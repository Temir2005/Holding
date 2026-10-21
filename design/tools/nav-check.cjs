/**
 * Page change check on the running site: hover over a menu link warms up the page (data request
 * before the click), the click runs a view transition, the new page starts at the top at once
 * (no smooth glide), and the content is there. Also an in-page anchor stays smooth.
 *   BASE=... [REDUCED=1] node tools/nav-check.cjs <w>x<h>
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'

;(async () => {
  const [w, h] = (process.argv[2] || '1440x900').split('x').map(Number)
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    window.__vt = 0
    window.__scrolls = []
    const t0 = () => Math.round(performance.now())
    const orig = window.scrollTo.bind(window)
    window.scrollTo = (...a) => { window.__scrolls.push({ t: t0(), a: JSON.stringify(a), sb: getComputedStyle(document.documentElement).scrollBehavior, y: Math.round(scrollY), st: new Error().stack.split('\n').slice(2, 4).join(' ').replace(/https?:[^)]*\//g, '') }); return orig(...a) }
    addEventListener('click', () => window.__scrolls.push({ t: t0(), a: 'click' }), true)
    const start = document.startViewTransition?.bind(document)
    if (start) document.startViewTransition = (cb) => { window.__vt++; return start(cb) }
  })
  const requests = []
  page.on('request', (r) => r.url().includes('/api/') && requests.push({ t: Date.now(), url: r.url().replace(/^.*\/api\/v1/, '') }))
  await page.goto(BASE + '/ru', { waitUntil: 'networkidle' })
  // to the bottom, then a little up so the header shows again
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(300)
  await page.mouse.wheel(0, -200)
  await page.waitForTimeout(500)
  const link = page.locator('header nav a[href="/ru/development"]').first()
  const visible = await link.isVisible()
  requests.length = 0
  await link.hover()
  await page.waitForTimeout(400)
  const warmed = requests.map((r) => r.url)
  const yBefore = await page.evaluate(() => scrollY)
  await link.click()
  const ys = []
  for (let i = 0; i < 10; i++) { ys.push(await page.evaluate(() => Math.round(scrollY))); await page.waitForTimeout(50) }
  await page.waitForTimeout(800)
  const after = await page.evaluate(() => ({
    path: location.pathname, vt: window.__vt, sections: document.querySelectorAll('main section').length,
    skeleton: document.querySelectorAll('.animate-pulse').length,
    vtSupported: typeof document.startViewTransition === 'function',
  }))
  console.log(`@${w}x${h} reduced=${!!process.env.REDUCED} header link visible=${visible}`)
  console.log(`  hover warmed: ${JSON.stringify(warmed)}`)
  console.log(`  scrollY before=${yBefore} after click (every 50ms): ${ys.join(',')}`)
  if (process.env.DEBUG) console.log((await page.evaluate(() => window.__scrolls)).slice(-12).map((x) => JSON.stringify(x)).join('\n'))
  console.log(`  ${JSON.stringify(after)} errors=${errors.length ? errors.join(' | ') : 0}`)
  // in-page anchor: still smooth
  const anchor = await page.evaluate(() => {
    const el = document.querySelector('main section[id]:not(:first-child)')
    return el ? el.id : null
  })
  if (anchor) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await page.evaluate((id) => { const a = document.createElement('a'); a.href = '#' + id; a.id = '__a'; a.textContent = 'x'; a.style.cssText = 'position:fixed;top:200px;left:10px;z-index:9999'; document.body.append(a) }, anchor)
    await page.click('#__a')
    const ys2 = []
    for (let i = 0; i < 6; i++) { ys2.push(await page.evaluate(() => Math.round(scrollY))); await page.waitForTimeout(60) }
    console.log(`  in-page #${anchor}: scrollY ${ys2.join(',')}`)
  }
  await browser.close()
})()
