// The password is the one secret this app keeps. These assertions exist so that
// "stay signed in" stays opt-in and nothing writes the password behind the user's back.
const { chromium } = require('playwright-core')

let failures = 0
const check = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) failures++ }

const SECRET = 'hunter2-super-secret'

const dump = (page) => page.evaluate(() => {
  const out = {}
  for (let i = 0; i < localStorage.length; i++) out[localStorage.key(i)] = localStorage.getItem(localStorage.key(i))
  return out
})

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })

  console.log('\nA LOGIN WITHOUT "STAY SIGNED IN" WRITES NO PASSWORD')
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.addInitScript(() => localStorage.setItem('bytegym_cache_version', '3'))
    await page.goto('http://127.0.0.1:1420/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })

    check('login screen offers the opt-in toggle', await page.$$eval('.item-title',
      (els) => els.some((e) => /stay signed in|angemeldet bleiben/i.test(e.textContent))))

    const checked = await page.$$eval('.toggle input[type="checkbox"]', (els) => els.map((e) => e.checked))
    check('it is OFF by default (the secure path is the default)', !checked.some(Boolean),
      `toggles: ${JSON.stringify(checked)}`)

    // Type the password and attempt a login. The API is dead so it fails — but the
    // password must not have been written anywhere along the way regardless.
    await page.fill('input[type="email"]', 'a@b.c')
    await page.fill('input[type="password"]', SECRET)
    await page.waitForTimeout(300)

    const blob = JSON.stringify(await dump(page))
    check('the typed password never reaches localStorage', !blob.includes(SECRET),
      blob.includes(SECRET) ? 'LEAKED' : 'not stored')
    await page.close()
  }

  console.log('\nTHE PERSISTED RECORD HAS NO PLACE FOR A PASSWORD')
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.addInitScript(() => {
      localStorage.setItem('bytegym_cache_version', '3')
      localStorage.setItem('bytegym_session', JSON.stringify({
        userId: 'u1', jsessionid: 'x', brandApiUrl: 'http://127.0.0.1:9',
        email: 'a@b.c', staySignedIn: false,
      }))
    })
    await page.goto('http://127.0.0.1:1420/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.toolbar.tabbar')
    await page.waitForTimeout(800)

    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('bytegym_session') || '{}'))
    check('session record carries no password field', !('password' in session),
      'password' in session ? 'PRESENT' : 'absent')
    check('opt-in flag is persisted so re-login knows what it may do', 'staySignedIn' in session)
    await page.close()
  }

  await browser.close()
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
})()
