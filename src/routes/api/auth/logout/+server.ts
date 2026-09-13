import { json, redirect } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
export async function POST({ cookies }) { const token = cookies.get('session'); if (token) await sql`DELETE FROM session WHERE token=${token}`; cookies.delete('session', { path: '/' }); throw redirect(303, '/login'); }
