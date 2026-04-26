import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('API Request:', body.action, 'on table:', body.table);
    const { action, table, cols = '*', data, filters = [], order, limit, single } = body;

    // Proteção super básica contra SQL Injection no nome da tabela e chamadas indesejadas
    const allowedTables = ['users', 'systems', 'tickets', 'system_logs', 'ticket_messages'];
    if (!allowedTables.includes(table)) {
      console.warn('Tabela não permitida:', table);
      return NextResponse.json({ error: 'Tabela não permitida' }, { status: 400 });
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
      await connection.query('SET SESSION sort_buffer_size = 8388608'); // 8MB
      
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
