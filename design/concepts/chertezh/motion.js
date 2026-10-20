/*
 * Concept A, "Chertezh" v2: one red line runs through the whole page and is drawn by scrolling.
 *
 * Line contract (see README.md): every section enters at its top edge and leaves at its bottom
 * edge at x = --trace-x (the binding margin). Inside, a section may draw its own path (hero
 * horizon, stats dimension, cycle contour, project scales); a section without its own drawing
 * runs a straight vertical. Every path has pathLength=1, so drawing is just dashoffset = 1 - p.
 *
 * Progress of a section = (pen - top) / height with the pen at 78% of the viewport, i.e.
 * Framer's useScroll({ target, offset: ['start 78%', 'end 78%'] }). Paths with turns map that
 * progress piecewise (useTransform(progress, keys, lengths)).
 */
;(() => {
  const MS = window.MS
  const { t, esc, num, ui } = MS
  // ?settle=1: a service switch for full-page screenshots, everything in the final state like
  // reduced motion, without touching the reduced-motion path itself.
  const settle = new URLSearchParams(location.search).get('settle') === '1'
  // ?scene=K: service switch for screenshots, scrolls the pinned cycle scene to stage K (reveals off).
  const sceneQ = new URLSearchParams(location.search).get('scene')
  const sceneShot = sceneQ === 'pre' ? -1 : parseInt(sceneQ, 10) || 0 // pre: just before the pin
  const canObserve = 'IntersectionObserver' in window
  const reduced = MS.reduced || settle || !canObserve
  const root = document.documentElement
  root.dataset.accent = MS.accent
  if (new URLSearchParams(location.search).get('fallback') === '1') root.classList.add('is-fallback')

  /* UI strings missing from the shared ui dictionary; on the site they go to frontend/src/i18n. */
  const LOCAL = {
    skip: { ru: 'К содержанию', kk: 'Мазмұнға өту', en: 'Skip to content' },
    sheet: { ru: 'Лист', kk: 'Парақ', en: 'Sheet' },
    sheets: { ru: 'Листов', kk: 'Парақтар', en: 'Sheets' },
    legend: { ru: 'Условные обозначения', kk: 'Шартты белгілер', en: 'Legend' },
    index: { ru: 'Ведомость листов', kk: 'Парақтар тізімі', en: 'Sheet index' },
    nav: { ru: 'Основная навигация', kk: 'Негізгі навигация', en: 'Main navigation' },
    contacts: { ru: 'Контакты', kk: 'Байланыс', en: 'Contacts' },
    home: { ru: 'На главную', kk: 'Басты бетке', en: 'Home page' },
    no: { ru: '№', kk: '№', en: 'No.' },
  }
  const u = (k) => t(LOCAL[k])
  const LANGS = [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']]
  const pad = (n) => String(n).padStart(2, '0')
  const $ = (sel, el = document) => el.querySelector(sel)
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)]

  function langHref(code) {
    const p = new URLSearchParams(location.search)
    code === 'ru' ? p.delete('lang') : p.set('lang', code)
    p.delete('menu')
    const s = p.toString()
    return location.pathname + (s ? `?${s}` : '')
  }

  /* ------------------------------------------------------------------ shared drawing parts */

  const guides = () => `<div class="guides" aria-hidden="true">${'<i></i>'.repeat(12)}</div>`

  /** The section's own share of the line. Geometry is set in layout(), all paths pathLength=1. */
  const traceSvg = (extra = '') =>
    '<svg class="trace" aria-hidden="true" focusable="false"><path class="trace__path" pathLength="1"/>' +
    `<g class="trace__branches"></g><g class="trace__corners"></g>${extra}<circle class="trace__head" cx="0" cy="0" r="3.5"/></svg>`

  /** Dimension line |<-- label -->| in ink, label optional. */
  const dim = (label = '', cls = '') =>
    `<div class="dim ${cls}" aria-hidden="true"><span class="dim__line"></span>` +
    `<i class="dim__end dim__end--l"></i><i class="dim__end dim__end--r"></i>` +
    (label ? `<span class="dim__label mono">${esc(label)}</span>` : '') + '</div>'

  const cropMarks = () => '<span class="crop" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
  const arrow = '<span class="arr" aria-hidden="true"><i></i></span>'

  const sections = $$('main > section[data-block]')
  const total = sections.length + 1 // the footer is the last sheet of the set
  const sheetNo = (el) => `${pad(sections.indexOf(el) + 1)} / ${pad(total)}`

  function head(el, s, aside = '') {
    const eyebrow = t(s.eyebrow), title = t(s.title)
    return `<header class="sh${title ? '' : ' sh--bare'}">` +
      `<p class="sh__meta mono" data-rv="fade"><span class="sh__no">${sheetNo(el)}</span>` +
      (eyebrow ? `<span class="sh__eyebrow">${esc(eyebrow)}</span>` : '') + '</p>' +
      (title ? `<h2 class="h2 sh__title" data-split>${esc(title)}</h2>` : '') +
      (aside ? `<div class="sh__aside" data-rv="fade">${aside}</div>` : '') + '</header>'
  }
  const empty = () => `<div class="empty">${dim(ui('empty'), 'dim--empty')}</div>`

  function mount(el, tone, cls, html, extra = '') {
    el.className = `sec ${cls} tone-${tone}`
    el.innerHTML = guides() + traceSvg(extra) + html
  }

  /* ------------------------------------------------------------------ header, skip, menu */

  const name = MS.C.site.name
  const contacts = MS.C.site.contacts
  $('[data-block="skip"]').textContent = u('skip')

  const langList = (cls) => `<ul class="${cls}" role="list">` + LANGS.map(([code, label]) =>
    `<li><a href="${esc(langHref(code))}" hreflang="${code}" lang="${code}"` +
    `${code === MS.lang ? ' aria-current="true"' : ''}>${label}</a></li>`).join('') + '</ul>'

  const hdr = $('[data-block="header"]')
  hdr.innerHTML =
    `<a class="hdr__logo" href="./" aria-label="${esc(name)}, ${esc(u('home'))}">` +
    `<span class="hdr__mark" aria-hidden="true"></span>${esc(name)}</a>` +
    `<nav class="hdr__nav" aria-label="${esc(u('nav'))}"><ul role="list">` +
    MS.nav.map((n) => `<li><a class="ln-draw" href="${esc(n.href)}">${esc(t(n.label))}</a></li>`).join('') + '</ul></nav>' +
    `<div class="hdr__lang mono" aria-label="${esc(ui('language'))}" role="group">${langList('langs')}</div>` +
    `<button class="hdr__menu mono" type="button" aria-expanded="false" aria-controls="menu">` +
    `<span class="hdr__menu-ico" aria-hidden="true"><i></i><i></i></span>${esc(ui('menu'))}</button>`

  const contactsHtml = (cls) =>
    `<address class="${cls}"><span>${esc(t(contacts.address))}</span>` +
    `<a class="ln-draw" href="tel:${esc(contacts.phone.replace(/[^\d+]/g, ''))}">${esc(contacts.phone)}</a>` +
    `<a class="ln-draw" href="mailto:${esc(contacts.email)}">${esc(contacts.email)}</a></address>`

  $('[data-block="menu"]').outerHTML =
    `<div class="menu tone-light" id="menu" role="dialog" aria-modal="true" aria-label="${esc(ui('menu'))}" hidden>` +
    '<span class="menu__rail" aria-hidden="true"></span>' + guides() +
    `<div class="menu__bar"><span class="hdr__logo"><span class="hdr__mark" aria-hidden="true"></span>${esc(name)}</span>` +
    `<button class="menu__close mono" type="button">${esc(ui('close'))}<span class="menu__x" aria-hidden="true"></span></button></div>` +
    `<nav class="menu__nav" aria-label="${esc(u('nav'))}"><ol role="list">` +
    MS.nav.map((n, i) => `<li style="--i:${i}"><a href="${esc(n.href)}"><span class="mono menu__idx">${pad(i + 1)}</span>` +
      `<span class="menu__label">${esc(t(n.label))}</span></a></li>`).join('') + '</ol></nav>' +
    `<div class="menu__foot"><div class="menu__lang"><p class="mono menu__cap">${esc(ui('language'))}</p>${langList('langs langs--big')}</div>` +
    `<div class="menu__contacts"><p class="mono menu__cap">${esc(u('contacts'))}</p>${contactsHtml('contacts')}</div></div></div>`

  /* ------------------------------------------------------------------ hero (always dark) */

  const finishOf = (f) => (['gloss', 'matte', 'texture'].includes(f) ? f : 'matte')

  ;(function hero() {
    // LCP: the h1, the subtitle and the CTAs are static and visible from the first paint.
    // Only the line, the horizon, the frame of the shot and its crop marks are animated.
    const el = $('[data-block="hero"]')
    const h = MS.hero
    const ctas = (h.ctas || []).map((c) =>
      `<a class="btn btn--${c.variant === 'primary' ? 'primary' : 'secondary'}" href="${esc(c.href)}">` +
      `<span>${esc(t(c.label))}</span>${arrow}</a>`).join('')
    const eyebrow = t(h.eyebrow)
    const stamp =
      '<div class="stamp">' +
      `<div class="stamp__main"><span class="stamp__name">${esc(name)}</span>` +
      (eyebrow ? `<span class="stamp__eyebrow mono">${esc(eyebrow)}</span>` : '') + '</div>' +
      `<div class="stamp__cell"><span class="mono stamp__k">${esc(u('sheet'))}</span><span class="mono stamp__v">${pad(sections.indexOf(el) + 1)}</span></div>` +
      `<div class="stamp__cell"><span class="mono stamp__k">${esc(u('sheets'))}</span><span class="mono stamp__v">${pad(total)}</span></div>` +
      `<div class="stamp__cell stamp__cell--wide"><span class="mono stamp__k">${esc(ui('language'))}</span><span class="mono stamp__v">${LANGS.find(([c]) => c === MS.lang)[1]}</span></div>` +
      '</div>'
    el.className = 'sec hero tone-dark'
    el.innerHTML = guides() +
      traceSvg('<g class="trace__origin"><circle cx="8" cy="0" r="6"/><path d="M2 0H14M8 -6V6"/></g>') +
      `<h1 class="h1 hero__title">${esc(t(h.title))}</h1>` +
      '<div class="hero__datum" aria-hidden="true"><span></span><i class="hero__level mono">±0,000</i></div>' +
      '<div class="hero__body"><div class="hero__lead">' +
      (t(h.subtitle) ? `<p class="lead">${esc(t(h.subtitle))}</p>` : '') +
      (ctas ? `<div class="hero__ctas">${ctas}</div>` : '') + '</div>' +
      `<figure class="hero__figure frame" data-rv="wipe">${cropMarks()}${MS.plate(h.background, 'ms-plate--hero')}${stamp}</figure>` +
      '</div>'
  })()

  /* ------------------------------------------------------------------ stats */

  const isUnit = (s) => /\p{L}/u.test(s || '')
  const affix = (s, side) => (s == null || s === '' ? '' : isUnit(s)
    ? `<span class="unit unit--${side} mono">${esc(s.trim())}</span>`
    : `<span class="sym">${esc(s.trim())}</span>`)
  /** Figure with the final value reserving the width, so the count-up never shifts layout. */
  const figure = (it) =>
    `<span class="sr">${esc(`${it.prefix || ''}${num(it.value)}${it.suffix || ''}`)}</span>` +
    `<span class="stat__fig" aria-hidden="true">${affix(it.prefix, 'pre')}` +
    `<span class="num" data-count="${it.value}"><span class="num__final">${num(it.value)}</span>` +
    `<span class="num__live">${num(it.value)}</span></span>${affix(it.suffix, 'post')}</span>`
  /** Approximate width of a figure in em, for sizing the hero number to the column. */
  const charsOf = (it) => num(it.value).length * 0.62 +
    [it.prefix, it.suffix].reduce((a, s) => a + (s ? (isUnit(s) ? 0.55 : 0.45) : 0), 0)

  ;(function stats() {
    const el = $('[data-block="stats"]')
    const s = MS.stats
    const [first, ...rest] = s.items || []
    const heroStat = first
      ? `<div class="stat-hero" data-branch-scope style="--chars:${charsOf(first).toFixed(2)}">` +
        '<div class="stat-hero__fig">' +
        '<div class="stat-hero__dim" aria-hidden="true"><span class="stat-hero__span" data-branch="right"></span><i class="stat-hero__end"></i></div>' +
        `<p class="stat__value stat__value--hero" data-rv="count">${figure(first)}</p></div>` +
        `<div class="stat-hero__side" data-rv="dim"><p class="stat__label stat-hero__label"><span class="mono stat-hero__no" aria-hidden="true">01</span>${esc(t(first.label))}</p>${dim()}</div></div>`
      : ''
    const chain = rest.length
      ? `<ol class="stats__list" role="list">` + rest.map((it, i) =>
        `<li class="stat" data-rv="dim" style="--i:${i}">${dim(pad(i + 2))}` +
        `<p class="stat__value">${figure(it)}</p><p class="stat__label">${esc(t(it.label))}</p></li>`).join('') + '</ol>'
      : ''
    mount(el, MS.sectionTone(s), 'stats', head(el, s) + (first ? heroStat + chain : empty()))
  })()

  /* ------------------------------------------------------------------ process steps (the cycle)
     With motion and 2+ stages: a pinned scroll scene (N x 100svh, sticky stage of 100svh).
     Reduced motion, ?settle=1 or a single stage: a plain list, everything open. */

  /* ------------------------------------------------------------------ the drawing of the cycle
     Fallback for stages without a photo: one sheet (plan + elevation) that every stage adds a
     layer to. 12 elementary parts in cycle order; part k belongs to stage floor(k * N / 12), so
     any N from 1 to 12 gets every stage at least one part, none twice. Each part draws by p
     inside the first 75% of its stage's share (every path pathLength=1). */
  function drawingSvg(N) {
    const L = (pts) => 'M' + pts.map((p) => p.join(' ')).join('L')
    const lines = (arr) => arr.map((d) => `<path d="${d}" pathLength="1"/>`).join('')
    const hatch = (x0, y0, x1, y1, step) => { // 45° hatch clipped to a rectangle
      const out = []
      for (let c = x0 + y0 + step; c < x1 + y1; c += step) {
        const a = [Math.max(x0, c - y1), Math.min(y1, c - x0)], b = [Math.min(x1, c - y0), Math.max(y0, c - x1)]
        out.push(L([[a[0], c - a[0]], [b[0], c - b[0]]]))
      }
      return out
    }
    const win = (x, y) => `M${x} ${y}h16v18h-16Z`
    const parts = [
      ['site', lines([L([[30, 64], [212, 44], [226, 262], [42, 280], [30, 64]])])],
      ['dim', lines(['M30 30H212', 'M30 24V36', 'M212 24V36', 'M14 64V280', 'M8 64H20', 'M8 280H20'])],
      ['plan', lines([L([[74, 96], [184, 96], [184, 222], [74, 222], [74, 96]])])],
      ['axes mute', lines(['M74 84V234', 'M129 84V234', 'M184 84V234', 'M62 96H196', 'M62 159H196', 'M62 222H196'])],
      ['walls', lines(['M129 96V159', 'M74 159H184', 'M156 159V222', 'M96 222V206'])],
      ['elev', lines(['M250 300H470', L([[272, 300], [272, 112], [446, 112], [446, 300]])])],
      ['hatch', lines(hatch(272, 206, 446, 300, 14))],
      ['hatch', lines(hatch(272, 112, 446, 206, 14))],
      ['frame', lines(['M300 112V300', 'M359 112V300', 'M418 112V300'])],
      ['slabs', lines(['M264 253H454', 'M264 206H454', 'M264 159H454'])],
      ['roof', lines(['M264 112H454', 'M276 104H442', win(282, 222), win(341, 222), win(400, 222), win(282, 175), win(341, 175), win(400, 175), win(282, 128), win(341, 128), win(400, 128)])],
      ['mark accent', lines(['M462 300V112', 'M456 300H468', 'M456 112H468', 'M452 312l10 -12l10 12Z'])],
    ]
    const per = Array.from({ length: N }, () => [])
    parts.forEach((_, k) => per[Math.floor((k * N) / parts.length)].push(k))
    return '<svg class="drawing" viewBox="0 0 480 340" aria-hidden="true" focusable="false">' +
      parts.map(([cls, html], k) => {
        const s = Math.floor((k * N) / parts.length), list = per[s], j = list.indexOf(k)
        const a = (s + (0.75 * j) / list.length) / N, b = (s + (0.75 * (j + 1)) / list.length) / N
        return `<g class="dw ${cls}" data-a="${a.toFixed(4)}" data-b="${b.toFixed(4)}">${html}</g>`
      }).join('') +
      '<text class="dw__level" x="402" y="330">±0,000</text></svg>'
  }

  const sceneMode = !reduced && (MS.process.steps || []).length >= 2

  ;(function process() {
    const el = $('[data-block="process_steps"]')
    const s = MS.process
    const steps = s.steps || []
    const N = steps.length
    const aside = t(s.intro)
      ? `<p class="sh__intro">${esc(t(s.intro))}</p>`
      : N ? `<div class="sh__range">${dim(N > 1 ? `${pad(1)} — ${pad(N)}` : pad(1))}</div>` : ''
    const stageLabel = (i) => `<span class="sr">${esc(ui('stage'))} ${pad(i + 1)}. </span>`
    const division = (st, cls) => `<a class="${cls} mono" href="${esc(st.division.href || '#')}"><span class="${cls}-leader" aria-hidden="true"></span><span class="ln-draw">${esc(st.division.name)}</span></a>`
    let body
    if (!N) {
      body = empty()
    } else if (sceneMode) {
      body = `<div class="scene" style="--n:${N}"><div class="scene__stage">` + guides() +
        '<svg class="scene__svg" aria-hidden="true" focusable="false"><path class="scene__path" pathLength="1"/>' +
        '<g class="scene__corners"></g></svg>' +
        '<ol class="scene__rail" aria-hidden="true">' + steps.map((st, i) =>
          `<li class="tick${st.division ? ' is-key' : ''}${i === 0 ? ' is-cur' : ''}"><i class="tick__node"></i>` +
          `<span class="tick__no mono">${pad(i + 1)}</span><span class="tick__name mono">${esc(t(st.title))}</span></li>`).join('') + '</ol>' +
        '<div class="scene__mid"><ol class="scene__panels" role="list">' + steps.map((st, i) =>
          `<li class="panel${st.division ? ' is-key' : ''}${i === 0 ? ' is-active' : ''}" data-i="${i}">` +
          `<p class="panel__big" aria-hidden="true">${pad(i + 1)}</p>` +
          `<div class="panel__body"><h3 class="panel__title">${stageLabel(i)}${esc(t(st.title))}</h3>` +
          (t(st.text) ? `<p class="panel__text">${esc(t(st.text))}</p>` : '') + 
          (st.division ? division(st, 'panel__division') : '') + '</div></li>').join('') + '</ol>' +
        // the shot of the stage: its photo (step.media) or the drawing that grows stage by stage
        `<div class="scene__media" aria-hidden="true"><div class="scene__frame frame">${cropMarks()}` +
        steps.map((st, i) => `<div class="scene__shot${st.media ? '' : ' scene__shot--draw'}${i === 0 ? ' is-active' : ''}">${st.media ? MS.plate(st.media) : ''}</div>`).join('') +
        (steps.some((st) => !st.media) ? `<div class="scene__drawing">${drawingSvg(N)}</div>` : '') +
        '</div></div></div>' +
        // progress: a dimension across the container that grows with p, the stage counter sits on it
        `<div class="scene__progress" aria-hidden="true"><span class="scene__bar"></span><i class="dim__end dim__end--l"></i><i class="dim__end dim__end--r"></i>` +
        `<span class="scene__count mono">${esc(ui('stage'))} <b class="scene__cur">01</b> / ${pad(N)}</span></div>` +
        '</div></div>'
    } else {
      body = `<ol class="steps${N > 6 ? ' steps--many' : ''}" role="list" style="--n:${N}">` + steps.map((st, i) =>
        `<li class="step${st.division ? ' is-key' : ''}">` +
        `<p class="step__big" aria-hidden="true">${pad(i + 1)}</p>` +
        '<div class="step__axis" aria-hidden="true"><span class="step__node"></span></div>' +
        `<div class="step__body"><h3 class="h3 step__title">${stageLabel(i)}${esc(t(st.title))}</h3>` +
        (t(st.text) ? `<p class="step__text">${esc(t(st.text))}</p>` : '') + '</div>' +
        (st.division ? division(st, 'step__division') : '') + (st.media ? `<div class="step__media frame">${cropMarks()}${MS.plate(st.media)}</div>` : '') + '</li>').join('') + '</ol>'
    }
    mount(el, MS.sectionTone(s), `process${sceneMode ? ' process--scene' : ''}`, head(el, s, aside) + body)
  })()

  /* ------------------------------------------------------------------ projects: the register */

  const STATUS = ['completed', 'in_progress', 'planned']

  function projectData(p) {
    const status = STATUS.includes(p.status) ? p.status : 'planned'
    return {
      status: `<span class="status status--${status}"><i aria-hidden="true"></i>${esc(ui(`status.${status}`))}</span>`,
      token: p.is_tokenized ? `<span class="tag mono">${esc(ui('tokenized'))}</span>` : '',
      year: p.year ? esc(p.year) : null,
      area: p.area_m2 ? `${num(p.area_m2)}<small> ${esc(ui('sqm'))}</small>` : null,
    }
  }
  const nil = '<span class="nil" aria-hidden="true">—</span>'

  ;(function showcase() {
    const el = $('[data-block="projects_showcase"]')
    const s = MS.showcase
    const items = s.items || []
    const link = s.link ? `<a class="more" href="${esc(s.link.href)}"><span class="ln-draw">${esc(t(s.link.label))}</span>${arrow}</a>` : ''
    const href = (p) => `#project-${esc(p.slug)}` // on the site: the project page route
    let body
    if (!items.length) {
      body = `<div class="works-empty frame">${cropMarks()}<p class="mono">${esc(ui('empty'))}</p></div>`
    } else if (items.length === 1) {
      // One project: a full "project sheet" instead of a register.
      const p = items[0], d = projectData(p)
      const cells = [[ui('year'), d.year], [ui('area'), d.area]].filter(([, v]) => v)
      body = '<article class="sheet">' +
        `<div class="sheet__media frame" data-rv="wipe">${cropMarks()}${MS.plate(p.cover)}</div>` +
        '<div class="sheet__data">' +
        `<p class="sheet__no mono">${esc(u('no'))} 01</p>` +
        `<h3 class="sheet__title"><a class="ln-draw" href="${href(p)}">${esc(p.title)}</a></h3>` +
        `<p class="sheet__loc mono">${esc(t(p.location))}</p>` +
        (t(p.short) ? `<p class="sheet__short">${esc(t(p.short))}</p>` : '') +
        (cells.length ? `<dl class="sheet__table">${cells.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '') + `<p class="sheet__meta mono">${d.status}${d.token}</p>` +
        '</div></article>'
    } else {
      body = `<div class="reg${items.length > 6 ? ' reg--many' : ''}">` +
        `<div class="reg__head mono" aria-hidden="true"><span>${esc(u('no'))}</span><span></span><span>${esc(ui('year'))}</span><span>${esc(ui('area'))}</span></div>` +
        '<ol class="reg__list" role="list">' + items.map((p, i) => {
          const d = projectData(p)
          const nums = [[ui('year'), d.year, 'year'], [ui('area'), d.area, 'area']]
          return `<li class="row${i === 0 ? ' is-active' : ''}" data-row="${i}" data-rv="row" style="--i:${Math.min(i, 6)}">` +
            `<div class="row__media frame">${cropMarks()}${MS.plate(p.cover)}</div>` +
            `<span class="row__no mono" aria-hidden="true">${pad(i + 1)}</span>` +
            `<h3 class="row__title"><a class="row__link" href="${href(p)}"><span class="ln-draw">${esc(p.title)}</span></a></h3>` +
            `<p class="row__loc mono">${esc(t(p.location))}</p>` +
            `<p class="row__meta mono">${d.status}${d.token}</p>` +
            (t(p.short) ? `<p class="row__short">${esc(t(p.short))}</p>` : '') +
            `<dl class="row__nums${d.year || d.area ? '' : ' is-nil'}">` +
            nums.map(([k, v, c]) => `<div class="row__num row__num--${c}${v ? '' : ' is-nil'}"><dt class="mono">${esc(k)}</dt><dd>${v || nil}</dd></div>`).join('') +
            '</dl></li>'
        }).join('') + '</ol>' +
        '<div class="reg__preview" aria-hidden="true"><div class="reg__frame frame">' + cropMarks() +
        items.map((p, i) => `<div class="reg__shot${i === 0 ? ' is-active' : ''}" data-shot="${i}">${MS.plate(p.cover)}` +
          `<p class="reg__cap mono"><span>${pad(i + 1)}</span>${esc(p.title)}</p></div>`).join('') +
        '</div></div></div>'
    }
    mount(el, MS.sectionTone(s), `showcase${items.length === 1 ? ' showcase--solo' : ''}`, head(el, s, link) + body +
      (items.length > 3 && link ? `<div class="showcase__foot">${link}</div>` : ''))
  })()

  /* ------------------------------------------------------------------ production (dark sheet) */

  ;(function production() {
    const el = $('[data-block="production"]')
    if (!el) return
    const s = MS.production
    const facts = s.facts || [], gallery = s.gallery || [], swatches = s.swatches || []
    // "30 000 м²" -> figure + unit, the unit set as an annotation like in stats
    const fact = (v) => {
      const m = String(v).match(/^([\d\s  .,]+)\s*(.*)$/)
      return m ? `${esc(m[1].trim())}${m[2] ? `<span class="unit mono">${esc(m[2])}</span>` : ''}` : esc(v)
    }
    const factsHtml = facts.length
      ? '<ol class="facts" role="list">' + facts.map((f, i) =>
        `<li class="fact" data-rv="dim" style="--i:${i}">${dim(pad(i + 1))}<p class="fact__value">${fact(f.value)}</p>` +
        `<p class="fact__label">${esc(t(f.label))}</p></li>`).join('') + '</ol>'
      : ''
    const galleryHtml = gallery.length
      ? '<div class="pgal">' + gallery.map((m) =>
        `<figure class="pgal__item pgal__item--${m.height > m.width ? 'tall' : 'wide'} frame" data-rv="wipe">${cropMarks()}${MS.plate(m)}</figure>`).join('') + '</div>'
      : ''
    const legend = swatches.length
      ? `<div class="legend" data-rv="fade"><p class="legend__cap mono">${esc(u('legend'))}</p><ul class="legend__list" role="list">` +
        swatches.map((w) => `<li class="legend__item"><span class="sw sw--${finishOf(w.finish)}" style="--c:${esc(w.color)}" aria-hidden="true"></span>` +
          `<span class="legend__code mono">${esc(w.code)}</span><span class="legend__label">${esc(t(w.label))}</span></li>`).join('') + '</ul></div>'
      : ''
    mount(el, MS.sectionTone(s), 'production', head(el, s) +
      `<div class="prod">${t(s.body) ? `<p class="prod__body" data-rv="fade">${esc(t(s.body))}</p>` : ''}${factsHtml}</div>` +
      galleryHtml + legend)
  })()

  /* ------------------------------------------------------------------ footer: the title block of the set */

  ;(function footer() {
    const el = $('[data-block="footer"]')
    el.className = 'sec foot tone-dark'
    const cell = (k, v) => `<div class="fs__cell"><span class="mono fs__k">${esc(k)}</span><span class="mono fs__v">${v}</span></div>`
    el.innerHTML = guides() +
      traceSvg('<g class="trace__end"><rect x="3" y="-5" width="10" height="10"/></g>') +
      '<div class="foot__sheet">' +
      `<p class="foot__name">${esc(name)}</p>` +
      `<nav class="foot__index" aria-label="${esc(u('nav'))}"><p class="mono foot__cap">${esc(u('index'))}</p><ol role="list">` +
      MS.nav.map((n, i) => `<li><a href="${esc(n.href)}"><span class="mono foot__no">${esc(u('sheet'))} ${pad(i + 1)}</span>` +
        `<span class="foot__lbl"><span class="ln-draw">${esc(t(n.label))}</span></span></a></li>`).join('') + '</ol></nav>' +
      `<div class="foot__contacts"><p class="mono foot__cap">${esc(u('contacts'))}</p>${contactsHtml('contacts foot__addr')}</div>` +
      '<div class="foot__stamp">' +
      `<div class="fs__main"><span class="foot__end" data-trace-end></span><span class="fs__name">${esc(name)}</span>` +
      (t(MS.hero.eyebrow) ? `<span class="mono fs__req">${esc(t(MS.hero.eyebrow))}</span>` : '') + '</div>' +
      cell(u('sheet'), pad(total)) + cell(u('sheets'), pad(total)) +
      cell(ui('language'), LANGS.find(([c]) => c === MS.lang)[1]) + cell(ui('year'), new Date().getFullYear()) +
      '</div></div>'
  })()

  /* ================================================================== behaviour */

  if (reduced) root.classList.add('is-reduced') // .motion (hiding states) is added only once the observer is ready

  /* ---------------- mobile menu: full screen dialog, focus trap, Esc */
  let menuIsOpen = false
  ;(function menu() {
    const dlg = $('#menu')
    const openBtn = $('.hdr__menu')
    const closeBtn = $('.menu__close', dlg)
    const focusables = () => $$('a[href], button:not([disabled])', dlg)
    let closer = 0
    function open(instant) {
      clearTimeout(closer)
      menuIsOpen = true
      dlg.hidden = false
      dlg.classList.toggle('is-instant', !!instant)
      root.classList.add('menu-open')
      openBtn.setAttribute('aria-expanded', 'true')
      if (instant) dlg.classList.add('is-open')
      else requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')))
      ;(focusables()[1] || closeBtn).focus({ preventScroll: true })
    }
    function close() {
      menuIsOpen = false
      dlg.classList.remove('is-open', 'is-instant')
      root.classList.remove('menu-open')
      openBtn.setAttribute('aria-expanded', 'false')
      closer = setTimeout(() => { dlg.hidden = true }, reduced ? 0 : 320)
      openBtn.focus({ preventScroll: true })
    }
    openBtn.addEventListener('click', () => open(false))
    closeBtn.addEventListener('click', close)
    dlg.addEventListener('click', (e) => { if (e.target.closest('.menu__nav a')) close() })
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return }
      if (e.key !== 'Tab') return
      const f = focusables(), first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    })
    if (MS.menuOpen) open(true)
  })()

  /* ---------------- register: the preview frame follows hover and focus */
  ;(function register() {
    const rows = $$('.row')
    const shots = $$('.reg__shot')
    const setActive = (i) => {
      rows.forEach((r, j) => r.classList.toggle('is-active', i === j))
      shots.forEach((s, j) => s.classList.toggle('is-active', i === j))
    }
    rows.forEach((row, i) => {
      row.addEventListener('pointerenter', () => setActive(i))
      row.addEventListener('focusin', () => setActive(i))
    })
  })()

  /* ---------------- line-mask reveal for headings: lines rise from their baseline */
  function splitLines(el) {
    const text = el.textContent
    el.dataset.text = text
    el.innerHTML = text.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span class="w">${esc(w)}</span>`)).join('')
    const lines = []
    let top = null
    for (const w of $$('.w', el)) {
      if (top === null || Math.abs(w.offsetTop - top) > 4) { lines.push([]); top = w.offsetTop }
      lines[lines.length - 1].push(w.textContent)
    }
    el.innerHTML = lines.map((l, i) =>
      `<span class="ln" style="--l:${i}"><span class="ln__in">${esc(l.join(' '))}</span></span>`).join(' ')
    el.classList.add('is-split')
  }
  function unsplit(el) {
    if (!el.dataset.text) return
    el.textContent = el.dataset.text
    el.classList.remove('is-split', 'is-in')
    el.classList.add('is-done')
    delete el.dataset.text
  }

  /* ---------------- count-up: tabular figures, the hidden final value holds the width */
  function countUp(numEl) {
    const live = $('.num__live', numEl)
    const to = +numEl.dataset.count
    const t0 = performance.now(), dur = 1400
    ;(function tick(now) {
      const k = Math.min(1, (now - t0) / dur)
      live.textContent = num(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) requestAnimationFrame(tick)
    })(t0)
  }

  function reveal(el) {
    if (el.classList.contains('is-in')) return
    el.classList.add('is-in')
    if (el.hasAttribute('data-split') && el.classList.contains('is-split')) {
      setTimeout(() => unsplit(el), 800 + el.querySelectorAll('.ln').length * 90)
      return
    }
    $$('.num[data-count]', el).forEach(countUp)
  }

  /** Reveals: the hiding class goes on only together with a ready observer (progressive
      enhancement). Headings are split into lines after the fonts load, then observed. */
  function startMotion() {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target) }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 })
    root.classList.add('motion')
    $$('.num__live').forEach((n) => { n.textContent = num(0) })
    const hero = $('.hero')
    const inHero = (el) => hero.contains(el)
    requestAnimationFrame(() => {
      hero.classList.add('is-intro')
      $$('[data-rv]', hero).forEach(reveal)
    })
    $$('[data-rv]').filter((el) => !inHero(el)).forEach((el) => io.observe(el))
    document.fonts.ready.then(() => {
      const splits = $$('[data-split]')
      splits.forEach(splitLines)
      requestAnimationFrame(() => splits.forEach((el) => (inHero(el) ? reveal(el) : io.observe(el))))
      let rs = 0
      addEventListener('resize', () => {
        clearTimeout(rs)
        rs = setTimeout(() => splits.filter((el) => !el.classList.contains('is-in') && el.dataset.text)
          .forEach((el) => { unsplit(el); el.classList.remove('is-done'); splitLines(el) }), 150)
      })
    })
  }

  /* ================================================================== the line */

  const SVG = 'http://www.w3.org/2000/svg'
  const PEN = 0.78 // the pen: 78% of the viewport height, the same for every section
  const mqRow = matchMedia('(min-width: 1081px)')
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

  const segs = $$('.sec').map((sec) => {
    const svg = $(':scope > .trace', sec)
    return {
      sec, svg,
      path: $('.trace__path', svg),
      head: $('.trace__head', svg),
      origin: $('.trace__origin', svg),
      end: $('.trace__end', svg),
      cornersG: $('.trace__corners', svg),
      branchesG: $('.trace__branches', svg),
      steps: $$('.step', sec),
      list: $('.steps', sec),
      branches: $$('[data-branch]', sec).map((a) => ({ a, scope: a.closest('[data-branch-scope]'), path: null })),
    }
  })

  /** Box of el relative to the section rect r (layout time only, never per frame). */
  const relTo = (el, r) => { const b = el.getBoundingClientRect(); return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height } }

  /** Main path of a section: polyline + pen key (section-relative y) for every vertex. */
  function geometry(s, r, x) {
    const h = r.height
    const rel = (el) => relTo(el, r)
    if (s.sec.classList.contains('hero')) { // the line is born at the origin on the horizon
      const y0 = rel($('.hero__datum', s.sec)).y + 1
      return { pts: [[x, y0], [x, h]], keys: [y0, h] }
    }
    const endEl = $('[data-trace-end]', s.sec)
    if (endEl) { // the footer: down the margin, then into the title block, ends at the mark
      const e = rel(endEl)
      const ex = e.x, ey = e.y
      if (ex - x < 6) return { pts: [[x, 0], [x, ey]], keys: [0, ey] }
      return { pts: [[x, 0], [x, ey], [ex, ey]], keys: [0, ey, Math.min(h - 1, ey + Math.max(80, (ex - x) * 0.25))] }
    }
    if (s.list && s.list.classList.contains('steps--row') && mqRow.matches) {
      // The cycle: out of the margin onto the stage axis, down, back to the margin.
      const ax = rel($('.step__axis', s.steps[0]))
      const ay = ax.y + ax.h / 2
      const lr = rel(s.list)
      const endX = lr.x + lr.w
      const ry = lr.y + lr.h + 56
      const D = ry - ay
      const keys = [0, ay, ay + 0.72 * D, ay + 0.86 * D, Math.min(ry + 160, h - 2), h]
      for (let i = 1; i < keys.length; i++) keys[i] = Math.max(keys[i], keys[i - 1] + 1)
      return { pts: [[x, 0], [x, ay], [endX, ay], [endX, ry], [x, ry], [x, h]], keys, row: true }
    }
    return { pts: [[x, 0], [x, h]], keys: [0, h] }
  }

  function layout() {
    const sy = scrollY
    for (const s of segs) {
      const r = s.sec.getBoundingClientRect()
      const h = Math.max(1, r.height)
      const x = parseFloat(getComputedStyle(s.sec).paddingLeft) * 0.42 // = --trace-x
      s.top = r.top + sy; s.h = h; s.x = x
      const g = geometry(s, r, x)
      const cum = [0]
      for (let i = 1; i < g.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(g.pts[i][0] - g.pts[i - 1][0], g.pts[i][1] - g.pts[i - 1][1]))
      const len = Math.max(1, cum[cum.length - 1])
      s.pts = g.pts
      s.keysN = g.keys.map((k) => k / h)      // input of useTransform
      s.lensN = cum.map((c) => c / len)       // output: pathLength at each vertex
      s.svg.setAttribute('viewBox', `0 0 ${r.width.toFixed(1)} ${h.toFixed(1)}`)
      s.path.setAttribute('d', 'M' + g.pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L'))
      const [fx, fy] = g.pts[0], [lx, ly] = g.pts[g.pts.length - 1]
      if (s.origin) { s.origin.setAttribute('transform', `translate(${(fx - 8).toFixed(1)} ${fy.toFixed(1)})`); s.originY = s.top + fy }
      if (s.end) s.end.setAttribute('transform', `translate(${(lx - 8).toFixed(1)} ${ly.toFixed(1)})`)

      // Corner marks on the turns.
      s.cornersG.replaceChildren()
      s.corners = g.pts.slice(1, -1).map((p, i) => {
        const m = document.createElementNS(SVG, 'rect')
        m.setAttribute('x', (p[0] - 4.5).toFixed(1)); m.setAttribute('y', (p[1] - 4.5).toFixed(1))
        m.setAttribute('width', 9); m.setAttribute('height', 9)
        m.setAttribute('class', 'trace__corner')
        s.cornersG.append(m)
        return { el: m, at: s.lensN[i + 1] }
      })
      // Stage nodes of the cycle light up when the drawn line passes them.
      for (const st of s.steps) {
        const n = relTo($('.step__node', st), r)
        const px = g.row ? cum[1] + (n.x + n.w / 2 - x) : n.y + n.h / 2 - g.pts[0][1]
        st._at = clamp01(px / len); st._on = null
      }
      // Branches: from the margin to an anchor (stats dimension, a project's current stage).
      for (const b of s.branches) {
        if (!b.path) {
          b.path = document.createElementNS(SVG, 'path')
          b.path.setAttribute('pathLength', '1')
          b.path.setAttribute('class', 'trace__branch')
          s.branchesG.append(b.path)
        }
        const visible = b.a.offsetParent !== null
        b.path.style.display = visible ? '' : 'none'
        b.ok = visible
        if (!visible) continue
        const ar = relTo(b.a, r)
        const y = ar.y + ar.h / 2
        const x2 = b.a.dataset.branch === 'right' ? ar.x + ar.w : ar.x + ar.w / 2
        b.path.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)}H${x2.toFixed(1)}`)
        const span = Math.min(260, Math.max(100, (x2 - x) * 0.32))
        b.k0 = y / h; b.k1 = Math.min(1, (y + span) / h)
        if (b.k1 <= b.k0) b.k1 = b.k0 + 0.001
        b.nodes = b.scope ? $$('[data-node]', b.scope).map((nEl) => {
          const nr = relTo(nEl, r)
          return { el: nEl, at: clamp01((nr.x + nr.w / 2 - x - 1) / Math.max(1, x2 - x)) }
        }) : []
        b.last = -1
      }
      s.last = -1
    }
    originY = (segs.find((s) => s.originY != null) || {}).originY || 0
    if (scene) sceneLayout()
    update()
  }

  /** Piecewise-linear map (Framer: useTransform(progress, keys, values)). */
  function map(p, keys, vals) {
    if (p <= keys[0]) return vals[0]
    for (let i = 1; i < keys.length; i++) {
      if (p < keys[i]) return vals[i - 1] + (vals[i] - vals[i - 1]) * (p - keys[i - 1]) / (keys[i] - keys[i - 1])
    }
    return vals[vals.length - 1]
  }
  function pointAt(s, d) {
    for (let i = 1; i < s.lensN.length; i++) {
      if (d <= s.lensN[i]) {
        const f = (d - s.lensN[i - 1]) / Math.max(1e-6, s.lensN[i] - s.lensN[i - 1])
        return [s.pts[i - 1][0] + (s.pts[i][0] - s.pts[i - 1][0]) * f, s.pts[i - 1][1] + (s.pts[i][1] - s.pts[i - 1][1]) * f]
      }
    }
    return s.pts[s.pts.length - 1]
  }
  const draw = (path, d) => { path.style.strokeDashoffset = (1 - d).toFixed(4) }

  let originY = 0, intro = reduced ? 1 : 0, ticking = false

  function update() {
    ticking = false
    const vh = innerHeight
    let pen = scrollY + vh * PEN
    if (intro < 1) pen = originY + (pen - originY) * (1 - Math.pow(1 - intro, 3))
    for (const s of segs) {
      // Section progress: Framer's scrollYProgress for offset ['start 78%', 'end 78%'].
      const p = reduced ? 1 : clamp01((pen - s.top) / s.h)
      if (p === s.last) continue // far sections stay at 0 or 1: no DOM writes
      s.last = p
      const d = map(p, s.keysN, s.lensN)
      if (!reduced) {
        draw(s.path, d)
        const drawing = d > 0 && d < 1
        s.head.style.opacity = drawing ? 1 : 0
        if (drawing) { const [hx, hy] = pointAt(s, d); s.head.style.transform = `translate(${hx.toFixed(1)}px, ${hy.toFixed(1)}px)` }
      }
      for (const c of s.corners) c.el.classList.toggle('is-on', d >= c.at - 0.0005)
      for (const st of s.steps) {
        const on = d >= st._at - 0.0005
        if (on !== st._on) { st._on = on; st.classList.toggle('is-on', on) }
      }
      for (const b of s.branches) {
        if (!b.ok) continue
        const bd = reduced ? 1 : map(p, [b.k0, b.k1], [0, 1])
        if (bd === b.last) continue
        b.last = bd
        if (!reduced) draw(b.path, bd)
        for (const n of b.nodes) n.el.classList.toggle('is-on', bd >= n.at)
        if (b.scope) b.scope.classList.toggle('is-drawn', bd >= 0.999)
      }
    }
    if (scene) sceneUpdate()
    headerOnScroll()
  }

  /* ================================================================== the pinned cycle scene
     Section height N x 100svh, the stage is sticky (top 0, 100svh). Position alone defines the
     state: p = (scrollY - sceneTop) / (sceneHeight - stageHeight), active stage = floor(p * N).
     Native scrolling only: no snap, no preventDefault, no smooth scroll. The stage draws its own
     share of the line (field -> stage axis -> back to the field), continuously by p.
     Framer: useScroll({ target: scene, offset: ['start start', 'end end'] }) -> p. */
  const scene = (() => {
    const root_ = $('.scene')
    if (!root_) return null
    const stage = $('.scene__stage', root_)
    return {
      root: root_, stage,
      svg: $('.scene__svg', stage), path: $('.scene__path', stage), bar: $('.scene__bar', stage),
      cornersG: $('.scene__corners', stage), cur: $('.scene__cur', stage),
      ticks: $$('.tick', stage), panels: $$('.panel', stage), shots: $$('.scene__shot', stage),
      parts: $$('.dw', stage).map((g) => ({ g, a: +g.dataset.a, b: +g.dataset.b, f: -1 })),
      N: $$('.panel', stage).length, active: -1, lastD: -1,
    }
  })()

  function sceneLayout() {
    const sc = scene
    const sr = sc.stage.getBoundingClientRect()
    const rel = (el) => relTo(el, sr)
    sc.top = sc.root.getBoundingClientRect().top + scrollY
    sc.Hs = sc.stage.offsetHeight             // = 100svh in px
    sc.range = Math.max(1, sc.root.offsetHeight - sc.Hs)
    const W = sr.width, H = sr.height
    const x = parseFloat(getComputedStyle(sc.stage).paddingLeft) * 0.42 // the field, as in sections
    const N = sc.N
    const nodes = sc.ticks.map((tk) => { const r = rel($('.tick__node', tk)); return [r.x + r.w / 2, r.y + r.h / 2] })
    const row = Math.abs(nodes[0][1] - nodes[N - 1][1]) < 2 // horizontal axis (wide) or the field (phones)
    let pts, keys, entry // keys: p at each vertex, null = drawn before the pin by the pen
    if (row) {
      const ay = nodes[0][1]
      const xR = W - parseFloat(getComputedStyle(sc.stage).paddingRight)
      const ry = H - Math.min(32, H * 0.04) // under the progress dimension
      pts = [[x, 0], [x, ay], ...nodes, [xR, ay], [xR, ry], [x, ry], [x, H]]
      keys = [null, null, ...nodes.map((_, i) => i / N), (N - 0.7) / N, (N - 0.5) / N, (N - 0.15) / N, 1]
      entry = 2
    } else {
      pts = [[x, 0], ...nodes.map(([, y]) => [x, y]), [x, H]]
      keys = [null, ...nodes.map((_, i) => i / N), 1]
      entry = 1
    }
    const cum = [0]
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    const len = Math.max(1, cum[cum.length - 1])
    sc.lens = cum.map((c) => c / len)
    sc.keys = keys.slice(entry)             // p -> drawn length from the first node on
    sc.lensP = sc.lens.slice(entry)
    sc.entryY = row ? pts[1][1] : pts[1][1] // the pen draws the field down to here before the pin
    sc.entryLen = sc.lens[entry]
    sc.len = len
    sc.nodeAt = nodes.map((_, i) => sc.lens[entry + i])
    sc.svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`)
    sc.path.setAttribute('d', 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L'))
    sc.cornersG.replaceChildren()
    sc.corners = (row ? [1, entry + N, entry + N + 1, entry + N + 2] : []).map((i) => {
      const m = document.createElementNS(SVG, 'rect')
      m.setAttribute('x', (pts[i][0] - 4.5).toFixed(1)); m.setAttribute('y', (pts[i][1] - 4.5).toFixed(1))
      m.setAttribute('width', 9); m.setAttribute('height', 9); m.setAttribute('class', 'trace__corner')
      sc.cornersG.append(m)
      return { el: m, at: sc.lens[i] }
    })
    sc.lastD = -1; sc.active = -1; sc.lastP = -1
    sc.parts.forEach((pt) => { pt.f = -1 })
  }

  function sceneUpdate() {
    const sc = scene
    const y = scrollY
    const p = clamp01((y - sc.top) / sc.range)
    const stageTop = y < sc.top ? sc.top - y : y > sc.top + sc.range ? sc.top + sc.range - y : 0
    const localPen = innerHeight * PEN - stageTop
    let d
    if (p > 0) d = map(p, sc.keys, sc.lensP)
    else d = localPen < sc.entryY ? Math.max(0, localPen) / sc.len : sc.entryLen
    if (d !== sc.lastD) {
      sc.lastD = d
      sc.path.style.strokeDashoffset = (1 - d).toFixed(4)
      sc.ticks.forEach((tk, i) => tk.classList.toggle('is-lit', d >= sc.nodeAt[i] - 0.0005))
      for (const c of sc.corners) c.el.classList.toggle('is-on', d >= c.at - 0.0005)
    }
    const a = p >= 1 ? sc.N - 1 : Math.floor(p * sc.N)
    if (a !== sc.active) {
      sc.active = a
      sc.ticks.forEach((tk, i) => { tk.classList.toggle('is-cur', i === a); tk.classList.toggle('is-past', i < a) })
      sc.panels.forEach((pn, i) => pn.classList.toggle('is-active', i === a))
      sc.shots.forEach((sh, i) => sh.classList.toggle('is-active', i === a))
      sc.stage.classList.toggle('is-draw', !!sc.shots[a] && sc.shots[a].classList.contains('scene__shot--draw'))
      sc.stage.classList.toggle('is-key', sc.panels[a].classList.contains('is-key'))
      sc.cur.textContent = pad(a + 1)
    }
    if (p !== sc.lastP) { sc.lastP = p; sc.bar.style.transform = `scaleX(${p.toFixed(4)})` }
    // the drawing: every part draws by p inside its stage, drawn parts stay
    for (const pt of sc.parts) {
      const f = clamp01((p - pt.a) / (pt.b - pt.a))
      if (f !== pt.f) { pt.f = f; pt.g.style.setProperty('--f', f.toFixed(4)) }
    }
  }

  /** Scroll position of stage i (middle of its share of the pin). */
  const sceneY = (i) => scene.top + ((i + 0.5) / scene.N) * scene.range
  if (scene) {
    // Keyboard: focus inside an inactive stage scrolls to it; nothing focusable is hidden.
    scene.panels.forEach((pn, i) => pn.addEventListener('focusin', () => {
      if (scene.active !== i) scrollTo({ top: sceneY(i), behavior: 'instant' })
    }))
    if (sceneShot) scene.stage.classList.add('is-instant')
  }

  /* ---------------- header: hides on the way down, returns on the way up */
  let lastY = scrollY
  function headerOnScroll() {
    if (reduced) return
    const y = scrollY
    hdr.classList.toggle('is-scrolled', y > 8)
    const dy = y - lastY
    if (Math.abs(dy) < 6) return
    hdr.classList.toggle('is-hidden', dy > 0 && y > 160 && !menuIsOpen && !hdr.contains(document.activeElement))
    lastY = y
  }

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }

  function startLine() {
    layout()
    if (scene && sceneShot) {
      const top = sceneShot < 0 ? scene.top - innerHeight * 0.55 : sceneY(Math.min(scene.N, sceneShot) - 1)
      scrollTo({ top, behavior: 'instant' }); update()
    }
    let rz = 0
    const relayout = () => { clearTimeout(rz); rz = setTimeout(layout, 120) }
    addEventListener('resize', relayout)
    new ResizeObserver(relayout).observe(document.body)
    if (reduced) return
    addEventListener('scroll', onScroll, { passive: true })
    const t0 = performance.now() + 450, dur = 1100 // intro: the first stretch is drawn on load
    ;(function tick(now) {
      intro = clamp01((now - t0) / dur)
      update()
      if (intro < 1) requestAnimationFrame(tick)
    })(performance.now())
  }

  if (!reduced && !sceneShot) startMotion()
  document.fonts.ready.then(startLine)
})()
