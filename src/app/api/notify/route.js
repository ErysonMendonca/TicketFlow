import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';

// Envio de e-mail server-side (Resend via REST — sem SDK/dependência).
// Credenciais: primeiro do banco (app_config, editável pelo admin na tela Config), fallback pro .env.
// Se faltar config, faz skip silencioso (não trava o app). Trocar de provedor = só mudar o fetch abaixo.
async function credenciais() {
  try {
    const [rows] = await pool.query("SELECT chave, valor FROM app_config WHERE chave IN ('resend_api_key','email_from')");
    const m = {};
    for (const r of rows) m[r.chave] = r.valor;
    return { key: m.resend_api_key || process.env.RESEND_API_KEY, from: m.email_from || process.env.EMAIL_FROM };
  } catch {
    return { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM }; // tabela ainda não existe
  }
}

export async function POST(request) {
  try {
    const { to, subject, html, text } = await request.json();
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (recipients.length === 0) return NextResponse.json({ skipped: true, reason: 'sem destinatários' });

    const { key: KEY, from: FROM } = await credenciais();
    if (!KEY || !FROM) return NextResponse.json({ skipped: true, reason: 'e-mail não configurado (defina em Config ou no .env)' });

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
