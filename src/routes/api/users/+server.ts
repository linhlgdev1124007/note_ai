import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
export async function GET({ locals, url }) { if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 }); const query = `%${url.searchParams.get('q') ?? ''}%`; return json({ users: await sql`SELECT id,username,display_name AS "displayName" FROM app_user WHERE status='ACTIVE' AND id <> ${locals.user.id} AND (username ILIKE ${query} OR display_name ILIKE ${query}) ORDER BY username LIMIT 10` }); }
