import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sql, initDb } from './db/postgres';
const scrypt = promisify(nodeScrypt);
const colors = ['#22d3ee', '#a78bfa', '#fb7185', '#34d399', '#fbbf24'];

export async function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const key = await scrypt(password, salt, 64) as Buffer; return `${salt}:${key.toString('hex')}`; }
export async function verifyPassword(password: string, stored: string) { const [salt, value] = stored.split(':'); const key = await scrypt(password, salt, 64) as Buffer; return timingSafeEqual(key, Buffer.from(value, 'hex')); }
export async function createSession(userId: string) { await initDb(); const token = randomBytes(32).toString('hex'); await sql`INSERT INTO session (token, user_id, expires_at) VALUES (${token}, ${userId}, now() + interval '7 days')`; return token; }
export async function currentUser(token: string | undefined): Promise<{ id: string; username: string; displayName: string; role: string; colorCode: string } | null> { if (!token) return null; await initDb(); const rows = await sql`SELECT u.id, u.username, u.display_name AS "displayName", u.role, u.color_code AS "colorCode" FROM session s JOIN app_user u ON u.id=s.user_id WHERE s.token=${token} AND s.expires_at > now() AND u.status='ACTIVE'`; const user = rows[0]; return user ? { id: String(user.id), username: String(user.username), displayName: String(user.displayName), role: String(user.role), colorCode: String(user.colorCode) } : null; }
export async function seedAdmin() { await initDb(); const rows = await sql`SELECT id FROM app_user LIMIT 1`; if (!rows.length) await sql`INSERT INTO app_user (id, username, display_name, password_hash, role, color_code) VALUES (${randomUUID()}, 'admin', 'Administrator', ${await hashPassword('admin123')}, 'ADMIN', ${colors[0]})`; }
