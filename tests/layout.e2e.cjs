// Drives the real app in Edge at a phone viewport and MEASURES the tabbar +
// the sheet grabber, rather than eyeballing the CSS.
const { chromium } = require('playwright-core')

const URL = 'http://127.0.0.1:1420/'
let failures = 0
const check = (name, cond, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failures++
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // Seed a session so the router lands on MainPage instead of /login/
  await page.addInitScript(() => {
    localStorage.setItem('bytegym_session', JSON.stringify({
      userId: 'u1', jsessionid: 'x', brandApiUrl: 'http://127.0.0.1:9', loginTime: Date.now(),
    }))
  })

  page.on('pageerror', (e) => console.log('  [pageerror]', e.message))
  await page.goto(URL, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForSelector('.toolbar.tabbar', { timeout: 15000 })

  console.log('\nTABBAR')
  const bar = await page.evaluate(() => {
    const tb = document.querySelector('.toolbar.tabbar')
    const link = tb.querySelector('.tab-link')
    const icon = link.querySelector('i.icon')
    const label = link.querySelector('.tabbar-label')
    const cs = getComputedStyle(tb)
    const page_ = document.querySelector('.page-content') || document.querySelector('.tabs .page-content')
    return {
      hasIconsClass: tb.classList.contains('tabbar-icons'),
      barTop: tb.getBoundingClientRect().top,
      barH: tb.getBoundingClientRect().height,
      toolbarHeightVar: cs.getPropertyValue('--f7-toolbar-height').trim(),
      iconTop: icon.getBoundingClientRect().top,
      labelBottom: label.getBoundingClientRect().bottom,
      labelDisplay: getComputedStyle(label).display,
      pagePadBottom: page_ ? getComputedStyle(page_).paddingBottom : null,
    }
  })

  const spaceAbove = bar.iconTop - bar.barTop
  const spaceBelow = bar.barTop + bar.barH - bar.labelBottom
  check('tabbar-icons class applied', bar.hasIconsClass)
  check('bar height is the M3 nav-bar 80px', Math.round(bar.barH) === 80, `${bar.barH}px`)
  check('label renders as block', bar.labelDisplay === 'block')
  check('space ABOVE icon > 12px (the reported bug: was ~0)', spaceAbove > 12, `${spaceAbove.toFixed(1)}px`)
  check('content vertically centred (top ≈ bottom, ±3px)', Math.abs(spaceAbove - spaceBelow) <= 3,
    `above ${spaceAbove.toFixed(1)} / below ${spaceBelow.toFixed(1)}`)
  check('page-content reserves the full bar height', parseFloat(bar.pagePadBottom) >= 80,
    `padding-bottom ${bar.pagePadBottom} vs bar ${bar.barH}px`)

  console.log('\nSHEET GRABBER')
  const grab = await page.evaluate(() => {
    // Mount a sheet exactly as the app declares one and measure the ::before handle
    const el = document.createElement('div')
    el.className = 'sheet-modal sheet-surface rounded-t-2xl'
    el.style.cssText = 'display:block;height:95vh'
    el.innerHTML = '<div class="sheet-modal-inner"><div class="flex flex-col h-full overflow-y-auto"><div class="sticky top-0">H</div></div></div>'
    document.body.appendChild(el)
    const inner = el.querySelector('.sheet-modal-inner')
    const cs = getComputedStyle(inner, '::before')   // handle now lives on the inner
    const hairline = getComputedStyle(el, '::before') // F7's sheet top border
    const scroller = el.querySelector('.overflow-y-auto')
    return {
      content: cs.content,
      w: cs.width, h: cs.height, top: cs.top, radius: cs.borderRadius,
      opacity: cs.opacity,
      bg: cs.backgroundColor,
      innerPadTop: getComputedStyle(inner).paddingTop,
      innerPosition: getComputedStyle(inner).position,
      boxSizing: getComputedStyle(el).boxSizing,
      sheetH: el.getBoundingClientRect().height,
      innerH: inner.getBoundingClientRect().height,
      scrollerTop: scroller.getBoundingClientRect().top - el.getBoundingClientRect().top,
      sheetOverflowY: getComputedStyle(el).overflowY,
      hairlineH: hairline.height, hairlineW: hairline.width,
    }
  })
  check('handle is rendered', grab.content === '""', `content=${grab.content}`)
  check('handle is 36x4 px', grab.w === '36px' && grab.h === '4px', `${grab.w} x ${grab.h}`)
  check('handle sits 8px from the top', grab.top === '8px', grab.top)
  check('handle is visible (has a real colour, not transparent)', parseFloat(grab.opacity) > 0 && grab.bg !== 'rgba(0, 0, 0, 0)', `opacity ${grab.opacity}, bg ${grab.bg}`)
  check('handle is pill-shaped', grab.radius === '999px', grab.radius)
  check('inner is the containing block for it', grab.innerPosition === 'relative', grab.innerPosition)
  check('inner has 20px top padding to clear the handle', grab.innerPadTop === '20px', grab.innerPadTop)
  check("F7's own top hairline survives (not clobbered)", grab.hairlineH === '1px' && grab.hairlineW !== '36px', `${grab.hairlineW} x ${grab.hairlineH}`)
  check('content starts below the handle (no overlap)', grab.scrollerTop >= 20, `scroller starts at ${grab.scrollerTop}px`)
  check('border-box: padding does not inflate 95vh', grab.boxSizing === 'border-box' && Math.round(grab.sheetH) === Math.round(0.95 * 844),
    `sheet ${grab.sheetH}px vs 95vh=${(0.95 * 844).toFixed(0)}px`)
  check('sheet itself does not scroll (handle stays pinned)', grab.sheetOverflowY !== 'auto' && grab.sheetOverflowY !== 'scroll', grab.sheetOverflowY)

  await browser.close()
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
})()
