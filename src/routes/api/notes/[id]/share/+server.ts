import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sql } from '$lib/server/db/postgres';
import { canManage } from '$lib/server/permissions';

export async function GET({ locals, params }) {
  if (!(await canManage(locals.user, params.id))) return json({ error: 'Forbidden' }, { status: 403 });
  return json({ permissions: await sql`SELECT p.user_id AS "userId", u.username, u.display_name AS "displayName", p.permission FROM note_permission p JOIN app_user u ON u.id=p.user_id WHERE p.note_id=${params.id}` });
}

export async function POST({ locals, params, request }) {
  if (!locals.user || !(await canManage(locals.user, params.id))) return json({ error: 'Forbidden' }, { status: 403 });
  const { userId, permission } = await request.json();
  if (!['VIEW', 'EDIT'].includes(permission)) return json({ error: 'Invalid permission' }, { status: 400 });
  await sql`INSERT INTO note_permission(note_id,user_id,permission) VALUES (${params.id},${userId},${permission}) ON CONFLICT(note_id,user_id) DO UPDATE SET permission=excluded.permission`;
  await sql`INSERT INTO audit_log(id,note_id,user_id,action,diff_payload,search_text) VALUES(${randomUUID()},${params.id},${locals.user.id},'PERMISSION_CHANGE',${JSON.stringify({ userId, permission })},${String(userId)} || ' ' || ${permission})`;
  return json({ ok: true });
}

export async function DELETE({ locals, params, url }) {
  if (!locals.user || !(await canManage(locals.user, params.id))) return json({ error: 'Forbidden' }, { status: 403 });
  const userId = url.searchParams.get('userId');
  await sql`DELETE FROM note_permission WHERE note_id=${params.id} AND user_id=${userId}`;
  await sql`INSERT INTO audit_log(id,note_id,user_id,action,diff_payload,search_text) VALUES(${randomUUID()},${params.id},${locals.user.id},'PERMISSION_CHANGE',${JSON.stringify({ userId, permission: null })},${String(userId)} || ' revoked')`;
  return json({ ok: true });
}
