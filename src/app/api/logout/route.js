import { NextResponse } from 'next/server';
import { pool } from '@/lib/db.js';

export async function POST(request) {
  const token = request.headers.get('x-session-token');
  if (token) await pool.query('DELETE FROM sessions WHERE token = ?', [token]).catch(() => {});
  return NextResponse.json({ ok: true });
}
