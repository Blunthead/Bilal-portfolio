// Scroll behaviour for the portfolio. No libraries. Everything here is
// decoration: with JavaScript off, or with reduced motion on, the page still
// reads in full (see the reduced-motion block in styles.css).

const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))

const nav = $('#nav')
const progress = $('#progress')
const topBtn = $('#top-btn')
const orbs = $$('.orb')
const statement = $('[data-statement]')
const words = []
const timeline = $('[data-timeline]')

// ---- the statement: split into words, light them up as you scroll ----
const statementText = $('[data-words]')
if (statementText && !calm) {
  const text = statementText.textContent.trim().split(/\s+/)
  statementText.textContent = ''
  text.forEach((word, i) => {
    const span = document.createElement('span')
    span.className = 'w'
    span.textContent = word
    statementText.append(span, i < text.length - 1 ? ' ' : '')
    words.push(span)
  })
}

// ---- one scroll handler, run at most once per frame ----
// Layout is measured once (and again on resize or when fonts and images settle),
// never inside the scroll handler: reading layout while scrolling is what makes
// pages stutter, especially in Safari. The handler only does arithmetic and
// writes, and only writes what actually changed.
let ticking = false
let geo = null
let lastLit = -1
let lastFill = -1
let lastProgress = -1
let navOn = null
let topOn = null

function measure() {
  const y = window.scrollY
  const top = (el) => el.getBoundingClientRect().top + y
  geo = {
    vh: window.innerHeight,
    max: document.documentElement.scrollHeight - window.innerHeight,
    statementTop: statement ? top(statement) : 0,
    statementTravel: statement ? statement.offsetHeight - window.innerHeight : 1,
    timelineTop: timeline ? top(timeline) : 0,
    timelineH: timeline ? timeline.offsetHeight : 1,
    // Where each not-yet-revealed element sits, for `sweep` below.
    pending: [...$$('[data-reveal]:not(.in), [data-count]:not([data-done])')].map((el) => [el, top(el)]),
  }
}

// A reveal fires when an element crosses into view. Jump past one (tap "Contact"
// in the nav, or fling the page) and it never crosses, so it would stay hidden
// above you. Once scrolling settles, anything at or above the bottom of the
// screen is shown. Uses the measured positions: no layout reads.
let settle = null
function sweep() {
  const bottom = window.scrollY + window.innerHeight * 0.92
  geo.pending = geo.pending.filter(([el, elTop]) => {
    if (elTop > bottom) return true
    if (el.hasAttribute('data-count')) countUp(el)
    else el.classList.add('in')
    return false
  })
}

function frame() {
  ticking = false
  const y = window.scrollY

  const p = geo.max > 0 ? clamp(y / geo.max) : 0
  if (Math.abs(p - lastProgress) > 0.0005) {
    lastProgress = p
    progress.style.transform = `scaleX(${p.toFixed(4)})`
  }
  const scrolled = y > 8
  if (scrolled !== navOn) nav.classList.toggle('is-scrolled', (navOn = scrolled))
  const showTop = y > 600
  if (showTop !== topOn) topBtn.classList.toggle('show', (topOn = showTop))

  if (calm) return

  // The orbs drift at different speeds, which is the whole parallax. Off screen, they stop.
  if (y < geo.vh * 1.2) {
    for (const orb of orbs) orb.style.transform = `translate3d(0, ${(y * Number(orb.dataset.speed)).toFixed(1)}px, 0)`
  }

  if (words.length) {
    const t = clamp((y - geo.statementTop) / geo.statementTravel)
    const lit = Math.round(t * 1.15 * words.length)
    if (lit !== lastLit) {
      // Only the words between the old and new position change.
      const from = lastLit < 0 ? 0 : Math.min(lit, lastLit)
      const to = lastLit < 0 ? words.length : Math.max(lit, lastLit)
      for (let i = from; i < to && i < words.length; i++) words[i].classList.toggle('on', i < lit)
      lastLit = lit
    }
  }

  if (timeline) {
    const t = clamp((y + geo.vh * 0.7 - geo.timelineTop) / geo.timelineH)
    if (Math.abs(t - lastFill) > 0.002) {
      lastFill = t
      timeline.style.setProperty('--fill', t.toFixed(3))
    }
  }
}

function onScroll() {
  clearTimeout(settle)
  settle = setTimeout(sweep, 140)
  if (!ticking) {
    ticking = true
    requestAnimationFrame(frame)
  }
}

// Width changes (not the phone's address bar sliding, which only changes height)
// are what move things around.
let lastWidth = window.innerWidth
function onResize() {
  if (window.innerWidth === lastWidth && Math.abs(window.innerHeight - (geo?.vh ?? 0)) < 160) return
  lastWidth = window.innerWidth
  measure()
  onScroll()
}

window.addEventListener('scroll', onScroll, { passive: true })
window.addEventListener('resize', onResize)
window.addEventListener('load', () => { measure(); onScroll() })
if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); onScroll() })
measure()
frame()

topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }))

// ---- reveal on enter ----
const reveals = $$('[data-reveal]')
if (calm || !('IntersectionObserver' in window)) {
  reveals.forEach((el) => el.classList.add('in'))
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('in')
        io.unobserve(entry.target)
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
  )
  reveals.forEach((el) => io.observe(el))
}

// ---- numbers count up once, when they come into view ----
const counters = $$('[data-count]')
// With reduced motion there is nothing to count: show the real number at once.
if (calm) counters.forEach((el) => (el.textContent = el.dataset.count))
function countUp(el) {
  if (el.hasAttribute('data-done')) return
  el.setAttribute('data-done', '')
  const target = Number(el.dataset.count)
  if (calm) {
    el.textContent = target
    return
  }
  const start = performance.now()
  const duration = 1400
  const tick = (now) => {
    const t = clamp((now - start) / duration)
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)))
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
if ('IntersectionObserver' in window) {
  const co = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        countUp(entry.target)
        co.unobserve(entry.target)
      }
    },
    { threshold: 0.6 },
  )
  counters.forEach((el) => co.observe(el))
} else {
  counters.forEach((el) => (el.textContent = el.dataset.count))
}

// ---- which section is on screen, for the nav ----
const links = $$('.nav__links a[href^="#"]:not(.nav__cta)')
const targets = links.map((a) => $(a.getAttribute('href'))).filter(Boolean)
if ('IntersectionObserver' in window && targets.length) {
  const so = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`))
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  )
  targets.forEach((t) => so.observe(t))
}

// ---- a soft light that follows the cursor over cards ----
if (!calm && window.matchMedia('(hover: hover)').matches) {
  for (const card of $$('.spot')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
    })
  }
}

$('#year').textContent = new Date().getFullYear()
