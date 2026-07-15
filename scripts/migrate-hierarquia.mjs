// Reestruturação do banco para a Gestão Hierárquica — deixa o modelo SETORES redondo.
// NÃO-DESTRUTIVO (só UPDATE/ALTER aditivo; nenhum DELETE/DROP). Idempotente. Transacional nos dados.
//
// O que faz:
//   1) roles antigos → novos: user → funcionario, dev → responsavel_subsetor (admin mantém)
//   2) setores/systems.primary_responsibles: array de NOMES → array de IDs de users
//   3) garante um setor padrão e ANEXA todo sub-setor (system) órfão a ele (systems.setor_id)
//   4) backfill de tickets.setor_id a partir do sub-setor (platform → system.setor_id)
//   5) integridade: colunas novas (users.system_id + setores/systems.colunas p/ Kanban custom) + índices
//      + FKs users.setor_id → setores e users.system_id → systems (tudo guardado por information_schema)
//
// Rodar — DRY-RUN primeiro (não grava nada, só relata):
//   node --env-file=.env scripts/migrate-hierarquia.mjs
// Aplicar de verdade (idealmente num DUMP/banco de teste antes):
//   node --env-file=.env scripts/migrate-hierarquia.mjs --apply
import { pool } from '../src/lib/db.js';

const APPLY = process.argv.includes('--apply');
const DB = process.env.MYSQL_DATABASE;
const SETOR_PADRAO = 'TI'; // sub-setores órfãos entram aqui; re-parenteie depois pela tela Setores

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
  return [];
};
const tag = APPLY ? '[APLICANDO]' : '[DRY-RUN]';
const plan = (msg) => console.log(`${tag} ${msg}`);

async function indexExiste(conn, table, index) {
  const [r] = await conn.query(
    'SELECT COUNT(*) c FROM information_schema.statistics WHERE table_schema=? AND table_name=? AND index_name=?',
    [DB, table, index]);
  return r[0].c > 0;
}
async function fkExiste(conn, table, name) {
  const [r] = await conn.query(
    "SELECT COUNT(*) c FROM information_schema.table_constraints WHERE table_schema=? AND table_name=? AND constraint_name=? AND constraint_type='FOREIGN KEY'",
    [DB, table, name]);
  return r[0].c > 0;
}
async function colunaExiste(conn, table, col) {
  const [r] = await conn.query(
    'SELECT COUNT(*) c FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?',
    [DB, table, col]);
  return r[0].c > 0;
}

