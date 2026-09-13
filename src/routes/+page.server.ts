import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');
  const notes = locals.user.role === 'ADMIN'
    ? await sql`SELECT n.id,n.title,n.content,n.version,n.updated_at AS "updatedAt" FROM note n WHERE n.deleted_at IS NULL ORDER BY n.updated_at DESC`
    : await sql`SELECT DISTINCT n.id,n.title,n.content,n.version,n.updated_at AS "updatedAt",CASE WHEN n.owner_id=${locals.user.id} THEN 'OWNER' ELSE p.permission END AS permission FROM note n LEFT JOIN note_permission p ON p.note_id=n.id AND p.user_id=${locals.user.id} WHERE n.deleted_at IS NULL AND (n.owner_id=${locals.user.id} OR p.user_id IS NOT NULL) ORDER BY n.updated_at DESC`;
  return { user: locals.user, notes };
};
