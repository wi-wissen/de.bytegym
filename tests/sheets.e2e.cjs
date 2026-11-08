// Chart sheets used to be hard to get out of: their content scrolled in a plain
// overflow div, which Framework7 can't see, so a downward drag either fought the
// scroll or snapped back to the sheet's single breakpoint. This drives REAL touch
// drags against the AppSheet that replaced them, plus the root back step (back from
// another tab returns to Home instead of leaving the app).
const { chromium } = require('playwright-core')

let failures = 0
const check = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) failures++ }

;(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, headless: true } : { channel: 'msedge', headless: true })
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

  // The dead API opens the ErrorDialog sheet; get it out of the way.
  const closeErrorSheet = async () => {
    for (let i = 0; i < 3 && await page.$('.sheet-modal.modal-in'); i++) {
      await page.goBack()
      await page.waitForTimeout(600)
    }
  }
  await closeErrorSheet()

  const cdp = await ctx.newCDPSession(page)
  const drag = async (x, y0, dy) => {
    const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    })
    await touch('touchStart', y0)
    await page.waitForTimeout(30)
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', y0 + (dy * i) / steps)
      await page.waitForTimeout(25)
    }
    await touch('touchEnd', y0 + dy)
    await page.waitForTimeout(700)
  }
  const sheetOpen = () => page.evaluate(() => !!document.querySelector('.app-sheet.modal-in'))
  const openBioAge = async () => {
    await closeErrorSheet()
    await page.tap('#tab-home .card.ripple >> nth=1') // a real tap: F7 swallows a mouse click right after a swipe until the next touch
    await page.waitForSelector('.app-sheet.modal-in', { timeout: 5000 })
    await page.waitForTimeout(500)
  }
  const center = (sel) => page.$eval(sel, (e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 40) }
  })

  console.log('\nSHAPE')
  await openBioAge()
  const shape = await page.evaluate(() => {
    const s = document.querySelector('.app-sheet.modal-in')
    const body = s.querySelector('.app-sheet-body')
    return {
      top: s.getBoundingClientRect().top,
      bodyIsPageContent: body.classList.contains('page-content'),
      title: s.querySelector('.app-sheet-header h2').textContent.trim(),
    }
  })
  check('content scrolls in a .page-content (what F7 checks before dragging)', shape.bodyIsPageContent)
  check('sheet leaves backdrop to tap above it', shape.top >= 48, `top=${Math.round(shape.top)}px`)
  check('sheet has a title', shape.title.length > 0, shape.title)

  console.log('\nDRAG THE HEADER DOWN')
  let p = await center('.app-sheet.modal-in .app-sheet-header')
  await drag(p.x, p.y, 350)
  check('header drag closed the sheet', !(await sheetOpen()))

  console.log('\nDRAG SCROLLED CONTENT DOWN')
  await openBioAge()
  // Make the content tall and scroll into it, like a long measurement table.
  await page.evaluate(() => {
    const body = document.querySelector('.app-sheet.modal-in .app-sheet-body')
    const filler = document.createElement('div')
    filler.style.height = '2000px'
    filler.id = 'filler'
    body.appendChild(filler)
    body.scrollTop = 300
  })
  await page.waitForTimeout(100)
  p = await center('.app-sheet.modal-in .app-sheet-body')
  await drag(p.x, p.y + 100, 150)
  check('scrolled content: the drag scrolls, sheet stays open', await sheetOpen())

  // Let the previous drag's fling settle, then put the content at its top.
  await page.waitForTimeout(1500)
  await page.evaluate(() => { document.querySelector('.app-sheet.modal-in .app-sheet-body').scrollTop = 0 })
  await page.waitForTimeout(300)
  // The sheet is now full height; a slow drag closes past half of it.
  await drag(p.x, p.y + 100, 500)
  check('content at the top: the drag closes the sheet', !(await sheetOpen()))
  await page.evaluate(() => document.getElementById('filler')?.remove())

  console.log('\nTAP THE BACKDROP / CLOSE BUTTON')
  await openBioAge()
  await page.touchscreen.tap(195, 20)
  await page.waitForTimeout(700)
  check('backdrop tap closed the sheet', !(await sheetOpen()))

  await openBioAge()
  await page.tap('.app-sheet.modal-in .sheet-close')
  await page.waitForTimeout(700)
  check('close button closed the sheet', !(await sheetOpen()))

  console.log('\nBACK FROM ANOTHER TAB')
  await closeErrorSheet()
  await page.tap('a.tab-link[data-tab="#tab-leaderboard"]')
  await page.waitForTimeout(600)
  await closeErrorSheet()
  check('on the leaderboard tab', await page.evaluate(() => document.querySelector('#tab-leaderboard').classList.contains('tab-active')))
  await page.goBack()
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => ({
    home: document.querySelector('#tab-home')?.classList.contains('tab-active'),
    main: !!document.querySelector('.toolbar.tabbar'),
  }))
  check('back went to Home', after.home)
  check('and stayed in the app', after.main)

  await browser.close()
  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
  process.exit(failures ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
