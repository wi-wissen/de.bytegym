// Proves the lazily-imported maplibre-gl still actually renders a map:
// the chunk must load on demand, the default export must be the Map constructor,
// and the dynamically-imported CSS must reach the document.
const { chromium } = require('playwright-core')

let failures = 0
const check = (name, cond, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failures++
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // Seed a session + a studio with coordinates so StudioTab.initMap() actually runs
  await page.addInitScript(() => {
    // main.js wipes bytegym_studio unless the cache version matches — seed it too,
    // or the coordinates vanish before StudioTab ever sees them.
    localStorage.setItem('bytegym_cache_version', '3')
    localStorage.setItem('bytegym_session', JSON.stringify({
      userId: 'u1', jsessionid: 'x', brandApiUrl: 'http://127.0.0.1:9', loginTime: Date.now(),
    }))
    localStorage.setItem('bytegym_studio', JSON.stringify({
      name: 'Test Gym', lat: 52.52, lng: 13.405, workingHours: {},
    }))
  })

  const chunks = []
  page.on('response', (r) => {
    const u = r.url()
    if (/maplibre/i.test(u) && !/tiles|openfreemap/.test(u)) chunks.push(u.split('/').pop())
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('http://127.0.0.1:1420/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.toolbar.tabbar')

  console.log('\nMAPLIBRE IS NOT IN THE STARTUP PATH')
  check('no maplibre chunk fetched before the Studio tab is used', chunks.length === 0,
    chunks.join(', ') || 'none')

  console.log('\nMAP STILL WORKS WHEN LAZILY LOADED')
  // The seeded API is dead, so the app's ErrorDialog sheet is up and covers the
  // tabbar. Dismiss it with the back gesture (which also re-exercises backDismiss).
  if (await page.$('.sheet-modal.modal-in')) {
    await page.goBack()
    await page.waitForSelector('.sheet-modal.modal-in', { state: 'detached', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(400)
  }

  // Switch to the Studio tab so the map container has a real size
  await page.click('a.tab-link[data-tab="#tab-studio"]')
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1500)

  const state = await page.evaluate(() => {
    const canvas = document.querySelector('.maplibregl-canvas')
    const marker = document.querySelector('.maplibregl-marker')
    // CSS from the dynamic `import('maplibre-gl/dist/maplibre-gl.css')`.
    // maplibre-gl.css is the only thing that sets `.maplibregl-canvas{position:absolute}`,
    // so this proves the lazily-imported stylesheet actually reached the document.
    const cssApplied = !!canvas && getComputedStyle(canvas).position === 'absolute'
    return {
      hasCanvas: !!canvas,
      canvasW: canvas ? canvas.getBoundingClientRect().width : 0,
      canvasH: canvas ? canvas.getBoundingClientRect().height : 0,
      hasMarker: !!marker,
      cssApplied,
    }
  })

  check('maplibre chunk was fetched on demand', chunks.length > 0, chunks.join(', ') || 'NONE')
  check('map canvas rendered', state.hasCanvas)
  check('canvas has real size', state.canvasW > 100 && state.canvasH > 50, `${state.canvasW}x${state.canvasH}`)
  check('marker added', state.hasMarker)
  check('dynamically imported maplibre CSS is applied', state.cssApplied)
  check('no page errors', errors.length === 0, errors.join(' | ') || 'none')

  await browser.close()
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
})()
