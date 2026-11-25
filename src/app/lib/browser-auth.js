import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { isIPv4 } from 'node:net'

const minute = 60_000
const cookieName = 'electerm_session'

function loopback (host) {
  return host === 'localhost' || host === '::1' || host === '[::1]' ||
    (isIPv4(host) && host.startsWith('127.'))
}

function digest (value) {
  return createHash('sha256').update(value).digest()
}

// Earlier releases treated every nonempty ENABLE_AUTH value as requiring a
// password, including "0" and "false". Keep that guarantee on upgrade.
export function passwordlessLocal (env) {
  return !env.ENABLE_AUTH && env.ALLOW_PASSWORDLESS_LOCAL === '1'
}

export function createBrowserAuth (env, basePath, { idleMs = 30 * minute, lifetimeMs = 12 * 60 * minute } = {}) {
  const host = env.HOST
  const localOnly = passwordlessLocal(env)
  if (localOnly && (!loopback(host) || env.PUBLIC_ORIGIN ||
    (env.NODE_ENV === 'development' && !loopback(env.DEV_HOST || '127.0.0.1')))) {
    throw new Error('Passwordless mode requires a loopback host and no PUBLIC_ORIGIN')
  }
  if (!localOnly && !env.SERVER_PASS?.trim()) {
    throw new Error('Set a unique SERVER_PASS before starting electerm-web')
  }
  const origins = new Set()
  if (env.PUBLIC_ORIGIN) {
    const url = new URL(env.PUBLIC_ORIGIN)
    if (url.protocol !== 'https:' || url.origin !== env.PUBLIC_ORIGIN) {
      throw new Error('PUBLIC_ORIGIN must be an HTTPS origin without a path or trailing slash')
    }
    origins.add(url.origin)
  } else if (localOnly) {
    const ports = [env.PORT]
    if (env.NODE_ENV === 'development') ports.push(env.DEV_PORT || 5570)
    for (const port of ports) {
      for (const name of new Set(['localhost', '127.0.0.1', '[::1]', host === '::1' ? '[::1]' : host])) {
        origins.add(new URL('http://' + name + ':' + port).origin)
      }
    }
  }

  if (!localOnly && !env.PUBLIC_ORIGIN && !loopback(host)) {
    console.warn('PUBLIC_ORIGIN is unset. Checking browser origins against the request Host.')
  }

  const password = localOnly ? null : digest(env.SERVER_PASS)
  function cookieOptions (req) {
    return { httpOnly: true, sameSite: 'strict', secure: req.headers.origin.startsWith('https://'), path: basePath || '/' }
  }
  const sessions = new Map()
  const failures = new Map()

  function revoke (id) {
    const session = sessions.get(id)
    if (!session) return
    sessions.delete(id)
    clearTimeout(session.timer)
    for (const ws of session.sockets) {
      ws.removeAllListeners('message')
      ws.close(4001, 'Session ended')
    }
  }

  function deadline (session) {
    return Math.min(session.expires, session.lastUsed + idleMs)
  }

  function scheduleExpiry (id, session) {
    const delay = deadline(session) - Date.now()
    if (delay <= 0) return revoke(id)
    session.timer = setTimeout(() => scheduleExpiry(id, session), delay).unref()
  }

  function sessionId (req) {
    const pair = (req.headers.cookie || '').split(';').map(s => s.trim())
      .find(s => s.startsWith(cookieName + '='))
    return pair?.slice(cookieName.length + 1)
  }

  function lookup (req) {
    const id = sessionId(req)
    const session = sessions.get(id)
    if (!session) return
    if (Date.now() >= deadline(session)) return revoke(id)
    session.lastUsed = Date.now()
    return session
  }

  function validOrigin (req) {
    const origin = req.headers.origin
    if (origins.size) return origins.has(origin)
    if (!URL.canParse(origin) || !req.headers.host) return false
    const url = new URL(origin)
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) return false
    if (req.socket.encrypted && url.protocol !== 'https:') return false
    const authority = req.headers.host.toLowerCase()
    const defaultPort = url.protocol === 'https:' ? '443' : '80'
    if (url.host === authority || (!url.port && authority === url.host + ':' + defaultPort)) return true
    // The Vite page opens sockets directly on the backend port.
    return env.NODE_ENV === 'development' &&
      url.port === String(env.DEV_PORT || 5570) &&
      authority === url.hostname + ':' + env.PORT
  }

  function login (req, res) {
    res.set('Cache-Control', 'no-store')
    if (!validOrigin(req)) return res.sendStatus(403)
    if (localOnly) {
      const peer = req.socket.remoteAddress?.replace(/^::ffff:/, '')
      if (!loopback(peer) || !origins.has('http://' + req.headers.host) ||
        req.headers.forwarded || req.headers['x-forwarded-for']) return res.sendStatus(403)
    } else {
      // Bound memory even when requests come from many distinct addresses.
      // Behind a proxy the bucket covers that proxy; forwarded IPs are untrusted.
      const now = Date.now()
      const ip = req.socket.remoteAddress
      for (const [key, attempt] of failures) {
        if (attempt.until <= now) failures.delete(key)
      }
      const attempt = failures.get(ip)
      if (attempt?.retry > now || (!attempt && failures.size >= 4096)) {
        const seconds = Math.ceil(((attempt?.retry || now + minute) - now) / 1000)
        return res.set('Retry-After', String(seconds)).sendStatus(429)
      }
      const supplied = req.body?.password
      if (typeof supplied !== 'string' || !timingSafeEqual(password, digest(supplied))) {
        const count = (attempt?.count || 0) + 1
        const delay = count < 5 ? 0 : Math.min(60, 2 ** Math.min(6, count - 5)) * 1000
        failures.set(ip, { count, retry: now + delay, until: now + 15 * minute })
        console.warn('Login failed from', ip)
        return res.sendStatus(401)
      }
      failures.delete(ip)
    }

    if (localOnly && lookup(req)) return res.json({ ok: true })
    revoke(sessionId(req))
    const id = randomBytes(32).toString('hex')
    const now = Date.now()
    const session = { origin: req.headers.origin, expires: now + lifetimeMs, lastUsed: now, sockets: new Set() }
    sessions.set(id, session)
    scheduleExpiry(id, session)
    res.cookie(cookieName, id, cookieOptions(req)).json({ ok: true })
  }

  function matchesSessionOrigin (req) {
    const session = sessions.get(sessionId(req))
    return !session || session.origin === req.headers.origin
  }

  function logout (req, res) {
    if (!validOrigin(req) || !matchesSessionOrigin(req)) return res.sendStatus(403)
    revoke(sessionId(req))
    res.clearCookie(cookieName, cookieOptions(req)).set('Cache-Control', 'no-store').sendStatus(204)
  }

  function requireSession (req, res, next) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (!validOrigin(req) || !matchesSessionOrigin(req))) return res.sendStatus(403)
    if (!lookup(req)) return res.sendStatus(401)
    req.auth = { id: env.SERVER_USER || 'default_user' }
    res.set('Cache-Control', 'no-store')
    next()
  }

  function verifyClient ({ req }, done) {
    if (!validOrigin(req) || !matchesSessionOrigin(req)) return done(false, 403)
    done(!!lookup(req), 401)
  }

  function trackSocket (ws, req) {
    const session = lookup(req)
    if (!session) return ws.terminate()
    session.sockets.add(ws)
    ws.on('close', () => session.sockets.delete(ws))
    ws.on('message', () => { session.lastUsed = Date.now() })
  }

  return { login, logout, requireSession, verifyClient, trackSocket }
}
