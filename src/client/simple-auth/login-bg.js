/**
 * The falling-starfield background of the pre-login screens (login-bg.jsx).
 *
 * Plain 2d canvas on purpose, not another three.js scene: this is the page
 * background, so it has to be up with the first paint and stay cheap while the
 * login form and the lazily loaded 3D logo are still working. One rAF drives
 * everything and it only ever paints inside its own canvas - no layout, no DOM
 * writes, so the form never waits on it.
 *
 * The page underneath is white, so "stars" are low-alpha ink dots drawn from
 * pre-rendered soft sprites (white points on black would be invisible here):
 * three parallax depth layers falling at different speeds, a slow twinkle, a
 * little horizontal sway, and the occasional meteor.
 */
/* global requestAnimationFrame, cancelAnimationFrame */

const TAU = Math.PI * 2

// ink that reads on white: brand blue, slate, a violet accent, a little teal
const PALETTE = [
  [0, 136, 204],
  [92, 124, 168],
  [124, 108, 196],
  [6, 176, 148]
]
// stars lean as they fall instead of dropping dead straight (fraction of v)
const WIND = 0.22
// one star per this many css px², clamped: phones should not get a handful of
// dots and 4k screens should not get a blizzard
const DENSITY = 3800
const MIN_STARS = 140
const MAX_STARS = 520
const MAX_METEORS = 2
// seconds between meteor attempts
const METEOR_GAP = [2.5, 7]

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
const rand = (min, max) => min + Math.random() * (max - min)
const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${a})`

function reducedMotion () {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// A soft dot per palette colour. Drawing a pre-rendered glow is a single
// drawImage per star; shadowBlur per star per frame is not affordable at this
// count, and arcs alone look like dust instead of stars.
function makeSprite (rgb, size = 64) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')
  const r = size / 2
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, rgba(rgb, 1))
  grad.addColorStop(0.35, rgba(rgb, 0.85))
  grad.addColorStop(0.7, rgba(rgb, 0.22))
  grad.addColorStop(1, rgba(rgb, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(r, r, r, 0, TAU)
  ctx.fill()
  return cv
}

// mostly blue/slate - the accents are rare on purpose, or the field turns
// into confetti
function pickSprite () {
  const r = Math.random()
  return r < 0.44 ? 0 : r < 0.8 ? 1 : r < 0.93 ? 2 : 3
}

function makeStar (st) {
  // z is depth: 0 far (small, slow, faint) .. 1 near, which is where most of
  // the visible size and contrast lives
  const z = Math.pow(Math.random(), 0.85)
  return {
    x: rand(-20, st.w + 20),
    y: rand(-st.h * 0.15, st.h),
    z,
    r: 0.7 + z * 2.3,
    v: 18 + z * 62,
    alpha: 0.22 + z * 0.5,
    sprite: pickSprite(),
    phase: rand(0, TAU),
    rate: rand(0.5, 1.7),
    sway: rand(1.5, 7) * (0.5 + z),
    swayRate: rand(0.12, 0.5)
  }
}

function makeMeteor (st) {
  const dir = Math.random() < 0.5 ? -1 : 1
  const speed = rand(420, 780)
  // steep: they fall, they do not fly across the screen
  const lean = rand(0.2, 0.42)
  const sprite = Math.random() < 0.6 ? 0 : 2
  return {
    x: dir < 0 ? rand(st.w * 0.3, st.w * 1.1) : rand(-st.w * 0.1, st.w * 0.7),
    y: rand(-st.h * 0.3, -10),
    vx: dir * speed * Math.sin(lean),
    vy: speed * Math.cos(lean),
    // tail length in seconds of flight
    tail: rand(0.16, 0.3),
    width: rand(1, 2.2),
    sprite,
    color: PALETTE[sprite]
  }
}

function starCount (st) {
  return Math.round(clamp(st.w * st.h / DENSITY, MIN_STARS, MAX_STARS))
}

function seed (st) {
  const want = starCount(st)
  while (st.stars.length < want) {
    st.stars.push(makeStar(st))
  }
  st.stars.length = want
}

// The canvas is the fixed, full-viewport layer, so clientWidth/Height already
// are the viewport in css px; the backing store is scaled for the display.
function resize (st) {
  const w = st.canvas.clientWidth || window.innerWidth
  const h = st.canvas.clientHeight || window.innerHeight
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2)
  if (w === st.w && h === st.h && dpr === st.dpr) {
    return false
  }
  // keep the field visually still across the resize instead of reseeding
  const sx = st.w ? w / st.w : 1
  const sy = st.h ? h / st.h : 1
  for (const s of st.stars) {
    s.x *= sx
    s.y *= sy
  }
  st.w = w
  st.h = h
  st.dpr = dpr
  st.canvas.width = Math.round(w * dpr)
  st.canvas.height = Math.round(h * dpr)
  // from here on everything is in css px
  st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed(st)
  return true
}

function step (st, dt) {
  const { w, h, stars, meteors } = st
  for (const s of stars) {
    s.y += s.v * dt
    s.x += s.v * WIND * dt
    if (s.y > h + 6) {
      // recycle at the top: the field never thins out
      s.y = rand(-h * 0.15, -6)
      s.x = rand(-20, w + 20)
    } else if (s.x > w + 24) {
      s.x -= w + 48
    }
  }

  st.nextMeteor -= dt
  if (st.nextMeteor <= 0) {
    st.nextMeteor = rand(METEOR_GAP[0], METEOR_GAP[1])
    if (meteors.length < MAX_METEORS) {
      meteors.push(makeMeteor(st))
    }
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]
    m.x += m.vx * dt
    m.y += m.vy * dt
    if (m.y - m.vy * m.tail > h || m.x < -m.tail * 800 || m.x > w + m.tail * 800) {
      meteors.splice(i, 1)
    }
  }
}

function drawMeteor (st, m) {
  const ctx = st.ctx
  const tx = m.x - m.vx * m.tail
  const ty = m.y - m.vy * m.tail
  const grad = ctx.createLinearGradient(m.x, m.y, tx, ty)
  grad.addColorStop(0, rgba(m.color, 0.6))
  grad.addColorStop(0.35, rgba(m.color, 0.2))
  grad.addColorStop(1, rgba(m.color, 0))
  ctx.strokeStyle = grad
  ctx.lineWidth = m.width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(m.x, m.y)
  ctx.stroke()

  const d = m.width * 6
  ctx.globalAlpha = 0.55
  ctx.drawImage(st.sprites[m.sprite], m.x - d / 2, m.y - d / 2, d, d)
  ctx.globalAlpha = 1
}

function paint (st, t) {
  const ctx = st.ctx
  // transparent: the white behind it is the page's, so this layer costs one
  // clear and nothing else
  ctx.clearRect(0, 0, st.w, st.h)

  for (const s of st.stars) {
    const x = s.x + Math.sin(t * s.swayRate + s.phase) * s.sway
    const d = s.r * 3.2
    ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(t * s.rate + s.phase))
    ctx.drawImage(st.sprites[s.sprite], x - d / 2, s.y - d / 2, d, d)
  }
  ctx.globalAlpha = 1

  for (const m of st.meteors) {
    drawMeteor(st, m)
  }
}

function loop (st) {
  st.raf = requestAnimationFrame(() => loop(st))
  const now = performance.now()
  // clamp so a backgrounded tab does not teleport the whole field on return
  const dt = Math.min((now - st.last) / 1000, 0.05)
  st.last = now
  // rAF is already throttled while hidden; this is the belt to that braces
  if (document.hidden) {
    return
  }
  step(st, dt)
  st.time += dt
  paint(st, st.time)
}

export default function startLoginBg (canvas) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return () => {}
  }
  const st = {
    canvas,
    ctx,
    w: 0,
    h: 0,
    dpr: 1,
    stars: [],
    meteors: [],
    sprites: PALETTE.map(c => makeSprite(c)),
    time: 0,
    last: performance.now(),
    raf: 0,
    nextMeteor: rand(METEOR_GAP[0], METEOR_GAP[1]),
    reduced: reducedMotion()
  }
  resize(st)

  const stop = () => {
    if (st.raf) {
      cancelAnimationFrame(st.raf)
      st.raf = 0
    }
    if (st.ro) {
      st.ro.disconnect()
      st.ro = null
    }
    window.removeEventListener('resize', st.onResize)
  }

  st.onResize = () => {
    if (resize(st)) {
      paint(st, st.time)
    }
  }
  window.addEventListener('resize', st.onResize)
  // covers dpr changes (moving the window to another display) too
  if (window.ResizeObserver) {
    st.ro = new ResizeObserver(st.onResize)
    st.ro.observe(canvas)
  }

  if (st.reduced) {
    // no fall, no meteors: one still starfield
    paint(st, st.time)
    return stop
  }

  loop(st)
  return stop
}
