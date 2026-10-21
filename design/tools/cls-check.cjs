/**
 * Layout shift check of the running site: loads each page cold (no cache), records every
 * layout-shift entry (buffered, from navigation start), then scrolls through the page with the
 * wheel and back. Reports CLS (all shifts not caused by input), the largest single shift with
 * the elements that moved, horizontal overflow and console errors.
 * Usage (playwright container, host network, see stage-2-brief.md):
 *   BASE=http://localhost:4173 node tools/cls-check.cjs <w>x<h> '<path>' ...
 *   REDUCED=1 ... for prefers-reduced-motion
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'

;(async () => {
  const [size, ...paths] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  for (const p of paths) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.addInitScript(() => {
      window.__shifts = []
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue
          window.__shifts.push({
            t: Math.round(e.startTime),
            v: e.value,
            y: Math.round(scrollY),
            nodes: (e.sources || []).map((s) => {
              const n = s.node
              if (!n || !n.tagName) return '#text'
              const sec = n.closest && n.closest('section, header, footer, main > *')
              return `${n.tagName.toLowerCase()}.${String(n.className).split(' ').slice(0, 2).join('.')}` +
                (sec ? ` in ${sec.tagName.toLowerCase()}${sec.id ? '#' + sec.id : ''}` : '')
            }),
          })
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    if (process.env.SELFTEST) await page.evaluate(() => { const d = document.createElement('div'); d.style.height = '200px'; document.querySelector('main').prepend(d) })
    await page.waitForTimeout(800)
    const firstScreen = await page.evaluate(() => window.__shifts.reduce((s, e) => s + e.v, 0))
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < height; y += 300) {
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(600)
    for (let y = height; y > 0; y -= 600) {
      await page.mouse.wheel(0, -600)
      await page.waitForTimeout(40)
    }
    await page.waitForTimeout(600)
    if (process.env.HOVER) {
      // hover every link and button of the page in turn: hover never counts as input for CLS
      const targets = await page.$$('main a, main button, header a, header button, footer a')
      for (const t of targets) {
        try { await t.hover({ timeout: 400 }); await page.waitForTimeout(120) } catch {}
      }
      await page.waitForTimeout(500)
    }
    const r = await page.evaluate(() => ({
      shifts: window.__shifts,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }))
    const total = r.shifts.reduce((s, e) => s + e.v, 0)
    const worst = r.shifts.slice().sort((a, b) => b.v - a.v)[0]
    console.log(
      `${p} @${size}: CLS load=${firstScreen.toFixed(4)} total=${total.toFixed(4)} shifts=${r.shifts.length}` +
        ` overflow=${r.overflow} errors=${errors.length ? errors.join(' | ').slice(0, 300) : 0}` +
        (worst && worst.v > +(process.env.MIN_SHIFT || 0.001) ? `\n   worst ${worst.v.toFixed(4)} at t=${worst.t} y=${worst.y}: ${worst.nodes.slice(0, 4).join(', ')}` : ''),
    )
    await ctx.close()
  }
  await browser.close()
})()
