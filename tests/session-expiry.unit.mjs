// An expired session is a normal state, not a crash. It ended up in the error
// dialog once — a technical report, one per in-flight request, on top of being
// bounced to the login screen. This pins the behaviour down.
//
// It is a unit test rather than an e2e one on purpose: the app's HTTP layer is
// Tauri's plugin, which does not exist in a plain browser, so a real 401 cannot
// be produced in the browser harness at all.
import { errorStore } from '../src/store/error.js'

let failures = 0
const check = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) failures++ }

console.log('\nERROR DIALOG')

// A real fault must still surface — the point is to filter, not to go quiet.
errorStore.visible = false
errorStore.show(new Error('boom'), 'test')
check('a genuine error still opens the dialog', errorStore.visible === true)
check('and carries its detail', errorStore.detail.includes('boom'))

// The session ending is what App.vue already handles by routing to /login/.
errorStore.visible = false
errorStore.detail = ''
const expired = new Error('session_expired')
expired.sessionExpired = true
expired.status = 401
errorStore.show(expired, 'api')
check('an ended session does NOT open the dialog', errorStore.visible === false,
  errorStore.visible ? 'dialog opened' : 'stayed closed')
check('and leaves no error report behind', errorStore.detail === '')

// Every request in flight when the session dies raises its own copy of this.
errorStore.visible = false
for (let i = 0; i < 5; i++) errorStore.show(expired, `api-${i}`)
check('five concurrent requests still produce zero dialogs', errorStore.visible === false)

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
process.exit(failures ? 1 : 0)
