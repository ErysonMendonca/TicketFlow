import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';
import { usuarioDaSessao, assinarLinkRegistro } from '@/lib/auth.js';

const parseArr = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };

// Emite um LINK de registro assinado. Só quem TEM autoridade (admin, ou líder do
// setor/sub-setor no escopo) consegue emitir — e só os papéis permitidos.
export async function POST(request) {
  try {
    const usuario = await usuarioDaSessao(request);
    if (!usuario) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    if (usuario.blocked) return NextResponse.json({ error: 'Acesso bloqueado.' }, { status: 403 });

    const { tipo, id, papel } = await request.json();
    const alvoId = Number(id);
    if (!['setor', 'categoria'].includes(tipo) || !alvoId) return NextResponse.json({ error: 'Alvo inválido.' }, { status: 400 });
    const admin = usuario.role === 'admin';

    let lidera = admin, papeisOk = [];
    if (tipo === 'setor') {
      const [s] = await pool.query('SELECT primary_responsibles FROM setores WHERE id = ? LIMIT 1', [alvoId]);
      if (!s[0]) return NextResponse.json({ error: 'Setor inexistente.' }, { status: 404 });
      lidera = lidera || parseArr(s[0].primary_responsibles).includes(usuario.id) ||
        (usuario.role === 'gerente' && String(usuario.setor_id) === String(alvoId));
      papeisOk = ['gerente', 'funcionario'];
    } else { // sub-setor
      const [sy] = await pool.query('SELECT primary_responsibles, setor_id FROM systems WHERE id = ? LIMIT 1', [alvoId]);
      if (!sy[0]) return NextResponse.json({ error: 'Sub-setor inexistente.' }, { status: 404 });
      let lideraSub = parseArr(sy[0].primary_responsibles).includes(usuario.id) ||
        (usuario.role === 'responsavel_subsetor' && String(usuario.system_id) === String(alvoId));
      // Gerente do setor PAI também pode emitir para os sub-setores dele
      if (!lideraSub && usuario.role === 'gerente') {
        const [ps] = await pool.query('SELECT primary_responsibles FROM setores WHERE id = ? LIMIT 1', [sy[0].setor_id]);
        lideraSub = String(usuario.setor_id) === String(sy[0].setor_id) || (ps[0] && parseArr(ps[0].primary_responsibles).includes(usuario.id));
      }
      lidera = lidera || lideraSub;
      papeisOk = ['responsavel_subsetor', 'funcionario'];
    }

    if (!lidera) return NextResponse.json({ error: 'Sem permissão para emitir link deste setor/sub-setor.' }, { status: 403 });
    const papelFinal = papeisOk.includes(papel) ? papel : 'funcionario'; // clamp: nunca escala além do permitido

    const token = await assinarLinkRegistro({ t: tipo, i: alvoId, p: papelFinal, c: usuario.id });
    return NextResponse.json({ token, papel: papelFinal });
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao gerar o link.' }, { status: 500 });
  }
}
