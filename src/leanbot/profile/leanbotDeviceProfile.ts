export const LEANBOT_PROFILE = Object.freeze({
  target: 'leanbot-standard',
  fqbn: 'arduino:avr:uno',
  serial: Object.freeze({
    baudRate: 115200,
    bufferSize: 2048,
    filters: Object.freeze([
      Object.freeze({ usbVendorId: 0x1a86, usbProductId: 0x7523 }),
      Object.freeze({ usbVendorId: 0x0403, usbProductId: 0x6001 }),
    ]),
    dtrPulseMs: 50,
    flushBeforeSyncMs: 100,
    bootloaderSettleMs: 500,
  }),
  uploader: Object.freeze({
    pageSize: 128,
    syncKeepAliveIntervalMs: 100,
    getSyncRepeatMs: 50,
    getSyncTimeoutMs: 500,
    loadAddressTimeoutMs: 500,
    writeFlashTimeoutMs: 1000,
    readFlashTimeoutMs: 1000,
    bootloaderStart: 0x7000,
    bootloaderSize: 0x1000,
  }),
})

export type LeanbotProfile = typeof LEANBOT_PROFILE
