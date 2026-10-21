/**
 * Text contrast where axe cannot decide (gradients, pseudo-elements, overlaps): for every
 * visible text node, its colour (with opacity of the element chain) against the nearest
 * solid background colour up the tree, composited over the page background. WCAG AA:
 * 4.5:1, or 3:1 for large text (24px, or 18.66px bold). Lists what falls short.
 *   BASE=... node tools/contrast-check.cjs <w>x<h> '<path>' ...
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'
;(async () => {
  const [size, ...paths] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  let bad = 0
  for (const p of paths) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    if (process.env.SELFTEST) await page.evaluate(() => { const s = document.querySelectorAll('main section')[1]; const d = document.createElement('p'); d.textContent = 'low contrast probe'; d.style.color = 'rgb(200,200,200)'; s.prepend(d) })
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)) } })
    await page.waitForTimeout(600)
    const r = await page.evaluate(() => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a } }
      const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 })
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
      const background = (el) => {
        const layers = []
        for (let n = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor)
          if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break }
        }
        let bg = { r: 255, g: 255, b: 255, a: 1 }
        for (const l of layers.reverse()) bg = over(l, bg)
        return bg
      }
      const out = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const seen = new Set()
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const el = t.parentElement
        if (!el || seen.has(el) || !t.textContent.trim()) continue
        seen.add(el)
        if (el.closest('[aria-hidden="true"], svg, script, style, noscript, [hidden]')) continue
        const rect = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (!rect.width || !rect.height || cs.visibility === 'hidden') continue
        let opacity = 1
        for (let n = el; n; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity)
        if (opacity === 0) continue
        const c = parse(cs.color); if (!c) continue
        const bg = background(el)
        const fg = over({ ...c, a: c.a * opacity }, bg)
        const px = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700
        const large = px >= 24 || (px >= 18.66 && bold)
        const need = large ? 3 : 4.5
        const k = ratio(fg, bg)
        if (k < need) out.push(`${k.toFixed(2)} < ${need} "${t.textContent.trim().slice(0, 40)}" ${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} ${px}px`)
      }
      return out
    })
    bad += r.length
    console.log(`${p} @${size}: below AA=${r.length}`)
    for (const l of r.slice(0, 15)) console.log('   ' + l)
    await page.close()
  }
  console.log('TOTAL below AA: ' + bad)
  await browser.close()
})()
