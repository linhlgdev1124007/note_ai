import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => { if (!locals.user) throw redirect(303, '/login'); if (locals.user.role !== 'ADMIN') throw redirect(303, '/'); const users = await sql`SELECT id,username,display_name AS "displayName",role,status,color_code AS "colorCode",created_at AS "createdAt" FROM app_user ORDER BY created_at`; return { users }; };
