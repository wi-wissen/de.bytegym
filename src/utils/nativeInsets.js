/**
 * System-bar insets from the Android shell.
 *
 * The app draws edge-to-edge (see MainActivity.kt), so content would slide under
 * the status and navigation bars. CSS `env(safe-area-inset-*)` is meant to cover
 * that, but the Android WebView only reports it on recent versions — so the shell
 * hands us the real insets: once through `window.ByteGymInsets.get()` at startup,
 * and again through `window.__bytegymSetInsets()` whenever they change (rotation,
 * keyboard, gesture vs. 3-button navigation).
 *
 * They land in `--native-inset-*`; main.css feeds those into Framework7's
 * `--f7-safe-area-*`, which already pads the navbar, tabbar and sheets.
 * Outside the Android shell (desktop, browser, tests) nothing is set and the CSS
 * falls back to `env()`.
 */
const SIDES = ['top', 'right', 'bottom', 'left']

export function applyInsets(insets) {
  if (!insets) return
  const root = document.documentElement.style
  for (const side of SIDES) {
    const value = Number(insets[side])
    if (Number.isFinite(value)) root.setProperty(`--native-inset-${side}`, `${value}px`)
  }
}

export function installNativeInsets() {
  window.__bytegymSetInsets = applyInsets
  try {
    const raw = window.ByteGymInsets?.get?.()
    if (raw) applyInsets(JSON.parse(raw))
  } catch {
    /* not running in the Android shell */
  }
}
