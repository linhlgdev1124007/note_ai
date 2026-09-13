import WebSocket from 'ws';
import * as Y from 'yjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
if (!login.ok) throw new Error(`login failed: ${login.status}`);
const cookie = login.headers.get('set-cookie')?.split(';')[0];
const note = await fetch(`${base}/api/notes`, { headers: { cookie } });
const notes = await note.json();
let noteId = notes.notes?.[0]?.id;
if (!noteId) {
  const created = await fetch(`${base}/api/notes`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Realtime smoke fixture', content: '' }) });
  noteId = (await created.json()).id;
}
if (!noteId) throw new Error('could not create realtime fixture note');
async function connect() {
  const ticket = await fetch(`${base}/api/realtime-ticket`, { method: 'POST', headers: { cookie } });
  const { token } = await ticket.json();
  const socket = new WebSocket(`ws://localhost:3001/?token=${token}&noteId=${noteId}`);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return socket;
}
const first = await connect();
const second = await connect();
const source = new Y.Doc();
const text = source.getText('note');
text.insert(0, 'realtime-smoke');
const received = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('realtime update timeout')), 5000);
  second.once('message', (data) => { clearTimeout(timer); const target = new Y.Doc(); Y.applyUpdate(target, data); resolve(target.getText('note').toString()); });
});
first.send(Y.encodeStateAsUpdate(source));
const value = await received;
first.close(); second.close();
if (value !== 'realtime-smoke') throw new Error(`unexpected Yjs value: ${value}`);
console.log('Realtime smoke test passed: Yjs update relayed between two clients');
