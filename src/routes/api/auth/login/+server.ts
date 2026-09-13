import { json } from '@sveltejs/kit';
import { verifyPassword, createSession } from '$lib/server/auth';
import { sql } from '$lib/server/db/postgres';
import { allowLogin } from '$lib/server/rate-limit';

export async function POST({ request, cookies }) {
  const { username, password } = await request.json(); const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'; if (!allowLogin(ip)) return json({ error: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.' }, { status: 429 }); if (String(username ?? '').length > 100 || String(password ?? '').length > 200) return json({ error: 'Thông tin đăng nhập không hợp lệ' }, { status: 400 });
  const rows = await sql`SELECT id, password_hash FROM app_user WHERE username=${String(username ?? '')} AND status='ACTIVE'`;
  if (!rows[0] || !(await verifyPassword(String(password ?? ''), rows[0].password_hash))) return json({ error: 'Sai username hoặc password' }, { status: 401 });
  cookies.set('session', await createSession(rows[0].id), { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 60 * 60 * 24 * 7 });
  return json({ ok: true });
}
