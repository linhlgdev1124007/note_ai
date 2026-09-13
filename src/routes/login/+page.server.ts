import { fail, redirect } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
import { createSession, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => { if (locals.user) throw redirect(303, '/'); };
  export const actions: Actions = { default: async ({ request, cookies }) => { const data = await request.formData(); const username = String(data.get('username') ?? '').trim(); const password = String(data.get('password') ?? ''); if (username.length > 100 || password.length > 200) return fail(400, { error: 'Thông tin đăng nhập không hợp lệ' }); const rows = await sql`SELECT id,password_hash FROM app_user WHERE username=${username} AND status='ACTIVE'`; if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) return fail(401, { error: 'Sai username, password hoặc tài khoản đã bị khóa' }); cookies.set('session', await createSession(rows[0].id), { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 60 * 60 * 24 * 7 }); throw redirect(303, '/'); } };
