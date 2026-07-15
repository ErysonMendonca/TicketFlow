import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';

// Auto-registro por link (público). Insere o usuário e, se for responsável, anexa aos primary_responsibles.
export async function POST(request) {
  try {
    const { name, email, password, tipo, id, papel } = await request.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Preencha nome, e-mail e senha.' }, { status: 400 });

    const role = papel === 'responsavel_subsetor' ? 'responsavel_subsetor' : 'funcionario';
    const table = tipo === 'setor' ? 'setores' : 'systems';
    const [alvoRows] = await pool.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    const alvo = alvoRows[0];
    const setorId = tipo === 'setor' ? id : (alvo?.setor_id ?? null);
    const systemId = tipo === 'setor' ? null : id;

    const [r] = await pool.query(
      'INSERT INTO users (name, email, password, role, setor_id, system_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, password, role, setorId, systemId, `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`]
    );
    const newId = r.insertId;

    if (role === 'responsavel_subsetor' && alvo) {
      let resp = alvo.primary_responsibles;
      if (typeof resp === 'string') { try { resp = JSON.parse(resp); } catch { resp = []; } }
      resp = Array.isArray(resp) ? resp : [];
      if (!resp.includes(newId)) {
        await pool.query(`UPDATE ${table} SET primary_responsibles = ? WHERE id = ?`, [JSON.stringify([...resp, newId]), id]);
      }
    }
    return NextResponse.json({ ok: true, id: newId });
  } catch (e) {
    const dup = /duplicate/i.test(e.message || '');
    return NextResponse.json({ error: dup ? 'E-mail já cadastrado.' : e.message }, { status: dup ? 409 : 500 });
  }
}
