import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { hashSenha } from '@/lib/auth.js';

// Redefine a senha a partir de um token válido (não usado e não expirado).
export async function POST(request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password || String(password).length < 4) {
      return NextResponse.json({ error: 'Informe uma senha com pelo menos 4 caracteres.' }, { status: 400 });
    }
    const [rows] = await pool.query(
      'SELECT user_id FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1',
      [token]
    );
    const pr = rows[0];
    if (!pr) return NextResponse.json({ error: 'Link inválido ou expirado. Peça um novo.' }, { status: 400 });

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashSenha(password), pr.user_id]);
    await pool.query('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
