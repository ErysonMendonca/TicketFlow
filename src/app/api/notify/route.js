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

// --- Template de e-mail (HTML à prova de clientes: tabela + estilos inline, cores do sistema) ---
const AZUL = '#4f46e5';
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function renderEmail({ cabecalho, icone, titulo, descricao, situacao, situacaoCor, mensagem, assinatura, cta, ctaUrl } = {}) {
  const bodyBits = [
    `<div style="color:#c7d2fe;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;">Assunto</div>`,
    `<div style="color:#ffffff;font-size:17px;font-weight:800;line-height:1.35;margin:4px 0 2px;">${esc(titulo)}</div>`,
  ];
  if (descricao) bodyBits.push(
    `<div style="color:#c7d2fe;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-top:16px;">Descrição</div>`,
    `<div style="color:#e0e7ff;font-size:14px;line-height:1.6;margin-top:3px;">${esc(descricao)}</div>`
  );
  if (mensagem) bodyBits.push(
    `<div style="margin-top:14px;background:rgba(255,255,255,0.12);border-radius:10px;padding:13px 16px;color:#ffffff;font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(mensagem)}</div>`
  );
  if (situacao) bodyBits.push(
    `<div style="margin-top:18px;"><span style="display:inline-block;background:#ffffff;color:${situacaoCor || AZUL};font-size:12px;font-weight:800;padding:7px 15px;border-radius:999px;">${esc(situacao)}</span></div>`
  );

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;">
<div style="background:#eef2ff;padding:30px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e0e7ff;">
      <tr><td style="background:${AZUL};padding:22px 28px;text-align:center;">
        <div style="color:#c7d2fe;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">TicketFlow · TynkeTech</div>
        <div style="color:#ffffff;font-size:21px;font-weight:800;margin-top:5px;">${esc(cabecalho || 'Notificação de Ticket')}</div>
      </td></tr>
      <tr><td style="padding:26px 28px ${cta && ctaUrl ? '20px' : '26px'};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${AZUL};border-radius:16px;">
          <tr><td style="padding:24px 26px;">${bodyBits.join('')}</td></tr>
        </table>
      </td></tr>
      ${cta && ctaUrl ? `<tr><td style="padding:2px 28px 28px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>
          <td style="border-radius:11px;background:${AZUL};box-shadow:0 4px 12px rgba(79,70,229,0.35);">
            <a href="${esc(ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:11px;">${esc(cta)}</a>
          </td>
        </tr></table>
        <div style="font-size:11px;color:#94a3b8;margin-top:10px;">É preciso estar logado no TicketFlow para acessar.</div>
      </td></tr>` : ''}
      <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        ${assinatura ? `<div style="font-size:13px;color:#334155;font-weight:700;">${esc(assinatura)}</div>` : ''}
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Notificação automática do TicketFlow · não responda este e-mail.</div>
      </td></tr>
    </table>
  </td></tr></table>
</div></body></html>`;
}

// Toggle do evento (default habilitado se não houver registro em app_config)
async function eventoHabilitado(evento) {
  if (!evento) return true;
  try {
    const [rows] = await pool.query('SELECT valor FROM app_config WHERE chave = ?', ['notif_' + evento]);
    return rows.length === 0 ? true : rows[0].valor !== 'false';
  } catch {
    return true;
  }
}

export async function POST(request) {
  try {
    const { to, subject, html, text, evento, email } = await request.json();
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (recipients.length === 0) return NextResponse.json({ skipped: true, reason: 'sem destinatários' });

    if (!(await eventoHabilitado(evento))) return NextResponse.json({ skipped: true, reason: `notificação "${evento}" desativada` });

    const { key: KEY, from: FROM } = await credenciais();
    if (!KEY || !FROM) return NextResponse.json({ skipped: true, reason: 'e-mail não configurado (defina em Config ou no .env)' });

    // CTA "Verificar o ticket agora" → deep-link #/ticket/<id> na origem do app (fallback: URL da requisição)
    let emailData = email;
    if (email && email.ticketId) {
      const origin = request.headers.get('origin') || new URL(request.url).origin;
      emailData = { ...email, cta: email.cta || 'Verificar o ticket agora →', ctaUrl: `${origin}/#/ticket/${email.ticketId}` };
    }
    const finalHtml = emailData ? renderEmail(emailData) : html; // conteúdo estruturado → template branded; senão, html cru (compat)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: recipients, subject: subject || 'TicketFlow', html: finalHtml || undefined, text: text || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: data?.message || `Falha no envio (${res.status})` }, { status: 502 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
