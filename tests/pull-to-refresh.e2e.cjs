// Pull-to-refresh was wired to f7-tab, which has no `ptr` prop and never emits
// `ptr:refresh` — so it silently never fired. This drives a REAL touch drag to
// prove the gesture now reaches the refresh handler.
const { chromium } = require('playwright-core')

let failures = 0
const check = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) failures++ }

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('bytegym_cache_version', '3')
    localStorage.setItem('bytegym_session', JSON.stringify({
      userId: 'u1', jsessionid: 'x', brandApiUrl: 'http://127.0.0.1:9', loginTime: Date.now(),
    }))
  })
  await page.goto('http://127.0.0.1:1420/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.toolbar.tabbar')
  await page.waitForTimeout(1200)

  console.log('\nWIRING')
  const wiring = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tabs > .page-content')]
    return {
      count: tabs.length,
      allAreTabs: tabs.every((t) => t.classList.contains('tab')),
      allPtrContent: tabs.every((t) => t.classList.contains('ptr-content')),
      preloaders: tabs.filter((t) => t.querySelector(':scope > .ptr-preloader')).length,
    }
  })
  check('4 tab page-contents', wiring.count === 4, String(wiring.count))
  check('each carries the .tab class', wiring.allAreTabs)
  check('each is now a .ptr-content (was missing entirely)', wiring.allPtrContent)
  check('each got a .ptr-preloader', wiring.preloaders === 4, `${wiring.preloaders}/4`)

  console.log('\nREAL TOUCH DRAG FIRES THE REFRESH')
  // Dismiss the ErrorDialog sheet (dead API) so it doesn't eat the gesture
  if (await page.$('.sheet-modal.modal-in')) {
    await page.goBack()
    await page.waitForTimeout(600)
  }
  // Watch for F7's own ptr lifecycle events on the active tab
  await page.evaluate(() => {
    window.__ptr = []
    const el = document.querySelector('.tabs > .page-content.tab-active')
    el.scrollTop = 0
    for (const ev of ['ptr:pullstart', 'ptr:pullmove', 'ptr:refresh', 'ptr:done']) {
      el.addEventListener(ev, () => window.__ptr.push(ev))
    }
  })

  // Start the drag below the navbar — the page-content's rect starts at y=0, but the
  // navbar overlays that strip and would swallow the touch (it's a sibling, so the
  // events would never bubble to the scroll container).
  const box = await page.$eval('.tabs > .page-content.tab-active', (e) => {
    const r = e.getBoundingClientRect()
    const navH = document.querySelector('.navbar').getBoundingClientRect().height
    return { x: r.x + r.width / 2, y: r.y + navH + 20 }
  })
  const cdp = await ctx.newCDPSession(page)
  // id must be non-zero: F7 stores it as `touchId` and guards `&& touchId` on
  // touchend, so an identifier of 0 would make it bail out.
  const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x: box.x, y, id: 1 }],
  })
  await touch('touchStart', box.y)
  await page.waitForTimeout(50)
  for (let y = box.y + 15; y <= box.y + 240; y += 15) {
    await touch('touchMove', y)
    await page.waitForTimeout(40)
  }
  await touch('touchEnd', box.y + 240)
  await page.waitForTimeout(3000)

  const events = await page.evaluate(() => window.__ptr)
  const uniq = [...new Set(events)].join(' -> ')
  check('F7 saw the pull start', events.includes('ptr:pullstart'), uniq || 'no events')
  check('the pull crossed the threshold and fired ptr:refresh', events.includes('ptr:refresh'), uniq || 'none')

  // Not asserting the `ptr:done` EVENT: F7 only triggers it from a `transitionend`,
  // which is unreliable headless. `done()` itself synchronously drops .ptr-refreshing,
  // so that class clearing is the honest proof our callback ran — and this API is
  // DEAD, i.e. exactly the failure path where done() used to be skipped entirely.
  const stillRefreshing = await page.$eval('.tabs > .page-content.tab-active',
    (e) => e.classList.contains('ptr-refreshing'))
  check('done() ran even though every request failed (spinner released)', !stillRefreshing,
    stillRefreshing ? 'STUCK in .ptr-refreshing' : '.ptr-refreshing cleared')

  await browser.close()
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
})()
