import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sql } from '$lib/server/db/postgres';
export async function POST({ locals, params }) { if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 }); const rows = await sql`UPDATE note SET deleted_at=NULL,deleted_by=NULL,updated_at=now() WHERE id=${params.id} AND (${locals.user.role}='ADMIN' OR owner_id=${locals.user.id}) RETURNING id`; if (!rows.length) return json({ error: 'Forbidden or note not found' }, { status: 403 }); await sql`INSERT INTO audit_log(id,note_id,user_id,action,search_text) VALUES(${randomUUID()},${params.id},${locals.user.id},'RESTORE','restored deleted note')`; return json({ ok: true }); }
