// End-to-end: real app, real Framework7, real browser history.
// Presses the REAL back button on a REAL open sheet — the exact chain the Android
// back gesture takes once handleBackNavigation is on.
// (The seeded session points at a dead API, so the app's own ErrorDialog sheet
//  opens on its own — a genuine f7-sheet to test against.)
const { chromium } = require('playwright-core')

let failures = 0
const check = (name, cond, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failures++
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.addInitScript(() => {
    localStorage.setItem('bytegym_session', JSON.stringify({
      userId: 'u1', jsessionid: 'x', brandApiUrl: 'http://127.0.0.1:9', loginTime: Date.now(),
    }))
  })
  await page.goto('http://127.0.0.1:1420/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.toolbar.tabbar')

  const sheetOpen = () => page.evaluate(() => !!document.querySelector('.sheet-modal.modal-in'))
  const backdropUp = () => page.evaluate(() => !!document.querySelector('.sheet-backdrop.backdrop-in'))
  const onMainPage = () => page.evaluate(() => !!document.querySelector('.toolbar.tabbar'))
  const histLen = () => page.evaluate(() => history.length)

  console.log('\nBACK CLOSES A REAL OPEN SHEET')
  await page.waitForSelector('.sheet-modal.modal-in', { timeout: 15000 })
  const openLen = await histLen()
  check('a real sheet is open', await sheetOpen())
  check('its grabber is painted', await page.evaluate(() => {
    const inner = document.querySelector('.sheet-modal.modal-in .sheet-modal-inner')
    if (!inner) return false
    const cs = getComputedStyle(inner, '::before')
    return cs.width === '36px' && cs.height === '4px'
  }))

  // The real back button — what the Android gesture triggers inside the WebView
  await page.goBack()
  await page.waitForTimeout(800)

  check('back CLOSED the sheet', (await sheetOpen()) === false)
  check('backdrop is gone too', (await backdropUp()) === false)
  check('back did NOT leave the app (still on MainPage)', await onMainPage())
  check('history entry was consumed', (await histLen()) === openLen, `${openLen} -> ${await histLen()}`)

  console.log('\nUI CLOSE LEAVES NO STALE ENTRY')
  // Open the logout confirm dialog (now that no backdrop blocks the navbar)
  await page.click('.navbar a.link:last-child')
  await page.waitForSelector('.dialog.modal-in', { timeout: 5000 })
  // history.length is useless here (pushState truncates forward entries after a
  // goBack, so it stays flat). The marker our controller writes is the real signal.
  const marker = () => page.evaluate(() => history.state && history.state.f7Modal)
  check('opening pushed a tracked entry', (await marker()) === 'dialog', `history.state.f7Modal=${await marker()}`)

  // Dismiss via the dialog's own Cancel button, NOT via back
  await page.click('.dialog.modal-in .dialog-button >> nth=0')
  await page.waitForTimeout(800)
  check('dialog closed via its button', await page.evaluate(() => !document.querySelector('.dialog.modal-in')))
  check('its history entry was rolled back', !(await marker()), `history.state.f7Modal=${await marker()}`)
  check('still on MainPage', await onMainPage())

  // The entry it pushed must be gone, so this back falls THROUGH to the app
  await page.goBack()
  await page.waitForTimeout(800)
  check('back after a UI close was not swallowed (app navigated away)',
    (await onMainPage()) === false, `still on MainPage: ${await onMainPage()}`)

  await browser.close()
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
})()
