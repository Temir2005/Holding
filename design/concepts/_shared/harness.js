/*
 * Shared harness for the stage-0 prototypes. Gives every concept the same data and the same
 * stress switches, so they are compared on equal terms:
 *   ?lang=ru|kk|en       content language (kk/en are draft translations for length tests)
 *   ?n=0|1|3|12          number of items in stats, process steps and the showcase
 *   ?tone=dark|light|accent  overrides the tone of every section except the hero
 *   ?menu=open           opens the mobile menu on load (for the 375 screenshot)
 *   ?accent=red|amber    accent variant (the concept decides what it maps to)
 *   ?stages=demo         illustrative cycle stages for in-progress projects (NOT facts)
 *   ?nomedia=1           process steps without photos (the drawing fallback must carry the scene)
 * Exposes window.MS. Load after content.js, before the concept's own script.
 */
;(function () {
  const C = window.MS_CONTENT
  const q = new URLSearchParams(location.search)
  const lang = ['ru', 'kk', 'en'].includes(q.get('lang')) ? q.get('lang') : 'ru'
  const n = q.has('n') ? Math.max(0, Math.min(12, parseInt(q.get('n'), 10) || 0)) : null
  const tone = ['dark', 'light', 'accent'].includes(q.get('tone')) ? q.get('tone') : null
  const accent = ['red', 'amber'].includes(q.get('accent')) ? q.get('accent') : 'red'
  const demoStages = q.get('stages') === 'demo'
  const noMedia = q.get('nomedia') === '1'
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  /** Localized text with the API's fallback to ru; null stays null. */
  const t = (v) => (v == null ? null : typeof v === 'string' ? v : v[lang] || v.ru || null)

  /** Repeats a list up to `count` items (marks copies) — only for the ?n stress test. */
  function take(list, count) {
    if (count == null) return list
    const out = []
    for (let i = 0; i < count; i++) out.push(list[i % Math.max(list.length, 1)])
    return list.length ? out : []
  }

  const statsItems = n == null ? C.stats.items : take([...C.stats.items, ...C.stats.extra], n)
  const featured = C.showcase.featuredSlugs.map((s) => C.projects.find((p) => p.slug === s))
  const showcaseItems = n == null ? featured : take(C.projects, n)

  const sectionTone = (s) => tone || s.tone

  const CYCLE = ['land', 'design', 'materials', 'construction', 'handover']
  /**
   * Where a project is in the full cycle: { index 0-4, key, done }.
   * Uses project.cycle_stage (proposed backend field) when set; otherwise only what the current
   * status allows: planned → land, in_progress → construction, completed → handover (done).
   * ?stages=demo spreads in-progress projects over design / materials / construction to show
   * intermediate states — illustration only.
   */
  function projectStage(p, i = 0) {
    let key = p.cycle_stage
    if (!key && demoStages && p.status === 'in_progress') key = ['design', 'materials', 'construction'][i % 3]
    if (!key) key = p.status === 'planned' ? 'land' : p.status === 'in_progress' ? 'construction' : 'handover'
    return { index: CYCLE.indexOf(key), key, done: p.status === 'completed' }
  }

  const nf = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU')
  /** Number in the site's format: thin no-break space as thousands separator for ru/kk. */
  const num = (v) => (v == null ? '' : nf.format(v).replace(/\s/g, ' '))

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

  /**
   * A neutral photo plate: keeps the real aspect ratio (no layout shift), says what photo goes
   * there. Concepts style .ms-plate / .ms-plate__label themselves.
   */
  function plate(media, extraClass = '') {
    const w = media?.width || 3, h = media?.height || 2
    const subject = media?.subject || 'фото'
    return `<div class="ms-plate ${extraClass}" style="aspect-ratio:${w}/${h}" role="img" aria-label="${esc(t(media?.alt) || subject)}">` +
      `<span class="ms-plate__label">ФОТО · ${esc(subject)}</span></div>`
  }

  function link(params) {
    const p = new URLSearchParams(location.search)
    for (const [k, v] of Object.entries(params)) (v == null ? p.delete(k) : p.set(k, v))
    const s = p.toString()
    return location.pathname + (s ? `?${s}` : '')
  }

  /** Small debug panel (hidden for automated screenshots). */
  function panel() {
    if (navigator.webdriver) return
    const el = document.createElement('details')
    el.className = 'ms-debug'
    const opt = (key, values) =>
      `<div><b>${key}</b> ` + values.map((v) => {
        const active = (q.get(key) ?? '') === (v ?? '')
        return `<a href="${link({ [key]: v })}"${active ? ' aria-current="true"' : ''}>${v ?? '—'}</a>`
      }).join(' ') + '</div>'
    el.innerHTML = `<summary>stress</summary>${opt('lang', [null, 'kk', 'en'])}${opt('n', [null, '0', '1', '3', '12'])}` +
      `${opt('tone', [null, 'dark', 'light', 'accent'])}${opt('accent', [null, 'amber'])}${opt('nomedia', [null, '1'])}<div><a href="../../index.html">← все концепции</a></div>`
    document.body.append(el)
    const css = document.createElement('style')
    css.textContent = `.ms-debug{position:fixed;right:12px;bottom:12px;z-index:9999;font:12px/1.6 ui-monospace,monospace;
      background:#111;color:#eee;border:1px solid #444;border-radius:6px;padding:6px 10px;max-width:260px}
      .ms-debug summary{cursor:pointer}.ms-debug a{color:#9cf;margin-right:6px}.ms-debug a[aria-current]{color:#fc6;font-weight:700}`
    document.head.append(css)
  }

  document.documentElement.lang = lang
  window.MS = {
    C, lang, n, tone, accent, reduced, CYCLE, projectStage, t, num, esc, plate, sectionTone,
    menuOpen: q.get('menu') === 'open',
    hero: C.hero,
    stats: { ...C.stats, items: statsItems },
    process: { ...C.process, steps: take(C.process.steps, n).map((s) => (noMedia ? { ...s, media: null } : s)) },
    // Swatches moved from the hero to production (proposed field ProductionData.swatches).
    production: { ...C.production, swatches: C.hero.swatches },
    showcase: { ...C.showcase, items: showcaseItems },
    projects: C.projects,
    nav: C.site.navigation,
    ui: (key) => t(key.split('.').reduce((o, k) => o?.[k], C.ui)),
  }
  addEventListener('DOMContentLoaded', panel)
})()
