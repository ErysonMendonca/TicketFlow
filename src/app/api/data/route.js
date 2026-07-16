import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { usuarioDaSessao, hashSenha } from '@/lib/auth.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, table, cols = '*', data, filters = [], order, limit, single } = body;

    // Proteção básica contra SQL Injection no nome da tabela e chamadas indesejadas
    const allowedTables = ['users', 'setores', 'systems', 'tickets', 'system_logs', 'ticket_messages'];
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: 'Tabela não permitida' }, { status: 400 });
    }

    // --- AUTENTICAÇÃO: nada é acessível sem login ---
    const usuario = await usuarioDaSessao(request);
    if (!usuario) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const admin = usuario.role === 'admin';

    // --- AUTORIZAÇÃO POR CARGO (o que seu cargo não alcança é bloqueado no servidor) ---
    const semPermissao = () => NextResponse.json({ error: 'Sem permissão para esta ação.' }, { status: 403 });
    // Escrever em setores/systems: só admin — EXCEÇÃO: quem lidera pode editar campos de configuração
    // (`colunas` do Kanban e `auto_pool`) do setor/sub-setor que lidera.
    if (['setores', 'systems'].includes(table) && action !== 'select' && !admin) {
      const alvoId = filters.find(f => f.type === 'eq' && f.col === 'id')?.val;
      const campos = data ? Object.keys(data) : [];
      const permitidos = ['colunas', 'auto_pool'];
      const soPermitidos = action === 'update' && campos.length > 0 && campos.every(c => permitidos.includes(c));
      if (!soPermitidos || alvoId == null) return semPermissao();
      // Dono: está no primary_responsibles OU é o gerente/resp. lotado nele (cargo + setor_id/system_id).
      const [donoRows] = await pool.query(`SELECT primary_responsibles FROM ${table} WHERE id = ? LIMIT 1`, [alvoId]);
      let resp = donoRows[0]?.primary_responsibles;
      if (typeof resp === 'string') { try { resp = JSON.parse(resp); } catch { resp = []; } }
      const noPrimary = Array.isArray(resp) && resp.includes(usuario.id);
      const porCargo = table === 'setores'
        ? (usuario.role === 'gerente' && String(usuario.setor_id) === String(alvoId))
        : (usuario.role === 'responsavel_subsetor' && String(usuario.system_id) === String(alvoId));
      if (!noPrimary && !porCargo) return semPermissao();
    }
    // Escrever em users: só admin — exceto a PRÓPRIA linha (is_online / perfil)
    if (table === 'users' && action !== 'select' && !admin) {
      const alvo = filters.find(f => f.type === 'eq' && f.col === 'id')?.val;
      if (String(alvo) !== String(usuario.id)) return semPermissao();
    }
    // Ler logs do sistema: só admin
    if (table === 'system_logs' && action === 'select' && !admin) return semPermissao();

    // Nunca gravar senha em texto puro: faz hash em qualquer escrita de users
    if (table === 'users' && ['insert', 'update', 'upsert'].includes(action) && data) {
      const items = Array.isArray(data) ? data : [data];
      for (const it of items) {
        if (it && typeof it.password === 'string' && it.password && !it.password.includes(':')) {
          it.password = hashSenha(it.password);
        }
      }
    }

    let query = '';
    let values = [];

    // Filtros
    const buildWhere = () => {
      if (filters.length === 0) return '';
      const clauses = filters.map(f => {
        if (f.type === 'eq') { values.push(f.val); return `${f.col} = ?`; }
        if (f.type === 'neq') { values.push(f.val); return `${f.col} != ?`; }
        return '';
      }).filter(Boolean);
      return clauses.length > 0 ? ' WHERE ' + clauses.join(' AND ') : '';
    };

    if (action === 'select') {
      const safeCols = cols === '*' ? '*' : cols.split(',').map(c => c.trim()).join(', ');
      query = `SELECT ${safeCols} FROM ${table}`;
      query += buildWhere();
      
      if (order) {
        query += ` ORDER BY ${order.column} ${order.ascending ? 'ASC' : 'DESC'}`;
      }
      
      if (limit) {
        query += ` LIMIT ${parseInt(limit)}`;
      }

    } else if (action === 'insert') {
      const items = Array.isArray(data) ? data : [data];
      const keys = Object.keys(items[0]);
      const placeholders = keys.map(() => '?').join(', ');
      
      query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES `;
      const valueSets = [];
      items.forEach(item => {
        valueSets.push(`(${placeholders})`);
        keys.forEach(k => {
          values.push(typeof item[k] === 'object' && item[k] !== null ? JSON.stringify(item[k]) : item[k]);
        });
      });
      query += valueSets.join(', ');

    } else if (action === 'upsert') {
      const items = Array.isArray(data) ? data : [data];
      const keys = Object.keys(items[0]);
      const placeholders = keys.map(() => '?').join(', ');
      
      query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES `;
      const valueSets = [];
      items.forEach(item => {
        valueSets.push(`(${placeholders})`);
        keys.forEach(k => {
          values.push(typeof item[k] === 'object' && item[k] !== null ? JSON.stringify(item[k]) : item[k]);
        });
      });
      query += valueSets.join(', ');
      
      const updateClause = keys.filter(k => k !== 'id').map(k => `${k} = VALUES(${k})`).join(', ');
      if (updateClause.length > 0) {
         query += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
      }

    } else if (action === 'update') {
      const keys = Object.keys(data);
      const setClause = keys.map(k => { 
        values.push(typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]); 
        return `${k} = ?`; 
      }).join(', ');
      query = `UPDATE ${table} SET ${setClause}`;
      query += buildWhere();

    } else if (action === 'delete') {
      query = `DELETE FROM ${table}`;
      query += buildWhere();
    } else {
      return NextResponse.json({ error: 'Ação SQL inválida' }, { status: 400 });
    }

    // Obter uma conexão única do pool para garantir que o SET SESSION afete a query subsequente
    const connection = await pool.getConnection();
    try {
      // Aumentar sort_buffer_size para a sessão atual para evitar erro de ordenação em campos grandes (JSON)
      // Aumenta o buffer de ordenação para lidar com colunas JSON/Base64 pesadas
      await connection.query('SET SESSION sort_buffer_size = 33554432'); // 32MB
      
      const [rows] = await connection.query(query, values);

      // Formatação de retorno padrão de resposta
      const parseJsonCols = (dataSet) => {
        if (!Array.isArray(dataSet)) return dataSet;
        return dataSet.map(r => {
           for (let k in r) {
              if (typeof r[k] === 'string' && ((r[k].startsWith('[') && r[k].endsWith(']')) || (r[k].startsWith('{') && r[k].endsWith('}')))) {
                 try { r[k] = JSON.parse(r[k]); } catch(e) {}
              }
           }
           return r;
        });
      };

      let resultData = rows;
      
      if (action === 'insert' || action === 'upsert') {
        if (rows && rows.insertId) {
          const [insertedRow] = await connection.query(`SELECT * FROM ${table} WHERE id = ?`, [rows.insertId]);
          
          if (insertedRow && insertedRow.length > 0) {
             resultData = parseJsonCols(insertedRow);
          } else {
             const fallbackData = Array.isArray(data) ? data : [data];
             fallbackData[0].id = rows.insertId;
             resultData = fallbackData;
          }
        } else {
          const fallbackData = Array.isArray(data) ? data : [data];
          fallbackData[0].id = Date.now();
          resultData = fallbackData;
        }
      } else if (action === 'update' || action === 'delete') {
        resultData = null; 
      } else {
        resultData = parseJsonCols(rows);
        if (single && Array.isArray(resultData)) {
          resultData = resultData.length > 0 ? resultData[0] : null;
        }
      }

      // A senha nunca sai do servidor
      if (table === 'users' && resultData) {
        if (Array.isArray(resultData)) resultData = resultData.map(({ password, ...r }) => r);
        else if (typeof resultData === 'object') { const { password, ...r } = resultData; resultData = r; }
      }

      return NextResponse.json({ data: resultData, error: null });
    } finally {
      connection.release(); // Sempre liberar a conexão de volta para o pool
    }

  } catch (error) {
    console.error('Database API Error:', error);
    
    // Tenta registrar o erro no banco de dados (se for um erro de query, pode falhar aqui também)
    try {
      await pool.query(
        'INSERT INTO system_logs (action_type, new_value, actor_name, actor_role) VALUES (?, ?, ?, ?)',
        ['SYSTEM_ERROR', `API ERROR: ${error.message.substring(0, 200)}`, 'SERVER', 'system']
      );
    } catch (e) {
      console.error('Falha crítica ao logar erro no banco:', e);
    }

    return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  }
}
// Trigger deploy
