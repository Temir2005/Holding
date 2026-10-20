/*
 * Concept A, "Chertezh" (the drawing): one vermilion line runs through the whole page in the
 * binding margin of the sheet and is drawn by scrolling. Every section owns its own segment at
 * the same x (--trace-x), so any section order still reads as one continuous line.
 *
 * Rendering and motion live in one file (the brief allows index.html / style.css / motion.js).
 * On the site: render = React section components, motion = Framer Motion (useScroll +
 * useTransform for the pen, whileInView for reveals). Nothing here needs GSAP or smooth scroll.
 */
;(() => {
  const MS = window.MS
  const { t, esc, num, ui } = MS
  const reduced = MS.reduced
  const root = document.documentElement

  /* UI strings missing from the shared ui dictionary. On the site they belong in
     frontend/src/i18n (UI chrome, not CMS content). */
  const LOCAL = {
    skip: { ru: 'К содержанию', kk: 'Мазмұнға өту', en: 'Skip to content' },
    sheet: { ru: 'Лист', kk: 'Парақ', en: 'Sheet' },
    sheets: { ru: 'Листов', kk: 'Парақтар', en: 'Sheets' },
    legend: { ru: 'Условные обозначения', kk: 'Шартты белгілер', en: 'Legend' },
    nav: { ru: 'Основная навигация', kk: 'Негізгі навигация', en: 'Main navigation' },
    contacts: { ru: 'Контакты', kk: 'Байланыс', en: 'Contacts' },
    home: { ru: 'На главную', kk: 'Басты бетке', en: 'Home page' },
    stage: { ru: 'Этап', kk: 'Кезең', en: 'Stage' },
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

  /** 12 hairline construction guides (4 on phones), behind the content. */
  const guides = () => `<div class="guides" aria-hidden="true">${'<i></i>'.repeat(12)}</div>`

  /** The section's own segment of the trace. Geometry is set in layout(). */
  const traceSvg = (extra = '') =>
    `<svg class="trace" aria-hidden="true" focusable="false"><path class="trace__path"/>${extra}` +
    `<g class="trace__corners"></g><circle class="trace__head" cx="0" cy="0" r="3.5"/></svg>`

  /** Dimension line |<-- label -->|, label optional (mono, knocked out of the line). */
  const dim = (label = '', cls = '') =>
    `<div class="dim ${cls}" aria-hidden="true"><span class="dim__line"></span>` +
    `<i class="dim__end dim__end--l"></i><i class="dim__end dim__end--r"></i>` +
    (label ? `<span class="dim__label mono">${esc(label)}</span>` : '') + '</div>'

  const cropMarks = () =>
    '<span class="crop" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'

  const sections = $$('main > section[data-block]')
  const total = sections.length
  const sheetNo = (el) => `${pad(sections.indexOf(el) + 1)} / ${pad(total)}`

  /** Section header: sheet number + eyebrow on the rail, title on 8 columns, aside on the right. */
  function head(el, s, aside = '') {
    const eyebrow = t(s.eyebrow), title = t(s.title)
    return `<header class="sh${title ? '' : ' sh--bare'}">` +
      `<p class="sh__meta mono" data-rv="fade"><span class="sh__no">${sheetNo(el)}</span>` +
      (eyebrow ? `<span class="sh__eyebrow">${esc(eyebrow)}</span>` : '') + '</p>' +
      (title ? `<h2 class="h2 sh__title" data-split>${esc(title)}</h2>` : '') +
      (aside ? `<div class="sh__aside" data-rv="fade">${aside}</div>` : '') + '</header>'
  }

  const empty = () => `<div class="empty">${dim(ui('empty'), 'dim--empty')}</div>`

  function mount(el, tone, cls, html) {
    el.className = `sec ${cls} tone-${tone}`
    el.innerHTML = guides() + traceSvg() + html
  }

  /* ------------------------------------------------------------------ header + skip + menu */

  const name = MS.C.site.name
  const contacts = MS.C.site.contacts

  $('[data-block="skip"]').textContent = u('skip')

  const langList = (cls) => `<ul class="${cls}" role="list">` + LANGS.map(([code, label]) =>
    `<li><a href="${esc(langHref(code))}" hreflang="${code}" lang="${code}"` +
    `${code === MS.lang ? ' aria-current="true"' : ''}>${label}</a></li>`).join('') + '</ul>'

  $('[data-block="header"]').innerHTML =
    `<a class="hdr__logo" href="./" aria-label="${esc(name)}, ${esc(u('home'))}">` +
    `<span class="hdr__mark" aria-hidden="true"></span>${esc(name)}</a>` +
    `<nav class="hdr__nav" aria-label="${esc(u('nav'))}"><ul role="list">` +
    MS.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(t(n.label))}</a></li>`).join('') +
    '</ul></nav>' +
    `<div class="hdr__lang mono" aria-label="${esc(ui('language'))}" role="group">${langList('langs')}</div>` +
    `<button class="hdr__menu mono" type="button" aria-expanded="false" aria-controls="menu">` +
    `<span class="hdr__menu-ico" aria-hidden="true"><i></i><i></i></span>${esc(ui('menu'))}</button>`

  const contactsHtml = (cls) =>
    `<address class="${cls}"><span>${esc(t(contacts.address))}</span>` +
    `<a href="tel:${esc(contacts.phone.replace(/[^\d+]/g, ''))}">${esc(contacts.phone)}</a>` +
    `<a href="mailto:${esc(contacts.email)}">${esc(contacts.email)}</a></address>`

  const menuHost = $('[data-block="menu"]')
  menuHost.outerHTML =
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
    const el = $('[data-block="hero"]')
    const h = MS.hero
    const swatches = h.swatches || []
    const ctas = (h.ctas || []).map((c) =>
      `<a class="btn btn--${c.variant === 'primary' ? 'primary' : 'secondary'}" href="${esc(c.href)}">` +
      `<span>${esc(t(c.label))}</span><span class="btn__arrow" aria-hidden="true"></span></a>`).join('')
    const legend = swatches.length
      ? `<div class="legend" data-rv="fade"><p class="legend__cap mono">${esc(u('legend'))}</p><ul class="legend__list" role="list">` +
        swatches.map((s) => `<li class="legend__item"><span class="sw sw--${finishOf(s.finish)}" style="--c:${esc(s.color)}" aria-hidden="true"></span>` +
          `<span class="legend__code mono">${esc(s.code)}</span><span class="legend__label">${esc(t(s.label))}</span></li>`).join('') +
        '</ul></div>'
      : ''
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
      '<div class="hero__sheet">' +
      `<h1 class="h1 hero__title" data-split>${esc(t(h.title))}</h1>` +
      '<div class="hero__datum" aria-hidden="true"><span></span><i class="hero__level mono">±0,000</i></div>' +
      '<div class="hero__body">' +
      '<div class="hero__lead">' +
      (t(h.subtitle) ? `<p class="lead" data-rv="fade">${esc(t(h.subtitle))}</p>` : '') +
      (ctas ? `<div class="hero__ctas" data-rv="fade">${ctas}</div>` : '') +
      '</div>' +
      `<figure class="hero__figure frame" data-rv="wipe">${cropMarks()}${MS.plate(h.background, 'ms-plate--hero')}${stamp}</figure>` +
      legend +
      '</div></div>'
  })()

  /* ------------------------------------------------------------------ stats */

  const isUnit = (s) => /\p{L}/u.test(s || '')
  const affix = (s, side) => (s == null || s === '' ? '' : isUnit(s)
    ? `<span class="unit unit--${side} mono">${esc(s.trim())}</span>`
    : `<span class="sym">${esc(s.trim())}</span>`)

  ;(function stats() {
    const el = $('[data-block="stats"]')
    const s = MS.stats
    const items = s.items || []
    const list = items.length
      ? `<ol class="stats__list" role="list" style="--n:${items.length}">` + items.map((it, i) => {
        const full = `${it.prefix || ''}${num(it.value)}${it.suffix || ''}`
        return `<li class="stat" data-rv="dim" style="--i:${i}">${dim(pad(i + 1))}` +
          `<p class="stat__value"><span class="sr">${esc(full)}</span><span class="stat__fig" aria-hidden="true">${affix(it.prefix, 'pre')}` +
          `<span class="num" data-count="${it.value}"><span class="num__final">${num(it.value)}</span>` +
          `<span class="num__live">${num(it.value)}</span></span>${affix(it.suffix, 'post')}</span></p>` +
          `<p class="stat__label">${esc(t(it.label))}</p></li>`
      }).join('') + '</ol>'
      : empty()
    mount(el, MS.sectionTone(s), `stats${items.length === 1 ? ' stats--solo' : ''}`, head(el, s) + list)
  })()

  /* ------------------------------------------------------------------ process steps */

  ;(function process() {
    const el = $('[data-block="process_steps"]')
    const s = MS.process
    const steps = s.steps || []
    const aside = t(s.intro)
      ? `<p class="sh__intro">${esc(t(s.intro))}</p>`
      : steps.length ? `<div class="sh__range">${dim(steps.length > 1 ? `${pad(1)} — ${pad(steps.length)}` : pad(1))}</div>` : ''
    // Row (horizontal cycle) for 2..6 stages on wide screens; otherwise the rail itself is the axis.
    const mode = steps.length >= 2 && steps.length <= 6 ? 'steps--row' : steps.length > 6 ? 'steps--many' : ''
    const list = steps.length
      ? `<ol class="steps ${mode}" role="list" style="--n:${steps.length}">` + steps.map((st, i) => {
        const key = !!st.division
        return `<li class="step${key ? ' is-key' : ''}" style="--i:${i}">` +
          dim(`${pad(i + 1)}`, 'step__dim') +
          `<p class="step__big" aria-hidden="true">${pad(i + 1)}</p>` +
          '<div class="step__axis" aria-hidden="true"><span class="step__node"></span></div>' +
          `<div class="step__body"><h3 class="h3 step__title"><span class="sr">${esc(u('stage'))} ${pad(i + 1)}. </span>${esc(t(st.title))}</h3>` +
          (t(st.text) ? `<p class="step__text">${esc(t(st.text))}</p>` : '') + '</div>' +
          (key ? '<span class="step__tap" aria-hidden="true"></span>' +
            `<a class="step__division mono" href="${esc(st.division.href || '#')}"><span class="step__leader" aria-hidden="true"></span>${esc(st.division.name)}</a>` : '') +
          '</li>'
      }).join('') + '</ol>'
      : empty()
    mount(el, MS.sectionTone(s), 'process', head(el, s, aside) + list)
  })()

  /* ------------------------------------------------------------------ projects showcase */

  const STATUS = ['completed', 'in_progress', 'planned']

  /** Layout per index: big / small alternate, mirrored every second row; a lone last item goes solo. */
  function workKind(i, n) {
    if (n === 1) return 'solo'
    const k = i % 4
    const rowStart = k === 0 || k === 2
    if (rowStart && i === n - 1) return 'solo'
    return ['big-l', 'small-r', 'small-l', 'big-r'][k]
  }

  ;(function showcase() {
    const el = $('[data-block="projects_showcase"]')
    const s = MS.showcase
    const items = s.items || []
    const link = s.link ? `<a class="more" href="${esc(s.link.href)}"><span>${esc(t(s.link.label))}</span><span class="btn__arrow" aria-hidden="true"></span></a>` : ''
    const list = items.length
      ? '<ul class="works" role="list">' + items.map((p, i) => {
        const status = STATUS.includes(p.status) ? p.status : 'planned'
        const meta = [`<span class="status status--${status}"><i aria-hidden="true"></i>${esc(ui(`status.${status}`))}</span>`]
        if (p.year) meta.push(`<span><span class="sr">${esc(ui('year'))}: </span>${esc(p.year)}</span>`)
        const area = p.area_m2 ? dim(`S = ${num(p.area_m2)} ${ui('sqm')}`, 'dim--area') : ''
        return `<li class="work work--${workKind(i, items.length)}">` +
          `<p class="work__meta mono" data-rv="fade">${meta.join('<span class="work__sep" aria-hidden="true"></span>')}` +
          `<span class="work__no" aria-hidden="true">${pad(i + 1)}</span></p>` +
          `<div class="frame" data-rv="wipe">${cropMarks()}${MS.plate(p.cover)}</div>` +
          (area ? `<div class="work__area" data-rv="dim"><span class="sr">${esc(ui('area'))}: ${num(p.area_m2)} ${esc(ui('sqm'))}</span>${area}</div>` : '') +
          '<div class="work__body">' +
          `<h3 class="h3 work__title">${esc(p.title)}</h3>` +
          `<p class="work__loc mono"><span class="sr">${esc(ui('location'))}: </span>${esc(t(p.location))}</p>` +
          (t(p.short) ? `<p class="work__short">${esc(t(p.short))}</p>` : '') +
          (p.is_tokenized ? `<p class="tag mono">${esc(ui('tokenized'))}</p>` : '') +
          '</div></li>'
      }).join('') + '</ul>'
      : `<div class="works-empty frame">${cropMarks()}<p class="mono">${esc(ui('empty'))}</p></div>`
    mount(el, MS.sectionTone(s), 'showcase', head(el, s, link) + list +
      (items.length > 2 && link ? `<div class="showcase__foot">${link}</div>` : ''))
  })()

  /* ------------------------------------------------------------------ footer (site chrome, dark) */

  ;(function footer() {
    const el = $('[data-block="footer"]')
    el.className = 'sec foot tone-dark'
    el.innerHTML = guides() +
      traceSvg('<g class="trace__end"><rect x="3" y="-5" width="10" height="10"/></g>') +
      '<div class="foot__grid">' +
      `<p class="foot__name"><span class="foot__end" data-trace-end></span>${esc(name)}</p>` +
      contactsHtml('contacts foot__contacts') +
      `<nav class="foot__nav" aria-label="${esc(u('nav'))}"><ul role="list">` +
      MS.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(t(n.label))}</a></li>`).join('') + '</ul></nav>' +
      `<p class="foot__copy mono">© ${new Date().getFullYear()} ${esc(name)}</p>` +
      '</div>'
  })()

  /* ================================================================== behaviour */

  /* ---------------- mobile menu: full screen dialog, focus trap, Esc */
  ;(function menu() {
    const dlg = $('#menu')
    const openBtn = $('.hdr__menu')
    const closeBtn = $('.menu__close', dlg)
    const focusables = () => $$('a[href], button:not([disabled])', dlg)
    let closer = 0

    function open(instant) {
      clearTimeout(closer)
      dlg.hidden = false
      dlg.classList.toggle('is-instant', !!instant)
      root.classList.add('menu-open')
      openBtn.setAttribute('aria-expanded', 'true')
      if (instant) dlg.classList.add('is-open')
      else requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')))
      ;(focusables()[1] || closeBtn).focus({ preventScroll: true })
    }
    function close() {
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

  if (reduced) {
    root.classList.add('is-reduced')
  } else {
    root.classList.add('motion')
  }

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
    return lines.length
  }
  function unsplit(el) {
    if (!el.dataset.text) return
    el.textContent = el.dataset.text
    el.classList.remove('is-split', 'is-in')
    el.classList.add('is-done')
    delete el.dataset.text
  }

  /* ---------------- count-up with tabular figures; the final value already holds the width */
  function countUp(numEl) {
    const live = $('.num__live', numEl)
    const to = +numEl.dataset.count
    const dur = 1300
    const t0 = performance.now()
    const ease = (x) => 1 - Math.pow(1 - x, 3)
    ;(function tick(now) {
      const k = Math.min(1, (now - t0) / dur)
      live.textContent = num(Math.round(to * ease(k)))
      if (k < 1) requestAnimationFrame(tick)
    })(t0)
  }

  /* ---------------- reveals on view (IntersectionObserver; Framer: whileInView once) */
  function reveal(el) {
    if (el.classList.contains('is-in')) return
    if (el.hasAttribute('data-split') && el.classList.contains('is-split')) {
      const n = el.querySelectorAll('.ln').length
      el.classList.add('is-in')
      setTimeout(() => unsplit(el), 700 + n * 90 + 100)
      return
    }
    el.classList.add('is-in')
    $$('.num[data-count]', el).forEach((n) => { n.querySelector('.num__live').textContent = num(0); countUp(n) })
  }

  async function startMotion() {
    await document.fonts.ready
    const splits = $$('[data-split]')
    splits.forEach(splitLines)
    $$('.num__live').forEach((n) => { n.textContent = num(0) })
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target) }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    const hero = $('.hero')
    // Hero plays as an intro sequence; everything else reveals on view.
    requestAnimationFrame(() => {
      hero.classList.add('is-intro')
      $$('[data-split], [data-rv]', hero).forEach((el) => reveal(el))
    })
    $$('[data-split], [data-rv]').filter((el) => !hero.contains(el)).forEach((el) => io.observe(el))
    // A heading split before a resize keeps stale lines; rebuild those not yet revealed.
    let rs = 0
    addEventListener('resize', () => {
      clearTimeout(rs)
      rs = setTimeout(() => splits.filter((el) => !el.classList.contains('is-in') && el.dataset.text).forEach((el) => { unsplit(el); splitLines(el) }), 150)
    })
  }

  /* ---------------- the trace: one pen position drives every section's segment.
     A segment is a polyline with a "pen key" per vertex: the pen y (section-relative) at which
     the line reaches that vertex. Straight sections have two vertices; the process row has a
     contour: in from the rail, along the stage axis, down, back to the rail, on down. */
  const SVG = 'http://www.w3.org/2000/svg'
  const segs = $$('.sec').map((sec) => ({
    sec,
    svg: $(':scope > .trace', sec),
    path: $(':scope > .trace .trace__path', sec),
    head: $(':scope > .trace .trace__head', sec),
    origin: $(':scope > .trace .trace__origin', sec),
    end: $(':scope > .trace .trace__end', sec),
    cornersG: $(':scope > .trace .trace__corners', sec),
    steps: $$('.step', sec),
    list: $('.steps', sec),
  })).filter((s) => s.svg)
  const mqRow = matchMedia('(min-width: 1081px)')
  const PEN = 0.78 // the pen sits at 78% of the viewport height
  let maxScroll = 0, originY = 0, intro = reduced ? 1 : 0, ticking = false

  /** Box of el relative to the section rect r. */
  const relTo = (el, r) => { const b = el.getBoundingClientRect(); return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height } }

  function geometry(s, r) {
    const rel = (el) => relTo(el, r)
    const x = parseFloat(getComputedStyle(s.sec).paddingLeft) * 0.42 // = --trace-x
    const h = r.height
    s.x = x
    if (s.sec.classList.contains('hero')) {
      const y0 = rel($('.hero__datum', s.sec)).y
      return { pts: [[x, y0], [x, h]], keys: [y0, h] }
    }
    const endEl = $('[data-trace-end]', s.sec)
    if (endEl) {
      const y1 = rel(endEl).y
      return { pts: [[x, 0], [x, y1]], keys: [0, y1] }
    }
    if (s.list && s.list.classList.contains('steps--row') && mqRow.matches) {
      const ax = rel($('.step__axis', s.steps[0]))
      const ay = ax.y + ax.h / 2
      const lr = rel(s.list)
      const endX = lr.x + lr.w
      const ry = lr.y + lr.h + Math.min(72, Math.max(40, innerWidth * 0.035))
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
      s.top = r.top + sy
      const g = geometry(s, r)
      s.pts = g.pts; s.keys = g.keys
      s.cum = [0]
      for (let i = 1; i < g.pts.length; i++) s.cum.push(s.cum[i - 1] + Math.hypot(g.pts[i][0] - g.pts[i - 1][0], g.pts[i][1] - g.pts[i - 1][1]))
      s.len = Math.max(1, s.cum[s.cum.length - 1])
      s.svg.setAttribute('viewBox', `0 0 ${r.width.toFixed(1)} ${r.height.toFixed(1)}`)
      s.path.setAttribute('d', 'M' + g.pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L'))
      s.path.style.strokeDasharray = reduced ? 'none' : `${s.len} ${s.len + 20}`
      const [fx, fy] = g.pts[0], [lx, ly] = g.pts[g.pts.length - 1]
      if (s.origin) { s.origin.setAttribute('transform', `translate(${(fx - 8).toFixed(1)} ${fy.toFixed(1)})`); originY = s.top + fy }
      if (s.end) s.end.setAttribute('transform', `translate(${(lx - 8).toFixed(1)} ${ly.toFixed(1)})`)
      // Corner marks on the turns of the contour.
      s.corners = []
      if (s.cornersG) {
        s.cornersG.replaceChildren()
        for (let i = 1; i < g.pts.length - 1; i++) {
          const m = document.createElementNS(SVG, 'rect')
          m.setAttribute('x', (g.pts[i][0] - 4.5).toFixed(1)); m.setAttribute('y', (g.pts[i][1] - 4.5).toFixed(1))
          m.setAttribute('width', 9); m.setAttribute('height', 9)
          m.setAttribute('class', 'trace__corner' + (reduced ? ' is-on' : ''))
          s.cornersG.append(m)
          s.corners.push({ el: m, at: s.cum[i] })
        }
      }
      // Stage nodes light up when the drawn length passes them.
      for (const st of s.steps) {
        const n = relTo($('.step__node', st), r)
        const nx = n.x + n.w / 2, ny = n.y + n.h / 2
        st._at = g.row ? s.cum[1] + (nx - s.x) : ny
        st._on = null
      }
      s.last = -1
    }
    maxScroll = Math.max(0, root.scrollHeight - innerHeight)
    update()
  }

  /** Pen = reading point at 78% of the viewport; it reaches the page end at max scroll. */
  function pen() {
    const sy = scrollY, vh = innerHeight
    const rem = maxScroll - sy
    const f = rem < vh ? PEN + (1 - PEN) * (1 - Math.max(rem, 0) / vh) : PEN
    let y = sy + vh * f
    if (intro < 1) y = originY + (y - originY) * (1 - Math.pow(1 - intro, 3))
    return y
  }

  /** Drawn length for a section-relative pen y (piecewise linear over the vertex keys). */
  function drawnAt(s, py) {
    const k = s.keys
    if (py <= k[0]) return 0
    for (let i = 1; i < k.length; i++) {
      if (py < k[i]) return s.cum[i - 1] + (s.cum[i] - s.cum[i - 1]) * (py - k[i - 1]) / (k[i] - k[i - 1])
    }
    return s.len
  }
  function pointAt(s, d) {
    for (let i = 1; i < s.cum.length; i++) {
      if (d <= s.cum[i]) {
        const f = (d - s.cum[i - 1]) / Math.max(1e-6, s.cum[i] - s.cum[i - 1])
        return [s.pts[i - 1][0] + (s.pts[i][0] - s.pts[i - 1][0]) * f, s.pts[i - 1][1] + (s.pts[i][1] - s.pts[i - 1][1]) * f]
      }
    }
    return s.pts[s.pts.length - 1]
  }

  function update() {
    ticking = false
    const y = pen()
    for (const s of segs) {
      const d = reduced ? s.len : drawnAt(s, y - s.top)
      if (Math.abs(d - s.last) < 0.3) continue
      s.last = d
      if (!reduced) {
        s.path.style.strokeDashoffset = (s.len - d).toFixed(1)
        const drawing = d > 0 && d < s.len
        s.head.style.opacity = drawing ? 1 : 0
        if (drawing) { const [hx, hy] = pointAt(s, d); s.head.style.transform = `translate(${hx.toFixed(1)}px, ${hy.toFixed(1)}px)` }
      }
      for (const c of s.corners) c.el.classList.toggle('is-on', d >= c.at - 1)
      for (const st of s.steps) {
        const on = d >= st._at - 1
        if (on !== st._on) { st._on = on; st.classList.toggle('is-on', on) }
      }
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }

  function startTrace() {
    layout()
    let rz = 0
    const relayout = () => { clearTimeout(rz); rz = setTimeout(layout, 120) }
    addEventListener('resize', relayout)
    new ResizeObserver(relayout).observe(document.body)
    if (reduced) return
    addEventListener('scroll', onScroll, { passive: true })
    // Intro: the first line is drawn on load, from the origin down to the pen.
    const t0 = performance.now() + 450, dur = 1100
    ;(function tick(now) {
      intro = Math.min(1, Math.max(0, (now - t0) / dur))
      update()
      if (intro < 1) requestAnimationFrame(tick)
    })(performance.now())
  }

  if (reduced) document.fonts.ready.then(startTrace)
  else document.fonts.ready.then(() => { startMotion(); startTrace() })
})()
