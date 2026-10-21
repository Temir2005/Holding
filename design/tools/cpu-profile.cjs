/**
 * CPU profile of a cold load (4× CPU throttling): self time by function, top N, for a build
 * made without minification (names and modules readable).
 *   BASE=... node tools/cpu-profile.cjs '<path>' [top]
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:4173'
;(async () => {
  const [p, top = '30'] = process.argv.slice(2)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 823 } })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.RATE || 4) })
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
  await cdp.send('Profiler.start')
  await page.goto(BASE + p, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const { profile } = await cdp.send('Profiler.stop')
  const byId = new Map(profile.nodes.map((n) => [n.id, n]))
  const self = new Map()
  const dt = profile.timeDeltas
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i])
    const f = n.callFrame
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`
    self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000)
  }
  const total = [...self.values()].reduce((a, b) => a + b, 0)
  console.log(`sampled ${Math.round(total)} ms`)
  for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, +top)) console.log(`${String(Math.round(v)).padStart(6)} ms  ${k}`)
  await browser.close()
})()
