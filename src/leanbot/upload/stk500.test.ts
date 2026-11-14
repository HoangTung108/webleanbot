import { describe, expect, it } from 'vitest'
import { Stk500Uploader, UploadProtocolError } from './stk500'
import type { UploadTransport } from './transport'

const HEX = ':0400000001020304F2\n:00000001FF'

class FakeTransport implements UploadTransport {
  writes: Uint8Array[] = []
  dtr: boolean[] = []
  flushes: number[] = []
  closed = false
  currentAddress = 0
  memory = new Uint8Array(32768).fill(0xff)
  corruptVerify = false
  response: number[] = []

  async write(data: Uint8Array) {
    this.writes.push(data)
    if (data[0] === 0x55) this.currentAddress = ((data[2] << 8) | data[1]) << 1
    if (data[0] === 0x64) this.memory.set(data.slice(4, -1), this.currentAddress)
    if (data[0] === 0x74) {
      const length=(data[1]<<8)|data[2]
      const payload=this.memory.slice(this.currentAddress,this.currentAddress+length)
      if(this.corruptVerify)payload[0]^=0xff
      this.response=[0x14,...payload,0x10]
    } else this.response=[0x14,0x10]
  }

  async read(length: number) {
    if(this.response.length<length)throw new Error('fake serial timeout')
    return Uint8Array.from(this.response.splice(0,length))
  }

  async setDtr(value: boolean) { this.dtr.push(value) }
  async flush(durationMs: number) { this.flushes.push(durationMs) }
  async close() { this.closed = true }
}

describe('STK500v1 Leanbot uploader', () => {
  it('resets, syncs, writes 128-byte pages, verifies, and leaves programming mode', async () => {
    const transport = new FakeTransport()
    const states: string[] = []

    await new Stk500Uploader(transport, { onProgress: (state) => states.push(state) }).upload(HEX)

    expect(transport.dtr.slice(0, 2)).toEqual([false, true])
    expect(transport.flushes).toEqual([100])
    expect(transport.writes.map((packet) => packet[0])).toEqual(expect.arrayContaining([0x30, 0x55, 0x64, 0x74, 0x51]))
    expect(transport.writes.find((packet) => packet[0] === 0x64)?.length).toBe(133)
    expect(states).toEqual(expect.arrayContaining(['resetting', 'syncing', 'uploading', 'verifying', 'done']))
    expect(transport.closed).toBe(true)
  })

  it('reports VERIFY_ERROR without claiming success and releases the port', async () => {
    const transport = new FakeTransport()
    transport.corruptVerify = true

    await expect(new Stk500Uploader(transport).upload(HEX)).rejects.toMatchObject({ code: 'VERIFY_ERROR' } satisfies Partial<UploadProtocolError>)
    expect(transport.closed).toBe(true)
  })
  it('explains constant 0x62 readback and never reports a verified upload', async () => {
    class ConstantReadback extends FakeTransport {
      async write(data: Uint8Array) {
        await super.write(data)
        if(data[0]===0x74)this.response=[0x14,...Array((data[1]<<8)|data[2]).fill(0x62),0x10]
      }
    }
    const transport=new ConstantReadback(), states:string[]=[]
    await expect(new Stk500Uploader(transport,{onProgress:state=>states.push(state)}).upload(HEX))
      .rejects.toMatchObject({code:'VERIFY_ERROR',message:expect.stringContaining('USBasp hoặc Arduino as ISP')})
    expect(states).not.toContain('done')
    expect(transport.closed).toBe(true)
  })

  it('releases the port without flashing when firmware is malformed', async () => {
    const transport = new FakeTransport()
    await expect(new Stk500Uploader(transport).upload('not Intel HEX')).rejects.toThrow()
    expect(transport.closed).toBe(true)
    expect(transport.writes).toHaveLength(0)
  })

  it('skips startup noise and does not require ENTER_PROGMODE', async () => {
    class Noisy extends FakeTransport {
      async write(data: Uint8Array) {
        if(data[0]===0x50)throw new Error('unsupported by reference bootloader')
        await super.write(data)
        if(data[0]===0x30)this.response.unshift(0x00,0x41,0x42)
      }
    }
    const transport=new Noisy()
    await new Stk500Uploader(transport).upload(HEX)
    expect(transport.memory.slice(0,4)).toEqual(Uint8Array.from([1,2,3,4]))
    expect(transport.writes.some(packet=>packet[0]===0x50)).toBe(false)
    expect(transport.writes.find(packet=>packet[0]===0x55)).toEqual(Uint8Array.from([0x55,0,0,0x20]))
  })
  it('resets again after a failed sync and can fall back to a 57600 baud bootloader', async () => {
    class Legacy extends FakeTransport {
      baud=115200; rates:number[]=[]
      async setBaudRate(baud: number) {this.baud=baud;this.rates.push(baud)}
      async write(data: Uint8Array) {
        await super.write(data)
        if(data[0]===0x30 && this.baud===115200)this.response=[]
      }
    }
    const transport=new Legacy()
    await new Stk500Uploader(transport).upload(HEX)
    expect(transport.rates).toEqual([115200,57600])
    expect(transport.dtr.filter(value=>value===false)).toHaveLength(4)
    expect(transport.memory.slice(0,4)).toEqual(Uint8Array.from([1,2,3,4]))
  })
  it('reports LOAD_ADDRESS failure at zero separately from verification failure', async () => {
    class BadAddress extends FakeTransport {
      async write(data: Uint8Array) {await super.write(data);if(data[0]===0x55)this.response=[0x14,0x11]}
    }
    const transport=new BadAddress()
    await expect(new Stk500Uploader(transport).upload(HEX)).rejects.toMatchObject({code:'WRITE_ERROR',message:expect.stringContaining('địa chỉ flash 0x0000')})
    expect(transport.writes.some(packet=>packet[0]===0x64)).toBe(false)
    expect(transport.closed).toBe(true)
  })
  it('programs application pages at 0x7000 rather than silently skipping them', async () => {
    const transport=new FakeTransport()
    await new Stk500Uploader(transport).upload(':01700000018E\n:00000001FF')
    expect(transport.memory[0x7000]).toBe(1)
  })
  it('rejects firmware in the bootloader area before any command is sent', async () => {
    const transport=new FakeTransport()
    await expect(new Stk500Uploader(transport).upload(':017E00000180\n:00000001FF')).rejects.toMatchObject({code:'WRITE_ERROR'})
    expect(transport.writes).toHaveLength(0);expect(transport.closed).toBe(true)
  })

})

it.each([':01780000CFB8', ':01780000D5B2'])('rejects bootloader data before sending any command: %s',async(record)=>{
 const transport=new FakeTransport()
 await expect(new Stk500Uploader(transport).upload(`${record}\n:00000001FF`)).rejects.toMatchObject({code:'WRITE_ERROR',message:expect.stringContaining('bootloader từ 0x7800')})
 expect(transport.writes).toHaveLength(0);expect(transport.closed).toBe(true)
})
it('allows the last application page immediately below 0x7800',async()=>{
 const transport=new FakeTransport()
 await new Stk500Uploader(transport).upload(':0177FF000188\n:00000001FF')
 expect(transport.memory[0x77ff]).toBe(1)
})
