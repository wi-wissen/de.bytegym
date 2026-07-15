// Drives the real apiGet through every auth-failure path using the setTransport /
// setReauthHandler seams — no device, no network.
//
// The bug this pins down: eGym returns 403 "Access is denied" for a stale session on
// the gym-feed endpoint, but reauth only fired on 401, so the app never recovered and
// showed a crash dialog. Signing back in (a fresh cookie) is what actually fixes it.

// credentials.js touches localStorage at call time; shim it so imports are safe.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }

const { apiGet, setTransport, setReauthHandler } = await import('../src/api/client.js')
const { sessionStore } = await import('../src/store/session.js')

sessionStore.cookieString = 'JSESSIONID=stale'

let failures = 0
const check = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) failures++ }

const enc = new TextEncoder()
function res(status, body = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => '' },
    arrayBuffer: async () => enc.encode(text).buffer,
    text: async () => text,
  }
}

// A transport scripted to return a sequence of responses, recording each call.
function scriptedTransport(sequence) {
  const calls = []
  setTransport(async (url) => {
    calls.push(url)
    const next = sequence.shift()
    if (!next) throw new Error('transport called more times than scripted')
    return next
  })
  return calls
}

async function expectThrow(fn) {
  try { await fn(); return null } catch (e) { return e }
}

// ---- the reported bug: 403 on a stale session, reauth available ----
{
  console.log('\n403 WITH WORKING REAUTH — the exact failure the user hit')
  const calls = scriptedTransport([
    res(403, { message: 'Access is denied' }), // stale session
    res(200, { feed: 'ok' }),                  // after fresh login
  ])
  let reauths = 0
  setReauthHandler(async () => { reauths++; sessionStore.cookieString = 'JSESSIONID=fresh'; return true })

  const result = await apiGet('https://api/feed')
  check('reauth was attempted', reauths === 1, `${reauths}x`)
  check('the request was replayed once', calls.length === 2)
  check('the replay carried the fresh cookie', sessionStore.cookieString === 'JSESSIONID=fresh')
  check('the caller gets data, not an error', JSON.stringify(result) === JSON.stringify({ feed: 'ok' }))
}

// ---- 403 but reauth impossible (stay-signed-in off / no stored password) ----
{
  console.log('\n403 WITH NO WAY TO REAUTH — must route to login, not crash')
  scriptedTransport([res(403, { message: 'Access is denied' })])
  setReauthHandler(async () => false) // no password to sign in with

  const err = await expectThrow(() => apiGet('https://api/feed'))
  check('it throws', err !== null)
  check('flagged as a session end, not a crash', err?.sessionExpired === true)
  check('carries the 403 status', err?.status === 403)
}

// ---- 401 still works (regression guard) ----
{
  console.log('\n401 STILL TRIGGERS REAUTH (unchanged behaviour)')
  const calls = scriptedTransport([res(401), res(200, { ok: true })])
  let reauths = 0
  setReauthHandler(async () => { reauths++; return true })

  const result = await apiGet('https://api/x')
  check('reauth attempted on 401', reauths === 1)
  check('replayed and succeeded', calls.length === 2 && result.ok === true)
}

// ---- genuinely forbidden: fresh session STILL 403 → real error, no bounce loop ----
{
  console.log('\nGENUINE 403 (fresh session still denied) — surfaced as a real error')
  const calls = scriptedTransport([
    res(403, { message: 'Access is denied' }), // first
    res(403, { message: 'Access is denied' }), // still forbidden after fresh login
  ])
  let reauths = 0
  setReauthHandler(async () => { reauths++; return true })

  const err = await expectThrow(() => apiGet('https://api/forbidden'))
  check('reauth tried exactly once (no infinite loop)', reauths === 1, `${reauths}x`)
  check('request tried exactly twice', calls.length === 2)
  check('surfaced as a real API error, not session_expired', err?.sessionExpired !== true, String(err?.sessionExpired))
  check('keeps the 403 status and body', err?.status === 403 && /Access is denied/.test(err?.responseBody || ''))
}

// ---- single-flight: concurrent 403s share ONE reauth ----
{
  console.log('\nCONCURRENT 403s SHARE ONE REAUTH (no login stampede)')
  // four first-hits 403, then four replays 200 — but reauth must run only once
  const seq = [res(403), res(403), res(403), res(403), res(200, { n: 1 }), res(200, { n: 2 }), res(200, { n: 3 }), res(200, { n: 4 })]
  scriptedTransport(seq)
  let reauths = 0
  setReauthHandler(async () => { reauths++; await new Promise(r => setTimeout(r, 5)); return true })

  const out = await Promise.all([apiGet('u1'), apiGet('u2'), apiGet('u3'), apiGet('u4')])
  check('reauth ran once for all four', reauths === 1, `${reauths}x`)
  check('all four recovered', out.filter(Boolean).length === 4)
}

// ---- a normal error is untouched ----
{
  console.log('\nA 500 IS A PLAIN ERROR (reauth not involved)')
  scriptedTransport([res(500, 'boom')])
  let reauths = 0
  setReauthHandler(async () => { reauths++; return true })

  const err = await expectThrow(() => apiGet('https://api/down'))
  check('reauth not attempted', reauths === 0)
  check('surfaced as a real error', err?.status === 500 && err?.sessionExpired !== true)
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
process.exit(failures ? 1 : 0)
