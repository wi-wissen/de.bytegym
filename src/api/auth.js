import { apiGet, apiPost, rawFetch, setReauthHandler, NP_GATEWAY, extractJsessionId, extractFullCookieString, parseJsonText, readResponseText } from './client.js'
import { sessionStore } from '../store/session.js'
import { getStoredPassword } from '../store/credentials.js'

/** Step 1: resolve container -> `brandIdentifier` + `resourceType`. */
export async function resolveContainer(keyword) {
  return apiGet(
    `${NP_GATEWAY}/np/nfa/resolveContainer?keyword=${encodeURIComponent(keyword)}&containerAppVersion=32400`
  )
}

/** Step 2: fetch NFA config -> contains `brand_api_url`. */
export async function fetchNfaConfig(brandIdentifier, resourceType) {
  return apiGet(
    `${NP_GATEWAY}/np/nfa/config?brandIdentifier=${encodeURIComponent(brandIdentifier)}&resourceType=${encodeURIComponent(resourceType)}`
  )
}

/** Extract brand API URL from NFA config: load `config.xml` + parse `server_url_base`. */
async function extractBrandApiUrl(config) {
  const resources = config?.resources || []

  // Find `config.xml` resource
  const configXmlEntry = resources.find(
    r => r.key === 'res/values/config.xml' || r.url?.includes('config.xml')
  )

  if (configXmlEntry?.url) {
    try {
      const resp = await rawFetch(configXmlEntry.url, {
        method: 'GET',
        headers: { 'user-agent': 'okhttp/4.12.0' }
      })
      const xml = await resp.text()
      // Extract `server_url_base` from XML
      const match = xml.match(/<string[^>]+name="server_url_base"[^>]*>\s*([^<]+?)\s*<\/string>/)
      if (match?.[1]) return match[1].replace(/\/+$/, '')
    } catch (e) {
      console.warn('[auth] config.xml load failed:', e)
    }
  }

  // Fallback: direct URL fields containing netpulse.com
  for (const r of resources) {
    const val = r.url || r.value || ''
    if (val.includes('netpulse.com') && val.startsWith('http')) {
      return val.replace(/\/+$/, '')
    }
  }

  if (config?.apiUrl) return config.apiUrl.replace(/\/+$/, '')
  if (config?.baseUrl) return config.baseUrl.replace(/\/+$/, '')

  return null
}

/**
 * Full studio setup flow:
 * resolveContainer → fetchNfaConfig → brand_api_url
 */
export async function setupStudio(keyword) {
  let resolve
  try {
    resolve = await resolveContainer(keyword)
  } catch (e) {
    // 404 = unknown keyword -> studio not found
    if (e.status === 404) throw new Error('studio_not_found')
    // 400 = invalid request -> forward with response body for diagnostics
    console.warn('[auth] resolveContainer', e.status, e.responseBody || '(no body)')
    throw e
  }

  if (!resolve?.brandIdentifier) throw new Error('studio_not_found')

  let config
  try {
    config = await fetchNfaConfig(resolve.brandIdentifier, resolve.resourceType)
  } catch (e) {
    if (e.status === 404) throw new Error('studio_not_found')
    throw e
  }

  const brandApiUrl = await extractBrandApiUrl(config)
  if (!brandApiUrl) throw new Error('studio_not_found')

  return brandApiUrl
}

/** Log in and return `JSESSIONID` + `userId`. */
export async function login(email, password, brandApiUrl) {
  const body = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&relogin=false`

  const response = await apiPost(
    `${brandApiUrl}/np/exerciser/login`,
    body,
    {
      'Content-Type': 'application/x-www-form-urlencoded',
      'accept-encoding': 'identity'
    }
  )

  if (response.status === 401 || response.status === 403) {
    throw new Error('wrong_credentials')
  }
  if (!response.ok) {
    throw new Error(`login_failed_${response.status}`)
  }

  const jsessionid = extractJsessionId(response)
  const cookieString = extractFullCookieString(response)
  const text = await readResponseText(response)
  let data = {}
  if (text) {
    try {
      data = parseJsonText(text) || {}
    } catch (e) {
      console.error('[auth] login response parse error', {
        url: `${brandApiUrl}/np/exerciser/login`,
        length: text.length,
        firstCharCode: text.charCodeAt(0),
        preview: text.slice(0, 160),
        error: e?.message || String(e)
      })
      if (e?.message === 'compressed_response_not_parsed' || e?.message === 'invalid_json_response') {
        throw e
      }
      throw new Error('login_response_parse_failed')
    }
  }

  return { userId: data.uuid, jsessionid, cookieString }
}

/** Log out. */
export async function logout(brandApiUrl) {
  try {
    await apiPost(`${brandApiUrl}/np/logout`, '', { 'Content-Length': '0' })
  } catch (e) {
    console.warn('[auth] logout failed (ignored):', e)
  }
}

/**
 * Do we have a session to make requests with?
 *
 * Whether that session is still *valid* is not something we can know up front —
 * only the server does, and it tells us with a 401. client.js reacts to that by
 * calling `reauthenticate()` below. (An earlier version guessed a 3-hour lifetime
 * and forced a re-login on that timer; the guess was never grounded in anything
 * the API actually returns.)
 */
export async function ensureSession() {
  return sessionStore.isLoggedIn
}

/**
 * Sign back in after a 401, silently.
 *
 * Only possible if the user opted in to "stay signed in" — otherwise we hold no
 * password and the session is simply over, which drops them back to the login
 * screen. Returns whether the caller may retry its request.
 */
async function reauthenticate() {
  const password = sessionStore.staySignedIn ? getStoredPassword() : null

  if (!password || !sessionStore.email || !sessionStore.brandApiUrl) {
    sessionStore.logout()
    return false
  }

  try {
    const { userId, jsessionid, cookieString } = await login(
      sessionStore.email,
      password,
      sessionStore.brandApiUrl
    )
    sessionStore.setSession(userId, jsessionid, sessionStore.brandApiUrl, cookieString)
    return true
  } catch (e) {
    // Wrong credentials here means the password changed server-side — the stored
    // one is dead weight, so drop it instead of retrying with it forever.
    console.error('[auth] silent re-login failed:', e)
    sessionStore.logout()
    return false
  }
}

setReauthHandler(reauthenticate)
