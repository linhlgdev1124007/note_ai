import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db/postgres';
export async function GET() { try { await sql`SELECT 1`; return json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() }); } catch { return json({ status: 'error', database: 'unavailable' }, { status: 503 }); } }
