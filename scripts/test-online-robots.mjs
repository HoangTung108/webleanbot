import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const port = 18089;
const server = spawn(process.execPath, ['--import', 'tsx', 'server/robotNetworkServer.ts'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
const sockets = [];
function next(ws, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.off('message', handler); reject(new Error('Timeout: ' + type)); }, 5000);
    function handler(raw) { const msg = JSON.parse(raw); if (msg.type === type) { clearTimeout(timer); ws.off('message', handler); resolve(msg); } }
    ws.on('message', handler);
  });
}
async function connect(id, type, password = 'secret') {
  const ws = new WebSocket(`ws://localhost:${port}/ws?clientId=${id}&roomId=TEST`);
  sockets.push(ws);
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const response = next(ws, type === 'bad' ? 'error' : 'room-joined');
  ws.send(JSON.stringify({type: type === 'create' ? 'create-room' : 'join-room', password}));
  return {ws, message: await response};
}
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Server startup timeout')), 10000); server.stdout.on('data', data => { if (String(data).includes('Waiting for connections')) {clearTimeout(timer); resolve();} }); server.once('error', reject); });
  const a = await connect('a', 'create');
  const state = {pose: {x: 300, y: 400, heading: 90}, motorLeft: 100, motorRight: 100, timestamp: 1};
  a.ws.send(JSON.stringify({type: 'robot-state', state}));
  const b = await connect('b', 'join');
  assert.deepEqual(b.message.peers[0].state, state);
  const sync = next(a.ws, 'state-sync');
  b.ws.send(JSON.stringify({type: 'robot-state', state: {...state, pose: {...state.pose, x: 500}}}));
  assert.equal((await sync).state.pose.x, 500);
  const reverse = next(b.ws, 'state-sync');
  a.ws.send(JSON.stringify({type: 'robot-state', state}));
  assert.deepEqual((await reverse).state, state);
  assert.equal((await connect('c', 'bad')).message.message, 'Room is full');
  assert.equal((await connect('d', 'bad', 'wrong')).message.message, 'Incorrect password');
  const left = next(b.ws, 'peer-left'); a.ws.close(); await left;
  const replacement = await connect('e', 'join');
  assert.equal(replacement.message.robotId, 'Robot-1');
  assert.equal(replacement.message.peers[0].robotId, 'Robot-2');
  console.log('PASS: two-way sync, late join, capacity, password, slot reuse');
} finally { for (const ws of sockets) ws.close(); server.kill(); }
