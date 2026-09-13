import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sql } from '$lib/server/db/postgres';
import { canManage } from '$lib/server/permissions';
import { reindexNote } from '$lib/server/rag';
export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canManage(locals.user, params.id))) return json({ error: 'Forbidden' }, { status: 403 });
  const { revisionId } = await request.json();
  const revision = await sql`SELECT snapshot FROM note_revision WHERE id=${revisionId} AND note_id=${params.id}`;
  if (!revision[0]) return json({ error: 'Revision not found' }, { status: 404 });
  const snapshot = JSON.parse(revision[0].snapshot); const current = await sql`SELECT version FROM note WHERE id=${params.id}`; const version = Number(current[0].version) + 1;
  await sql`UPDATE note SET title=${snapshot.title},content=${snapshot.content},version=${version},updated_at=now() WHERE id=${params.id}`;
  await reindexNote(params.id, snapshot.content, locals.user.id);
  await sql`INSERT INTO note_revision(id,note_id,version,snapshot,created_by) VALUES(${randomUUID()},${params.id},${version},${JSON.stringify(snapshot)},${locals.user.id})`;
  await sql`INSERT INTO audit_log(id,note_id,user_id,action,diff_payload,search_text) VALUES(${randomUUID()},${params.id},${locals.user.id},'RESTORE',${JSON.stringify({ revisionId, snapshot })},${String(snapshot.content)})`;
  return json({ version });
}
