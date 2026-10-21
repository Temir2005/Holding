/**
 * Landing on #anchor of another page, with lazy sections:
 *  - cold: the page opened by URL with a hash;
 *  - client: from another page through the router (history.pushState + popstate);
 *  - user: cold, but the visitor scrolls at once: the landing must not take the scroll.
 * Samples scrollY every 40 ms; reports the distinct positions it went through (one landing =
 * 0 → target), where the target ends up relative to its scroll-margin, and its drift 1.5 s later.
 *   BASE=... node tools/anchor-check.cjs <w>x<h>
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'
const CASES = [
  ['cold', '/ru/development#contacts'],
  ['cold', '/ru/team#vacancies'],
  ['cold', '/ru/projects#tokenization'],
  ['cold', '/kk/smart-panels#contacts'],
  ['client', '/ru', '/ru/team#vacancies'],
  ['client', '/ru/clients', '/en/development#portfolio'],
  ['user', '/ru/development#contacts'],
]

async function sampleUntilQuiet(page, id) {
  const ys = []
  let last = -1
  let still = 0
  // quiet = scrollY unchanged for 1.2 s, and only once the target exists (lazy sections in)
  for (let i = 0; i < 250 && (still < 30 || !(await page.evaluate((id) => !!document.getElementById(id), id))); i++) {
    const y = await page.evaluate(() => Math.round(scrollY))
    if (y !== last) { ys.push(y); still = 0 } else still++
    last = y
    await page.waitForTimeout(40)
  }
  return ys
}

const landing = (page, id) => page.evaluate((id) => {
  const el = document.getElementById(id)
  if (!el) return null
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  return Math.round(el.getBoundingClientRect().top - margin)
}, id)

;(async () => {
  const [w, h] = (process.argv[2] || '1440x900').split('x').map(Number)
  const browser = await chromium.launch()
  for (const [kind, from, to] of CASES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const target = (to || from).split('#')[1]
    let ys
    if (kind === 'client') {
      await page.goto(BASE + from, { waitUntil: 'networkidle' })
      await page.evaluate((url) => { history.pushState(history.state, '', url); dispatchEvent(new PopStateEvent('popstate', { state: history.state })) }, to)
      ys = await sampleUntilQuiet(page, target)
    } else {
      const nav = page.goto(BASE + from, { waitUntil: 'commit' })
      await nav
      if (kind === 'user') {
        await page.waitForSelector('header', { timeout: 10000 })
        await page.mouse.move(w / 2, h / 2)
        await page.mouse.wheel(0, 300)
      }
      ys = await sampleUntilQuiet(page, target)
    }
    const off = await landing(page, target)
    await page.waitForTimeout(1500)
    const drift = await landing(page, target)
    const ok = kind === 'user' ? Math.max(...ys) < 2000 : off !== null && Math.abs(off) <= 2 && Math.abs(drift - off) <= 2
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${kind.padEnd(6)} ${(to ? from + ' → ' + to : from).padEnd(46)} @${w}x${h} scrollY: ${ys.join(' → ')} | target offset ${off} px, after 1.5 s ${drift} px`)
    await page.close()
  }
  await browser.close()
})()
