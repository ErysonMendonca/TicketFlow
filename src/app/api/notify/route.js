import { NextResponse } from 'next/server';

// Envio de e-mail server-side (Resend via REST — sem SDK/dependência).
// Configurar no .env: RESEND_API_KEY e EMAIL_FROM (ex.: "TicketFlow <chamados@seudominio.com>").
// Se faltar config, faz skip silencioso (não trava o app). Trocar de provedor = só mudar o fetch abaixo.
export async function POST(request) {
  try {
    const { to, subject, html, text } = await request.json();
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (recipients.length === 0) return NextResponse.json({ skipped: true, reason: 'sem destinatários' });

    const KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.EMAIL_FROM;
    if (!KEY || !FROM) return NextResponse.json({ skipped: true, reason: 'e-mail não configurado (RESEND_API_KEY/EMAIL_FROM)' });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: recipients, subject: subject || 'TicketFlow', html: html || undefined, text: text || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: data?.message || `Falha no envio (${res.status})` }, { status: 502 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
