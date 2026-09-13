import { json } from '@sveltejs/kit';
import { canRead } from '$lib/server/permissions';
import { sql } from '$lib/server/db/postgres';
export async function GET({ locals, params }) { if (!(await canRead(locals.user, params.id))) return json({ error: 'Forbidden' }, { status: 403 }); const revisions = await sql`SELECT id,version,snapshot,created_by AS "createdBy",created_at AS "createdAt" FROM note_revision WHERE note_id=${params.id} ORDER BY version DESC`; const audit = await sql`SELECT id,action,block_id AS "blockId",diff_payload AS "diffPayload",search_text AS "searchText",created_at AS "createdAt" FROM audit_log WHERE note_id=${params.id} ORDER BY created_at DESC`; return json({ revisions, audit }); }
