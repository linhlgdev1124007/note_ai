import { json } from '@sveltejs/kit';
import { canRead } from '$lib/server/permissions';
import { sql } from '$lib/server/db/postgres';
export async function GET({ locals, params }) { if (!(await canRead(locals.user, params.id))) return json({ error: 'Forbidden' }, { status: 403 }); return json({ blocks: await sql`SELECT id,block_index AS "blockIndex",block_type AS "blockType",block_text AS "blockText",created_by AS "createdBy",last_edited_by AS "lastEditedBy",created_at AS "createdAt",updated_at AS "updatedAt" FROM note_block WHERE note_id=${params.id} ORDER BY block_index` }); }
