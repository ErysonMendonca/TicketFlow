import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { usuarioDaSessao } from '@/lib/auth.js';

// Limpa o banco deixando SÓ os usuários admin. Apaga tickets, mensagens, setores, sub-setores,
// sessões/resets dos não-admin, logs e todos os usuários não-admin. Só admin autenticado executa.
export async function POST(request) {
  try {
    const usuario = await usuarioDaSessao(request);
    if (!usuario) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    if (usuario.role !== 'admin') return NextResponse.json({ error: 'Apenas admin pode limpar o banco.' }, { status: 403 });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM ticket_messages');
      await conn.query('DELETE FROM tickets');
      await conn.query('DELETE FROM systems');
      await conn.query('DELETE FROM setores');
      // mantém as sessões dos admins (não desloga quem está usando); apaga o resto
      await conn.query("DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')");
      await conn.query('DELETE FROM password_resets');
      await conn.query('DELETE FROM system_logs');
      const [r] = await conn.query("DELETE FROM users WHERE role <> 'admin'");
      await conn.commit();
      return NextResponse.json({ ok: true, usuariosRemovidos: r.affectedRows });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
