/*
 * Concept B — "Monolit". Renders every block from window.MS, then wires the motion:
 * "cast" numbers (mold → pour → count-up), crane-set slabs, pour reveals for photos.
 * Reduced motion: no .js-motion class, so the CSS default (settled) state is what renders.
 */
;(function () {
  const MS = window.MS
  const { t, esc, num, ui, C } = MS
  const reduced = MS.reduced
  const root = document.documentElement
  if (!reduced) root.classList.add('js-motion')

  /* UI strings the shared harness does not have. On the site they belong in frontend/src/i18n. */
  const LOCAL = {
    skip: { ru: 'К содержанию', kk: 'Мазмұнға өту', en: 'Skip to content' },
    nav: { ru: 'Основная навигация', kk: 'Негізгі навигация', en: 'Main navigation' },
    contacts: { ru: 'Контакты', kk: 'Байланыс', en: 'Contacts' },
    address: { ru: 'Адрес', kk: 'Мекенжай', en: 'Address' },
    phone: { ru: 'Телефон', kk: 'Телефон', en: 'Phone' },
    email: { ru: 'Почта', kk: 'Пошта', en: 'Email' },
    swatches: { ru: 'Образцы панелей', kk: 'Панель үлгілері', en: 'Panel samples' },
  }
  const L = (k) => t(LOCAL[k])
  const LANGS = [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']]

  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const tone = (sec) => `tone-${MS.sectionTone(sec)}`
  const pad2 = (n) => String(n).padStart(2, '0')
  /** Length of the longest word: drives the display fit formula in CSS (--lw). */
  const longest = (s) => Math.max(4, ...String(s || '').split(/\s+/).map((w) => [...w].length))
  /** Words wrapped for the rise-from-mask reveal; spaces stay real so wrapping is natural. */
  const words = (s) => esc(s).split(/\s+/).filter(Boolean)
    .map((w, i) => `<span class="w"><span class="w__i" style="--i:${i}">${w}</span></span>`).join(' ')

  function langHref(code) {
    const p = new URLSearchParams(location.search)
    p.set('lang', code)
    p.delete('menu')
    return `${location.pathname}?${p}`
  }
  const langLinks = () => LANGS.map(([code, label]) =>
    `<a href="${langHref(code)}" hreflang="${code}" lang="${code}"${MS.lang === code ? ' aria-current="true"' : ''}>${label}</a>`).join('')

  /* ---- Cast numbers ------------------------------------------------------------------- */
  const NUMERAL_SUFFIX = /^[+%]+$/
  /** Approximate advance (em) of the numeral face at wdth 125, tnum: lets CSS fit any value. */
  function emOf(body, unit) {
    let em = 0
    for (const ch of body) em += /\d/.test(ch) ? 1.05 : ch === '+' ? .84 : ch === '%' ? 1.4 : ch === ' ' ? .17 : .4
    if (unit) em += .1 + [...unit].length * .34 * .6
    return em
  }
  /**
   * item: { value, prefix?, suffix? } or { body } for fixed labels like step numbers.
   * Letters in the suffix (м², «дня») become a unit set in the text face; + and % stay cast.
   */
  function cast(item, { count = true } = {}) {
    const sfx = (item.suffix || '').trim()
    const numeric = NUMERAL_SUFFIX.test(sfx)
    const pre = item.prefix || ''
    const post = numeric ? sfx : ''
    const unit = numeric ? '' : sfx
    const body = item.body ?? pre + num(item.value) + post
    const data = count && item.value != null
      ? ` data-value="${item.value}" data-pre="${esc(pre)}" data-post="${esc(post)}"` : ''
    return `<span class="cast" style="--em:${emOf(body, unit).toFixed(2)}"${data}>` +
      `<span class="cast__body" aria-hidden="true"><span class="cast__mold">${esc(body)}</span>` +
      `<span class="cast__fill"><span class="v">${esc(body)}</span></span><span class="cast__level"></span></span>` +
      (unit ? `<span class="cast__unit" aria-hidden="true">${esc(unit)}</span>` : '') +
      `<span class="sr-only">${esc(unit ? `${body} ${unit}` : body)}</span></span>`
  }

  /* ---- Header + menu ------------------------------------------------------------------ */
  function renderHeader() {
    const el = $('[data-block="header"]')
    const items = MS.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(t(n.label))}</a></li>`).join('')
    const menuItems = MS.nav.map((n, i) =>
      `<li><a href="${esc(n.href)}"><span class="menu__idx" aria-hidden="true">${pad2(i + 1)}</span>${esc(t(n.label))}</a></li>`).join('')
    const c = C.site.contacts
    el.innerHTML = `
      <div class="site-header__bar">
        <a class="wordmark" href="#main">${esc(C.site.name)}</a>
        <nav class="nav" aria-label="${esc(L('nav'))}"><ul>${items}</ul></nav>
        <div class="langs" aria-label="${esc(ui('language'))}">${langLinks()}</div>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">${esc(ui('menu'))}</button>
      </div>
      <div class="menu tone-dark concrete formwork" id="menu" role="dialog" aria-modal="true" aria-label="${esc(ui('menu'))}" hidden>
        <div class="menu__top">
          <span class="wordmark" aria-hidden="true">${esc(C.site.name)}</span>
          <button class="menu-btn menu-close" type="button">${esc(ui('close'))}</button>
        </div>
        <nav class="menu__nav" aria-label="${esc(L('nav'))}"><ol>${menuItems}</ol></nav>
        <div class="menu__foot">
          <div class="langs" aria-label="${esc(ui('language'))}">${langLinks()}</div>
          <div class="contacts">
            <span>${esc(t(c.address))}</span>
            <a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>
            <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>
          </div>
        </div>
      </div>`
    const btn = $('.site-header__bar .menu-btn', el)
    const menu = $('#menu', el)
    const close = $('.menu-close', menu)
    const focusables = () => $$('a[href], button:not([disabled])', menu)

    function open(animate) {
      menu.hidden = false
      root.classList.add('menu-lock')
      btn.setAttribute('aria-expanded', 'true')
      if (animate && !reduced) {
        menu.classList.add('is-anim')
        menu.addEventListener('animationend', () => menu.classList.remove('is-anim'), { once: true })
      }
      close.focus()
    }
    function shut() {
      menu.hidden = true
      root.classList.remove('menu-lock')
      btn.setAttribute('aria-expanded', 'false')
      btn.focus()
    }
    btn.addEventListener('click', () => open(true))
    close.addEventListener('click', shut)
    $$('.menu__nav a', menu).forEach((a) => a.addEventListener('click', () => { menu.hidden = true; root.classList.remove('menu-lock'); btn.setAttribute('aria-expanded', 'false') }))
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); shut(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    })
    if (MS.menuOpen) open(false)
  }

  /* ---- Hero --------------------------------------------------------------------------- */
  function hexLum(hex) {
    const v = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => {
      const c = parseInt(v.slice(i, i + 2), 16) / 255
      return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4
    })
    return .2126 * r + .7152 * g + .0722 * b
  }
  /**
   * Swatches laid in running bond on a 6-unit course: 3 full bricks, then half + 2 + half.
   * The last course never leaves a gap: its bricks stretch to close the course flush
   * (1 left → a full-width capping brick, 2 left → two 3-unit bricks), so any count ends square.
   */
  function bond(list) {
    if (!list?.length) return ''
    let i = 0, k = 0, n = 0
    const courses = []
    const brick = (s, span) => {
      const ink = hexLum(s.color) > .2 ? '#121314' : '#F1EEE8'
      return `<div class="brick brick--${esc(s.finish)}" role="listitem" style="--c:${esc(s.color)};--ink:${ink};--i:${n++};--span:${span}">` +
        `<span class="brick__code">${esc(s.code)}</span><span class="brick__label">${esc(t(s.label))}</span></div>`
    }
    const half = () => `<div class="brick brick--blank brick--half" aria-hidden="true" style="--i:${n++}"></div>`
    while (i < list.length) {
      const offset = k % 2 === 1
      const cap = offset ? 2 : 3
      const take = Math.min(cap, list.length - i)
      const span = (offset ? 4 : 6) / take
      const row = []
      // A short offset course (1 brick between halves) would read as a hole: close it full width.
      const closeFlat = offset && take < cap
      if (offset && !closeFlat) row.push(half())
      for (let j = 0; j < take; j++) row.push(brick(list[i++], closeFlat ? 6 : span))
      if (offset && !closeFlat) row.push(half())
      courses.push(`<div class="bond__course">${row.join('')}</div>`)
      k++
    }
    return `<div class="bond" role="list" aria-label="${esc(L('swatches'))}">${courses.join('')}</div>`
  }

  function renderHero() {
    const el = $('[data-block="hero"]')
    const H = MS.hero
    // Key figures beside the title. On the site: a hero `facts` field (or a stats reference).
    const facts = MS.stats.items.slice(0, 3)
    el.className = `hero tone-dark concrete formwork${facts.length ? '' : ' no-facts'}`
    const title = t(H.title)
    el.innerHTML = `<div class="grid">
      ${t(H.eyebrow) ? `<p class="hero__eyebrow eyebrow fade">${esc(t(H.eyebrow))}</p>` : ''}
      <h1 class="hero__title fit"><span class="display h1 rise" style="--lw:${longest(title)}">${words(title)}</span></h1>
      ${facts.length ? `<ul class="hero__facts">${facts.map((f) =>
        `<li class="fact">${cast(f)}<span class="fact__label">${esc(t(f.label))}</span></li>`).join('')}</ul>` : ''}
      <div class="hero__base">
        <div class="hero__lede">
          ${t(H.subtitle) ? `<p class="lede fade">${esc(t(H.subtitle))}</p>` : ''}
          <div class="hero__ctas fade">${(H.ctas || []).map((c) =>
            `<a class="btn btn--${c.variant === 'primary' ? 'primary' : 'secondary'}" href="${esc(c.href)}">${esc(t(c.label))}</a>`).join('')}</div>
          ${bond(H.swatches)}
        </div>
        ${H.background ? `<div class="hero__photo pour">${MS.plate(H.background)}</div>` : ''}
      </div>
    </div>`
  }

  /* ---- Section head (eyebrow + h2), shared by all titled blocks ------------------------ */
  function secHead(sec) {
    const eb = t(sec.eyebrow), ti = t(sec.title), intro = t(sec.intro)
    if (!eb && !ti) return ''
    return `<header class="sec-head">${eb ? `<p class="eyebrow">${esc(eb)}</p>` : ''}` +
      (ti ? `<h2 class="fit"><span class="display h2 rise" style="--lw:${longest(ti)}">${words(ti)}</span></h2>` : '') +
      (intro ? `<p class="lede mute">${esc(intro)}</p>` : '') + '</header>'
  }
  const empty = () => `<div class="empty"><span class="label">${esc(ui('empty'))}</span></div>`

  /* ---- Stats: bento, first item is the hero ------------------------------------------- */
  /** Column spans per breakpoint (4 / 8 / 12 columns). The first item always gets the big cell. */
  function statSpans(i, n) {
    if (i === 0) return { s4: 4, s8: 8, s12: 12, size: 'xl' }
    if (i < 3) return { s4: 4, s8: n === 2 ? 8 : 4, s12: n === 2 ? 12 : i === 1 ? 7 : 5, size: 'l' }
    const r = n - 3, idx = i - 3
    const last3 = idx >= r - (r % 3 || 3)
    const s12 = last3 ? 12 / (r % 3 || 3) : 4
    const s8 = r % 2 && idx === r - 1 ? 8 : 4
    const s4 = r % 2 && idx === r - 1 ? 4 : 2
    return { s4, s8, s12, size: 'm' }
  }
  function renderStats() {
    const el = $('[data-block="stats"]')
    const S = MS.stats
    el.className = `stats ${tone(S)} concrete formwork`
    const items = S.items
    const body = items.length
      ? `<ul class="bento">${items.map((it, i) => {
        const s = statSpans(i, items.length)
        const rows = i === 0 && items.length >= 3 ? 2 : 1
        return `<li class="stat stat--${s.size}" style="--s4:${s.s4};--s8:${s.s8};--s12:${s.s12};--rows:${rows}">` +
          `${cast(it)}<span class="stat__label">${esc(t(it.label))}</span></li>`
      }).join('')}</ul>`
      : empty()
    el.innerHTML = `<div class="grid">${secHead(S)}${body}</div>`
  }

  /* ---- Process: slabs ----------------------------------------------------------------- */
  function renderProcess() {
    const el = $('[data-block="process"]')
    const P = MS.process
    el.className = `process ${tone(P)} concrete formwork`
    const steps = P.steps
    const total = steps.length
    const list = total ? `<ol class="slabs">${steps.map((s, i) => {
      const title = t(s.title)
      return `<li class="slab${s.division ? ' slab--accent' : ''}">
        <div class="slab__num">${cast({ body: pad2(i + 1) }, { count: false })}</div>
        <span class="slab__mark" aria-hidden="true">${pad2(i + 1)}/${pad2(total)}</span>
        <h3 class="slab__title fit"><span class="display h3" style="--lw:${longest(title)}">${words(title)}</span></h3>
        <div class="slab__body">
          ${t(s.text) ? `<p class="slab__text">${esc(t(s.text))}</p>` : ''}
          ${s.division ? `<a class="stencil" href="${esc(s.division.href)}"><span class="stencil__t">${esc(s.division.name)}</span></a>` : ''}
        </div>
      </li>`
    }).join('')}</ol>` : empty()
    el.innerHTML = `<div class="grid">${secHead(P)}${list}</div>`
  }

  /* ---- Projects showcase -------------------------------------------------------------- */
  const statusTag = (p) => `<span class="stencil stencil--${esc(p.status)}"><span class="stencil__t">${esc(ui(`status.${p.status}`))}</span></span>` +
    (p.is_tokenized ? `<span class="stencil stencil--token"><span class="stencil__t">${esc(ui('tokenized'))}</span></span>` : '')
  const projHref = (p) => `#project-${esc(p.slug)}`
  const area = (p) => p.area_m2 ? `<span class="num">${num(p.area_m2)}</span> ${esc(ui('sqm'))}` : ''

  function feature(p) {
    const facts = [
      [ui('location'), esc(t(p.location))],
      p.year ? [ui('year'), `<span class="num">${p.year}</span>`] : null,
      p.area_m2 ? [ui('area'), area(p)] : null,
    ].filter(Boolean)
    return `<article class="feature">
      <div class="feature__photo pour">${MS.plate(p.cover)}</div>
      <div class="feature__slab slide fit">
        <div class="feature__meta">${statusTag(p)}</div>
        <h3 class="display feature__title" style="--lw:${longest(p.title)}"><a href="${projHref(p)}">${words(p.title)}</a></h3>
        <div class="feature__facts">${facts.map(([k, v]) => `<div class="pfact"><span class="label">${esc(k)}</span><span class="pfact__v">${v}</span></div>`).join('')}</div>
        ${t(p.short) ? `<p class="feature__short">${esc(t(p.short))}</p>` : ''}
      </div>
    </article>`
  }
  function card(p) {
    return `<article class="card">
      <div class="card__photo pour">${MS.plate(p.cover)}</div>
      <div class="card__head slide"><span class="card__meta">${statusTag(p)}</span>${p.year ? `<span class="card__year">${p.year}</span>` : ''}</div>
      <h3 class="display card__title slide" style="--lw:${longest(p.title)}"><a href="${projHref(p)}">${words(p.title)}</a></h3>
      <p class="card__line slide"><span>${esc(t(p.location))}</span>${p.area_m2 ? `<span>${area(p)}</span>` : ''}</p>
      ${t(p.short) ? `<p class="mute slide">${esc(t(p.short))}</p>` : ''}
    </article>`
  }
  function renderShowcase() {
    const el = $('[data-block="showcase"]')
    const S = MS.showcase
    el.className = `showcase ${tone(S)} concrete formwork`
    const items = S.items
    const link = S.link ? `<a class="tlink showcase__all" href="${esc(S.link.href)}">${esc(t(S.link.label))}</a>` : ''
    const body = items.length
      ? feature(items[0]) + (items.length > 1 ? `<div class="stair">${items.slice(1).map(card).join('')}</div>` : '')
      : empty()
    el.innerHTML = `<div class="grid">${secHead(S)}${link}${body}</div>`
  }

  /* ---- Footer ------------------------------------------------------------------------- */
  function renderFooter() {
    const el = $('[data-block="footer"]')
    const c = C.site.contacts
    el.innerHTML = `<div class="grid">
      <h2 class="sr-only">${esc(L('contacts'))}</h2>
      <div class="site-footer__cols">
        <div><span class="label">${esc(L('address'))}</span><span>${esc(t(c.address))}</span></div>
        <div><span class="label">${esc(L('phone'))}</span><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></div>
        <div><span class="label">${esc(L('email'))}</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
      </div>
      <div class="site-footer__mass" aria-hidden="true" style="--lw:${[...C.site.name].length}">${esc(C.site.name)}</div>
    </div>`
  }

  /* ---- Motion ------------------------------------------------------------------------- */
  function play(el, d) {
    if (d != null) el.style.setProperty('--d', `${d}ms`)
    el.classList.add('is-in')
  }
  /** Count-up inside the fill; leading cells keep the final glyphs (invisible) so tnum cells line up. */
  function countUp(el, delay) {
    const value = Number(el.dataset.value)
    const fill = $('.cast__fill', el)
    const final = fill.textContent
    const pre = el.dataset.pre || '', post = el.dataset.post || ''
    const dur = 800
    const t0 = performance.now() + delay
    const frame = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur))
      const e = 1 - (1 - p) ** 4
      const s = pre + num(Math.round(value * e)) + post
      const lead = Math.max(0, final.length - s.length)
      fill.innerHTML = p < 1
        ? `<span class="pad">${esc(final.slice(0, lead))}</span><span class="v">${esc(s)}</span>`
        : `<span class="v">${esc(final)}</span>`
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }
  function pour(el, d = 0) {
    play(el, d)
    if (el.dataset.value != null) countUp(el, d)
  }
  function onView(els, fn, threshold = .3) {
    if (!('IntersectionObserver' in window)) { els.forEach((e, i) => fn(e, i)); return }
    const io = new IntersectionObserver((entries) => {
      let k = 0
      for (const en of entries) {
        if (!en.isIntersecting) continue
        io.unobserve(en.target)
        fn(en.target, k++)
      }
    }, { threshold, rootMargin: '0px 0px -6% 0px' })
    els.forEach((e) => io.observe(e))
  }

  function motion() {
    if (reduced) return
    // Hero intro: title rises, figures are cast beside it, the photo frame fills from below.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.site-header, .hero .fade').forEach((e, i) => play(e, i ? 420 : 0))
      const h1 = $('.hero .rise'); if (h1) play(h1, 60)
      const photo = $('.hero__photo'); if (photo) play(photo, 220)
      $$('.hero .cast').forEach((c, i) => pour(c, 420 + i * 130))
      const b = $('.hero .bond'); if (b) play(b, 640)
    }))
    $('.site-header').classList.add('fade')

    onView($$('main section:not(.hero) .rise'), (e) => play(e, 0), .2)
    onView($$('.stat'), (e, k) => pour($('.cast', e), k * 110), .35)
    onView($$('.slab'), (e, k) => {
      play(e, k * 140)
      e.style.animationDelay = `${k * 140}ms`
      const c = $('.cast', e); if (c) pour(c, k * 140 + 420)
    }, .25)
    onView($$('main section:not(.hero) .pour'), (e) => play(e, 0), .15)
    onView($$('main section:not(.hero) .slide'), (e, k) => play(e, 120 + k * 60), .2)
  }

  /**
   * Line collisions in the tight display leading (.92): a cap descender (Д Ц Щ Қ Ң Һ) can still
   * hit a mark above Й / Ё on the next line. Instead of loosening every title, the word with the
   * mark gets lifted (padding on its inline-block) only when it sits under a descender word.
   */
  const DESC = /[ДЦЩҚҢҺ]/
  const MARK = /[ЙЁ]/
  function guardMarks() {
    for (const el of $$('.display')) {
      const ws = $$('.w', el)
      ws.forEach((w) => w.classList.remove('w--lift'))
      if (ws.length < 2) continue
      const rows = []
      for (const w of ws) {
        const r = w.getBoundingClientRect()
        const row = rows.find((x) => Math.abs(x.top - r.top) < 4)
        const item = { w, left: r.left, right: r.right, text: w.textContent.toUpperCase() }
        if (row) row.items.push(item); else rows.push({ top: r.top, items: [item] })
      }
      rows.sort((a, b) => a.top - b.top)
      for (let i = 1; i < rows.length; i++) {
        for (const it of rows[i].items) {
          if (!MARK.test(it.text)) continue
          const hit = rows[i - 1].items.some((up) => DESC.test(up.text) && up.left < it.right && up.right > it.left)
          if (hit) it.w.classList.add('w--lift')
        }
      }
    }
  }
  window.MonolitGuard = guardMarks
  let guardTimer = 0
  addEventListener('resize', () => { clearTimeout(guardTimer); guardTimer = setTimeout(guardMarks, 120) })

  $('[data-ui="skip"]').textContent = L('skip')
  renderHeader()
  renderHero()
  renderStats()
  renderProcess()
  renderShowcase()
  renderFooter()
  guardMarks()
  document.fonts.ready.then(guardMarks)
  motion()
})()
