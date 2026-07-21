// Permissão de destino por setor de origem.
// NÃO-DESTRUTIVO (só ALTER aditivo). Idempotente (checa information_schema antes).
//
// Coluna:
//   setores.destinos_permitidos JSON NULL
//     -- array de IDs de setores para os quais ESTE setor (origem) pode abrir chamado.
//     -- NULL/[] = não pode abrir para nenhum (admin sempre pode). A ORIGEM define os destinos.
//
// Rodar — DRY-RUN:  node --env-file=.env scripts/migrate-destinos-permitidos.mjs
// Aplicar:          node --env-file=.env scripts/migrate-destinos-permitidos.mjs --apply
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

async function run() {
  if (!DB) throw new Error('MYSQL_DATABASE não definido — rode com --env-file=.env');
  const conn = await pool.getConnection();
  try {
    console.log(`\n=== Destinos permitidos por setor ${tag} — banco "${DB}" ===\n`);
    if (await colunaExiste(conn, 'setores', 'destinos_permitidos')) {
      console.log('   coluna setores.destinos_permitidos: já existe ✓');
    } else {
      console.log('   coluna setores.destinos_permitidos: criar');
      if (APPLY) await conn.query('ALTER TABLE setores ADD COLUMN destinos_permitidos JSON NULL');
    }
    console.log(APPLY ? '\n✅ Aplicado.' : '\nℹ️  DRY-RUN: nada foi gravado. Rode de novo com --apply.');
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(err => { console.error('\nFALHA:', err.message); process.exit(1); });
