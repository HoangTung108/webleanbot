const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/leanbot-ide/LeanbotSerial.js', 'utf8');
const logs = [];
const context = { Uint8Array, performance, sleep: async () => {}, console: { log: (...args) => logs.push(args.join(' ')) } };
vm.runInNewContext(source.replace(/^import .*$/gm, '').replace('export class LeanbotSerial', 'class LeanbotSerial') + '\nglobalThis.TestUploader=Uploader;', context);
context.TestUploader.setConfig({ pageSizeByte: 128, syncIntervalMs: 250, getSyncTimeoutMs: 1500, loadAddressTimeoutMs: 1500, writeFlashTimeoutMs: 750, readFlashTimeoutMs: 750 });
function record(address, bytes) {
  const data = [bytes.length, address >> 8, address & 255, 0, ...bytes];
  return ':' + [...data, (-data.reduce((a,b)=>a+b,0)) & 255].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const hex = [record(0,[12,148,1,0]), record(128,[2,3,4,5]), ':00000001FF'].join('\n');
async function run(corruptSecondPage) {
  const memory = new Uint8Array(32768).fill(255), writes = [], reads = [];
  let address = 0, response = [];
  const uploader = new context.TestUploader({
    isConnected: () => true, resetLeanbot: async () => {}, flushSerialReader: async () => {},
    SerialSend: async data => {
      writes.push(data.slice());
      assert.equal(data.at(-1),32);
      if (data[0]===0x55) address=(data[1]|data[2]<<8)*2;
      if (data[0]===0x64) {
        assert.equal(data.length,133, 'one complete PROG_PAGE per send');
        assert.deepEqual(Array.from(data.slice(0,4)),[0x64,0,128,0x46]);
        memory.set(data.slice(4,-1),address);
      }
      response=[20,16];
      if (data[0]===0x74) {
        reads.push(address);
        const page=memory.slice(address,address+128);
        if (corruptSecondPage && address===128) page[0]^=255;
        response=[20,...page,16];
      }
    },
    waitForSerialData: async length => { assert.equal(response.length,length); return Uint8Array.from(response); },
  });
  const result=await uploader.upload2(Promise.resolve({hexText:hex}));
  assert.equal(result.success,!corruptSecondPage);
  assert.deepEqual(reads,[0,128], 'full verification must read both pages');
  assert.equal(writes.filter(data=>data[0]===0x64).length,2);
  assert(writes.some(data=>data[0]===0x55 && data[1]===64 && data[2]===0), 'byte address 128 must load word address 64');
}
(async()=>{
  await run(false);
  await run(true);
  assert(logs.some(line=>line==='[VERIFY] Expected: 0c 94 01 00 ff ff ff ff ff ff ff ff ff ff ff ff'));
  assert(logs.some(line=>line.startsWith('[VERIFY] Actual:')));
  console.log('PASS: legacy atomic page writes, full verification, later-page corruption detection, word addresses, first-16-byte logs');
})().catch(error=>{console.error(error);process.exitCode=1});
