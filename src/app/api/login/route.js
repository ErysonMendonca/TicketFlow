import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { criarSessao, clientIp, verificarSenha } from '@/lib/auth.js';

// Rate limit por CONTA (e-mail) — travar uma conta não afeta outros do mesmo IP.
// Em memória (reinicia com o servidor); single-server basta.
const tentativas = new Map(); // email -> { count, resetAt }
const MAX = 5;
const JANELA = 15 * 60 * 1000; // 15 min

export async function POST(request) {
  try {
    const ip = clientIp(request);
    const { email, password } = await request.json();
    const chave = String(email || '').toLowerCase().trim();
    const now = Date.now();

    const t = tentativas.get(chave);
    if (t && t.count >= MAX && now < t.resetAt) {
      const min = Math.ceil((t.resetAt - now) / 60000);
      return NextResponse.json({ error: `Muitas tentativas nesta conta. Tente novamente em ${min} min.` }, { status: 429 });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    const user = rows[0];
    if (!user || !verificarSenha(password, user.password)) {
      const cur = (t && now < t.resetAt) ? t : { count: 0, resetAt: now + JANELA };
      cur.count++;
      tentativas.set(chave, cur);
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    tentativas.delete(chave); // sucesso zera o contador da conta
    const token = await criarSessao(user.id, ip);
    await pool.query('UPDATE users SET is_online = 1 WHERE id = ?', [user.id]).catch(() => {});
    await pool.query(
      'INSERT INTO system_logs (action_type, new_value, actor_name, actor_role) VALUES (?, ?, ?, ?)',
      ['USER_LOGIN', `Acesso via IP ${ip}`, user.name, user.role]
    ).catch(() => {});

    delete user.password; // nunca devolve a senha
    return NextResponse.json({ user, token });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
