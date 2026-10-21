/**
 * Where the main thread goes on a cold load: a Chrome trace with 4× CPU throttling, the long
 * tasks (>50 ms) after the first paint, each split into style, layout, script, paint.
 *   BASE=... node tools/trace-tasks.cjs '<path>' [w]
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:8080'
;(async () => {
  const [p, w = '412'] = process.argv.slice(2)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: +w, height: 823 } })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] })
  await page.goto(BASE + p, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const buf = await browser.stopTracing()
  const events = JSON.parse(buf.toString()).traceEvents
  const main = events.find((e) => e.name === 'TracingStartedInBrowser')
  const fcp = events.find((e) => e.name === 'firstContentfulPaint')
  const t0 = events.filter((e) => e.name === 'navigationStart').map((e) => e.ts).sort()[0]
  const tasks = events.filter((e) => e.name === 'RunTask' && e.dur > 50000).sort((a, b) => a.ts - b.ts)
  const kinds = { UpdateLayoutTree: 'style', Layout: 'layout', FunctionCall: 'script', EvaluateScript: 'script', 'v8.compile': 'compile', Paint: 'paint', PrePaint: 'paint', HitTest: 'other', ParseHTML: 'parse', TimerFire: 'script', FireAnimationFrame: 'raf', 'ResizeObserver::Callback': 'ro', IntersectionObserverController: 'io', MinorGC: 'gc', MajorGC: 'gc' }
  console.log(`FCP at ${fcp ? Math.round((fcp.ts - t0) / 1000) : '?'} ms; long tasks: ${tasks.length}`)
  for (const t of tasks) {
    const inside = events.filter((e) => e.tid === t.tid && e.ts >= t.ts && e.ts + (e.dur || 0) <= t.ts + t.dur && e.dur && kinds[e.name])
    const sum = {}
    for (const e of inside) sum[kinds[e.name]] = (sum[kinds[e.name]] || 0) + e.dur / 1000
    const fn = inside.filter((e) => e.name === 'FunctionCall').map((e) => (e.args?.data?.functionName || '') + '@' + (e.args?.data?.url || '').split('/').pop()).slice(0, 3)
    console.log(`  +${Math.round((t.ts - t0) / 1000)} ms  ${Math.round(t.dur / 1000)} ms  ` + Object.entries(sum).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ') + `  ${fn.join(' ')}`)
  }
  await browser.close()
})()
