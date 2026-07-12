// Guards the two riskiest cleanups:
//  - vue-i18n legacy -> composition: translations must still resolve (not raw keys)
//  - Framework7 css/bundle -> selective imports: no component may lose its styles
const { chromium } = require('playwright-core')

let failures = 0
const check = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) failures++ }

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const warnings = [], errors = []
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))

  await page.addInitScript(() => {
    localStorage.setItem('bytegym_cache_version', '3')
    localStorage.setItem('bytegym_session', JSON.stringify({
      userId: 'u1', jsessionid: 'x', brandApiUrl: 'http://127.0.0.1:9', loginTime: Date.now(),
    }))
    localStorage.setItem('bytegym_studio', JSON.stringify({ name: 'T', lat: 52.52, lng: 13.405, workingHours: {} }))
  })
  await page.goto('http://127.0.0.1:1420/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.toolbar.tabbar')
  await page.waitForTimeout(1500)

  console.log('\nI18N (legacy -> composition)')
  const labels = await page.$$eval('.tabbar-label', (els) => els.map((e) => e.textContent.trim()))
  check('tab labels are translated, not raw keys', labels.length === 4 && !labels.some((l) => l.includes('.')), labels.join(' | '))
  check('navbar title rendered', (await page.$eval('.navbar .title', (e) => e.textContent.trim())).length > 0)
  check('no vue-i18n deprecation warning', !warnings.some((w) => /Legacy API mode has been deprecated/i.test(w)),
    warnings.find((w) => /intlify/i.test(w)) || 'none')

  console.log('\nFRAMEWORK7 CSS (bundle -> selective)')
  const styles = await page.evaluate(() => {
    const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null }
    return {
      tabbarH: g('.toolbar.tabbar', 'height'),          // core: toolbar
      navbarPos: g('.navbar', 'position'),              // core: navbar
      pagePad: g('.page-content', 'paddingBottom'),     // core: page
      tabsDisplay: g('.tabs', 'display') !== null,      // component: tabs
      ptr: !!document.querySelector('.ptr-preloader'),  // component: pull-to-refresh
    }
  })
  check('toolbar/tabbar styled (core css)', styles.tabbarH === '80px', styles.tabbarH)
  check('navbar styled (core css)', styles.navbarPos === 'absolute' || styles.navbarPos === 'fixed', styles.navbarPos)
  check('page-content offset intact', parseFloat(styles.pagePad) >= 80, styles.pagePad)
  check('pull-to-refresh css present', styles.ptr)

  // The ErrorDialog sheet is up (dead API) — proves sheet + modal css survived
  const sheet = await page.evaluate(() => {
    const s = document.querySelector('.sheet-modal.modal-in')
    if (!s) return null
    const cs = getComputedStyle(s)
    const inner = s.querySelector('.sheet-modal-inner')
    return {
      position: cs.position,
      bottom: cs.bottom,
      visible: s.getBoundingClientRect().height > 100,
      grabber: inner ? getComputedStyle(inner, '::before').width : null,
      backdrop: !!document.querySelector('.sheet-backdrop.backdrop-in'),
    }
  })
  check('sheet css present (sheet renders positioned + sized)', sheet && sheet.position === 'absolute' && sheet.visible,
    sheet ? `${sheet.position}, h>100: ${sheet.visible}` : 'no sheet open')
  check('modal backdrop css present', sheet && sheet.backdrop)
  check('sheet grabber still painted', sheet && sheet.grabber === '36px', sheet && sheet.grabber)

  // Dialog css: open the logout confirm
  await page.goBack(); await page.waitForTimeout(500)
  await page.click('.navbar a.link:last-child')
  await page.waitForSelector('.dialog.modal-in', { timeout: 5000 })
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('.dialog.modal-in')
    const r = d.getBoundingClientRect()
    return { w: r.width, h: r.height, pos: getComputedStyle(d).position }
  })
  check('dialog css present (has real box)', dlg.w > 150 && dlg.h > 50 && dlg.pos === 'absolute',
    `${Math.round(dlg.w)}x${Math.round(dlg.h)} ${dlg.pos}`)

  check('no page errors', errors.length === 0, errors.join(' | ') || 'none')

  await browser.close()
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
})()
