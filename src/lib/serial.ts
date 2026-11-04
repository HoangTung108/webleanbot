import { LEANBOT_PROFILE } from '../leanbot/profile/leanbotDeviceProfile'
import type { UploadTransport } from '../leanbot/upload/transport'

type SerialPortInfo = { usbVendorId?: number; usbProductId?: number }
type SerialPortLike = {
  open(options: { baudRate: number; bufferSize?: number }): Promise<void>
  close(): Promise<void>
  getInfo?: () => SerialPortInfo
  readable?: ReadableStream<Uint8Array> | null
  writable?: WritableStream<Uint8Array> | null
  setSignals?: (signals: { dataTerminalReady?: boolean }) => Promise<void>
}

type SerialApi = {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPortLike>
  getPorts?(): Promise<SerialPortLike[]>
}

type NavigatorWithSerial = Navigator & { serial?: SerialApi }

function timeoutError() { return new Error('Hết thời gian chờ phản hồi từ Leanbot.') }
function abortError() { return new DOMException('Đã hủy thao tác serial.', 'AbortError') }

export class LeanbotSerialClient {
  port: SerialPortLike | null = null
  reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  onText: (value: string) => void = () => undefined
  onDisconnect: () => void = () => undefined
  private reading = false
  private monitorPromise: Promise<void> | null = null
  private uploadSession: { push(chunk: Uint8Array): void; fail(error: Error): void; close(): Promise<void> } | null = null
  private baudRate: number = LEANBOT_PROFILE.serial.baudRate
  private disconnecting = false
  private decoder = new TextDecoder()
  private lastDevice: SerialPortInfo | null = null

  get supported() { return Boolean((navigator as NavigatorWithSerial).serial) }
  get connected() { return Boolean(this.port?.readable && this.port?.writable) }

  async connect() {
    if (globalThis.isSecureContext !== true) throw new Error('Web Serial yêu cầu HTTPS hoặc localhost an toàn.')
    const api = (navigator as NavigatorWithSerial).serial
    if (!api) throw new Error('Web Serial không được hỗ trợ trên trình duyệt này.')
    this.port = await api.requestPort({ filters: [...LEANBOT_PROFILE.serial.filters] })
    await this.openSelectedPort()
    return this.lastDevice ?? {}
  }

  async reconnect() {
    if (this.connected) return this.lastDevice ?? {}
    const api = (navigator as NavigatorWithSerial).serial
    if (!api?.getPorts || !this.lastDevice) return this.connect()
    const ports = await api.getPorts()
    this.port = ports.find((candidate) => {
      const info = candidate.getInfo?.() ?? {}
      return info.usbVendorId === this.lastDevice?.usbVendorId && info.usbProductId === this.lastDevice?.usbProductId
    }) ?? null
    if (!this.port) return this.connect()
    await this.openSelectedPort()
    return this.lastDevice
  }

  private async openSelectedPort() {
    if (!this.port) throw new Error('Không có cổng Leanbot được chọn.')
    this.baudRate = LEANBOT_PROFILE.serial.baudRate
    await this.port.open({ baudRate: LEANBOT_PROFILE.serial.baudRate, bufferSize: LEANBOT_PROFILE.serial.bufferSize })
    await this.port.setSignals?.({ dataTerminalReady: true })
    this.lastDevice = this.port.getInfo?.() ?? null
    this.startReadLoop()
  }

  async disconnect() {
    const port = this.port
    this.disconnecting = true
    await this.uploadSession?.close()
    await this.stopReadLoop()
    try { await port?.close() } catch {}
    this.port = null
    this.disconnecting = false
    this.onDisconnect()
  }

  async send(text: string) {
    if (this.uploadSession) throw new Error('Cổng USB đang được dùng để nạp firmware.')
    if (!this.port?.writable) throw new Error('Leanbot chưa kết nối.')
    const writer = this.port.writable.getWriter()
    try { await writer.write(new TextEncoder().encode(text)) }
    finally { writer.releaseLock() }
  }

  async reset() {
    if (this.uploadSession) throw new Error('Đang nạp firmware; không thể reset thủ công.')
    if (!this.port?.setSignals) throw new Error('Cổng USB không hỗ trợ reset DTR.')
    await this.port.setSignals({ dataTerminalReady: false })
    await new Promise((resolve) => setTimeout(resolve, LEANBOT_PROFILE.serial.dtrPulseMs))
    await this.port.setSignals({ dataTerminalReady: true })
  }

