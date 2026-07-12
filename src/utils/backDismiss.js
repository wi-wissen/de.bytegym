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
 */

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
    if (!modal) return

    // `close()` emits `modalClose` synchronously, so the flag is still set by the
    // time the handler above runs.
    closingViaBack = true
    modal.close()
    closingViaBack = false
  })
}
