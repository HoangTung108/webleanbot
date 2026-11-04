import type { CompileResult } from '../../types'
import { decodeIntelHex } from '../upload/intelHex'
import { LEANBOT_PROFILE } from '../profile/leanbotDeviceProfile'

export interface CompileOptions { signal?: AbortSignal }

export interface CompilerAdapter {
  compile(source: string, options?: CompileOptions): Promise<CompileResult>
}

function compilerEndpoint(base: string) {
  const normalized = base.replace(/\/$/, '')
  return normalized.endsWith('/api/compile') ? normalized : `${normalized}/api/compile`
}

function failure(message: string): CompileResult {
  return { success: false, stdout: message, errors: [] }
}

export class OwnCompilerAdapter implements CompilerAdapter {
  constructor(private readonly baseUrl = import.meta.env.VITE_COMPILER_API || '') {}

  async compile(source: string, options: CompileOptions = {}): Promise<CompileResult> {
    const endpoint = this.baseUrl ? compilerEndpoint(this.baseUrl) : '/api/compile'
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source, target: LEANBOT_PROFILE.target }),
        signal: options.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      return failure(error instanceof Error ? error.message : 'Không thể kết nối compiler server.')
    }

    const payload = await response.json().catch(() => null) as CompileResult | null
    if (!payload || typeof payload.success !== 'boolean') {
      if (response.status === 405 || response.status === 404) return failure(`Compiler local không có API POST tại ${endpoint} (HTTP ${response.status}). Hãy chạy compiler server, cấu hình VITE_COMPILER_API tới backend, hoặc dùng Leanbot Cloud (bỏ VITE_COMPILER_API).`)
      return failure(`Compiler trả về HTTP ${response.status} với dữ liệu không hợp lệ.`)
    }
    return {
      success: payload.success && response.ok,
      hex: payload.hex,
      stdout: payload.stdout || (response.ok ? '' : `Compiler trả về HTTP ${response.status}.`),
      flashUsed: payload.flashUsed,
      ramUsed: payload.ramUsed,
      errors: Array.isArray(payload.errors) ? payload.errors : [],
    }
  }
}

type PythaverseResponse = { hex?: string; log?: string }

export class PythaverseCompilerAdapter implements CompilerAdapter {
  constructor(private readonly server = 'cs.leanbot.space') {}

  async compile(source: string, options: CompileOptions = {}): Promise<CompileResult> {
    const payload = {
      fqbn: LEANBOT_PROFILE.fqbn,
      files: [{ content: source, name: 'LeanbotSketch/LeanbotSketch.ino' }],
      flags: { verbose: false, preferLocal: false },
      libs: [],
    }
    try {
      const response = await fetch(`https://${this.server}/v3/compile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: options.signal,
      })
      const result = await response.json().catch(() => null) as PythaverseResponse | null
      if (!result || typeof result !== 'object') return failure(`Leanbot Cloud (${this.server}) trả về HTTP ${response.status} với dữ liệu không hợp lệ.`)
      const log = typeof result.log === 'string' ? result.log : ''
      if (!response.ok || typeof result.hex !== 'string' || !result.hex.trim()) return failure(log || `Leanbot Cloud trả về HTTP ${response.status}; chưa có firmware để nạp.`)
      const encoded = result.hex.trim()
      const hex = encoded.startsWith(':') ? encoded : new TextDecoder().decode(Uint8Array.from(atob(encoded), character => character.charCodeAt(0)))
      if (!decodeIntelHex(hex).size) return failure('Compiler trả về firmware trống; chưa thể nạp Leanbot.')
      return { success: true, hex, stdout: log, errors: [] }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      return failure(`Không thể biên dịch qua Leanbot Cloud (${this.server}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/** A static deployment has no /api/compile route. Use the same service as the legacy IDE. */
export function createDefaultCompiler(config: { apiUrl?: string; cloudServer?: string } = {}): CompilerAdapter {
  return config.apiUrl?.trim()
    ? new OwnCompilerAdapter(config.apiUrl.trim())
    : new PythaverseCompilerAdapter(config.cloudServer?.trim() || 'cs.leanbot.space')
}

const compilerApi = import.meta.env.VITE_COMPILER_API as string | undefined
const cloudServer = import.meta.env.VITE_LEANBOT_COMPILER_SERVER as string | undefined
const defaultCompiler = createDefaultCompiler({ apiUrl: compilerApi, cloudServer })
export const compilerDescription = compilerApi?.trim() ? `Compiler local: ${compilerApi.trim()}` : `Leanbot Cloud: ${cloudServer?.trim() || 'cs.leanbot.space'}`

export function compileLeanbot(source: string, options: CompileOptions = {}) {
  return defaultCompiler.compile(source, options)
}
