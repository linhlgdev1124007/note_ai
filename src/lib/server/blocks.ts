import { createHash } from 'node:crypto';
import { sql } from './db/postgres';
export async function syncBlocks(noteId: string, html: string, userId: string) {
  const matches = [...html.matchAll(/<(p|h[1-6]|li|blockquote|pre)[^>]*>([\s\S]*?)<\/\1>/gi)];
  const blocks = matches.map((match, index) => ({ id: `block_${createHash('sha1').update(`${noteId}:${index}:${match[2]}`).digest('hex').slice(0, 16)}`, type: match[1].toLowerCase(), text: match[2].replace(/<[^>]+>/g, '').trim(), index })).filter((block) => block.text);
  for (const block of blocks) await sql`INSERT INTO note_block(id,note_id,block_index,block_type,block_text,created_by,last_edited_by) VALUES(${block.id},${noteId},${block.index},${block.type},${block.text},${userId},${userId}) ON CONFLICT(id) DO UPDATE SET block_text=excluded.block_text,last_edited_by=${userId},updated_at=now()`;
}
