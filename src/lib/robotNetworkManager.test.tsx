import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RobotNetworkManager } from './robotNetworkManager'

class Socket {
  static OPEN = 1
  static instances: Socket[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: {data: string}) => void) | null = null
  send = vi.fn()
  constructor(public url: string) { Socket.instances.push(this) }
  close() { this.readyState = 3; this.onclose?.() }
  open() { this.readyState = 1; this.onopen?.() }
}

beforeEach(() => { vi.useFakeTimers(); Socket.instances = []; vi.stubGlobal('WebSocket', Socket) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('multi-robot WebSocket connection', () => {
  it('uses the same-origin /ws endpoint by default', async () => {
    const manager = new RobotNetworkManager()
    const connecting = manager.connectToRoom('CITY')
    const socket = Socket.instances[0]
    const url = new URL(socket.url)
    expect(url.host).toBe(window.location.host)
    expect(url.pathname).toBe('/ws')
    socket.open()
    expect(await connecting).toBe(true)
    manager.disconnect()
  })
  it('uses WSS on HTTPS pages without forcing port 8080', async () => {
    vi.stubGlobal('window', {location:{href:'https://studio.example/app/',host:'studio.example'}})
    const manager = new RobotNetworkManager()
    const connecting = manager.connectToRoom('CITY')
    expect(new URL(Socket.instances[0].url).origin).toBe('wss://studio.example')
    Socket.instances[0].open(); await connecting
    manager.disconnect()
  })
  it('preserves configured URL parameters and safely encodes room IDs', async () => {
    const manager = new RobotNetworkManager('wss://robots.example/ws?token=test')
    const connecting = manager.connectToRoom('A&B')
    const socket = Socket.instances[0], url = new URL(socket.url)
    expect(url.searchParams.get('token')).toBe('test')
    expect(url.searchParams.get('roomId')).toBe('A&B')
    socket.open(); expect(await connecting).toBe(true)
    manager.disconnect()
  })
  it('times out stalled handshakes with an actionable error', async () => {
    const manager = new RobotNetworkManager('ws://localhost:8080'), error = vi.fn()
    manager.on('error', error)
    const connecting = manager.connectToRoom('CITY')
    await vi.advanceTimersByTimeAsync(8000)
    expect(await connecting).toBe(false)
    expect(error).toHaveBeenCalledWith(expect.objectContaining({error:expect.stringContaining('npm run server:network')}))
    manager.disconnect()
    await vi.advanceTimersByTimeAsync(10000)
    expect(Socket.instances).toHaveLength(1)
  })
  it('cancels retries and ignores stale close events after switching rooms', async () => {
    const manager = new RobotNetworkManager('ws://localhost:8080')
    const first = manager.connectToRoom('FIRST'), old = Socket.instances[0]
    old.open(); await first
    const second = manager.connectToRoom('SECOND'), current = Socket.instances[1]
    old.onclose?.()
    current.open(); expect(await second).toBe(true)
    expect(manager.isConnected()).toBe(true)
    expect(manager.getRoomId()).toBe('SECOND')
    manager.disconnect()
    await vi.advanceTimersByTimeAsync(20000)
    expect(Socket.instances).toHaveLength(2)
  })
  it('settles a connection that closes before opening', async () => {
    const manager = new RobotNetworkManager('ws://localhost:8080')
    const connecting = manager.connectToRoom('CITY')
    Socket.instances[0].close()
    expect(await connecting).toBe(false)
    manager.disconnect()
  })
})
