import { afterEach, describe, expect, it, vi } from 'vitest'
import { OwnCompilerAdapter, PythaverseCompilerAdapter, createDefaultCompiler } from './compilerClient'

afterEach(() => vi.unstubAllGlobals())

describe('OwnCompilerAdapter', () => {
  it('posts only source and the fixed Leanbot target', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      hex: ':00000001FF\n',
      stdout: 'ok',
      flashUsed: 42,
      ramUsed: 7,
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await new OwnCompilerAdapter('https://compiler.example.com').compile('void setup() {}')

    expect(result.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://compiler.example.com/api/compile', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ source: 'void setup() {}', target: 'leanbot-standard' }),
    }))
  })

  it('returns structured diagnostics from compiler failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      success: false,
      stdout: 'compile failed',
      errors: [{ line: 12, column: 5, message: "expected ';'" }],
    }), { status: 422, headers: { 'content-type': 'application/json' } })))

    const result = await new OwnCompilerAdapter('/compiler').compile('bad code')

    expect(result).toMatchObject({ success: false, errors: [{ line: 12, column: 5, message: "expected ';'" }] })
  })
})

describe('PythaverseCompilerAdapter', () => {
  it('uses the verified v3 payload and decodes Base64 Intel HEX', async () => {
    const encodedHex = btoa(':0400000001020304F2\n:00000001FF\n')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ hex: encodedHex, log: 'compiled' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await new PythaverseCompilerAdapter('cs.leanbot.space').compile('#include <Leanbot.h>')

    expect(result).toMatchObject({ success: true, hex: ':0400000001020304F2\n:00000001FF\n', stdout: 'compiled' })
    expect(fetchMock).toHaveBeenCalledWith('https://cs.leanbot.space/v3/compile', expect.objectContaining({
      body: JSON.stringify({
        fqbn: 'arduino:avr:nano:cpu=atmega328',
        files: [{ content: '#include <Leanbot.h>', name: 'LeanbotSketch/LeanbotSketch.ino' }],
        flags: { verbose: false, preferLocal: false },
        libs: [],
      }),
    }))
  })
})


describe('compiler routing on static hosting', () => {
  it('uses Leanbot Cloud without requiring a local API server', () => {
    expect(createDefaultCompiler()).toBeInstanceOf(PythaverseCompilerAdapter)
    expect(createDefaultCompiler({ apiUrl: 'https://my-backend.example.com' })).toBeInstanceOf(OwnCompilerAdapter)
  })
  it('sends compilation to /v3/compile instead of the static /api/compile route', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ hex: btoa(':0400000001020304F2\n:00000001FF'), log: 'ok' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await createDefaultCompiler().compile('#include <Leanbot.h>')).success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://cs.leanbot.space/v3/compile', expect.any(Object))
  })
  it('explains a local backend 405 rather than returning an opaque invalid-data error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Method Not Allowed</html>', { status: 405 })))
    const result = await new OwnCompilerAdapter('https://static.example.com').compile('code')
    expect(result.success).toBe(false)
    expect(result.stdout).toContain('HTTP 405')
    expect(result.stdout).toContain('VITE_COMPILER_API')
  })
  it('rejects empty and corrupted cloud firmware and preserves cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ hex: btoa(':00000001FF') }), { status: 200 })))
    expect((await new PythaverseCompilerAdapter().compile('code')).success).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('cancelled', 'AbortError') }))
    await expect(new PythaverseCompilerAdapter().compile('code')).rejects.toMatchObject({ name: 'AbortError' })
  })
})

it.each([['local',new OwnCompilerAdapter('/api/compile')],['cloud',new PythaverseCompilerAdapter()]] as const)('rejects Nano boot-section bytes from the %s compiler',async(_name,adapter)=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({success:true,hex:':01780000CFB8\n:00000001FF',log:'ok',stdout:'ok'}),{status:200,headers:{'content-type':'application/json'}})))
 const result=await adapter.compile('void setup(){} void loop(){}')
 expect(result.success).toBe(false);expect(result.hex).toBeUndefined();expect(result.stdout).toContain('0x7800')
})
