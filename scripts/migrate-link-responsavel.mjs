// Adiciona o vínculo de responsável + sub-setores extras em `users`.
// NÃO-DESTRUTIVO (só ALTER aditivo). Idempotente (checa information_schema antes).
//
// Colunas:
//   users.system_ids JSON NULL     -- sub-setores extras onde o funcionário também trabalha
//   users.responsavel_id INT NULL  -- quem é o responsável (criador do link de cadastro) → FK users(id)
//
// Rodar — DRY-RUN:  node --env-file=.env scripts/migrate-link-responsavel.mjs
// Aplicar:          node --env-file=.env scripts/migrate-link-responsavel.mjs --apply
import { pool } from '../src/lib/db.js';

const APPLY = process.argv.includes('--apply');
const DB = process.env.MYSQL_DATABASE;
const tag = APPLY ? '[APLICANDO]' : '[DRY-RUN]';

async function colunaExiste(conn, table, col) {
  const [r] = await conn.query(
    'SELECT COUNT(*) c FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?',
    [DB, table, col]);
  return r[0].c > 0;
}
async function fkExiste(conn, table, name) {
  const [r] = await conn.query(
    "SELECT COUNT(*) c FROM information_schema.table_constraints WHERE table_schema=? AND table_name=? AND constraint_name=? AND constraint_type='FOREIGN KEY'",
    [DB, table, name]);
  return r[0].c > 0;
}
async function indexExiste(conn, table, index) {
  const [r] = await conn.query(
    'SELECT COUNT(*) c FROM information_schema.statistics WHERE table_schema=? AND table_name=? AND index_name=?',
    [DB, table, index]);
  return r[0].c > 0;
}

async function run() {
  if (!DB) throw new Error('MYSQL_DATABASE não definido — rode com --env-file=.env');
  const conn = await pool.getConnection();
  try {
    console.log(`\n=== Link de Responsável ${tag} — banco "${DB}" ===\n`);

    const colunas = [
      ['users', 'system_ids', 'ALTER TABLE users ADD COLUMN system_ids JSON NULL AFTER system_id'],
      ['users', 'responsavel_id', 'ALTER TABLE users ADD COLUMN responsavel_id INT NULL AFTER system_ids'],
      ['users', 'blocked', 'ALTER TABLE users ADD COLUMN blocked TINYINT DEFAULT 0 AFTER responsavel_id'],
      ['users', 'setor_ids', 'ALTER TABLE users ADD COLUMN setor_ids JSON NULL AFTER setor_id'],
    ];
    for (const [tbl, col, sql] of colunas) {
      if (await colunaExiste(conn, tbl, col)) { console.log(`   coluna ${tbl}.${col}: já existe ✓`); continue; }
      console.log(`   coluna ${tbl}.${col}: criar`);
      if (APPLY) await conn.query(sql);
    }

    if (await indexExiste(conn, 'users', 'idx_users_responsavel')) {
      console.log('   índice idx_users_responsavel: já existe ✓');
    } else {
      console.log('   índice idx_users_responsavel: criar');
      if (APPLY) await conn.query('ALTER TABLE users ADD INDEX idx_users_responsavel (responsavel_id)');
    }

    if (await fkExiste(conn, 'users', 'fk_users_responsavel')) {
      console.log('   FK fk_users_responsavel: já existe ✓');
    } else {
      console.log('   FK fk_users_responsavel: criar (users.responsavel_id → users.id ON DELETE SET NULL)');
      if (APPLY) await conn.query('ALTER TABLE users ADD CONSTRAINT fk_users_responsavel FOREIGN KEY (responsavel_id) REFERENCES users(id) ON DELETE SET NULL');
    }

    console.log(APPLY ? '\n✅ Aplicado.' : '\nℹ️  DRY-RUN: nada foi gravado. Rode de novo com --apply.');
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(err => { console.error('\nFALHA:', err.message); process.exit(1); });
