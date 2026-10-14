/**
 * The WebGL half of the login page brand block (see login-logo.jsx).
 *
 * A module of its own behind a dynamic import on purpose: three.js, the
 * GLTFLoader addon and electerm.glb are a few hundred KB the login screen
 * should only pay for while the brand block is mounted.
 *
 * Best effort by design - the static logo image sits under the canvas and
 * stays there until the model has rendered, so anything failing in here (no
 * WebGL, no network, broken model) just leaves the image in place.
 */
/* global requestAnimationFrame, cancelAnimationFrame, IntersectionObserver */

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import modelUrl from './electerm.glb?url'

// seconds the model takes to settle from its entry pose into the idle one
const ENTRY_SECONDS = 1.15
// idle/pointer rotation range, in radians
const YAW = 0.4
const PITCH = 0.22
const ROLL = 0.05
// how much of the remaining distance to the target rotation is covered per
// frame - what the idle drift smooths over at any frame rate
const FOLLOW = 0.08

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

function reducedMotion () {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function initLoginLogo (refs) {
  const st = {
    wrap: refs.wrap,
    canvas: refs.canvas,
    img: refs.img,
    destroyed: false,
    raf: 0,
    entry: 0,
    paused: false,
    inView: true,
    mouse: { x: 0, y: 0 },
    reduced: reducedMotion()
  }
  build(st).catch((err) => {
    console.warn('[login-logo] 3D logo disabled, keeping the logo image:', err)
    stop(st)
  })
  // the caller gets a teardown handle right away, the model may still be
  // loading - stop() is safe at any point of build()
  return () => {
    st.destroyed = true
    stop(st)
  }
}

async function build (st) {
  const renderer = new THREE.WebGLRenderer({
    canvas: st.canvas,
    alpha: true,
    antialias: true
  })
  st.renderer = renderer
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  const scene = new THREE.Scene()
  st.scene = scene

  // The baked material is near black, so lights alone leave it unreadable -
  // the soft studio reflections are what actually show the shape.
  st.pmrem = new THREE.PMREMGenerator(renderer)
  st.envMap = st.pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = st.envMap

  st.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100)
  st.camera.position.set(0, 0, 10)

  st.group = new THREE.Group()
  scene.add(st.group)

  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(3, 4, 6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x99bbff, 2)
  rim.position.set(-5, -1, -5)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffffff, 0.5)
  fill.position.set(-3, 2, 4)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.15))

  const gltf = await new GLTFLoader().loadAsync(modelUrl)
  if (st.destroyed) {
    disposeObject(gltf.scene)
    return
  }
  const model = gltf.scene
  const box = new THREE.Box3().setFromObject(model)
  st.size = box.getSize(new THREE.Vector3())
  model.position.sub(box.getCenter(new THREE.Vector3()))
  model.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material.envMapIntensity = 1.7
      o.material.needsUpdate = true
    }
  })
  st.model = model
  st.group.add(model)

  bind(st)

  if (st.reduced) {
    // no entry, no drift: one static frame on the final pose
    st.entry = 1
    st.canvas.style.opacity = '1'
    st.img.style.opacity = '0'
    fit(st)
    return
  }

  // entry pose: small and turned away, loop() settles it into place
  st.group.scale.setScalar(0.7)
  st.group.rotation.set(0, -1.1, 0)

  // plain performance.now() timing: THREE.Clock is deprecated (and THREE.Timer
  // is an addon we would only need for this)
  st.last = performance.now()
  st.time = 0
  loop(st)
}

// size the canvas to the image box and pull the camera back just far enough
// to frame the (very wide) wordmark in it
function fit (st) {
  const w = st.wrap.clientWidth || 1
  const h = st.wrap.clientHeight || 1
  st.renderer.setSize(w, h, false)
  const camera = st.camera
  const aspect = w / h
  const fov = camera.fov * Math.PI / 180
  const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect)
  const size = st.size
  const dist = Math.max(
    (size.x / 2) / Math.tan(hFov / 2),
    (size.y / 2) / Math.tan(fov / 2)
  ) * 1.1
  camera.aspect = aspect
  camera.position.set(0, 0, dist)
  camera.updateProjectionMatrix()
  render(st)
}

