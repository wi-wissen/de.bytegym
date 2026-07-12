// Exercises the real src/utils/backDismiss.js against a fake browser history
// (popstate is dispatched ASYNCHRONOUSLY, like a real browser) and fake F7 modals
// (close() emits `modalClose` synchronously, matching F7's modal-class.js).

import { installBackDismiss } from '../src/utils/backDismiss.js'

const tick = () => new Promise((r) => setTimeout(r, 0))

function makeEnv() {
  const listeners = []
  let entries = [{ base: true }] // history stack; last = current

  const history = {
    get state() { return entries[entries.length - 1] },
    pushState(s) { entries.push(s) },
    back() {
      // Real browsers pop synchronously but fire popstate on a later task.
      if (entries.length > 1) entries.pop()
      else entries.pop() // popping past base = leaving the app
      setTimeout(() => listeners.forEach((l) => l()), 0)
    },
  }

  global.history = history
  global.window = { addEventListener: (ev, cb) => { if (ev === 'popstate') listeners.push(cb) } }

  // Fake F7 app emitter
  const handlers = {}
  const f7 = {
    on: (ev, cb) => { (handlers[ev] ||= []).push(cb) },
    emit: (ev, m) => (handlers[ev] || []).forEach((cb) => cb(m)),
  }

  const makeModal = (type) => {
    const m = {
      type,
      open: false,
      close() {
        if (!m.open) return // F7 no-ops when already closed
        m.open = false
        f7.emit('modalClose', m) // synchronous, as in F7
      },
      show() {
        m.open = true
        f7.emit('modalOpen', m)
      },
    }
    return m
  }

  return { f7, makeModal, entries: () => entries, depth: () => entries.length }
}

let failures = 0
function check(name, cond, extra = '') {
  if (cond) console.log(`  ✓ ${name}`)
  else { failures++; console.log(`  ✗ ${name} ${extra}`) }
}

const userBack = (env) => { global.history.back() } // same as a system back gesture

// --- A: back gesture closes an open sheet, history returns to base
{
  console.log('A) back gesture closes sheet')
  const env = makeEnv(); installBackDismiss(env.f7)
  const s = env.makeModal('sheet')
  s.show()
  check('entry pushed on open', env.depth() === 2)
  userBack(env); await tick(); await tick()
  check('sheet closed', s.open === false)
  check('history back at base (app not exited)', env.depth() === 1, `depth=${env.depth()}`)
}

// --- B: closing via UI (✕ / swipe-down) must not leave a stale history entry
{
  console.log('B) ✕ / swipe-down closes sheet')
  const env = makeEnv(); installBackDismiss(env.f7)
  const s = env.makeModal('sheet')
  s.show()
  s.close() // user tapped ✕
  await tick(); await tick()
  check('history entry removed', env.depth() === 1, `depth=${env.depth()}`)
}

// --- B2: after a UI close, a following back must exit (not be swallowed)
{
  console.log('B2) back after UI close falls through to the app')
  const env = makeEnv(); installBackDismiss(env.f7)
  const s = env.makeModal('sheet')
  s.show(); s.close(); await tick(); await tick()
  userBack(env); await tick(); await tick()
  check('history popped past base => app exits', env.depth() === 0, `depth=${env.depth()}`)
}

// --- C: nested modals (sheet + error sheet on top), back twice
{
  console.log('C) nested modals, back twice')
  const env = makeEnv(); installBackDismiss(env.f7)
  const m1 = env.makeModal('sheet'); const m2 = env.makeModal('sheet')
  m1.show(); m2.show()
  check('two entries pushed', env.depth() === 3, `depth=${env.depth()}`)
  userBack(env); await tick(); await tick()
  check('top modal closed first', m2.open === false && m1.open === true)
  check('m1 entry still present', env.depth() === 2, `depth=${env.depth()}`)
  userBack(env); await tick(); await tick()
  check('m1 closed', m1.open === false)
  check('back at base', env.depth() === 1, `depth=${env.depth()}`)
}

// --- D: reopen after a back-close (no stale flags)
{
  console.log('D) reopen after back-close')
  const env = makeEnv(); installBackDismiss(env.f7)
  const s = env.makeModal('sheet')
  s.show(); userBack(env); await tick(); await tick()
  s.show()
  check('entry pushed again', env.depth() === 2, `depth=${env.depth()}`)
  userBack(env); await tick(); await tick()
  check('closes again', s.open === false)
  check('back at base', env.depth() === 1, `depth=${env.depth()}`)
}

// --- E: toasts must not consume a back press
{
  console.log('E) toast does not hijack back')
  const env = makeEnv(); installBackDismiss(env.f7)
  const t = env.makeModal('toast')
  t.show()
  check('no history entry for toast', env.depth() === 1, `depth=${env.depth()}`)
  userBack(env); await tick(); await tick()
  check('back exits app, toast untouched', env.depth() === 0 && t.open === true)
}

// --- F: two modals closed rapidly via UI (counter, not boolean)
{
  console.log('F) rapid double UI close stays in sync')
  const env = makeEnv(); installBackDismiss(env.f7)
  const m1 = env.makeModal('sheet'); const m2 = env.makeModal('sheet')
  m1.show(); m2.show()
  m2.close(); m1.close() // both closed before popstate flushes
  await tick(); await tick(); await tick()
  check('both entries removed, at base', env.depth() === 1, `depth=${env.depth()}`)
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures ? 1 : 0)