  async createUploadTransport(): Promise<UploadTransport> {
    if (this.uploadSession) throw new Error('Đã có một phiên nạp firmware đang chạy.')
    if (!this.port?.readable || !this.port.writable) throw new Error('Leanbot chưa kết nối.')
    const port = this.port
    let writer = port.writable!.getWriter()
    let queue = new Uint8Array()
    let closed = false
    let error: Error | undefined
    const waiters = new Set<() => void>()
    const notify = () => { for (const wake of [...waiters]) wake() }
    const check = (signal?: AbortSignal) => {
      if (signal?.aborted) throw abortError()
      if (closed) throw new Error('Phiên nạp firmware đã đóng.')
      if (error) throw error
    }
    const wait = (timeoutMs: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); waiters.delete(wake); signal?.removeEventListener('abort', abort) }
      const wake = () => { cleanup(); resolve() }
      const abort = () => { cleanup(); reject(abortError()) }
      const timer = setTimeout(() => { cleanup(); reject(timeoutError()) }, Math.max(0,timeoutMs))
      waiters.add(wake); signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
    })
    const switchBaud = async (baudRate: number) => {
      if (this.baudRate === baudRate) return
      await this.stopReadLoop()
      writer.releaseLock()
      await port.close()
      await port.open({ baudRate, bufferSize: LEANBOT_PROFILE.serial.bufferSize })
      if (!port.writable || !port.readable) throw new Error('Không mở lại được cổng USB khi đổi baud.')
      writer = port.writable.getWriter()
      this.baudRate = baudRate
      queue = new Uint8Array()
      this.startReadLoop()
    }
    const close = async () => {
      if (closed) return
      closed = true; notify()
      try {
        if (!this.disconnecting && this.baudRate !== LEANBOT_PROFILE.serial.baudRate) await switchBaud(LEANBOT_PROFILE.serial.baudRate)
      } finally {
        try { writer.releaseLock() } catch { /* port may have been unplugged */ }
        this.uploadSession = null
        if (queue.length && !this.disconnecting) this.onText(this.decoder.decode(queue, { stream: true }))
        queue = new Uint8Array()
      }
    }
    // A single reader routes bytes to the monitor or this queue. Never cancel it
    // just to hand ownership to the uploader: ACK bytes must not be lost.
    this.decoder = new TextDecoder()
    this.uploadSession = {
      push: chunk => {
        const next = new Uint8Array(queue.length + chunk.length)
        next.set(queue); next.set(chunk,queue.length); queue = next
        if (queue.length > 131072) error = new Error('Bộ đệm USB bị tràn trong khi nạp firmware.')
        notify()
      },
      fail: reason => { error = reason; notify() }, close,
    }
    if (!this.reading) this.startReadLoop()
    return {
      write: async data => { check(); await writer.write(data) },
      read: async (length,timeoutMs,signal) => {
        check(signal)
        const deadline = Date.now()+timeoutMs
        while (queue.length < length) {
          check(signal)
          const remaining=deadline-Date.now(); if (remaining<=0) throw timeoutError()
          await wait(remaining,signal)
        }
        check(signal)
        const result=queue.slice(0,length); queue=queue.slice(length); return result
      },
      setDtr: async value => {
        check()
        if (!port.setSignals) throw new Error('Cổng USB không hỗ trợ tín hiệu DTR để vào bootloader.')
        await port.setSignals({ dataTerminalReady:value })
      },
      setBaudRate: async baudRate => { check(); await switchBaud(baudRate) },
      flush: async (durationMs,signal) => {
        check(signal); queue=new Uint8Array()
        const deadline=Date.now()+durationMs
        while(Date.now()<deadline) {
          check(signal)
          try { await wait(deadline-Date.now(),signal) }
          catch(e) { check(signal); if (e instanceof DOMException && e.name==='AbortError') throw e; break }
          queue=new Uint8Array()
        }
        queue=new Uint8Array()
      }, close,
    }
  }

  private startReadLoop() {
    if (!this.port?.readable || this.reading) return
    this.reading = true
    const port = this.port
    this.monitorPromise = (async () => {
      let failure: unknown
      while (this.reading && this.port === port && port.readable) {
        const stream = port.readable
        const reader = stream.getReader()
        this.reader = reader
        try {
          while (this.reading) {
            const { value, done } = await reader.read()
            if (done) break
            if (value?.length) {
              if (this.uploadSession) this.uploadSession.push(value)
              else this.onText(this.decoder.decode(value, { stream: true }))
            }
          }
        } catch (e) { failure = e }
        finally {
          try { reader.releaseLock() } catch { /* already released */ }
          if (this.reader === reader) this.reader = null
        }
        if (!this.reading || port.readable === stream) break
        // Web Serial may replace its readable stream after a recoverable error.
      }
      if (this.reading) {
        this.reading = false
        this.uploadSession?.fail(new Error(`Không đọc được dữ liệu USB${failure instanceof Error ? `: ${failure.message}` : '.'}`))
        this.onDisconnect()
      }
    })()
  }

  private async stopReadLoop() {
    this.reading = false
    try { await this.reader?.cancel() } catch {}
    await this.monitorPromise?.catch(() => undefined)
    this.monitorPromise = null
  }
}
