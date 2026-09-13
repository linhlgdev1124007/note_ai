import { WebSocketServer } from 'ws';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@db:5432/hello_world');
const rooms = new Map();
const wss = new WebSocketServer({ port: Number(process.env.REALTIME_PORT ?? 3001), host: '0.0.0.0' });
wss.on('connection', async (socket, request) => {
  const url = new URL(request.url, 'http://localhost'); const token = url.searchParams.get('token'); const noteId = url.searchParams.get('noteId');
  const users = await sql`SELECT user_id FROM realtime_ticket WHERE token=${token} AND expires_at>now()`;
  if (!users.length || !noteId) { socket.close(1008, 'Unauthorized'); return; }
  const room = rooms.get(noteId) ?? new Set(); rooms.set(noteId, room); room.add(socket);
  socket.on('message', (raw, isBinary) => { for (const peer of room) if (peer !== socket && peer.readyState === 1) peer.send(raw, { binary: isBinary }); });
  socket.on('close', () => { room.delete(socket); if (!room.size) rooms.delete(noteId); });
});
console.log(`Realtime WebSocket listening on ${process.env.REALTIME_PORT ?? 3001}`);
