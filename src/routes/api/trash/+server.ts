import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
export async function GET({ locals }) { if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 }); const rows = locals.user.role === 'ADMIN' ? await sql`SELECT id,title,owner_id AS "ownerId",deleted_at AS "deletedAt" FROM note WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC` : await sql`SELECT id,title,owner_id AS "ownerId",deleted_at AS "deletedAt" FROM note WHERE deleted_at IS NOT NULL AND owner_id=${locals.user.id} ORDER BY deleted_at DESC`; return json({ notes: rows }); }
