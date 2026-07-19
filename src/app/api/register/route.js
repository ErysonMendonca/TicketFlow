import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { hashSenha } from '@/lib/auth.js';

// Lookup PÚBLICO do alvo do link (só id+nome) — a tela de cadastro é anônima e não pode usar /api/data (exige login).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ target: null }, { status: 400 });
    const table = tipo === 'setor' ? 'setores' : 'systems'; // tabela fixa por tipo (sem injeção)
    const [rows] = await pool.query(`SELECT id, name FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return NextResponse.json({ target: rows[0] || null });
  } catch (e) {
    return NextResponse.json({ target: null, error: e.message }, { status: 500 });
  }
}

// Auto-registro por link (público). Insere o usuário e, se for responsável, anexa aos primary_responsibles.
export async function POST(request) {
  try {
    const { name, email, password, tipo, id, papel, responsavelId } = await request.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Preencha nome, e-mail e senha.' }, { status: 400 });
    const senhaHash = hashSenha(password);

    const role = papel === 'gerente' ? 'gerente'
      : papel === 'responsavel_subsetor' ? 'responsavel_subsetor'
      : 'funcionario';
    const table = tipo === 'setor' ? 'setores' : 'systems';
    const [alvoRows] = await pool.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    const alvo = alvoRows[0];
    const setorId = tipo === 'setor' ? id : (alvo?.setor_id ?? null);
    const systemId = tipo === 'setor' ? null : id;
    // responsável = quem criou o link (se veio um id válido de usuário existente)
    let respId = Number(responsavelId) || null;
    if (respId) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [respId]);
      if (!uRows[0]) respId = null;
    }

    const [r] = await pool.query(
      'INSERT INTO users (name, email, password, role, setor_id, system_id, responsavel_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, senhaHash, role, setorId, systemId, respId, `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`]
    );
    const newId = r.insertId;

    // cargo de gestão (gerente do setor / responsável do sub-setor) entra nos primary_responsibles do alvo
    if ((role === 'gerente' || role === 'responsavel_subsetor') && alvo) {
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
