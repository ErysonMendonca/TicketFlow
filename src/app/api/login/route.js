import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { criarSessao, clientIp } from '@/lib/auth.js';

// Rate limit por IP (em memória; reinicia com o servidor). Single-server basta.
const tentativas = new Map(); // ip -> { count, resetAt }
const MAX = 5;
const JANELA = 15 * 60 * 1000; // 15 min

export async function POST(request) {
  try {
    const ip = clientIp(request);
    const now = Date.now();
    const t = tentativas.get(ip);
    if (t && t.count >= MAX && now < t.resetAt) {
      const min = Math.ceil((t.resetAt - now) / 60000);
      return NextResponse.json({ error: `Muitas tentativas de login. Tente novamente em ${min} min.` }, { status: 429 });
    }

    const { email, password } = await request.json();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1', [email, password]);
    const user = rows[0];

    if (!user) {
      const cur = (t && now < t.resetAt) ? t : { count: 0, resetAt: now + JANELA };
      cur.count++;
      tentativas.set(ip, cur);
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    tentativas.delete(ip); // sucesso zera o contador do IP
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
