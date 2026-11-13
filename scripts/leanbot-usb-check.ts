import { spawn } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { createInterface } from 'node:readline'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Stk500Uploader } from '../src/leanbot/upload/stk500'
import { decodeIntelHex } from '../src/leanbot/upload/intelHex'
import type { UploadTransport } from '../src/leanbot/upload/transport'

const port = process.argv[process.argv.indexOf('--port') + 1]
if (!process.argv.includes('--port') || !/^\/dev\/(cu|tty)\.usb[^/]+$/.test(port)) throw new Error('Specify the identified USB device with --port /dev/cu.usbserial-...')
const folder = join(tmpdir(), `leanbot-usb-check-${Date.now()}`)
await mkdir(folder, { recursive: true })
const lines: string[] = []
const log = (text: string) => { const line = `${new Date().toISOString()} ${text}`; lines.push(line); console.log(line) }
let driver: ReturnType<typeof spawn> | undefined
let request: ((op: string, args?: object) => Promise<any>) | undefined
let verified = false
let baud = 115200
try {
  const source = await readFile(fileURLToPath(new URL('../diagnostics/LeanbotUsbCheck.ino', import.meta.url)), 'utf8')
  log('Compiling diagnostic firmware with Leanbot Cloud...')
  const response = await fetch('https://cs.leanbot.space/v3/compile', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fqbn: 'arduino:avr:nano:cpu=atmega328', files: [{ name: 'LeanbotSketch/LeanbotSketch.ino', content: source }], flags: { verbose: false, preferLocal: false }, libs: [] }),
    signal: AbortSignal.timeout(90000),
  })
  const result = await response.json() as { hex?: string; log?: string }
  await writeFile(join(folder, 'compiler.log'), result.log ?? '')
  if (!response.ok || !result.hex) throw new Error(`Compiler HTTP ${response.status}: ${result.log ?? 'no firmware'}`)
  const hex = result.hex.trim().startsWith(':') ? result.hex : Buffer.from(result.hex, 'base64').toString('utf8')
  const memory = decodeIntelHex(hex)
  if (!memory.size) throw new Error('Compiler returned empty firmware')
  await writeFile(join(folder, 'firmware.hex'), hex)
  log(`Firmware compiled: ${memory.size} flash bytes. Opening ${port}.`)

  driver = spawn('python3', [fileURLToPath(new URL('./leanbot-native-serial.py', import.meta.url))], { stdio: ['pipe','pipe','pipe'] })
  let nextId = 0
  const pending = new Map<number, { resolve(value: any): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>()
  const reader = createInterface({ input: driver.stdout! })
  reader.on('line', line => {
    const value = JSON.parse(line), waiter = pending.get(value.id)
    if (!waiter) return
    pending.delete(value.id); clearTimeout(waiter.timer)
    if (value.ok) waiter.resolve(value); else waiter.reject(new Error(value.error))
  })
  driver.stderr!.on('data', chunk => log(`Driver: ${String(chunk).trim()}`))
  driver.on('exit', code => { for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error(`Serial driver exited (${code})`)) }; pending.clear() })
  request = (op, args = {}) => new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Serial driver timeout: ${op}`)) }, 10000)
    pending.set(id, { resolve, reject, timer })
    driver!.stdin!.write(JSON.stringify({ id, op, ...args }) + '\n')
  })
  await request('open', { port, baud })
  const transport: UploadTransport = {
    write: async bytes => { await request!('write', { data: Buffer.from(bytes).toString('base64') }) },
    read: async (length, timeout, signal) => {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      const reply = await request!('read', { length, timeout })
      return Uint8Array.from(Buffer.from(reply.data, 'base64'))
    },
    flush: async duration => { await request!('flush', { duration }) },
    setDtr: async value => { await request!('dtr', { value }) },
    setBaudRate: async value => { baud = value; log(`USB baud ${value}`); await request!('baud', { value }) },
    close: async () => { await request!('baud', { value: 115200 }) },
  }
  if (process.argv.includes('--legacy')) {
    const legacySource = await readFile(fileURLToPath(new URL('../public/leanbot-ide/LeanbotSerial.js', import.meta.url)), 'utf8')
    const context: Record<string, any> = {
      Uint8Array, performance, setTimeout, clearTimeout,
      sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
      console: { log: (...args: unknown[]) => log(args.map(String).join(' ')), error: (...args: unknown[]) => log(args.map(String).join(' ')) },
    }
    runInNewContext(legacySource.replace(/^import .*$/gm, '').replace('export class LeanbotSerial', 'class LeanbotSerial') + '\nglobalThis.DiagnosticUploader = Uploader;', context)
    context.DiagnosticUploader.setConfig({pageSizeByte:128, syncIntervalMs:250, getSyncTimeoutMs:1500, loadAddressTimeoutMs:1500, writeFlashTimeoutMs:750, readFlashTimeoutMs:750})
    const uploader = new context.DiagnosticUploader({
      isConnected: () => true,
      resetLeanbot: async () => { await transport.setDtr(false); await new Promise(resolve => setTimeout(resolve, 10)); await transport.setDtr(true) },
      flushSerialReader: () => transport.flush(100),
      SerialSend: (bytes: Uint8Array) => transport.write(bytes),
      waitForSerialData: (length: number, timeout: number) => transport.read(length, timeout),
    })
    const outcome = await uploader.upload2(Promise.resolve({hexText:hex}))
    if (!outcome.success) throw new Error(outcome.exception)
    await transport.write(Uint8Array.from([0x51,0x20]))
    const ack = await transport.read(2,1500)
    if (ack[0] !== 0x14 || ack[1] !== 0x10) throw new Error('Invalid LEAVE_PROGMODE ACK')
  } else {
    await new Stk500Uploader(transport, {
      onMessage: log,
      onProgress: (phase, progress) => { if (phase !== 'uploading' && phase !== 'verifying' || progress === 1) log(`${phase}: ${Math.round(progress * 100)}%`) },
    }).upload(hex)
  }
  verified = true
  log('Firmware readback verified. Checking serial heartbeat and bidirectional USB at 115200...')
  const text: number[] = []
  const deadline = Date.now() + 8000
  let prompted = false
  while (Date.now() < deadline) {
    try {
      const reply = await request('read', { length: 1, timeout: 1000 })
      text.push(...Buffer.from(reply.data, 'base64'))
      const output = Buffer.from(text).toString('utf8')
      if (output.includes('LEANBOT_USB_CHECK') && !prompted) { await request('write', { data: Buffer.from('?').toString('base64') }); prompted = true }
      if (output.includes('LEANBOT_USB_ECHO_OK') && output.includes('LEANBOT_USB_CHECK_OK')) break
    } catch (error) { if (!(error instanceof Error && error.message.includes('timeout'))) throw error }
  }
  const output = Buffer.from(text).toString('utf8')
  log(`Serial output:\n${output}`)
  if (!output.includes('LEANBOT_USB_ECHO_OK') || !output.includes('LEANBOT_USB_CHECK_OK')) throw new Error('Firmware verified, but expected USB heartbeat/echo was not received')
  log('PASS: compiled, uploaded, flash verified, heartbeat received, USB echo received.')
} catch (error) {
  log(`FAIL: ${error instanceof Error ? error.message : String(error)} (flashVerified=${verified}, bootloaderBaud=${baud})`)
  process.exitCode = 1
} finally {
  if (request) { try { await request('close') } catch {} }
  driver?.stdin?.end()
  await writeFile(join(folder, 'usb-check.log'), lines.join('\n') + '\n')
  log(`Diagnostic files: ${folder}`)
}
