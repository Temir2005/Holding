/**
 * prefers-reduced-motion audit of the running site. With `reduce`, while the page loads and is
 * scrolled through with the wheel (and a few elements are hovered), records:
 *  - inline style changes of transform / translate / scale / rotate / clip-path (JS motion,
 *    e.g. Framer Motion) whose value actually moves (not just set once to a rest state);
 *  - running animations and transitions (document.getAnimations) that change transform,
 *    clip-path, translate, scale, rotate, background-size, stroke-dash* or offset;
 * opacity and colour are allowed (the rule of the system: reduced motion = opacity only).
 *   BASE=... node tools/rm-check.cjs <w>x<h> '<path>' ...
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'
const MOVING = /transform|translate|scale|rotate|clip-path|background-size|stroke-dash|offset|path-length|pathLength/i

;(async () => {
  const [size, ...paths] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  for (const p of paths) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: process.env.NORMAL ? 'no-preference' : 'reduce' })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript((src) => {
      const MOVING = new RegExp(src, 'i')
      const desc = (el) => {
        const sec = el.closest && el.closest('section, header, footer')
        const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') || ''
        return `${el.tagName.toLowerCase()}.${cls.split(' ').filter(Boolean).slice(0, 3).join('.')}` + (sec ? ` in ${sec.id || sec.tagName.toLowerCase()}#${[...document.querySelectorAll('section')].indexOf(sec)}` : '')
      }
      window.__moves = new Map()
      const seen = new WeakMap()
      const note = (el, what) => { const k = desc(el) + ' :: ' + what; window.__moves.set(k, (window.__moves.get(k) || 0) + 1) }
      new MutationObserver((list) => {
        for (const m of list) {
          const el = m.target
          const st = el.style
          if (!st) continue
          const now = ['transform', 'translate', 'scale', 'rotate', 'clipPath'].map((k) => st[k]).join('|')
          const before = seen.get(el)
          seen.set(el, now)
          // the first value is the rest state set on mount; later changes are motion
          if (before !== undefined && before !== now && now.replace(/\|/g, '') !== '') note(el, 'style ' + now.slice(0, 60))
          // SVG paths drawn by Framer (pathLength → stroke-dasharray / offset attributes)
          if (m.attributeName === 'stroke-dashoffset' || m.attributeName === 'stroke-dasharray' || m.attributeName === 'pathLength') {
            const v = el.getAttribute(m.attributeName)
            if (m.oldValue !== null && m.oldValue !== v) note(el, m.attributeName)
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'stroke-dashoffset', 'stroke-dasharray', 'pathLength'] })
      window.__sampleAnims = () => {
        for (const a of document.getAnimations()) {
          if (a.playState !== 'running') continue
          const t = a.effect && a.effect.target
          if (!t) continue
          let props = a.transitionProperty || ''
          if (!props && a.effect.getKeyframes) props = a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join(',')
          if (props.includes('view-transition')) continue
          if (MOVING.test(props)) note(t, (a.animationName ? 'css-anim ' + a.animationName : a.transitionProperty ? 'transition ' : 'waapi ') + props)
        }
      }
    }, MOVING.source)
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < height + 2000; y += 250) {
      await page.mouse.wheel(0, 250)
      await page.waitForTimeout(40)
      await page.evaluate(() => window.__sampleAnims())
    }
    // hover a few interactive things on the way back up
    const targets = await page.$$('main a, main button')
    for (const t of targets.slice(0, 25)) {
      try { await t.hover({ timeout: 500 }); await page.evaluate(() => window.__sampleAnims()) } catch {}
    }
    await page.evaluate(() => window.__sampleAnims())
    const moves = await page.evaluate(() => [...window.__moves.entries()])
    console.log(`${p} @${size} reduced: moving=${moves.length} errors=${errors.length ? errors.join(' | ').slice(0, 200) : 0}`)
    for (const [k, n] of moves.slice(0, 25)) console.log(`   ${n}× ${k}`)
    await page.close()
  }
  await browser.close()
})()
