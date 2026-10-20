/**
 * Scroll check of the pinned «полный цикл» scene in the Chertezh prototype: real wheel scrolling,
 * records the active step and the sticky stage position, down and back up. Also checks
 * reduced motion (no pinning) and horizontal overflow.
 * Usage (via docker, see run.sh): node tools/scene-check.cjs
 */
const http = require('http'), fs = require('fs'), path = require('path')
const { chromium } = require('@playwright/test')
const ROOT = path.resolve(__dirname, '..')
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]))
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end()
  const t = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' }
  res.writeHead(200, { 'content-type': t[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
;(async () => {
  await new Promise((r) => server.listen(0, r))
  const base = `http://localhost:${server.address().port}/concepts/chertezh/index.html`
  const browser = await chromium.launch()
  for (const [w, h, q] of [[1440, 900, ''], [375, 812, ''], [375, 812, '?n=7'], [375, 812, '?n=3&lang=kk']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(base + q)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1500)
    const info = await page.evaluate(() => {
      const s = document.querySelector('.scene')
      return s ? { top: s.getBoundingClientRect().top + scrollY, height: s.offsetHeight, n: s.querySelectorAll('.panel').length } : null
    })
    if (!info) { console.log(`${w}${q}: NO SCENE`); continue }
    await page.evaluate((y) => scrollTo(0, y), info.top - h)
    const seq = []
    let stuck = true
    const sample = async () => {
      await page.waitForTimeout(120)
      return page.evaluate(() => {
        const st = document.querySelector('.scene__stage').getBoundingClientRect()
        const a = [...document.querySelectorAll('.scene .panel')].findIndex((p) => p.classList.contains('is-active'))
        const s = document.querySelector('.scene').getBoundingClientRect()
        return { a, stageTop: Math.round(st.top), inScene: s.top <= 0 && s.bottom >= innerHeight }
      })
    }
    for (let y = 0; y < info.height + h; y += 120) {
      await page.mouse.wheel(0, 120)
      const r = await sample()
      if (r.inScene && Math.abs(r.stageTop) > 1) stuck = false
      if (!seq.length || seq[seq.length - 1] !== r.a) seq.push(r.a)
    }
    const up = []
    for (let y = 0; y < info.height + h; y += 120) {
      await page.mouse.wheel(0, -120)
      const r = await sample()
      if (!up.length || up[up.length - 1] !== r.a) up.push(r.a)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    console.log(`${w}x${h}${q}: steps=${info.n} sceneHeight=${(info.height / h).toFixed(2)}vh-units down=[${seq.join(',')}] up=[${up.join(',')}] stagePinned=${stuck} overflow=${overflow} errors=${errors.length}`)
    await page.close()
  }
  const rm = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' })
  await rm.goto(base)
  await rm.waitForTimeout(800)
  const r = await rm.evaluate(() => {
    const s = document.querySelector('.scene'), st = document.querySelector('.scene__stage')
    return { scene: !!s, position: st ? getComputedStyle(st).position : null, height: s ? s.offsetHeight : null, panels: document.querySelectorAll('.panel').length }
  })
  console.log('reduced motion 375:', JSON.stringify(r))
  await browser.close(); server.close()
})()
