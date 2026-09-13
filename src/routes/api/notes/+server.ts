import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sql } from '$lib/server/db/postgres';

export async function GET({ locals }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const notes = locals.user.role === 'ADMIN'
    ? await sql`SELECT n.id,n.title,n.content,n.version,n.owner_id AS "ownerId",n.updated_at AS "updatedAt",'OWNER' AS permission FROM note n WHERE n.deleted_at IS NULL ORDER BY n.updated_at DESC`
    : await sql`SELECT DISTINCT n.id,n.title,n.content,n.version,n.owner_id AS "ownerId",n.updated_at AS "updatedAt",CASE WHEN n.owner_id=${locals.user.id} THEN 'OWNER' ELSE p.permission END AS permission FROM note n LEFT JOIN note_permission p ON p.note_id=n.id AND p.user_id=${locals.user.id} WHERE n.deleted_at IS NULL AND (n.owner_id=${locals.user.id} OR p.user_id IS NOT NULL) ORDER BY n.updated_at DESC`;
  return json({ notes });
}

export async function POST({ locals, request }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const { title = 'Untitled Note', content = '' } = await request.json();
  if (String(title).length > 300 || String(content).length > 200000) return json({ error: 'Note content too large' }, { status: 400 });
  const id = randomUUID();
  await sql`INSERT INTO note (id,title,content,owner_id) VALUES (${id},${title},${content},${locals.user.id})`;
  return json({ id }, { status: 201 });
}
