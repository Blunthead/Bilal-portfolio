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
let ticking = false

function frame() {
  ticking = false
  const y = window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight

  progress.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`
  nav.classList.toggle('is-scrolled', y > 8)
  topBtn.classList.toggle('show', y > 600)

  if (!calm) {
    // The orbs drift at different speeds, which is the whole parallax.
    if (y < window.innerHeight * 1.2) {
      for (const orb of orbs) orb.style.transform = `translate3d(0, ${y * Number(orb.dataset.speed)}px, 0)`
    }

    if (statement && words.length) {
      const rect = statement.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      const p = clamp(-rect.top / travel)
      const lit = Math.round(p * 1.15 * words.length)
      words.forEach((w, i) => w.classList.toggle('on', i < lit))
    }

    if (timeline) {
      const rect = timeline.getBoundingClientRect()
      const p = clamp((window.innerHeight * 0.7 - rect.top) / rect.height)
      timeline.style.setProperty('--fill', p.toFixed(3))
    }
  }
}

function onScroll() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(frame)
  }
}
window.addEventListener('scroll', onScroll, { passive: true })
window.addEventListener('resize', onScroll)
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
function countUp(el) {
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
