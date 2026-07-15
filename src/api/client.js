import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { sessionStore } from '../store/session.js'

/**
 * The plain Tauri fetch, for the rare request that must NOT carry the API
 * defaults or the session cookie. Re-exported so this module stays the single
 * place that reaches for `@tauri-apps/plugin-http`.
 */
export { tauriFetch as rawFetch }

export const NP_GATEWAY = 'https://one.netpulse.com'
export const MOBILE_API = 'https://mobile-api.int.api.egym.com'

/**
 * The HTTP transport. Defaults to Tauri's native fetch; tests swap it out to drive
 * the retry/reauth logic without a device. Same dependency inversion as the reauth
 * handler below.
 */
let transport = tauriFetch
export function setTransport(fn) { transport = fn }

/**
 * Re-authentication on 401/403.
 *
 * The server is the only thing that knows when a JSESSIONID has died, so we act on
 * its 401/403 — not a guessed lifetime. auth.js registers the handler rather than
 * us importing it, because auth.js already imports this module.
 */
let reauthHandler = null
let reauthInFlight = null

export function setReauthHandler(fn) {
  reauthHandler = fn
}

/** Re-auth at most once at a time, however many requests hit a 401 together. */
function reauthenticate() {
  if (!reauthHandler) return Promise.resolve(false)
  if (!reauthInFlight) {
    reauthInFlight = Promise.resolve()
      .then(() => reauthHandler())
      .catch(() => false)
      .finally(() => { reauthInFlight = null })
  }
  return reauthInFlight
}

const DEFAULT_HEADERS = {
  'x-np-user-agent': 'clientType=MOBILE_DEVICE; devicePlatform=ANDROID; deviceUid=; applicationName=EGYM Fitness; applicationVersion=3.24; applicationVersionCode=930; containerName=NetpulseFitness',
  'user-agent': 'okhttp/4.12.0',
  'x-np-app-version': '3.24',
  'x-np-api-version': '1.5',
  'Accept': 'application/json',
  'accept-encoding': 'gzip'
}

/** GET request with automatic header injection and session cookie. */
export async function apiGet(url, extraHeaders = {}, retried = false) {
  const headers = { ...DEFAULT_HEADERS, ...extraHeaders }
  if (sessionStore.cookieString) {
    headers['Cookie'] = sessionStore.cookieString
  } else if (sessionStore.jsessionid) {
    headers['Cookie'] = `JSESSIONID=${sessionStore.jsessionid}`
  }

  let response
  try {
    response = await transport(url, { method: 'GET', headers })
  } catch (e) {
    console.error(`[API GET ERROR] ${url}`, e)
    throw normalizeTauriError(e)
  }

  // A session can die mid-use. eGym signals that with 401, and on some endpoints
  // (e.g. the gym feed) with 403 "Access is denied". Both mean the same thing:
  // sign back in and replay the request once, so it picks up the fresh cookie.
  if (response.status === 401 || response.status === 403) {
    if (!retried && await reauthenticate()) {
      return apiGet(url, extraHeaders, true)
    }
    // We could not recover — either reauth was impossible/failed (we are now
    // logged out), or a fresh session still gets a 401. Tell the UI to send the
    // user to login instead of showing a crash report.
    //
    // A *retried* 403 is the one exception: the new session works, but this
    // resource is genuinely forbidden. That is a real error, not a dead session,
    // so let it fall through to the normal handler below rather than bouncing the
    // user to login forever.
    if (!(retried && response.status === 403)) {
      const err = new Error('session_expired')
      err.sessionExpired = true
      err.status = response.status
      throw err
    }
  }

  if (!response.ok) {
    let responseBody = ''
    try { responseBody = await response.text() } catch { /* ignore */ }
    console.error(`[API GET ${response.status}] ${url}`, responseBody)
    const err = new Error(`API ${response.status}: ${url}`)
    err.status = response.status
    if (responseBody) err.responseBody = responseBody
    throw err
  }

  const text = await readResponseText(response)
  if (!text) return null

  try {
    return parseJsonText(text)
  } catch (e) {
    console.error('[API GET JSON PARSE ERROR]', {
      url,
      status: response.status,
      length: text.length,
      firstCharCode: text.charCodeAt(0),
      preview: text.slice(0, 160)
    })
    const err = e instanceof Error ? e : new Error('invalid_json_response')
    if (!err.message) err.message = 'invalid_json_response'
    throw err
  }
}

/** POST request. */
export async function apiPost(url, body, extraHeaders = {}) {
  const headers = { ...DEFAULT_HEADERS, ...extraHeaders }
  if (sessionStore.cookieString) {
    headers['Cookie'] = sessionStore.cookieString
  } else if (sessionStore.jsessionid) {
    headers['Cookie'] = `JSESSIONID=${sessionStore.jsessionid}`
  }

  try {
    const response = await transport(url, { method: 'POST', body, headers })
    return response
  } catch (e) {
    console.error(`[API POST ERROR] ${url}`, e)
    throw normalizeTauriError(e)
  }
}

export async function readResponseText(response) {
  const contentEncoding =
    response.headers?.get?.('content-encoding') ||
    response.headers?.get?.('Content-Encoding') ||
    ''

  const buffer = await response.arrayBuffer()
  let bytes = new Uint8Array(buffer)
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
  const shouldTryDecompress = isGzip || contentEncoding.toLowerCase().includes('gzip')

  if (shouldTryDecompress) {
    try {
      bytes = await gunzipBytes(bytes)
    } catch {
      throw new Error('compressed_response_not_parsed')
    }
  }

  return new TextDecoder('utf-8').decode(bytes)
}

async function gunzipBytes(bytes) {
  const stream = new Blob([bytes]).stream()
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
  const decompressedBuffer = await new Response(decompressedStream).arrayBuffer()
  return new Uint8Array(decompressedBuffer)
}

/**
 * Tauri's HTTP plugin may throw plain strings instead of `Error` objects.
 * This function normalizes all variants to a real `Error`.
 */
function normalizeTauriError(e) {
  // Already a real Error
  if (e instanceof Error) return e

  const raw = typeof e === 'string' ? e : JSON.stringify(e)

  // Handle URL-scope errors explicitly
  if (raw.toLowerCase().includes('url not allowed') || raw.toLowerCase().includes('not allowed on the configured scope')) {
    const err = new Error('url_not_allowed')
    err.detail = raw
    return err
  }

  // Wrap everything else as Error
  return new Error(raw)
}

/** Extract `JSESSIONID` from `Set-Cookie` header. */
export function extractJsessionId(response) {
  // Tauri's HTTP plugin returns `Set-Cookie` as a single header
  const setCookie =
    response.headers?.get?.('set-cookie') ||
    response.headers?.get?.('Set-Cookie') || ''
  const match = setCookie.match(/JSESSIONID=([^;]+)/)
  return match ? match[1] : null
}

/**
 * Extract full `Set-Cookie` string so it can be sent back 1:1
 * as cookie header (same behavior as official eGym app).
 */
export function extractFullCookieString(response) {
  const setCookie =
    response.headers?.get?.('set-cookie') ||
    response.headers?.get?.('Set-Cookie') || ''
  return setCookie || null
}

export function parseJsonText(text) {
  if (typeof text !== 'string') throw new Error('invalid_json_response')

  const firstChar = text.charCodeAt(0)
  if (firstChar === 0x1f) {
    throw new Error('compressed_response_not_parsed')
  }

  const normalized = text.replace(/^\uFEFF/, '').trim()
  if (!normalized) return null

  try {
    return JSON.parse(normalized)
  } catch {
    throw new Error('invalid_json_response')
  }
}
