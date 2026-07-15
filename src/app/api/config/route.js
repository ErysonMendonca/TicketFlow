import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';

// Config de app (ex.: credenciais Resend) editável pelo admin.
// SEGURANÇA: a tabela app_config NÃO está no allowlist do /api/data (não é lida pelo endpoint genérico).
// O GET aqui NUNCA devolve a api key — só se está configurada + o remetente.

async function lerConfig() {
  const [rows] = await pool.query("SELECT chave, valor FROM app_config WHERE chave IN ('resend_api_key','email_from')");
  const m = {};
  for (const r of rows) m[r.chave] = r.valor;
  return m;
}

export async function GET() {
  try {
    const c = await lerConfig();
    return NextResponse.json({ emailConfigured: !!c.resend_api_key, emailFrom: c.email_from || null });
  } catch (e) {
    // tabela ainda não existe (migração não rodou) → tratar como não configurado
    return NextResponse.json({ emailConfigured: false, emailFrom: null });
  }
}

export async function POST(request) {
  try {
    const { resendApiKey, emailFrom } = await request.json();
    const up = async (chave, valor) => {
      if (valor === undefined || valor === null || valor === '') return; // em branco = mantém o atual
      await pool.query(
        'INSERT INTO app_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [chave, String(valor)]
      );
    };
    await up('resend_api_key', resendApiKey);
    await up('email_from', emailFrom);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
