/**
 * Interaction states audit on the running site:
 *  - every .link-draw inside a link/button must react to hovering that link (direct child or
 *    the link itself), otherwise its underline never draws;
 *  - every interactive element (a, button, [role=tab], input, select, textarea, summary) gets a
 *    visible focus indicator on keyboard focus (outline, box-shadow or a changed border/bg);
 *  - interactive elements smaller than 24×24 (WCAG 2.2 target size minimum) are listed.
 *   BASE=... node tools/states-check.cjs <w>x<h> '<path>' ...
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'

;(async () => {
  const [size, ...paths] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  for (const p of paths) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)) }
      scrollTo({ top: 0, behavior: 'instant' })
    })
    await page.waitForTimeout(500)
    const report = await page.evaluate(() => {
      const describe = (el) => {
        const sec = el.closest('section[id], header, footer, section')
        const txt = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)
        return `${el.tagName.toLowerCase()} "${txt}"${sec ? ' in ' + (sec.id || sec.tagName.toLowerCase()) : ''}`
      }
      const deepDraw = [...document.querySelectorAll('.link-draw')].filter((el) => {
        if (el.matches('a, button')) return false
        const host = el.closest('a, button')
        return host && el.parentElement !== host && !/group-hover/.test(el.className)
      }).map((el) => describe(el.closest('a, button')))
      const small = [...document.querySelectorAll('a[href], button, [role=tab], input:not([type=hidden]), select, textarea')]
        .filter((el) => {
          if (el.tabIndex < 0) return false
          const r = el.getBoundingClientRect()
          const hit = getComputedStyle(el, '::after')
          const hh = hit.content !== 'none' && hit.position === 'absolute' ? parseFloat(hit.height) || 0 : 0
          return r.width > 0 && r.height > 0 && (r.width < 24 || Math.max(r.height, hh) < 24) && getComputedStyle(el).visibility !== 'hidden'
        })
        .map((el) => { const r = el.getBoundingClientRect(); return `${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}` })
      return { deepDraw: [...new Set(deepDraw)], small: [...new Set(small)] }
    })
    // keyboard focus: keyboard modality once, then focus every tabbable element in turn
    await page.keyboard.press('Tab')
    const focus = await page.evaluate(async () => {
      const els = [...document.querySelectorAll('a[href], button, [role=tab], input, select, textarea, summary, [tabindex]')]
        .filter((el) => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
      const bad = []
      for (const el of els) {
        el.focus()
        await new Promise((r) => requestAnimationFrame(() => r()))
        if (document.activeElement !== el) continue
        const cs = getComputedStyle(el)
        const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none')
        const child = [...el.querySelectorAll('*')].some((c) => { const s = getComputedStyle(c); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 })
        if (!ring && !child) {
          const sec = el.closest('section[id], header, footer, section')
          bad.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"${sec ? ' in ' + (sec.id || sec.tagName.toLowerCase()) : ''}`)
        }
      }
      return { count: els.length, bad }
    })
    const count = focus.count
    const noFocus = focus.bad
    console.log(`${p} @${size}: focusable=${count} noFocusRing=${noFocus.length} deepLinkDraw=${report.deepDraw.length} small=${report.small.length}`)
    for (const d of [...new Set(noFocus)]) console.log('   no ring: ' + d)
    for (const d of report.deepDraw) console.log('   deep link-draw: ' + d)
    for (const d of report.small) console.log('   small: ' + d)
    await page.close()
  }
  await browser.close()
})()
