import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {spawn, type ChildProcess} from 'node:child_process'
import {createServer} from 'node:net'
import WebSocket from 'ws'

let server: ChildProcess
let port: number
const sockets: WebSocket[] = []

function next(socket: WebSocket, type: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage)
      reject(new Error(`Timeout waiting for ${type}`))
    }, 5000)
    function onMessage(raw: WebSocket.RawData) {
      const message = JSON.parse(raw.toString())
      if (message.type !== type) return
      clearTimeout(timer)
      socket.off('message', onMessage)
      resolve(message)
    }
    socket.on('message', onMessage)
  })
}

async function connect(id: string, room: string, create: boolean) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?clientId=${id}&roomId=${room}`)
  sockets.push(socket)
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  const joined = next(socket, 'room-joined')
  socket.send(JSON.stringify({type:create ? 'create-room' : 'join-room',password:'secret'}))
  await joined
  return socket
}

beforeAll(async () => {
  const listener = createServer()
  port = await new Promise<number>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen(0, '127.0.0.1', () => resolve((listener.address() as {port: number}).port))
  })
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()))
  server = spawn(process.execPath, ['--import', 'tsx', 'server/robotNetworkServer.ts'], {
    env:{...process.env, PORT:String(port)}, stdio:['ignore','pipe','pipe'],
  })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 10000)
    server.once('error', error => {clearTimeout(timer); reject(error)})
    server.once('exit', code => {clearTimeout(timer); reject(new Error(`Server exited: ${code}`))})
    server.stdout!.on('data', data => {
      if (String(data).includes('Waiting for connections')) {clearTimeout(timer); resolve()}
    })
  })
}, 15000)

afterAll(() => {
  sockets.forEach(socket => socket.terminate())
  server?.kill()
})

describe('robot WebSocket messages', () => {
  it('relays in both directions only to room peers and rejects invalid data', async () => {
    const a = await connect('a', 'FIRST', true)
    const missing = next(a, 'error')
    a.send(JSON.stringify({type:'robot-message',payload:'alone'}))
    expect((await missing).message).toContain('Không có robot')
    const b = await connect('b', 'FIRST', false)
    const other = await connect('c', 'SECOND', true)
    const leaked: unknown[] = []
    other.on('message', raw => {const msg = JSON.parse(raw.toString()); if (msg.type === 'robot-message') leaked.push(msg)})
    const received = next(b, 'robot-message')
    a.send(JSON.stringify({type:'robot-message',peerId:'forged',payload:'xin chào'}))
    expect(await received).toEqual({type:'robot-message',peerId:'a',payload:'xin chào'})
    const reverse = next(a, 'robot-message')
    b.send(JSON.stringify({type:'robot-message',payload:'x'.repeat(1024)}))
    expect(await reverse).toEqual({type:'robot-message',peerId:'b',payload:'x'.repeat(1024)})
    for (const payload of ['', 'é'.repeat(513), 42]) {
      const error = next(a, 'error')
      a.send(JSON.stringify({type:'robot-message',payload}))
      expect((await error).message).toContain('1024 byte')
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(leaked).toEqual([])
    const competition = next(a, 'competition-state')
    a.send(JSON.stringify({type:'competition-command',command:{action:'enable'}}))
    await competition
    const error = next(a, 'error')
    a.send(JSON.stringify({type:'robot-message',payload:'blocked'}))
    expect((await error).message).toContain('phiên thi')
  }, 15000)
})
