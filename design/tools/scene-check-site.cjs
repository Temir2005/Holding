/**
 * Scroll check of the pinned «полный цикл» scene on the running dev site (React version):
 * real wheel scrolling down and back up, records the open stage and whether the sticky stage
 * stays at the top while the scene is under the viewport. Also: horizontal overflow, overflow of
 * the open panel inside the stage, reduced motion (no pinning).
 * Usage (playwright container, host network, see stage-2-brief.md):
 *   node tools/scene-check-site.cjs                     # the default set of pages
 *   node tools/scene-check-site.cjs shots <out> <w>x<h> '<path>' <stage|pre> ...  # one-screen shots
 */
const path = require('path')
const { chromium } = require('@playwright/test')
const BASE = 'http://localhost:5173'

const sceneInfo = (page) =>
  page.evaluate(() => {
    const s = document.querySelector('[data-scene]')
    return s ? { top: s.getBoundingClientRect().top + scrollY, height: s.offsetHeight, n: s.querySelectorAll('ol[role=list] > li').length } : null
  })

async function open(browser, w, h, p, reduced = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(BASE + p, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(800)
  return { page, errors }
}

async function check(browser, w, h, p) {
  const { page, errors } = await open(browser, w, h, p)
  const info = await sceneInfo(page)
  if (!info) { console.log(`| ${p} | ${w}×${h} | NO SCENE |`); return page.close() }
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), info.top - h)
  await page.mouse.move(w / 2, h / 2)
  let pinned = true
  let overflow = 0
  const sample = async () => {
    await page.waitForTimeout(110)
    return page.evaluate(() => {
      const stEl = document.querySelector('[data-scene-stage]')
      if (!stEl) return { a: -1, stageTop: 0, inScene: false, over: 0 } // e.g. a dev reload
      const st = stEl.getBoundingClientRect()
      const s = document.querySelector('[data-scene]').getBoundingClientRect()
      const panels = [...document.querySelectorAll('[data-scene] ol[role=list] > li')]
      const a = panels.findIndex((x) => x.hasAttribute('data-open'))
      // content of the open panel that does not fit its box (px)
      const pn = panels[a]
      let over = 0
      if (pn) {
        const box = pn.getBoundingClientRect()
        for (const c of pn.querySelectorAll('*')) {
          const r = c.getBoundingClientRect()
          if (r.width && r.height) over = Math.max(over, Math.round(box.top - r.top), Math.round(r.bottom - box.bottom))
        }
      }
      return { a, stageTop: Math.round(st.top), inScene: s.top <= 0 && s.bottom >= innerHeight, over }
    })
  }
  const down = []
  for (let y = 0; y < info.height + h; y += 120) {
    await page.mouse.wheel(0, 120)
    const r = await sample()
    if (r.inScene && Math.abs(r.stageTop) > 1) pinned = false
    if (r.inScene) overflow = Math.max(overflow, r.over)
    if (!down.length || down[down.length - 1] !== r.a) down.push(r.a)
  }
  const up = []
  for (let y = 0; y < info.height + h; y += 120) {
    await page.mouse.wheel(0, -120)
    const r = await sample()
    if (!up.length || up[up.length - 1] !== r.a) up.push(r.a)
  }
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  const fmt = (a) => a.map((i) => i + 1).join('→')
  console.log(`| ${p} | ${w}×${h} | ${info.n} | ${fmt(down)} | ${fmt(up)} | ${pinned ? 'да' : 'НЕТ'} | ${overflow > 1 ? overflow + ' px' : 'нет'} | ${hscroll} | ${errors.length ? errors.join(' / ').slice(0, 160) : 0} |`)
  await page.close()
}

async function shots(browser, out, size, p, which) {
  const [w, h] = size.split('x').map(Number)
  const { page } = await open(browser, w, h, p)
  const info = await sceneInfo(page)
  for (const k of which) {
    if (!info) break
    const range = info.height - h
    const y = k === 'pre' ? info.top - h * 0.55 : k === 'post' ? info.top + info.height - h * 0.6 : info.top + ((+k - 0.5) / info.n) * range
    // walk there with the wheel so scroll-linked values settle like a real scroll
    await page.evaluate((t) => scrollTo({ top: t - 240, behavior: 'instant' }), y)
    await page.mouse.move(w / 2, h / 2)
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(900)
    const name = `${p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}-${w}x${h}-${k}.png`
    await page.screenshot({ path: path.join(out, name) })
    console.log(name)
  }
  await page.close()
}

;(async () => {
  const browser = await chromium.launch()
  const [mode, ...args] = process.argv.slice(2)
  if (mode === 'shots') {
    const [out, size, p, ...which] = args
    await shots(browser, out, size, p, which)
  } else {
    console.log('| страница | экран | N | этапы вниз | этапы вверх | сцена закреплена | переполнение панели | гориз. скролл | ошибки |')
    console.log('|---|---|---|---|---|---|---|---|---|')
    const sets = [
      ['/ru/dev/sections?type=process_steps&n=5', [[1440, 900], [1920, 1080], [768, 1024], [375, 812], [375, 667]]],
      ['/ru/dev/sections?type=process_steps&n=3', [[1440, 900], [375, 667]]],
      ['/ru/dev/sections?type=process_steps&n=7', [[1440, 900], [375, 667]]],
      ['/ru/dev/sections?type=process_steps&n=5&media=0', [[1440, 900]]],
      ['/kk/dev/sections?type=process_steps&n=5&long=1', [[1440, 900], [375, 812]]],
      ['/ru/development', [[1440, 900], [375, 812]]],
      ['/kk/development', [[1280, 720], [375, 667]]],
    ]
    for (const [p, sizes] of sets) for (const [w, h] of sizes) await check(browser, w, h, p)
    const { page } = await open(browser, 375, 812, '/ru/development', true)
    const r = await page.evaluate(() => ({ scene: !!document.querySelector('[data-scene]'), items: document.querySelectorAll('main ol[role=list] > li').length }))
    console.log(`\nreduced motion 375 /ru/development: scene=${r.scene} listItems=${r.items}`)
    await page.close()
  }
  await browser.close()
})()