async function run() {
  if (!DB) throw new Error('MYSQL_DATABASE não definido — rode com --env-file=.env');
  const conn = await pool.getConnection();
  try {
    console.log(`\n=== Reestruturação Hierárquica ${tag} — banco "${DB}" ===\n`);

    // ---- leitura ----
    const [users]   = await conn.query('SELECT id, name, role FROM users');
    const [setores] = await conn.query('SELECT id, name, primary_responsibles FROM setores ORDER BY id');
    const [systems] = await conn.query('SELECT id, name, setor_id, primary_responsibles FROM systems ORDER BY id');
    const [tickets] = await conn.query('SELECT id, setor_id, platform FROM tickets');

    const nameToId = new Map();
    const dup = new Set();
    for (const u of users) { if (nameToId.has(u.name)) dup.add(u.name); nameToId.set(u.name, u.id); }
    if (dup.size) console.warn(`AVISO: nomes de usuário duplicados (usei o último id): ${[...dup].join(', ')}\n`);

    if (APPLY) await conn.beginTransaction();

    // ---- 1) roles ----
    const nRoleUser = users.filter(u => u.role === 'user').length;
    const nRoleDev  = users.filter(u => u.role === 'dev').length;
    plan(`1) roles: user→funcionario (${nRoleUser}), dev→responsavel_subsetor (${nRoleDev})`);
    if (APPLY) {
      await conn.query("UPDATE users SET role='funcionario' WHERE role='user'");
      await conn.query("UPDATE users SET role='responsavel_subsetor' WHERE role='dev'");
    }

    // ---- 2) primary_responsibles nomes → ids ----
    const unmatched = [];
    const converte = (list, ref) => {
      const ids = [];
      for (const item of asArray(list)) {
        if (typeof item === 'number') { ids.push(item); continue; } // já é id (idempotência)
        const id = nameToId.get(item);
        if (id != null) ids.push(id);
        else unmatched.push(`${ref}: "${item}" (sem usuário)`);
      }
      return [...new Set(ids)];
    };
    console.log(`\n2) primary_responsibles (nomes → ids):`);
    for (const s of setores) {
      const ids = converte(s.primary_responsibles, `setor#${s.id} ${s.name}`);
      console.log(`   setor#${s.id} ${s.name}: ${JSON.stringify(asArray(s.primary_responsibles))} → ${JSON.stringify(ids)}`);
      if (APPLY) await conn.query('UPDATE setores SET primary_responsibles=? WHERE id=?', [JSON.stringify(ids), s.id]);
    }
    for (const s of systems) {
      const ids = converte(s.primary_responsibles, `system#${s.id} ${s.name}`);
      console.log(`   system#${s.id} ${s.name}: ${JSON.stringify(asArray(s.primary_responsibles))} → ${JSON.stringify(ids)}`);
      if (APPLY) await conn.query('UPDATE systems SET primary_responsibles=? WHERE id=?', [JSON.stringify(ids), s.id]);
    }

    // ---- 3) setor padrão + anexa sub-setores órfãos ----
    let setorPadrao = setores.find(s => s.name === SETOR_PADRAO) || setores[0];
    let setorPadraoId = setorPadrao?.id;
    console.log(`\n3) sub-setores → setor:`);
    if (!setorPadraoId) {
      console.log(`   nenhum setor existe → criar "${SETOR_PADRAO}"`);
      if (APPLY) { const [r] = await conn.query('INSERT INTO setores (name) VALUES (?)', [SETOR_PADRAO]); setorPadraoId = r.insertId; }
    } else {
      console.log(`   setor padrão p/ órfãos: #${setorPadraoId} ${setorPadrao.name}`);
    }
    const orfaos = systems.filter(s => s.setor_id == null);
    console.log(`   sub-setores órfãos (setor_id null): ${orfaos.length ? orfaos.map(s => `#${s.id} ${s.name}`).join(', ') : 'nenhum'}`);
    if (APPLY && orfaos.length && setorPadraoId) {
      await conn.query('UPDATE systems SET setor_id=? WHERE setor_id IS NULL', [setorPadraoId]);
    }
    // mapa final system→setor (considerando o anexo acima)
    const systemSetor = new Map(systems.map(s => [String(s.id), s.setor_id ?? setorPadraoId]));

    // ---- 4) backfill tickets.setor_id ----
    const semSetor = tickets.filter(t => t.setor_id == null);
    const backfillaveis = semSetor.filter(t => t.platform != null && systemSetor.has(String(t.platform)));
    const semPlatform   = semSetor.filter(t => t.platform == null);
    console.log(`\n4) tickets sem setor_id: ${semSetor.length} (backfilláveis via platform: ${backfillaveis.length}; sem platform, ficam null: ${semPlatform.length})`);
    if (APPLY) {
      for (const t of backfillaveis) {
        await conn.query('UPDATE tickets SET setor_id=? WHERE id=? AND setor_id IS NULL', [systemSetor.get(String(t.platform)), t.id]);
      }
    }
    if (semPlatform.length) console.log(`   (tickets sem platform nem setor ficam null — legado sem sub-setor: ${semPlatform.map(t => '#'+t.id).join(', ')})`);

    // ---- 4.1) Kanban 4 colunas padrão: "Em Teste" saiu do padrão → mover tickets presos pra "Resolvendo" ----
    const [emTeste] = await conn.query("SELECT COUNT(*) c FROM tickets WHERE status='em_teste'");
    console.log(`\n4.1) tickets em 'em_teste' (coluna removida do padrão) → 'resolvendo': ${emTeste[0].c}`);
    if (APPLY && emTeste[0].c > 0) await conn.query("UPDATE tickets SET status='resolvendo' WHERE status='em_teste'");

    if (APPLY) { await conn.commit(); console.log('\n>> dados COMMITados.'); }

    // ---- 5) integridade (DDL — auto-commit; roda após os dados) ----
    console.log(`\n5) integridade (colunas + índices + FK):`);

    // 5.0) colunas novas: users.system_id (vínculo de sub-setor) + setores/systems.colunas (Kanban custom)
    const colunasNovas = [
      ['users', 'system_id', 'ALTER TABLE users ADD COLUMN system_id INT NULL AFTER setor_id'],
      ['setores', 'colunas', 'ALTER TABLE setores ADD COLUMN colunas JSON NULL'],
      ['systems', 'colunas', 'ALTER TABLE systems ADD COLUMN colunas JSON NULL'],
    ];
    for (const [tbl, col, sql] of colunasNovas) {
      if (await colunaExiste(conn, tbl, col)) { console.log(`   coluna ${tbl}.${col}: já existe ✓`); continue; }
      console.log(`   coluna ${tbl}.${col}: criar`);
      if (APPLY) await conn.query(sql);
    }

    // 5.1) tabelas de config/auth (fora do allowlist do /api/data)
    console.log('   tabelas app_config / sessions / password_resets: garantir (CREATE TABLE IF NOT EXISTS)');
    if (APPLY) {
      await conn.query('CREATE TABLE IF NOT EXISTS app_config (chave VARCHAR(100) PRIMARY KEY, valor TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)');
      await conn.query('CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL, ip VARCHAR(64), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY idx_sessions_user (user_id))');
      await conn.query('CREATE TABLE IF NOT EXISTS password_resets (token VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL, used TINYINT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    }

    const ddl = [
      ['idx_users_setor',     'users',   'ALTER TABLE users ADD INDEX idx_users_setor (setor_id)', () => indexExiste(conn, 'users', 'idx_users_setor')],
      ['idx_users_system',    'users',   'ALTER TABLE users ADD INDEX idx_users_system (system_id)', () => indexExiste(conn, 'users', 'idx_users_system')],
      ['idx_systems_setor',   'systems', 'ALTER TABLE systems ADD INDEX idx_systems_setor (setor_id)', () => indexExiste(conn, 'systems', 'idx_systems_setor')],
      ['idx_tickets_setor',   'tickets', 'ALTER TABLE tickets ADD INDEX idx_tickets_setor (setor_id)', () => indexExiste(conn, 'tickets', 'idx_tickets_setor')],
      ['idx_tickets_platform','tickets', 'ALTER TABLE tickets ADD INDEX idx_tickets_platform (platform)', () => indexExiste(conn, 'tickets', 'idx_tickets_platform')],
    ];
    for (const [name, , sql, jaExiste] of ddl) {
      if (await jaExiste()) { console.log(`   índice ${name}: já existe ✓`); continue; }
      console.log(`   índice ${name}: criar`);
      if (APPLY) await conn.query(sql);
    }
    if (await fkExiste(conn, 'users', 'fk_users_setor')) {
      console.log('   FK fk_users_setor: já existe ✓');
    } else {
      console.log('   FK fk_users_setor: criar (users.setor_id → setores.id ON DELETE SET NULL)');
      if (APPLY) await conn.query('ALTER TABLE users ADD CONSTRAINT fk_users_setor FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL');
    }
    if (await fkExiste(conn, 'users', 'fk_users_system')) {
      console.log('   FK fk_users_system: já existe ✓');
    } else {
      console.log('   FK fk_users_system: criar (users.system_id → systems.id ON DELETE SET NULL)');
      if (APPLY) await conn.query('ALTER TABLE users ADD CONSTRAINT fk_users_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE SET NULL');
    }

    if (unmatched.length) {
      console.warn('\nAVISO: responsáveis por nome SEM usuário correspondente (foram removidos — reatribua pela tela Setores):');
      [...new Set(unmatched)].forEach(u => console.warn('  - ' + u));
    }

    console.log(APPLY ? '\n✅ Reestruturação aplicada.' : '\nℹ️  DRY-RUN: nada foi gravado. Reveja acima e rode de novo com --apply.');
  } catch (err) {
    if (APPLY) { try { await conn.rollback(); console.error('ROLLBACK dos dados feito.'); } catch {} }
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(err => { console.error('\nFALHA na reestruturação:', err.message); process.exit(1); });
