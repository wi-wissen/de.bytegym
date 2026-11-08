/**
 * Back-to-dismiss for Framework7 modals.
 *
 * Framework7 modals are not part of the router history, so a back navigation
 * would sail straight past an open sheet and drop the user out of the app.
 * We give every dismissible modal its own history entry instead:
 *
 *   - opening pushes an entry
 *   - a back navigation pops it and closes the top-most modal
 *   - closing via the UI (✕, backdrop, swipe-down) removes the entry again,
 *     so the modal stack and the history stack stay in sync
 *
 * On Android this is what makes the system back button and the edge-swipe-back
 * gesture close a sheet (requires `handleBackNavigation = true` in MainActivity.kt);
 * on desktop it wires up the browser/mouse back button.
 *
 * Beyond modals there is one more back step: the root back handler. Android's
 * navigation pattern is that back from any other top-level tab returns to the start
 * tab, and only back from the start tab leaves the app. `setRootBackHandler(fn)`
 * pushes a single history entry for that; a back navigation with no modal open pops
 * it and calls `fn`. `setRootBackHandler(null)` (the user went home by hand) removes
 * the entry again.
 */

// The installed controller, so pages can reach it without threading it through.
let current = null

export function setRootBackHandler(handler) {
  current?.setRootBackHandler(handler)
}

// Overlay types a back navigation should dismiss. Toasts and notifications
// expire on their own and must never swallow a back press.
const DISMISSIBLE = ['sheet', 'popup', 'popover', 'actions', 'dialog']

export function installBackDismiss(f7) {
  // Open modals, top-most last.
  const stack = []

  // Set while a back navigation is closing a modal: the browser already consumed
  // the history entry, so `modalClose` must not pop another one.
  let closingViaBack = false

  // Number of history entries we popped ourselves — the `popstate` events they
  // trigger are ours, not the user's, and get skipped.
  let selfPops = 0

  // Root back step (see above). Non-null means its history entry is on the stack,
  // underneath any modal entries.
  let rootHandler = null

  f7.on('modalOpen', (modal) => {
    if (!DISMISSIBLE.includes(modal.type)) return
    stack.push(modal)
    history.pushState({ f7Modal: modal.type }, '')
  })

  f7.on('modalClose', (modal) => {
    const i = stack.lastIndexOf(modal)
    if (i === -1) return
    stack.splice(i, 1)
    if (closingViaBack) return

    // Closed through the UI, so the entry we pushed on open is still there.
    selfPops += 1
    history.back()
  })

  window.addEventListener('popstate', () => {
    if (selfPops > 0) {
      selfPops -= 1
      return
    }

    const modal = stack[stack.length - 1]
    if (!modal) {
      // No modal left, so this was the root entry.
      const handler = rootHandler
      rootHandler = null
      handler?.()
      return
    }

    // `close()` emits `modalClose` synchronously, so the flag is still set by the
    // time the handler above runs.
    closingViaBack = true
    modal.close()
    closingViaBack = false
  })

  current = {
    setRootBackHandler(handler) {
      if (handler) {
        if (!rootHandler) history.pushState({ f7Root: true }, '')
        rootHandler = handler
        return
      }
      if (!rootHandler) return
      rootHandler = null
      // Only ours to pop while it is on top. Modals sit above it and block the UI
      // that would call this, so in practice it always is.
      if (stack.length === 0) {
        selfPops += 1
        history.back()
      }
    },
  }
  return current
}
