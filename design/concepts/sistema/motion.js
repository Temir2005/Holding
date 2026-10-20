/*
 * Concept C — "Sistema". Renders every block from window.MS and wires the motion:
 *   - hero mini pipeline runs once on load (a "deploy" of the full cycle);
 *   - stats roll in as an odometer when they enter the viewport;
 *   - the process pipeline fill is bound to scroll (maps to Framer Motion useScroll/useTransform);
 *   - the showcase preview cross-fades on row hover/focus.
 * Reduced motion: everything is rendered in its final state, nothing moves.
 */
;(() => {
  'use strict'
  const MS = window.MS
  const { t, esc, num } = MS
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const motion = !MS.reduced
  const pad2 = (i) => String(i).padStart(2, '0')

  // UI strings the shared harness does not carry. On the site they live in frontend/src/i18n.
  const LOCAL = {
    skip: { ru: 'Перейти к содержанию', kk: 'Мазмұнға өту', en: 'Skip to content' },
    nav: { ru: 'Основная навигация', kk: 'Негізгі навигация', en: 'Main navigation' },
    home: { ru: 'На главную', kk: 'Басты бетке', en: 'Home' },
  }
  const L = (k) => t(LOCAL[k])

  const LANGS = [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']]
  const langHref = (code) => {
    const p = new URLSearchParams(location.search)
    p.set('lang', code)
    p.delete('menu')
    return `?${p}`
  }
  const langLinks = () =>
    LANGS.map(([code, label]) =>
      `<a href="${langHref(code)}" hreflang="${code}" lang="${code}"${code === MS.lang ? ' aria-current="true"' : ''}>${label}</a>`).join('')

  const logo = () =>
    `<a class="logo" href="#top" aria-label="${esc(MS.C.site.name)} — ${esc(L('home'))}">` +
    `<span class="logo__mark" aria-hidden="true"><i></i><i></i><i></i></span>` +
    `<span class="logo__word">${esc(MS.C.site.name)}</span></a>`

  const STATUS = { planned: 0, in_progress: 1, completed: 2 }
  const mtrack = (s) => `<span class="mtrack" data-s="${s}" aria-hidden="true"><i></i><i></i><i></i></span>`

  /** Splits a stat suffix into a symbol (+, %) set in the display face, or a unit set in mono. */
  const suffix = (sfx) => {
    const s = (sfx || '').trim()
    if (!s) return ''
    return /^[+%]$/.test(s) ? `<span class="stat__sym">${esc(s)}</span>` : `<span class="stat__unit">${esc(s)}</span>`
  }
  const kpiSuffix = (sfx) => {
    const s = (sfx || '').trim()
    if (!s) return ''
    return `<small${/^[+%]$/.test(s) ? ' class="sym"' : ''}>${esc(s)}</small>`
  }

  const sectionOpen = (el, data, extra = '') => {
    el.className = `blk ${extra} tone-${MS.sectionTone(data)}`.trim()
  }

  const secHead = (data, more = '') => {
    if (!data.eyebrow && !data.title) return ''
    return `<header class="sec-head">` +
      (data.eyebrow ? `<p class="eyebrow" data-reveal>${esc(t(data.eyebrow))}</p>` : '') +
      (data.title ? `<h2 class="h2" data-reveal style="--i:1">${esc(t(data.title))}</h2>` : '') +
      (data.intro ? `<p class="sec-head__intro" data-reveal style="--i:2">${esc(t(data.intro))}</p>` : '') +
      more + `</header>`
  }

  /* ---------- Header ---------- */
  function renderHeader() {
    const el = $('[data-block="header"]')
    el.innerHTML = `<div class="frame hdr__in">${logo()}` +
      `<nav class="hdr__nav" aria-label="${esc(L('nav'))}"><ul>` +
      MS.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(t(n.label))}</a></li>`).join('') +
      `</ul></nav>` +
      `<div class="langs" role="group" aria-label="${esc(MS.ui('language'))}">${langLinks()}</div>` +
      `<button class="hdr__menu" type="button" aria-expanded="false" aria-controls="menu">` +
      `<span class="hdr__menu-ic" aria-hidden="true"><i></i><i></i></span>${esc(MS.ui('menu'))}</button></div>`
    const skip = $('.skip')
    skip.textContent = L('skip')
  }

  /* ---------- Hero ---------- */
  function renderHero() {
    const h = MS.hero
    const el = $('[data-block="hero"]')
    el.className = 'blk hero tone-dark'
    const steps = MS.process.steps
    const kpis = MS.stats.items.slice(0, 4)
    const bg = h.background

    const pipe = steps.length
      ? `<div class="panel__sec"><div class="panel__sec-h"><span class="lbl">${esc(t(MS.process.eyebrow) || '')}</span>` +
        `<span class="lbl">${pad2(steps.length)}</span></div>` +
        `<div class="hpipe${steps.length > 6 ? ' hpipe--dense' : ''}" style="--n:${steps.length}">` +
        (steps.length > 1 ? `<span class="hpipe__track" aria-hidden="true"><span class="hpipe__fill"></span></span>` : '') +
        `<ol class="hpipe__list">` +
        steps.map((s, i) =>
          `<li class="hpipe__step${s.division ? ' is-div' : ''}" style="--i:${i}"><span class="hpipe__node" aria-hidden="true"></span>` +
          `<span class="hpipe__num">${pad2(i + 1)}</span><span class="hpipe__t">${esc(t(s.title))}</span></li>`).join('') +
        `</ol></div></div>`
      : ''

    const kpiBlock = kpis.length
      ? `<dl class="kpis" style="--k:${kpis.length}">` + kpis.map((k) =>
        `<div><dt>${esc(t(k.label))}</dt><dd>${esc(k.prefix || '')}${num(k.value)}${kpiSuffix(k.suffix)}</dd></div>`).join('') + `</dl>`
      : ''

    const sw = (h.swatches || []).length
      ? `<div class="hero__mat" data-reveal style="--i:4"><ul class="swatches">` + h.swatches.map((s) =>
        `<li class="swatch" title="${esc(s.code)} · ${esc(t(s.label))}">` +
        `<span class="swatch__chip" style="--c:${esc(s.color)}" data-finish="${esc(s.finish)}" aria-hidden="true"></span>` +
        `<span class="swatch__code">${esc(s.code)}</span><span class="sr">${esc(t(s.label))}</span></li>`).join('') +
        `</ul></div>`
      : ''

    el.innerHTML = `<div class="hero__bg" aria-hidden="true"></div><div class="frame hero__in">` +
      `<div class="hero__copy">` +
      (h.eyebrow ? `<p class="eyebrow" data-reveal>${esc(t(h.eyebrow))}</p>` : '') +
      `<h1 class="h1" data-reveal style="--i:1">${esc(t(h.title))}</h1>` +
      (h.subtitle ? `<p class="lead" data-reveal style="--i:2">${esc(t(h.subtitle))}</p>` : '') +
      `<div class="ctas" data-reveal style="--i:3">` + (h.ctas || []).map((c) =>
        `<a class="btn ${c.variant === 'primary' ? 'btn--primary' : 'btn--ghost edge'}" href="${esc(c.href)}">${esc(t(c.label))}` +
        `<span class="btn__arrow" aria-hidden="true">→</span></a>`).join('') + `</div>` +
      `</div>` +
      `<div class="panel" data-reveal style="--i:2">` +
      `<div class="panel__bar"><span class="live" aria-hidden="true"></span><span class="lbl">${esc(MS.C.site.name)}</span>` +
      `<span class="panel__bar-r" aria-hidden="true"><i></i><i></i><i></i></span></div>` +
      (bg ? `<div class="panel__win">${MS.plate(bg)}<span class="panel__dim lbl" aria-hidden="true">${bg.width} × ${bg.height}</span></div>` : '') +
      pipe + kpiBlock + `</div>` + sw + `</div>`
  }

  /* ---------- Stats ---------- */
  /** Row pattern: big pairs first, then rows of three. Returns a size class per item. */
  function statSizes(n) {
    if (n === 1) return ['xl']
    const pairs = n % 3 === 0 ? 0 : n % 3 === 1 ? 2 : 1
    const out = []
    for (let i = 0; i < n; i++) out.push(i < pairs * 2 ? 'l' : 'm')
    return out
  }

  function odometer(str) {
    let digitIndex = 0
    const digits = str.replace(/\D/g, '').length
    return `<span class="odo" aria-hidden="true">` + [...str].map((ch) => {
      if (!/\d/.test(ch)) return `<span class="odo__s">${esc(ch)}</span>`
      const d = +ch
      const fromRight = digits - 1 - digitIndex++
      const col = Array.from({ length: 20 }, (_, k) => `<span>${k % 10}</span>`).join('')
      return `<span class="odo__d"><span class="odo__col" style="--k:${10 + d};--dl:${fromRight * 40}ms">${col}</span></span>`
    }).join('') + `</span>`
  }

  function renderStats() {
    const s = MS.stats
    const el = $('[data-block="stats"]')
    sectionOpen(el, s, 'stats')
    const sizes = statSizes(s.items.length)
    const body = s.items.length
      ? `<ul class="stats__grid">` + s.items.map((it, i) => {
        const value = num(it.value)
        const full = `${it.prefix || ''}${value}${(it.suffix || '').trim() ? ' ' + it.suffix.trim() : ''}`
        return `<li class="stat stat--${sizes[i]}" style="--i:${i % 3}">` +
          `<div class="stat__top"><span class="lbl">${pad2(i + 1)}</span><span class="tick" aria-hidden="true"></span></div>` +
          `<div><p class="stat__num"><span class="sr">${esc(full)}</span>${esc(it.prefix || '')}` +
          (motion ? odometer(value) : `<span aria-hidden="true">${esc(value)}</span>`) +
          `<span aria-hidden="true" style="display:contents">${suffix(it.suffix)}</span></p>` +
          `<p class="stat__label">${esc(t(it.label))}</p></div></li>`
      }).join('') + `</ul>`
      : `<div class="stats__empty"><p class="empty">${mtrack(-1)}${esc(MS.ui('empty'))}</p></div>`
    el.innerHTML = `<div class="frame">${secHead(s)}${body}</div>`
  }

  /* ---------- Process ---------- */
  function renderProcess() {
    const p = MS.process
    const el = $('[data-block="process_steps"]')
    sectionOpen(el, p, 'process')
    const n = p.steps.length
    const steps = p.steps.map((s, i) =>
      `<li class="step${s.division ? ' is-div' : ''}" style="--i:${i}">` +
      `<span class="step__node" aria-hidden="true"></span>` +
      // compact state of the scene: number + short mono title (duplicate, hidden from AT)
      `<span class="step__mini" aria-hidden="true"><span class="step__num">${pad2(i + 1)}</span>` +
      `<span class="step__mini-t">${esc(t(s.title))}</span></span>` +
      `<div class="step__full"><span class="step__num">${pad2(i + 1)}</span>` +
      `<h3 class="h3 step__title">${esc(t(s.title))}</h3>` +
      (s.text ? `<p class="step__text">${esc(t(s.text))}</p>` : '') +
      (s.division ? `<div class="svc-row"><span class="svc-row__line" aria-hidden="true"></span>` +
        `<a class="svc edge" href="${esc(s.division.href)}"><span class="svc__ic" aria-hidden="true"></span>` +
        `<span>${esc(s.division.name)}</span><span class="svc__arrow" aria-hidden="true">↗</span></a></div>` : '') +
      `</div></li>`).join('')
    const log = p.steps.map((s, i) =>
      `<span class="pipe__log-i"><b>${pad2(i + 1)}</b> ${esc(t(s.title))}</span>`).join('')
    const body = n
      ? `<div class="pipe" data-reveal style="--n:${n}" data-capable="${n >= 3 && n <= 6 ? 1 : 0}">` +
        `<div class="pipe__bar"><span class="live" aria-hidden="true"></span>` +
        `<span class="pipe__count" aria-hidden="true"><b data-done>${pad2(motion ? 0 : n)}</b><span> / ${pad2(n)}</span></span>` +
        `<span class="pipe__log" aria-hidden="true"><span class="pipe__log-col">${log}</span></span>` +
        `<span class="pipe__segs" aria-hidden="true">${'<i></i>'.repeat(n)}</span></div>` +
        `<div class="pipe__body"><span class="pipe__hl" aria-hidden="true"></span>` +
        `<span class="pipe__track" aria-hidden="true"><span class="pipe__fill"></span><span class="pipe__head"></span></span>` +
        `<ol class="pipe__steps">${steps}</ol></div></div>`
      : `<div class="pipe"><p class="empty">${mtrack(-1)}${esc(MS.ui('empty'))}</p></div>`
    el.innerHTML = `<div class="frame"><div class="scene" style="--n:${n}"><div class="scene__stage">${secHead(p)}${body}</div></div></div>`
  }

  /* ---------- Showcase ---------- */
  function renderShowcase() {
    const s = MS.showcase
    const el = $('[data-block="projects_showcase"]')
    sectionOpen(el, s, 'showcase')
    const items = s.items
    const more = s.link
      ? `<a class="more sec-head__more" href="${esc(s.link.href)}" data-reveal style="--i:2">${esc(t(s.link.label))}<span class="btn__arrow" aria-hidden="true">→</span></a>`
      : ''
    const area = (v) => (v == null ? `<span class="meta__v is-null">—</span>` : `<span class="meta__v">${num(v)} ${esc(MS.ui('sqm'))}</span>`)
    const year = (v) => (v == null ? `<span class="meta__v is-null">—</span>` : `<span class="meta__v">${v}</span>`)
    const statusBlock = (p) => {
      const si = STATUS[p.status] ?? 0
      return `<span class="status" data-s="${si}"><span class="chip"><span class="chip__dot" aria-hidden="true"></span>${esc(MS.ui(`status.${p.status}`))}</span>${mtrack(si)}</span>`
    }
    const token = (p) => (p.is_tokenized ? `<span class="chip chip--token">${esc(MS.ui('tokenized'))}</span>` : '')

    const rows = items.map((p, i) =>
      `<li><a class="row" href="#" data-i="${i}" data-reveal style="--i:${Math.min(i, 8)}">` +
      `<span class="row__idx" aria-hidden="true">${pad2(i + 1)}</span>` +
      `<span class="row__media">${MS.plate(p.cover)}</span>` +
      `<span class="row__main"><span class="row__title">${esc(p.title)}</span>${token(p)}</span>` +
      `<span class="row__status">${statusBlock(p)}</span>` +
      `<span class="meta row__loc"><span class="meta__k lbl">${esc(MS.ui('location'))}</span><span class="meta__v">${esc(t(p.location))}</span></span>` +
      `<span class="meta row__year"><span class="meta__k lbl">${esc(MS.ui('year'))}</span>${year(p.year)}</span>` +
      `<span class="meta row__area"><span class="meta__k lbl">${esc(MS.ui('area'))}</span>${area(p.area_m2)}</span>` +
      (p.short ? `<span class="row__short">${esc(t(p.short))}</span>` : '') +
      `</a></li>`).join('')

    const list = items.length
      ? `<div class="sc__thead lbl" aria-hidden="true"><span>#</span><span>${esc(t(s.eyebrow) || '')}</span><span></span>` +
        `<span>${esc(MS.ui('year'))}</span><span>${esc(MS.ui('area'))}</span></div>` +
        `<ul class="rows${items.length === 1 ? ' rows--one' : ''}">${rows}</ul>`
      : `<div class="pipe"><p class="empty">${mtrack(-1)}${esc(MS.ui('empty'))}</p></div>`

    const preview = items.length
      ? `<div class="sc__preview" aria-hidden="true" data-reveal style="--i:1"><div class="sc__frame">` +
        `<div class="sc__stack">` + items.map((p, i) => `<div class="sc__slide${i === 0 ? ' is-active' : ''}">${MS.plate(p.cover)}</div>`).join('') + `</div>` +
        `<div class="sc__cap">` + items.map((p, i) =>
          `<div class="sc__cap-i${i === 0 ? ' is-active' : ''}"><div class="sc__cap-h"><span class="lbl">${esc(p.division || '')}</span>` +
          `<span class="lbl">${pad2(i + 1)} / ${pad2(items.length)}</span></div>` +
          (p.short ? `<p>${esc(t(p.short))}</p>` : '') + `</div>`).join('') +
        `</div></div></div>`
      : ''

    el.innerHTML = `<div class="frame">${secHead(s, more)}<div class="sc${items.length ? '' : ' sc--empty'}">` +
      `<div class="sc__list">${list}</div>${preview}</div></div>`
  }

  /* ---------- Footer ---------- */
  function renderFooter() {
    const c = MS.C.site.contacts
    const el = $('[data-block="footer"]')
    el.innerHTML = `<div class="frame ftr__in">` +
      `<div class="ftr__brand">${logo()}<address class="ftr__addr">${esc(t(c.address))}</address></div>` +
      `<address class="ftr__contacts"><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>` +
      `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></address>` +
      `<nav class="ftr__nav" aria-label="${esc(L('nav'))}"><ul>` +
      MS.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(t(n.label))}</a></li>`).join('') + `</ul></nav>` +
      `<div class="ftr__base"><span class="lbl">© ${new Date().getFullYear()} ${esc(MS.C.site.name)}</span>` +
      `<div class="langs" role="group" aria-label="${esc(MS.ui('language'))}">${langLinks()}</div></div></div>`
  }

  /* ---------- Mobile menu ---------- */
  function renderMenu() {
    const c = MS.C.site.contacts
    const m = document.createElement('div')
    m.className = 'menu tone-dark'
    m.id = 'menu'
    m.hidden = true
    m.setAttribute('role', 'dialog')
    m.setAttribute('aria-modal', 'true')
    m.setAttribute('aria-label', MS.ui('menu'))
    m.innerHTML = `<div class="menu__bar">${logo()}` +
      `<button class="hdr__menu menu__close" type="button">${esc(MS.ui('close'))}</button></div>` +
      `<nav class="menu__nav" aria-label="${esc(L('nav'))}"><ol>` +
      MS.nav.map((n, i) => `<li style="--i:${i}"><a href="${esc(n.href)}"><span class="lbl" aria-hidden="true">${pad2(i + 1)}</span>${esc(t(n.label))}</a></li>`).join('') +
      `</ol></nav><div class="menu__foot">` +
      `<div class="menu__row"><span class="lbl" id="menu-lang">${esc(MS.ui('language'))}</span>` +
      `<div class="langs" role="group" aria-labelledby="menu-lang">${langLinks()}</div></div>` +
      `<address class="menu__contacts"><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>` +
      `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a><span>${esc(t(c.address))}</span></address></div>`
    document.body.append(m)

    const btn = $('.hdr__menu')
    const outside = () => [$('[data-block="header"]'), $('main'), $('[data-block="footer"]')]
    const focusables = () => $$('a[href], button:not([disabled])', m)

    const open = (animate) => {
      m.hidden = false
      m.classList.toggle('is-anim', !!animate)
      btn.setAttribute('aria-expanded', 'true')
      document.body.classList.add('is-locked')
      outside().forEach((n) => n && (n.inert = true))
      $(".menu__close", m).focus()
    }
    const close = () => {
      m.hidden = true
      m.classList.remove('is-anim')
      btn.setAttribute('aria-expanded', 'false')
      document.body.classList.remove('is-locked')
      outside().forEach((n) => n && (n.inert = false))
      btn.focus()
    }
    btn.addEventListener('click', () => open(motion))
    $('.menu__close', m).addEventListener('click', close)
    $$('.menu__nav a', m).forEach((a) => a.addEventListener('click', () => { if (a.getAttribute('href').startsWith('#')) close() }))
    m.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    })
    if (MS.menuOpen) open(false)
  }

  /* ---------- Motion ---------- */
  function revealOnView() {
    if (!motion || !('IntersectionObserver' in window)) {
      $$('[data-reveal], .stat').forEach((n) => n.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    $$('[data-reveal], .stat').forEach((n) => io.observe(n))
  }

  function heroRun() {
    const hp = $('.hpipe')
    if (!hp || !motion) return
    requestAnimationFrame(() => requestAnimationFrame(() => hp.classList.add('is-run')))
  }

  /**
   * Process pipeline, two modes:
   *  - scene (≥1024, motion on, 3–6 steps): the section is a (100 + 45·N)vh runway with a sticky
   *    100vh stage. Scroll progress 0→1 picks the active stage; columns move by transform only
   *    (precomputed x per layout), the head rides the track between live node positions.
   *  - log (everything else): vertical list, fill bound to scroll; reduced motion → filled.
   * Maps to Framer Motion: useScroll({ target: runway }) → progress → same math.
   */
  function pipeline() {
    const pipe = $('.process .pipe[data-capable]')
    if (!pipe) return
    const sec = $('.process')
    const scene = $('.scene', sec)
    const body = $('.pipe__body', pipe)
    const track = $('.pipe__track', pipe)
    const fill = $('.pipe__fill', pipe)
    const head = $('.pipe__head', pipe)
    const hl = $('.pipe__hl', pipe)
    const steps = $$('.step', pipe)
    const nodes = steps.map((s) => $('.step__node', s))
    const counter = $('[data-done]', pipe)
    const logCol = $('.pipe__log-col', pipe)
    const logItems = $$('.pipe__log-i', pipe)
    const segs = $$('.pipe__segs i', pipe)
    const n = steps.length
    const wide = matchMedia('(min-width: 1024px)')
    const NODE_X = 24 + 6.5
    let isScene = false, fracs = [], len = 0, geo = null, k = -1, inView = false, raf = 0

    const clamp01 = (v) => Math.max(0, Math.min(1, v))

    /* ----- log mode ----- */
    const layoutLog = () => {
      // offset* ignores transforms, so reveal motion cannot skew the measured geometry
      const c = steps.map((s, i) => ({ x: s.offsetLeft + nodes[i].offsetLeft + 6.5, y: s.offsetTop + nodes[i].offsetTop + 6.5 }))
      const a = c[0], z = c[n - 1]
      len = z.y - a.y
      Object.assign(track.style, { left: `${a.x}px`, top: `${a.y}px`, height: `${len}px`, width: '' })
      fracs = c.map((p) => (len ? (p.y - a.y) / len : 0))
      track.style.display = n > 1 ? '' : 'none'
      pipe.style.setProperty('--len', `${len}px`)
    }
    let lastDone = -1
    const applyLog = (p) => {
      pipe.style.setProperty('--p', p.toFixed(4))
      let done = 0
      steps.forEach((s, i) => {
        const on = p >= fracs[i] - 0.001
        s.classList.toggle('is-done', on)
        if (on) done = i + 1
      })
      steps.forEach((s, i) => s.classList.toggle('is-cur', i === done - 1 && done < n))
      pipe.classList.toggle('is-done', done === n)
      if (done !== lastDone) { counter.textContent = pad2(done); lastDone = done }
    }
    const updateLog = () => {
      if (!motion) return applyLog(1)
      const vh = innerHeight
      const r = track.getBoundingClientRect()
      const p = n === 1 ? (r.top < vh * 0.62 ? 1 : 0) : (vh * 0.62 - r.top) / Math.max(r.height, 1)
      applyLog(clamp01(p))
    }

    /* ----- scene mode ----- */
    const layoutScene = () => {
      const W = body.clientWidth
      const wi = Math.round(Math.min(168, (W * 0.5) / (n - 1)))
      const wa = W - wi * (n - 1)
      geo = { W, wi, wa }
      pipe.style.setProperty('--wa', `${wa}px`)
      pipe.style.setProperty('--wi', `${wi}px`)
      len = W - NODE_X - 24
      Object.assign(track.style, { left: `${NODE_X}px`, top: `${28 + 6.5}px`, width: `${len}px`, height: '', display: '' })
      k = -1
    }
    const progress = () => {
      const r = scene.getBoundingClientRect()
      return clamp01(-r.top / Math.max(r.height - innerHeight, 1))
    }
    const setActive = (nk) => {
      if (nk === k) return
      k = nk
      steps.forEach((s, i) => {
        s.style.setProperty('--x', `${i * geo.wi + (i > k ? geo.wa - geo.wi : 0)}px`)
        s.classList.toggle('is-cur', i === k)
        s.classList.toggle('is-done', i <= k)
      })
      hl.style.setProperty('--x', `${k * geo.wi}px`)
      counter.textContent = pad2(k + 1)
      logItems.forEach((it, i) => { it.classList.toggle('is-done', i < k); it.classList.toggle('is-cur', i === k) })
      logCol.style.setProperty('--k', k)
      segs.forEach((g, i) => { g.classList.toggle('is-done', i < k); g.classList.toggle('is-cur', i === k) })
    }
    const tickScene = () => {
      raf = 0
      const p = progress()
      const f = p * n
      const nk = Math.min(n - 1, Math.floor(f))
      const tt = clamp01(f - nk)
      setActive(nk)
      pipe.classList.toggle('is-done', p >= 0.999)
      segs[n - 1].classList.toggle('is-done', p >= 0.999)
      // live node positions (rects include running transitions) keep the head glued to the track
      const bl = body.getBoundingClientRect().left
      const cx = (i) => { const r = nodes[i].getBoundingClientRect(); return r.left + r.width / 2 - bl }
      const a = cx(nk)
      const z = nk < n - 1 ? cx(nk + 1) : geo.W - 24
      const hx = a + (z - a) * tt - NODE_X
      head.style.transform = `translate3d(${hx.toFixed(1)}px, 0, 0)`
      fill.style.transform = `scaleX(${clamp01(hx / len).toFixed(4)})`
      if (inView) raf = requestAnimationFrame(tickScene)
    }

    /* ----- mode switch ----- */
    const layout = () => {
      isScene = motion && wide.matches && pipe.dataset.capable === '1'
      sec.classList.toggle('is-scene', isScene)
      pipe.classList.toggle('pipe--s', isScene)
      pipe.classList.toggle('pipe--v', !isScene)
      fill.style.transform = head.style.transform = ''
      steps.forEach((s) => s.style.removeProperty('--x'))
      if (isScene) {
        layoutScene()
        if (!raf) tickScene()
      } else {
        lastDone = -1
        layoutLog()
        updateLog()
      }
    }

    addEventListener('scroll', () => {
      if (isScene) { if (!raf) raf = requestAnimationFrame(tickScene) }
      else if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateLog() })
    }, { passive: true })
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        inView = e.isIntersecting
        if (inView && isScene && !raf) raf = requestAnimationFrame(tickScene)
      }).observe(scene)
    }
    // keyboard: focusing something inside a stage scrolls the runway to that stage
    steps.forEach((s, i) => s.addEventListener('focusin', () => {
      if (!isScene || i === k) return
      const r = scene.getBoundingClientRect()
      scrollTo(0, scrollY + r.top + (r.height - innerHeight) * ((i + 0.5) / n))
    }))
    addEventListener('resize', () => requestAnimationFrame(layout))
    wide.addEventListener('change', layout)
    document.fonts?.ready.then(layout)
    layout()
  }

  function showcase() {
    const rows = $$('.showcase .row')
    const slides = $$('.showcase .sc__slide')
    const caps = $$('.showcase .sc__cap-i')
    if (!rows.length) return
    let cur = 0
    const set = (i) => {
      if (i === cur) return
      cur = i
      rows.forEach((r, k) => r.classList.toggle('is-active', k === i))
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i))
      caps.forEach((s, k) => s.classList.toggle('is-active', k === i))
    }
    rows[0].classList.add('is-active')
    rows.forEach((r, i) => {
      r.addEventListener('pointerenter', () => set(i))
      r.addEventListener('focus', () => set(i))
    })
  }

  renderHeader()
  renderHero()
  renderStats()
  renderProcess()
  renderShowcase()
  renderFooter()
  renderMenu()
  if (motion) document.documentElement.classList.add('js-motion')
  revealOnView()
  heroRun()
  pipeline()
  showcase()
})()
