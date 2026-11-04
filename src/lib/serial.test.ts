import { afterEach, describe, expect, it, vi } from 'vitest'
import { LEANBOT_PROFILE } from '../leanbot/profile/leanbotDeviceProfile'
import { LeanbotSerialClient } from './serial'
import { uploadHex } from '../leanbot/upload/stk500'

afterEach(() => vi.unstubAllGlobals())

describe('LeanbotSerialClient', () => {
  it('opens only verified Leanbot USB adapters with the reference serial settings', async () => {
    const open = vi.fn(async () => undefined)
    const setSignals = vi.fn(async () => undefined)
    const close = vi.fn(async () => undefined)
    const port = {
      open,
      close,
      setSignals,
      getInfo: () => ({ usbVendorId: 0x1a86, usbProductId: 0x7523 }),
      readable: new ReadableStream<Uint8Array>({ start(controller) { controller.close() } }),
      writable: new WritableStream<Uint8Array>(),
    }
    const requestPort = vi.fn(async () => port)
    vi.stubGlobal('navigator', { serial: { requestPort, getPorts: vi.fn(async () => [port]) } })
    vi.stubGlobal('isSecureContext', true)

    const client = new LeanbotSerialClient()
    await client.connect()

    expect(requestPort).toHaveBeenCalledWith({ filters: LEANBOT_PROFILE.serial.filters })
    expect(open).toHaveBeenCalledWith({ baudRate: 115200, bufferSize: 2048 })
    expect(setSignals).toHaveBeenCalledWith({ dataTerminalReady: true })
    await client.disconnect()
    expect(close).toHaveBeenCalled()
  })

  it('does not open Web Serial outside a secure context', async () => {
    vi.stubGlobal('navigator', { serial: { requestPort: vi.fn() } })
    vi.stubGlobal('isSecureContext', false)
    await expect(new LeanbotSerialClient().connect()).rejects.toThrow(/HTTPS/)
  })
})


function livePort(reply?: (data: Uint8Array) => number[]) {
  let input!: ReadableStreamDefaultController<Uint8Array>
  const cancel=vi.fn(),writes:Uint8Array[]=[]
  const port={
    open:vi.fn(async (_options: {baudRate:number;bufferSize?:number})=>{
      port.readable=new ReadableStream<Uint8Array>({start(c){input=c},cancel})
      port.writable=new WritableStream<Uint8Array>({write(chunk){
        writes.push(chunk)
        const response=reply?.(chunk)
        if(response) { input.enqueue(Uint8Array.from(response.slice(0,1))); input.enqueue(Uint8Array.from(response.slice(1))); }
      }})
    }),
    close:vi.fn(async()=>{port.readable=null;port.writable=null}),
    setSignals:vi.fn(async()=>{}),getInfo:()=>({usbVendorId:0x1a86,usbProductId:0x7523}),
    readable:null as ReadableStream<Uint8Array>|null,writable:null as WritableStream<Uint8Array>|null,
  }
  vi.stubGlobal('navigator',{serial:{requestPort:async()=>port}});vi.stubGlobal('isSecureContext',true)
  return {port,cancel,writes,enqueue:(bytes:number[]|string)=>input.enqueue(typeof bytes==='string'?new TextEncoder().encode(bytes):Uint8Array.from(bytes)),end:()=>input.close()}
}
const turn=()=>new Promise(resolve=>setTimeout(resolve,0))
describe('serial handoff between monitor and bootloader',()=>{
  it('preserves one reader across upload, receives split ACKs and resumes monitor text',async()=>{
    const usb=livePort(),client=new LeanbotSerialClient(),text=vi.fn();client.onText=text
    await client.connect();usb.enqueue('ready');await turn();expect(text).toHaveBeenCalledWith('ready')
    const reader=client.reader,transport=await client.createUploadTransport()
    expect(client.reader).toBe(reader);expect(usb.cancel).not.toHaveBeenCalled()
    const response=transport.read(2,1000);usb.enqueue([0x14]);await turn();usb.enqueue([0x10]);
    expect(await response).toEqual(Uint8Array.from([0x14,0x10]))
    await expect(client.send('must not mix into upload')).rejects.toThrow('nạp firmware')
    await transport.close();await transport.close();usb.enqueue('after upload');await turn()
    expect(text).toHaveBeenLastCalledWith('after upload');expect(usb.cancel).not.toHaveBeenCalled()
    await client.disconnect();expect(usb.cancel).toHaveBeenCalledTimes(1)
  })
  it('times out without losing subsequent bytes and aborts pending protocol reads',async()=>{
    const usb=livePort(),client=new LeanbotSerialClient();await client.connect();const transport=await client.createUploadTransport()
    await expect(transport.read(2,5)).rejects.toThrow('thời gian')
    const result=transport.read(2,1000);usb.enqueue([0x14,0x10]);expect(await result).toEqual(Uint8Array.from([0x14,0x10]))
    const abort=new AbortController(),pending=transport.read(1,1000,abort.signal);abort.abort()
    await expect(pending).rejects.toMatchObject({name:'AbortError'})
    await transport.close();await client.disconnect()
  })
  it('changes baud on the same port and restores monitor baud when the lease closes',async()=>{
    const usb=livePort(),client=new LeanbotSerialClient();await client.connect();const transport=await client.createUploadTransport()
    await transport.setBaudRate!(57600)
    expect(usb.port.open).toHaveBeenLastCalledWith({baudRate:57600,bufferSize:2048})
    const result=transport.read(2,1000);usb.enqueue([0x14,0x10]);expect(await result).toHaveLength(2)
    await transport.close();expect(usb.port.open).toHaveBeenLastCalledWith({baudRate:115200,bufferSize:2048})
    await client.disconnect()
  })
  it('fails reads immediately if USB closes and rejects simultaneous upload leases',async()=>{
    const usb=livePort(),client=new LeanbotSerialClient();await client.connect();const transport=await client.createUploadTransport()
    await expect(client.createUploadTransport()).rejects.toThrow('phiên nạp')
    const pending=transport.read(2,1000);usb.end()
    await expect(pending).rejects.toThrow('USB');await transport.close();await client.disconnect()
  })
  it('programs and verifies address zero through the real serial transport, then returns to the monitor',async()=>{
    const memory=new Uint8Array(32768).fill(0xff);let address=0
    const usb=livePort(data=>{
      if(data[0]===0x55)address=((data[2]<<8)|data[1])*2
      if(data[0]===0x64)memory.set(data.slice(4,-1),address)
      if(data[0]===0x74)return [0x14,...memory.slice(address,address+((data[1]<<8)|data[2])),0x10]
      if(data[0]===0x30)return [0x42,0x4f,0x4f,0x54,0x14,0x10]
      if(data[0]===0x51)return [0x14,0x10,...new TextEncoder().encode('app ready')]
      return [0x14,0x10]
    })
    const client=new LeanbotSerialClient(),text=vi.fn();client.onText=text;await client.connect()
    const transport=await client.createUploadTransport()
    await uploadHex(transport,':0400000001020304F2\n:00000001FF')
    await turn()
    expect(memory.slice(0,4)).toEqual(Uint8Array.from([1,2,3,4]))
    expect(memory[32256]).toBe(0xff)
    expect(usb.writes.find(packet=>packet[0]===0x55)).toEqual(Uint8Array.from([0x55,0,0,0x20]))
    expect(text.mock.calls.map(call=>call[0]).join('')).toBe('app ready')
    expect(usb.cancel).not.toHaveBeenCalled()
    await client.disconnect()
  })

})