function bind (st) {
  if (!st.reduced) {
    st.onMove = (e) => {
      const r = st.wrap.getBoundingClientRect()
      st.mouse.x = clamp(
        (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2),
        -1,
        1
      )
      st.mouse.y = clamp(
        (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2),
        -1,
        1
      )
    }
    window.addEventListener('pointermove', st.onMove, { passive: true })
  }

  if (window.ResizeObserver) {
    st.ro = new ResizeObserver(() => fit(st))
    st.ro.observe(st.wrap)
  } else {
    st.onResize = () => fit(st)
    window.addEventListener('resize', st.onResize)
  }

  st.onVis = () => {
    st.paused = document.hidden
  }
  document.addEventListener('visibilitychange', st.onVis)

  if (window.IntersectionObserver) {
    st.io = new IntersectionObserver((list) => {
      st.inView = list[0].isIntersecting
    }, { threshold: 0.05 })
    st.io.observe(st.wrap)
  }
}

function loop (st) {
  if (st.destroyed) {
    return
  }
  // advance the clock before the pause check, so resuming after a hidden tab
  // does not hand the animation one huge delta
  const now = performance.now()
  const dt = Math.min((now - st.last) / 1000, 0.05)
  st.last = now
  if (st.paused || !st.inView) {
    st.raf = requestAnimationFrame(() => loop(st))
    return
  }

  st.time += dt
  const t = st.time
  const group = st.group

  if (st.entry < 1) {
    // entry: unroll, scale up, and fade the canvas in while the image fades
    // out - the two are pixel-aligned, so the swap stays invisible
    st.entry = Math.min(1, st.entry + dt / ENTRY_SECONDS)
    const e = easeOutCubic(st.entry)
    group.scale.setScalar(0.7 + 0.3 * e)
    group.rotation.y = -1.1 * (1 - e)
    st.canvas.style.opacity = String(e)
    st.img.style.opacity = String(1 - e)
  } else {
    // idle drift, pushed around by where the pointer is on the page
    const yaw = st.mouse.x * YAW + Math.sin(t * 0.3) * 0.1
    const pitch = -st.mouse.y * PITCH + Math.sin(t * 0.45 + 1.2) * 0.04
    group.rotation.y += (yaw - group.rotation.y) * FOLLOW
    group.rotation.x += (pitch - group.rotation.x) * FOLLOW
    group.rotation.z += (st.mouse.x * ROLL - group.rotation.z) * FOLLOW
    group.position.y = Math.sin(t * 0.9) * 0.04
    group.position.x = -st.mouse.x * 0.12
  }

  render(st)
  st.raf = requestAnimationFrame(() => loop(st))
}

function render (st) {
  st.renderer.render(st.scene, st.camera)
}

function disposeObject (root) {
  root.traverse((o) => {
    if (o.geometry) {
      o.geometry.dispose()
    }
    if (o.material) {
      o.material.dispose()
    }
  })
}

function stop (st) {
  if (st.raf) {
    cancelAnimationFrame(st.raf)
    st.raf = 0
  }
  if (st.ro) {
    st.ro.disconnect()
  }
  if (st.io) {
    st.io.disconnect()
  }
  if (st.onMove) {
    window.removeEventListener('pointermove', st.onMove)
  }
  if (st.onResize) {
    window.removeEventListener('resize', st.onResize)
  }
  if (st.onVis) {
    document.removeEventListener('visibilitychange', st.onVis)
  }
  // hand the box back to the logo image
  if (st.img) {
    st.img.style.opacity = ''
  }
  if (st.canvas) {
    st.canvas.style.opacity = ''
  }
  if (st.model) {
    disposeObject(st.model)
  }
  try {
    if (st.pmrem) {
      st.pmrem.dispose()
    }
    if (st.envMap) {
      st.envMap.dispose()
    }
    if (st.renderer) {
      // the login screen is the only WebGL context in the app, and it is
      // mounted for minutes at most - release it eagerly anyway
      st.renderer.dispose()
      st.renderer.forceContextLoss()
    }
  } catch (e) {
    // teardown after a partial init - nothing useful left to do
  }
}
