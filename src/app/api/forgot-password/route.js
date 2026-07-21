import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { gerarToken } from '@/lib/auth.js';

// Esqueci a senha: gera token, envia link por e-mail. Sempre responde ok (não revela se o e-mail existe).
export async function POST(request) {
  try {
    const { email } = await request.json();
    const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ? LIMIT 1', [email]);
    const user = rows[0];
    if (user) {
      const token = gerarToken();
      await pool.query(
        'INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
        [token, user.id]
      );
      const origin = request.headers.get('origin') || new URL(request.url).origin;
      const resetUrl = `${origin}/#/reset/${token}`;
      await fetch(new URL('/api/notify', request.url), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [email],
          subject: 'Recuperação de senha — TicketFlow',
          email: {
            cabecalho: 'Recuperar senha',
            titulo: 'Redefinição de senha',
            descricao: `Olá ${user.name}, recebemos um pedido para redefinir sua senha. O link expira em 1 hora. Se não foi você, ignore este e-mail.`,
            cta: 'Redefinir senha', ctaUrl: resetUrl,
          },
        }),
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true }); // não vaza erro/existência
  }
}
