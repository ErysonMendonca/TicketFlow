// Visibilidade de ORIGEM + múltiplos responsáveis.
// NÃO-DESTRUTIVO (só ALTER aditivo + UPDATE de backfill). Idempotente (checa information_schema antes).
//
// Colunas:
//   users.responsavel_ids  JSON NULL                 -- responsáveis EXTRAS (definidos pelo admin); efetivo = responsavel_id ∪ responsavel_ids
//   setores.origin_visibility VARCHAR(20) NOT NULL DEFAULT 'own'  -- own | subsetor | setor (quem dos colegas de origem vê os chamados enviados)
//   tickets.origin_setor_id  INT NULL                -- setor de ORIGEM (de quem abriu) → FK setores(id) ON DELETE SET NULL
//   tickets.origin_system_id INT NULL                -- sub-setor de ORIGEM (system_id de quem abriu)
//
// Backfill (aditivo): preenche origin_setor_id/origin_system_id retroativamente a partir do CRIADOR do ticket.
//
// Rodar — DRY-RUN:  node --env-file=.env scripts/migrate-origem-visibilidade.mjs
// Aplicar:          node --env-file=.env scripts/migrate-origem-visibilidade.mjs --apply
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

async function run() {
  if (!DB) throw new Error('MYSQL_DATABASE não definido — rode com --env-file=.env');
  const conn = await pool.getConnection();
  try {
    console.log(`\n=== Visibilidade de Origem ${tag} — banco "${DB}" ===\n`);

    // 1) Colunas aditivas
    const colunas = [
      ['users',   'responsavel_ids',  'ALTER TABLE users ADD COLUMN responsavel_ids JSON NULL'],
      ['setores', 'origin_visibility', "ALTER TABLE setores ADD COLUMN origin_visibility VARCHAR(20) NOT NULL DEFAULT 'own'"],
      ['tickets', 'origin_setor_id',  'ALTER TABLE tickets ADD COLUMN origin_setor_id INT NULL'],
      ['tickets', 'origin_system_id', 'ALTER TABLE tickets ADD COLUMN origin_system_id INT NULL'],
    ];
    for (const [tbl, col, sql] of colunas) {
      if (await colunaExiste(conn, tbl, col)) { console.log(`   coluna ${tbl}.${col}: já existe ✓`); continue; }
      console.log(`   coluna ${tbl}.${col}: criar`);
      if (APPLY) await conn.query(sql);
    }

    // 2) FK tickets.origin_setor_id → setores(id)
    if (await fkExiste(conn, 'tickets', 'fk_tickets_origin_setor')) {
      console.log('   FK fk_tickets_origin_setor: já existe ✓');
    } else {
      console.log('   FK fk_tickets_origin_setor: criar (tickets.origin_setor_id → setores.id ON DELETE SET NULL)');
      if (APPLY) await conn.query('ALTER TABLE tickets ADD CONSTRAINT fk_tickets_origin_setor FOREIGN KEY (origin_setor_id) REFERENCES setores(id) ON DELETE SET NULL');
    }

    // 3) Backfill a partir do criador do ticket (só linhas ainda NULL)
    console.log('\n   backfill origin_setor_id/origin_system_id (a partir do criador):');
    if (APPLY) {
      const [r1] = await conn.query(
        `UPDATE tickets t JOIN users u ON t.created_by = u.id
           SET t.origin_setor_id = u.setor_id
         WHERE t.origin_setor_id IS NULL AND u.setor_id IS NOT NULL`);
      const [r2] = await conn.query(
        `UPDATE tickets t JOIN users u ON t.created_by = u.id
           SET t.origin_system_id = u.system_id
         WHERE t.origin_system_id IS NULL AND u.system_id IS NOT NULL`);
      console.log(`     origin_setor_id: ${r1.affectedRows} linha(s) · origin_system_id: ${r2.affectedRows} linha(s)`);
    } else {
      const [[a]] = await conn.query(
        `SELECT COUNT(*) n FROM tickets t JOIN users u ON t.created_by=u.id WHERE t.origin_setor_id IS NULL AND u.setor_id IS NOT NULL`);
      const [[b]] = await conn.query(
        `SELECT COUNT(*) n FROM tickets t JOIN users u ON t.created_by=u.id WHERE t.origin_system_id IS NULL AND u.system_id IS NOT NULL`);
      console.log(`     preencheria origin_setor_id: ${a.n} · origin_system_id: ${b.n}`);
    }

    console.log(APPLY ? '\n✅ Aplicado.' : '\nℹ️  DRY-RUN: nada foi gravado. Rode de novo com --apply.');
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(err => { console.error('\nFALHA:', err.message); process.exit(1); });
