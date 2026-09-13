import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sql } from '$lib/server/db/postgres';
import { canEdit, canRead } from '$lib/server/permissions';
import { reindexNote } from '$lib/server/rag';
import { syncBlocks } from '$lib/server/blocks';

export async function PUT({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canEdit(locals.user, params.id))) return json({ error: 'Forbidden' }, { status: 403 });
  const { title, content, version } = await request.json();
  const current = await sql`SELECT title, content, version FROM note WHERE id=${params.id}`;
  if (!current[0] || current[0].version !== version) return json({ error: 'Conflict', current: current[0] }, { status: 409 });
  if (current[0].title === title && current[0].content === content) return json({ version: current[0].version, unchanged: true });
  const next = Number(version) + 1;
  const rows = await sql`UPDATE note SET title=${title}, content=${content}, version=${next}, summary_status='STALE', updated_at=now() WHERE id=${params.id} AND version=${version} RETURNING version`;
  await reindexNote(params.id, content, locals.user.id);
  await syncBlocks(params.id, content, locals.user.id);
  await sql`INSERT INTO note_revision(id,note_id,version,snapshot,created_by) VALUES(${randomUUID()},${params.id},${next},${JSON.stringify({ title, content })},${locals.user.id})`;
  await sql`INSERT INTO audit_log(id,note_id,user_id,action,diff_payload,search_text) VALUES(${randomUUID()},${params.id},${locals.user.id},'UPDATE',${JSON.stringify({ old: current[0], new: { title, content } })},${String(current[0].content)} || ' ' || ${String(content)})`;
  return json({ version: rows[0].version });
}

export async function DELETE({ locals, params }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canRead(locals.user, params.id)) || (locals.user.role !== 'ADMIN' && !(await canEdit(locals.user, params.id)))) return json({ error: 'Forbidden' }, { status: 403 });
  await sql`UPDATE note SET deleted_at=now(), deleted_by=${locals.user.id} WHERE id=${params.id}`;
  await sql`INSERT INTO audit_log(id,note_id,user_id,action,search_text) VALUES(${randomUUID()},${params.id},${locals.user.id},'DELETE','deleted note')`;
  return json({ ok: true });
}
