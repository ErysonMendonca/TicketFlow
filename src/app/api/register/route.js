import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { hashSenha, verificarLinkRegistro } from '@/lib/auth.js';

// Resolve o alvo do link a partir do TOKEN ASSINADO (público, mas o papel/alvo vêm do token, não da URL).
export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    const link = await verificarLinkRegistro(token);
    if (!link) return NextResponse.json({ target: null }, { status: 400 });
    const table = link.t === 'setor' ? 'setores' : 'systems';
    const [rows] = await pool.query(`SELECT id, name FROM ${table} WHERE id = ? LIMIT 1`, [link.i]);
    return NextResponse.json({ target: rows[0] || null, tipo: link.t, papel: link.p });
  } catch {
    return NextResponse.json({ target: null }, { status: 500 });
  }
}

// Auto-registro por link. papel/tipo/alvo/criador vêm SÓ do token assinado (não do corpo).
export async function POST(request) {
  try {
    const { name, email, password, token } = await request.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Preencha nome, e-mail e senha.' }, { status: 400 });
    const link = await verificarLinkRegistro(token);
    if (!link) return NextResponse.json({ error: 'Link inválido ou expirado. Peça um novo.' }, { status: 400 });

    const { t: tipo, i: id, p: papel, c: criadorId } = link;
    const senhaHash = hashSenha(password);
    const role = papel === 'gerente' ? 'gerente'
      : papel === 'responsavel_subsetor' ? 'responsavel_subsetor'
      : 'funcionario';
    const table = tipo === 'setor' ? 'setores' : 'systems';
    const [alvoRows] = await pool.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    const alvo = alvoRows[0];
    if (!alvo) return NextResponse.json({ error: 'Setor/sub-setor do link não existe mais.' }, { status: 400 });
    const setorId = tipo === 'setor' ? id : (alvo?.setor_id ?? null);
    const systemId = tipo === 'setor' ? null : id;
    // responsável = quem emitiu o link (id vindo do token; valida que ainda existe)
    let respId = Number(criadorId) || null;
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
    return NextResponse.json({ error: dup ? 'E-mail já cadastrado.' : 'Falha no cadastro.' }, { status: dup ? 409 : 500 });
  }
}
