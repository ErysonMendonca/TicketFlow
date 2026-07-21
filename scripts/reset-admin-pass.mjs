// Redefine a senha do admin para um valor conhecido (dev). Gera hash scrypt novo.
// Uso: node --env-file=.env scripts/reset-admin-pass.mjs [novaSenha]
import { pool } from '../src/lib/db.js';
import { hashSenha } from '../src/lib/auth.js';

const email = 'admin@ticketflow.com';
const nova = process.argv[2] || 'admin123';

const [r] = await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashSenha(nova), email]);
console.log(r.affectedRows ? `OK: senha de ${email} definida como "${nova}"` : `Nenhum usuário com email ${email}`);
await pool.end();
