/**
 * Stage-0 helper: serves design/ over HTTP and drives Chromium (Playwright from the frontend
 * node_modules volume). Modes:
 *   glyphs              — checks Kazakh glyphs in every downloaded font → tools/glyphs.{json,png}
 *   concepts [name...]  — screenshots + scroll video of each prototype → concepts/<name>/shots/
 * Run via design/tools/run.sh (docker, mcr.microsoft.com/playwright).
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')

const ROOT = path.resolve(__dirname, '..')
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webm': 'video/webm',
}

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(ROOT, url)
    if (!file.startsWith(ROOT)) return res.writeHead(403).end()
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) return res.writeHead(404).end('not found')
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, () => resolve(server)))
}

/** One entry per font package: family name and its latin/cyrillic/cyrillic-ext files. */
function fontList() {
  const dir = path.join(ROOT, 'concepts/_shared/fonts')
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'files'))).map((d) => {
    const files = fs.readdirSync(path.join(dir, d, 'files')).filter((f) => f.endsWith('.woff2'))
    // Variable: the plain weight axis file; static: regular 400 (and 700/800 kept for weights).
    const pick = (subset) => files.filter((f) =>
      new RegExp(`-${subset}-(wght|400)-normal\\.woff2$`).test(f))
    const subsets = {}
    for (const s of ['latin', 'cyrillic', 'cyrillic-ext']) {
      const f = pick(s)
      if (f.length) subsets[s] = `/concepts/_shared/fonts/${d}/files/${f[0]}`
    }
    return { pkg: d.replace('_', '/'), family: d.split('_')[1], subsets }
  })
}

async function glyphs(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  await page.goto(`${base}/tools/glyphs.html`)
  const result = await page.evaluate((fonts) => window.runCheck(fonts), fontList())
  fs.writeFileSync(path.join(__dirname, 'glyphs.json'), JSON.stringify(result, null, 2))
  await page.screenshot({ path: path.join(__dirname, 'glyphs.png'), fullPage: true })
  for (const r of result) console.log(`${r.missing.length ? 'MISSING' : 'OK     '} ${r.family}  ${r.missing.join(' ')}`)
}

async function concept(browser, base, name) {
  const out = path.join(ROOT, 'concepts', name, 'shots')
  fs.mkdirSync(out, { recursive: true })
  const problems = []
  const url = (q = '') => `${base}/concepts/${name}/index.html${q}`
  const open = async (opts, q) => {
    const ctx = await browser.newContext(opts)
    const page = await ctx.newPage()
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    await page.goto(url(q))
    await page.evaluate(() => document.fonts.ready)
    return { ctx, page }
  }
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    // First screen with motion on, after the intro has played.
    let { ctx, page } = await open({ viewport: { width: w, height: h } }, '')
    await page.waitForTimeout(2200)
    await page.screenshot({ path: `${out}/first-${w}.png` })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    if (overflow > 0) problems.push(`horizontal overflow ${overflow}px at ${w}`)
    await ctx.close()
    // Whole page in the settled state (reduced motion shows the final frames).
    ;({ ctx, page } = await open({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }, ''))
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/page-${w}.png`, fullPage: true })
    await ctx.close()
  }
  for (const [q, file, full] of [['?menu=open', 'menu-375', false], ['?lang=kk', 'kk-375', true],
    ['?lang=en', 'en-375', false], ['?n=1', 'n1-375', true], ['?n=12', 'n12-375', true]]) {
    const { ctx, page } = await open({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' }, q)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/${file}.png`, fullPage: full })
    await ctx.close()
  }
  for (const q of ['?n=0', '?tone=light', '?tone=accent']) {
    const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, q)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}/${q.slice(1).replace('=', '-')}-1440.png`, fullPage: true })
    await ctx.close()
  }
  // Scroll video: wheel steps so scroll-linked motion plays as a person would see it.
  const vctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } },
  })
  const vpage = await vctx.newPage()
  await vpage.goto(url())
  await vpage.waitForTimeout(2500)
  const total = await vpage.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let y = 0; y < total; y += 120) {
    await vpage.mouse.wheel(0, 120)
    await vpage.waitForTimeout(70)
  }
  await vpage.waitForTimeout(1200)
  const video = vpage.video()
  await vctx.close()
  fs.renameSync(await video.path(), `${out}/scroll-1440.webm`)
  console.log(`${name}: ${problems.length ? problems.join('\n  ') : 'no console errors, no overflow'}`)
}

/** page <path> <out.png> [width]: one full-page screenshot of any file under design/. */
async function onePage(browser, base, [p, outFile, width = '1440']) {
  const page = await browser.newPage({ viewport: { width: +width, height: 900 } })
  await page.goto(`${base}/${p}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => !document.querySelector('script[data-wait]') && (document.title === 'done' || !/frames/.test(location.pathname)), null, { timeout: 60000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(ROOT, outFile), fullPage: true })
}

;(async () => {
  const [mode, ...names] = process.argv.slice(2)
  const server = await serve()
  const base = `http://localhost:${server.address().port}`
  const browser = await chromium.launch()
  try {
    if (mode === 'glyphs') await glyphs(browser, base)
    else if (mode === 'page') await onePage(browser, base, names)
    else for (const n of names.length ? names : ['chertezh', 'monolit', 'sistema']) await concept(browser, base, n)
  } finally {
    await browser.close()
    server.close()
  }
})()
