/** Median of the Lighthouse runs per page: scores and the key metrics. */
const fs = require('fs')
const path = require('path')
const dir = process.argv[2]
const runs = {}
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.report.json'))) {
  const name = f.replace(/-\d\.report\.json$/, '')
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  ;(runs[name] ??= []).push(r)
}
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]
for (const [name, rs] of Object.entries(runs)) {
  const s = (k) => median(rs.map((r) => Math.round(r.categories[k].score * 100)))
  const a = (k) => median(rs.map((r) => r.audits[k].numericValue))
  console.log(
    `${name}: Performance ${s('performance')}, Accessibility ${s('accessibility')}, Best practices ${s('best-practices')}, SEO ${s('seo')} | ` +
      `LCP ${(a('largest-contentful-paint') / 1000).toFixed(2)} s, CLS ${a('cumulative-layout-shift').toFixed(3)}, TBT ${Math.round(a('total-blocking-time'))} ms, FCP ${(a('first-contentful-paint') / 1000).toFixed(2)} s, SI ${(a('speed-index') / 1000).toFixed(2)} s` +
      ` | runs perf: ${rs.map((r) => Math.round(r.categories.performance.score * 100)).join(', ')}`,
  )
  const r = rs[0]
  const failing = Object.values(r.audits).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual')
  for (const x of failing.slice(0, 12)) console.log(`   ${x.id}: ${x.score} ${x.displayValue ?? ''}`)
}
