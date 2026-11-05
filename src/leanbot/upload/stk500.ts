import { LEANBOT_PROFILE } from '../profile/leanbotDeviceProfile'
import { toFlashPages, type FlashPage } from './intelHex'
import type { UploadTransport } from './transport'

const INSYNC = 0x14, OK = 0x10, EOP = 0x20
export type UploadPhase = 'idle' | 'resetting' | 'syncing' | 'uploading' | 'verifying' | 'done'
export type UploadErrorCode = 'CONNECT_ERROR' | 'SYNC_ERROR' | 'WRITE_ERROR' | 'VERIFY_ERROR' | 'DISCONNECTED'
export class UploadProtocolError extends Error {
  constructor(public readonly code: UploadErrorCode, message: string, options?: ErrorOptions) { super(message, options); this.name = 'UploadProtocolError' }
}
export interface UploaderOptions {
  signal?: AbortSignal
  onProgress?(phase: UploadPhase, progress: number): void
  onMessage?(message: string): void
}
function abortError() { return new DOMException('Đã hủy nạp chương trình.', 'AbortError') }
async function delay(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) throw abortError()
  await new Promise<void>((resolve,reject) => {
    const cleanup=()=>{ clearTimeout(timer); signal?.removeEventListener('abort',abort) }
    const abort=()=>{cleanup();reject(abortError())}
    const timer=setTimeout(()=>{cleanup();resolve()},ms)
    signal?.addEventListener('abort',abort,{once:true})
    if(signal?.aborted)abort()
  })
}
const addressText=(address:number)=>`0x${address.toString(16).padStart(4,'0')}`
export class Stk500Uploader {
  private readonly signal?: AbortSignal
  private readonly onProgress: NonNullable<UploaderOptions['onProgress']>
  private readonly onMessage: NonNullable<UploaderOptions['onMessage']>
  private applicationLimit: number = LEANBOT_PROFILE.uploader.maximumApplicationBytes
  constructor(private readonly transport: UploadTransport, options: UploaderOptions = {}) {
    this.signal=options.signal;this.onProgress=options.onProgress??(()=>{});this.onMessage=options.onMessage??(()=>{})
  }
  async upload(hex: string) {
    try {
      const pages=toFlashPages(hex,LEANBOT_PROFILE.uploader.pageSize)
      if(!pages.length)throw new UploadProtocolError('WRITE_ERROR','Intel HEX không chứa dữ liệu firmware.')
      this.validateAddresses(pages)
      await this.enterBootloader()
      this.validateAddresses(pages)
      await this.program(pages)
      await this.verify(pages)
      await this.transact([0x51],0,LEANBOT_PROFILE.uploader.getSyncTimeoutMs,'DISCONNECTED')
    } finally { await this.transport.close() }
    this.onProgress('done',1)
  }
  private validateAddresses(pages: FlashPage[]) {
    const invalid=pages.find(page=>page.address<0 || page.address+page.data.length>this.applicationLimit)
    if(invalid)throw new UploadProtocolError('WRITE_ERROR',`Firmware vượt vùng ứng dụng tại ${addressText(invalid.address)} (giới hạn ${this.applicationLimit} byte). Không ghi đè bootloader.`)
  }
  private checkAbort() { if(this.signal?.aborted)throw abortError() }
  private async transact(request:number[], payloadLength:number, timeoutMs:number, code:UploadErrorCode) {
    this.checkAbort()
    try {
      await this.transport.write(Uint8Array.from([...request,EOP]))
      const deadline=Date.now()+timeoutMs
      const read=async(length:number)=>{
        const remaining=deadline-Date.now();if(remaining<=0)throw new Error('Hết thời gian chờ ACK.')
        const bytes=await this.transport.read(length,remaining,this.signal)
        if(bytes.length!==length)throw new Error(`ACK thiếu dữ liệu (${bytes.length}/${length} byte).`)
        return bytes
      }
      // Skip startup/monitor noise before the frame, never inside flash payload.
      let skipped=0
      while((await read(1))[0]!==INSYNC)if(++skipped>256)throw new Error('Quá nhiều dữ liệu ngoài khung STK500.')
      const response=await read(payloadLength+1)
      if(response.at(-1)!==OK)throw new Error(`ACK không hợp lệ: ${Array.from(response.slice(-8),b=>b.toString(16).padStart(2,'0')).join(' ')}.`)
      return response.slice(0,-1)
    } catch(error) {
      if(error instanceof DOMException&&error.name==='AbortError')throw error
      if(error instanceof UploadProtocolError)throw error
      throw new UploadProtocolError(code,`Lệnh STK500 ${addressText(request[0])}: ${error instanceof Error?error.message:String(error)}`,{cause:error})
    }
  }
  private async enterBootloader() {
    const {serial,uploader}=LEANBOT_PROFILE
    const baudRates=this.transport.setBaudRate?uploader.baudRates:[serial.baudRate]
    let lastError:unknown
    for(const baud of baudRates) {
      this.checkAbort()
      await this.transport.setBaudRate?.(baud)
      for(let attempt=0;attempt<3;attempt++) {
        this.checkAbort()
        this.onMessage(`Kết nối bootloader ${baud} baud, lần ${attempt+1}/3…`)
        try {
          this.onProgress('resetting',0)
          await this.transport.setDtr(false)
          await delay(serial.dtrPulseMs,this.signal)
          await this.transport.setDtr(true)
          await this.transport.flush(serial.flushBeforeSyncMs,this.signal)
          await delay(serial.bootloaderSettleMs,this.signal)
          this.onProgress('syncing',0)
          await this.transact([0x30],0,uploader.getSyncTimeoutMs,'SYNC_ERROR')
          this.applicationLimit=baud===57600?uploader.legacyMaximumApplicationBytes:uploader.maximumApplicationBytes
          // The reference Leanbot uploader proceeds straight from GET_SYNC to
          // LOAD_ADDRESS; do not require a separate ENTER_PROGMODE response.
          return
        } catch(error) {
          if(error instanceof DOMException&&error.name==='AbortError')throw error
          lastError=error
          if(attempt<2)await delay(uploader.getSyncRepeatMs,this.signal)
        }
      }
    }
    throw new UploadProtocolError('SYNC_ERROR',`Không bắt tay được bootloader ở ${baudRates.join('/')} baud sau khi reset. ${lastError instanceof Error?lastError.message:''}`,{cause:lastError})
  }
  private async loadAddress(page:FlashPage,code:UploadErrorCode) {
    const word=page.address>>>1
    try { await this.transact([0x55,word&0xff,(word>>>8)&0xff],0,LEANBOT_PROFILE.uploader.loadAddressTimeoutMs,code) }
    catch(error) {
      if(error instanceof DOMException&&error.name==='AbortError')throw error
      throw new UploadProtocolError(code,`Không nhận ACK khi đặt địa chỉ flash ${addressText(page.address)} (word ${addressText(word)}). ${error instanceof Error?error.message:''}`,{cause:error})
    }
  }
  private async program(pages:FlashPage[]) {
    this.onProgress('uploading',0)
    for(let index=0;index<pages.length;index++) {
      const page=pages[index];await this.loadAddress(page,'WRITE_ERROR')
      this.onMessage(`Ghi firmware tại ${addressText(page.address)}…`)
      await this.transact([0x64,page.data.length>>8,page.data.length&0xff,0x46,...page.data],0,LEANBOT_PROFILE.uploader.writeFlashTimeoutMs,'WRITE_ERROR')
      this.onProgress('uploading',(index+1)/pages.length)
    }
  }
  private async verify(pages:FlashPage[]) {
    this.onProgress('verifying',0)
    for(let index=0;index<pages.length;index++) {
      const page=pages[index];await this.loadAddress(page,'VERIFY_ERROR')
      this.onMessage(`Đọc lại flash tại ${addressText(page.address)}…`)
      const actual=await this.transact([0x74,page.data.length>>8,page.data.length&0xff,0x46],page.data.length,LEANBOT_PROFILE.uploader.readFlashTimeoutMs,'VERIFY_ERROR')
      const mismatch=actual.findIndex((value,offset)=>value!==page.data[offset])
      if(mismatch>=0) {
        const constantReadback=actual.length>=16 && actual.every(value=>value===0x62)
        const recovery=constantReadback
          ? ' Bootloader trả toàn byte 0x62. Chưa xác nhận firmware được ghi đúng. Thử xác minh bằng Arduino IDE/avrdude; nếu cùng lỗi, cần kiểm tra flash, fuse/lock và bootloader qua ISP (USBasp hoặc Arduino as ISP).'
          : ''
        throw new UploadProtocolError('VERIFY_ERROR',`Flash không khớp tại ${addressText(page.address+mismatch)}: cần ${addressText(page.data[mismatch])}, đọc được ${addressText(actual[mismatch])}.${recovery}`)
      }
      this.onProgress('verifying',(index+1)/pages.length)
    }
  }
}
export function uploadHex(transport:UploadTransport,hex:string,options:UploaderOptions={}) { return new Stk500Uploader(transport,options).upload(hex) }
