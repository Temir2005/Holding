/**
 * Every block in uncomfortable conditions on the dev bench (/dev/sections): 0, 1, 3, 12 items,
 * long Kazakh texts, no images, dark and accent tones, at 375 and 1440. For each load reports
 * what is wrong: render errors (the error boundary or console), horizontal page scroll,
 * elements sticking out of the viewport (outside scroll strips), clipped text (overflow hidden
 * with more content than room) and a sheet left empty. Writes a screenshot of every bad case.
 *   node tools/bench-check.cjs <outDir> [type ...]
 */
const path = require('path')
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'
const TYPES = 'hero stats about_text timeline divisions_grid projects_showcase project_list capabilities process_steps production tokenization_explainer team_grid clients_marquee clients_grid testimonials quote cta contact_form media_gallery video vacancies geography'.split(' ')

const variants = () => {
  const v = []
  for (const w of [375, 1440]) {
    for (const n of [0, 1, 3, 12]) v.push({ w, q: `n=${n}&long=1`, lang: 'kk' })
    v.push({ w, q: 'n=3&media=0', lang: 'ru' })
    v.push({ w, q: 'n=12', lang: 'en' })
  }
  for (const tone of ['dark', 'accent']) v.push({ w: 1440, q: `n=3&long=1&tone=${tone}`, lang: 'kk' })
  return v
}

async function inspect(page) {
  return page.evaluate(() => {
    const problems = []
    if (/failed to render/i.test(document.body.innerText)) problems.push('error boundary')
    const vw = document.documentElement.clientWidth
    if (document.documentElement.scrollWidth > vw + 1) problems.push(`page scrolls sideways by ${document.documentElement.scrollWidth - vw}px`)
    // a strip that scrolls on its own or the running line of logos may extend past the screen
    const intended = (el) => {
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || /marquee/.test(cs.animationName)) return true
      }
      return false
    }
    const sections = [...document.querySelectorAll('main section')]
    for (const s of sections) {
      if (s.offsetHeight < 60) problems.push(`empty sheet (${s.offsetHeight}px)`)
      // text past the edge of the screen: clipped by the sheet, so the page does not scroll,
      // but cut off for the reader. Measured on the text itself (a block keeps its box width).
      const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT)
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const el = t.parentElement
        if (!el || !t.textContent.trim() || el.closest('[aria-hidden="true"], svg, [hidden]')) continue
        // visually hidden text for screen readers (sr-only: a 1px box that clips) is not on screen
        const box = el.getBoundingClientRect()
        if (box.width <= 1 && getComputedStyle(el).overflow === 'hidden') continue
        const range = document.createRange()
        range.selectNodeContents(t)
        const r = range.getBoundingClientRect()
        if (!r.width || !r.height) continue
        if ((r.right > vw + 1 || r.left < -1) && !intended(el)) {
          problems.push(`past the edge: ${el.tagName.toLowerCase()} "${t.textContent.trim().slice(0, 24)}" ${Math.round(r.left)}…${Math.round(r.right)}`)
          break
        }
      }
      for (const el of s.querySelectorAll('h1, h2, h3, h4, p, a, button, li, dd, dt, span')) {
        const cs = getComputedStyle(el)
        if (!['hidden', 'clip'].includes(cs.overflowX) && !['hidden', 'clip'].includes(cs.overflowY)) continue
        if (el.closest('[aria-hidden="true"]') || cs.position === 'absolute') continue
        if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
          if (el.clientWidth > 0 && el.textContent.trim().length > 0 && !el.querySelector('img, video, svg'))
            problems.push(`clipped text: ${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}" ${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight}`)
        }
      }
    }
    return [...new Set(problems)].slice(0, 6)
  })
}

;(async () => {
  const [out, ...only] = process.argv.slice(2)
  const types = only.length ? only : TYPES
  const browser = await chromium.launch()
  let loads = 0
  let bad = 0
  for (const type of types) {
    for (const v of variants()) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.w < 500 ? 812 : 900 } })
      const errors = []
      page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 100)))
      page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push('console ' + m.text().slice(0, 100)))
      const url = `/${v.lang}/dev/sections?type=${type}&${v.q}`
      await page.goto(BASE + url, { waitUntil: 'networkidle' })
      if (process.env.SELFTEST)
        await page.evaluate(() => {
          const s = document.querySelector('main section')
          const word = document.createElement('h3')
          word.textContent = 'Қазақстанныңиндустриялықдамуыныңстратегиялықбағдарламасы'.repeat(2)
          word.style.cssText = 'font-size:48px;white-space:nowrap'
          const cut = document.createElement('p')
          cut.textContent = 'Clipped '.repeat(40)
          cut.style.cssText = 'height:20px;overflow:hidden'
          s.append(word, cut)
        })
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)) } scrollTo({ top: 0, behavior: 'instant' }) })
      await page.waitForTimeout(500)
      const problems = [...errors, ...(await inspect(page))]
      loads++
      if (problems.length) {
        bad++
        const name = `${type}-${v.lang}-${v.w}-${v.q.replace(/[^a-z0-9]+/gi, '_')}.png`
        await page.screenshot({ path: path.join(out, name), fullPage: true })
        console.log(`BAD ${url} @${v.w}: ${problems.join(' | ')}`)
      }
      await page.close()
    }
    console.log(`.. ${type} done`)
  }
  console.log(`loads=${loads} bad=${bad}`)
  await browser.close()
})()
