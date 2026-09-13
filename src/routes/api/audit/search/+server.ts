import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
export async function POST({ locals, request }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const { query, noteId } = await request.json(); const term = String(query ?? '').trim(); const like = `%${term}%`; const safeNoteId = noteId ?? null;
  const rows = locals.user.role === 'ADMIN'
    ? await sql`SELECT a.id,a.note_id AS "noteId",n.title AS "noteTitle",a.action,a.search_text AS "searchText",a.diff_payload AS "diffPayload",a.created_at AS "createdAt",u.username,u.display_name AS "displayName" FROM audit_log a LEFT JOIN note n ON n.id=a.note_id LEFT JOIN app_user u ON u.id=a.user_id WHERE (${safeNoteId}::uuid IS NULL OR a.note_id=${safeNoteId}) AND (a.search_vector @@ websearch_to_tsquery('simple', ${term}) OR a.search_text ILIKE ${like} OR a.action ILIKE ${like} OR u.username ILIKE ${like}) ORDER BY a.created_at DESC LIMIT 50`
    : await sql`SELECT a.id,a.note_id AS "noteId",n.title AS "noteTitle",a.action,a.search_text AS "searchText",a.diff_payload AS "diffPayload",a.created_at AS "createdAt",u.username,u.display_name AS "displayName" FROM audit_log a JOIN note n ON n.id=a.note_id LEFT JOIN app_user u ON u.id=a.user_id LEFT JOIN note_permission p ON p.note_id=n.id AND p.user_id=${locals.user.id} WHERE (n.owner_id=${locals.user.id} OR p.user_id IS NOT NULL) AND (${safeNoteId}::uuid IS NULL OR a.note_id=${safeNoteId}) AND (a.search_vector @@ websearch_to_tsquery('simple', ${term}) OR a.search_text ILIKE ${like} OR a.action ILIKE ${like} OR u.username ILIKE ${like}) ORDER BY a.created_at DESC LIMIT 50`;
  return json({ results: rows });
}
