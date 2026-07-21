import { pool } from './db.js';
import crypto from 'node:crypto';

export const gerarToken = () => crypto.randomBytes(32).toString('hex');

// --- Hash de senha (scrypt nativo; formato salt:hash) ---
export function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(senha), salt, 32).toString('hex');
  return `${salt}:${derived}`;
}
export function verificarSenha(senha, armazenada) {
  if (!armazenada || !String(armazenada).includes(':')) return false;
  const [salt, hash] = String(armazenada).split(':');
  const derived = crypto.scryptSync(String(senha), salt, 32).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(derived, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// IP da máquina (atrás de proxy usa x-forwarded-for)
export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'desconhecido';
}

export async function criarSessao(userId, ip) {
  const token = gerarToken();
  await pool.query('INSERT INTO sessions (token, user_id, ip) VALUES (?, ?, ?)', [token, userId, ip]);
  return token;
}

// Usuário logado a partir do header x-session-token (ou null)
export async function usuarioDaSessao(request) {
  const token = request.headers.get('x-session-token');
  if (!token) return null;
  try {
    const [rows] = await pool.query(
      'SELECT u.id, u.name, u.role, u.setor_id, u.system_id, u.blocked FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? LIMIT 1',
      [token]);
    return rows[0] || null;
  } catch { return null; }
}

export async function apagarSessao(token) {
  if (token) await pool.query('DELETE FROM sessions WHERE token = ?', [token]).catch(() => {});
}

// --- Links de registro ASSINADOS (HMAC) ---
// O papel/alvo do link NÃO pode vir do cliente (senão qualquer um forja /registro/setor/1/gerente).
// A rota autenticada /api/register-link assina {tipo,id,papel,criador} com um segredo do servidor;
// o /api/register confia só no que está assinado.
let _linkSecret = null;
async function linkSecret() {
  if (_linkSecret) return _linkSecret;
  const [rows] = await pool.query("SELECT valor FROM app_config WHERE chave = 'link_secret' LIMIT 1");
  if (rows[0]?.valor) { _linkSecret = rows[0].valor; return _linkSecret; }
  const novo = crypto.randomBytes(32).toString('hex');
  await pool.query("INSERT INTO app_config (chave, valor) VALUES ('link_secret', ?) ON DUPLICATE KEY UPDATE valor = valor", [novo]);
  const [again] = await pool.query("SELECT valor FROM app_config WHERE chave = 'link_secret' LIMIT 1");
  _linkSecret = again[0]?.valor || novo;
  return _linkSecret;
}
const _hmac = (secret, body) => crypto.createHmac('sha256', secret).update(body).digest('base64url');

export async function assinarLinkRegistro(payload) { // payload = { t, i, p, c }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${_hmac(await linkSecret(), body)}`;
}
export async function verificarLinkRegistro(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const esperado = _hmac(await linkSecret(), body);
  const a = Buffer.from(sig), b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
}
