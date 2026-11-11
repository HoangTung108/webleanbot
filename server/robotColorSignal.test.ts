import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
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
  socket.send(JSON.stringify({ type: create ? 'create-room' : 'join-room', password: 'secret' }))
  const joinData = await joined
  return { socket, joinData }
}

beforeAll(async () => {
  const listener = createServer()
  port = await new Promise<number>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen(0, '127.0.0.1', () => resolve((listener.address() as { port: number }).port))
  })
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()))
  server = spawn(process.execPath, ['--import', 'tsx', 'server/robotNetworkServer.ts'], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 10000)
    server.once('error', error => { clearTimeout(timer); reject(error) })
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)) })
    server.stdout!.on('data', data => {
      if (String(data).includes('Waiting for connections')) { clearTimeout(timer); resolve() }
    })
  })
}, 15000)

afterAll(() => {
  sockets.forEach(socket => socket.terminate())
  server?.kill()
})

describe('Real Robot Color Signals over WebSocket', () => {
  it('exchanges color signals bidirectionally between 2 robots in the same room', async () => {
    const { socket: robot1 } = await connect('real-robot-1', 'COLOR_ROOM', true)

    // Cannot send color when alone in the room
    const missing = next(robot1, 'error')
    robot1.send(JSON.stringify({ type: 'color-signal', color: 'RED' }))
    expect((await missing).message).toContain('Không có robot khác')

    const { socket: robot2 } = await connect('real-robot-2', 'COLOR_ROOM', false)

    // Connect a robot to a different room to verify isolation
    const { socket: robot3 } = await connect('other-robot-3', 'OTHER_ROOM', true)
    const leaked: unknown[] = []
    robot3.on('message', raw => {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'color-signal') leaked.push(msg)
    })

    // Robot 1 sends RED to Robot 2
    const recvOn2 = next(robot2, 'color-signal')
    robot1.send(JSON.stringify({ type: 'color-signal', color: 'RED' }))
    const msg2 = await recvOn2
    expect(msg2.type).toBe('color-signal')
    expect(msg2.peerId).toBe('real-robot-1')
    expect(msg2.color).toBe('RED')
    expect(typeof msg2.timestamp).toBe('number')

    // Robot 2 sends BLUE back to Robot 1
    const recvOn1 = next(robot1, 'color-signal')
    robot2.send(JSON.stringify({ type: 'color-signal', color: 'blue' })) // test case-insensitivity
    const msg1 = await recvOn1
    expect(msg1.type).toBe('color-signal')
    expect(msg1.peerId).toBe('real-robot-2')
    expect(msg1.color).toBe('BLUE')

    // Query last color state via get-color-signal
    const lastColorRecv = next(robot1, 'color-signal')
    robot1.send(JSON.stringify({ type: 'get-color-signal' }))
    const lastColor = await lastColorRecv
    expect(lastColor.color).toBe('BLUE')

    // Ensure robot in OTHER_ROOM never received anything
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(leaked).toEqual([])
  })

  it('rejects invalid color signals with informative error', async () => {
    const { socket: robot1 } = await connect('err-robot-1', 'ERR_ROOM', true)
    await connect('err-robot-2', 'ERR_ROOM', false)

    const error1 = next(robot1, 'error')
    robot1.send(JSON.stringify({ type: 'color-signal', color: 'MAGENTA' }))
    expect((await error1).message).toContain('Tín hiệu màu không hợp lệ')

    const error2 = next(robot1, 'error')
    robot1.send(JSON.stringify({ type: 'color-signal', color: 12345 }))
    expect((await error2).message).toContain('Tín hiệu màu không hợp lệ')
  })

  it('supports WiFi robots via HTTP REST API (/api/rooms/:roomId/color) without USB', async () => {
    const baseUrl = `http://127.0.0.1:${port}`

    // 1. Initial GET returns WAITING and CORS headers
    const getInit = await fetch(`${baseUrl}/api/rooms/WIFI_ROOM/color?clientId=wifi-bot-1`)
    expect(getInit.status).toBe(200)
    expect(getInit.headers.get('access-control-allow-origin')).toBe('*')
    const initJson = await getInit.json()
    expect(initJson.ok).toBe(true)
    expect(initJson.roomId).toBe('WIFI_ROOM')
    expect(initJson.color).toBe('WAITING')
    expect(initJson.wifiPeers).toContain('wifi-bot-1')

    // 2. Connect a WebSocket peer to WIFI_ROOM to verify hybrid WS + WiFi REST broadcast
    const { socket: wsPeer } = await connect('ws-peer-1', 'WIFI_ROOM', false)
    const wsReceived = next(wsPeer, 'color-signal')

    // 3. WiFi robot POSTs color signal directly over HTTP
    const postRes = await fetch(`${baseUrl}/api/rooms/WIFI_ROOM/color`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: 'GREEN', senderRobotId: 'wifi-bot-1' }),
    })
    expect(postRes.status).toBe(200)
    const postJson = await postRes.json()
    expect(postJson.ok).toBe(true)
    expect(postJson.color).toBe('GREEN')
    expect(postJson.broadcastedTo).toBe(1)

    // WebSocket peer receives the broadcast from the WiFi robot
    const wsMsg = await wsReceived
    expect(wsMsg.color).toBe('GREEN')
    expect(wsMsg.senderRobotId).toBe('wifi-bot-1')

    // 4. Another WiFi robot polls GET /api/rooms/WIFI_ROOM/color
    const getAfter = await fetch(`${baseUrl}/api/rooms/WIFI_ROOM/color?clientId=wifi-bot-2`)
    const afterJson = await getAfter.json()
    expect(afterJson.color).toBe('GREEN')
    expect(afterJson.senderRobotId).toBe('wifi-bot-1')

    // 5. WebSocket peer sends YELLOW back; WiFi robot polls and sees YELLOW
    wsPeer.send(JSON.stringify({ type: 'color-signal', color: 'YELLOW' }))
    await new Promise(resolve => setTimeout(resolve, 40))
    const getFromWs = await fetch(`${baseUrl}/api/rooms/WIFI_ROOM/color`)
    const fromWsJson = await getFromWs.json()
    expect(fromWsJson.color).toBe('YELLOW')

    // 6. Invalid color via POST returns 400
    const badRes = await fetch(`${baseUrl}/api/rooms/WIFI_ROOM/color`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: 'INVALID_COLOR' }),
    })
    expect(badRes.status).toBe(400)
    const badJson = await badRes.json()
    expect(badJson.ok).toBe(false)
  })

  it('supports LeanbotIoT WiFi module endpoints (/api/iot/attribute) and syncs with WebSocket room', async () => {
    const baseUrl = `http://127.0.0.1:${port}`
    const { socket: wsPeer } = await connect('ws-iot-peer', 'IOT_ROOM', true)

    // Default attribute value is waiting
    const getInit = await fetch(`${baseUrl}/api/iot/attribute?assetId=IOT_ROOM&attribute=Color`)
    expect((await getInit.json()).value).toBe('waiting')

    // Robot WiFi module writes Color attribute via /api/iot/attribute
    const wsSignal = next(wsPeer, 'color-signal')
    const postIot = await fetch(`${baseUrl}/api/iot/attribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId: 'IOT_ROOM', attribute: 'Color', value: 'Purple', clientId: 'esp-robot-1' }),
    })
    expect(postIot.status).toBe(200)

    const msg = await wsSignal
    expect(msg.color).toBe('PURPLE')
    expect(msg.senderRobotId).toBe('esp-robot-1')

    // Reading back via /api/iot/attribute returns Purple
    const getAfter = await fetch(`${baseUrl}/api/iot/attribute?assetId=IOT_ROOM&attribute=Color`)
    expect((await getAfter.json()).value).toBe('Purple')
  })

  it('supports direct WiFi WebSocket auto-join mode (?mode=wifi)', async () => {
    const wifiWs1 = new WebSocket(`ws://127.0.0.1:${port}/ws?clientId=esp-ws-1&roomId=AUTO_WIFI&mode=wifi`)
    sockets.push(wifiWs1)
    const joined1 = await next(wifiWs1, 'room-joined')
    expect(joined1.roomId).toBe('AUTO_WIFI')

    const wifiWs2 = new WebSocket(`ws://127.0.0.1:${port}/ws?clientId=esp-ws-2&roomId=AUTO_WIFI&mode=wifi`)
    sockets.push(wifiWs2)
    await next(wifiWs2, 'room-joined')

    const recvOn2 = next(wifiWs2, 'color-signal')
    wifiWs1.send(JSON.stringify({ type: 'color-signal', color: 'BLUE' }))
    const signal = await recvOn2
    expect(signal.color).toBe('BLUE')
    expect(signal.peerId).toBe('esp-ws-1')
  })
})

