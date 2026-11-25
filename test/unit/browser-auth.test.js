import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import express from 'express'
import expressWs from 'express-ws'
import WebSocket from 'ws'
import pug from 'pug'
import { createBrowserAuth } from '../../src/app/lib/browser-auth.js'

const env = { HOST: '127.0.0.1', PORT: '5577', SERVER_PASS: '1', PUBLIC_ORIGIN: 'https://terminal.example' }

async function fixture (t, options, overrides) {
  const app = express()
  const server = createServer(app).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  const auth = createBrowserAuth({ ...env, PORT: port, ...overrides }, '/app', options)
  const { getWss } = expressWs(app, server, { wsOptions: { verifyClient: auth.verifyClient } })
  getWss().prependListener('connection', auth.trackSocket)
  app.use(express.json())
  app.post('/app/login', auth.login)
  app.post('/app/logout', auth.logout)
  app.get('/app/private', auth.requireSession, (req, res) => res.json(req.auth))
  app.ws('/app/socket', ws => ws.on('message', data => ws.send(data)))
  t.after(() => {
    for (const ws of getWss().clients) ws.terminate()
    server.close()
  })
  const origin = 'http://127.0.0.1:' + port
  const url = origin + '/app'
  function post (path, body, headers = {}) {
    return fetch(url + path, {
      method: 'POST',
      headers: { origin: env.PUBLIC_ORIGIN, 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body)
    })
  }
  async function login () {
    const res = await post('/login', { password: env.SERVER_PASS })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
    const header = res.headers.get('set-cookie')
    for (const attr of ['Path=/app', 'HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(header.includes(attr))
    return header.split(';')[0]
  }
  async function socket (cookie, origin = env.PUBLIC_ORIGIN) {
    const ws = new WebSocket(url.replace('http:', 'ws:') + '/socket', { origin, headers: { cookie } })
    await once(ws, 'open')
    return ws
  }
  async function status (cookie) {
    return (await fetch(url + '/private', { headers: { cookie } })).status
  }
  return { post, login, socket, status, origin }
}

test('configuration defaults to password authentication and fails closed', () => {
  for (const password of [undefined, '', ' ', 'some-login-pass-word']) {
    assert.throws(() => createBrowserAuth({ ...env, SERVER_PASS: password }), /SERVER_PASS/)
  }
  for (const overrides of [
    { ENABLE_AUTH: '0' },
    { ENABLE_AUTH: '0', PUBLIC_ORIGIN: '', HOST: '0.0.0.0' },
    { ENABLE_AUTH: '0', PUBLIC_ORIGIN: '', NODE_ENV: 'development', DEV_HOST: '0.0.0.0' },
    { HOST: '0.0.0.0', PUBLIC_ORIGIN: '' },
    { PUBLIC_ORIGIN: 'http://terminal.example' }
  ]) assert.throws(() => createBrowserAuth({ ...env, ...overrides }))
})

test('passwordless login requires explicit local mode and a local origin and host', async t => {
  const f = await fixture(t, undefined, { ENABLE_AUTH: '0', PUBLIC_ORIGIN: '' })
  const headers = { origin: f.origin }
  assert.equal((await f.post('/login', {}, headers)).status, 200)
  assert.equal((await f.post('/login', {}, { ...headers, 'x-forwarded-for': '192.0.2.1' })).status, 403)
  assert.equal((await f.post('/login', {}, { ...headers, origin: 'null' })).status, 403)
})

test('logout revokes only its session across HTTP, upgrades and open sockets', async t => {
  const f = await fixture(t)
  const cookie = await f.login()
  const other = await f.login()
  assert.equal(await f.status(cookie), 200)
  await assert.rejects(f.socket(cookie, 'https://other.example'), /403/)
  const ws = await f.socket(cookie)
  const closed = once(ws, 'close')
  assert.equal((await f.post('/logout', {}, { cookie, origin: 'null' })).status, 403)
  assert.equal((await f.post('/logout', {}, { cookie })).status, 204)
  await closed
  assert.equal(await f.status(cookie), 401)
  await assert.rejects(f.socket(cookie), /401/)
  assert.equal(await f.status(other), 200)
})

for (const timeout of ['idleMs', 'lifetimeMs']) {
  test(timeout + ' expires existing sockets and rejects subsequent requests', { timeout: 5000 }, async t => {
    const f = await fixture(t, { [timeout]: 250 })
    const cookie = await f.login()
    const ws = await f.socket(cookie)
    const closed = once(ws, 'close')
    if (timeout === 'lifetimeMs') {
      const interval = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('active') }, 25)
      t.after(() => clearInterval(interval))
    }
    await closed
    assert.equal(await f.status(cookie), 401)
    await assert.rejects(f.socket(cookie), /401/)
  })
}

test('failed password attempts are throttled and omitted passwords are rejected', async t => {
  const f = await fixture(t)
  for (let i = 0; i < 5; i++) assert.equal((await f.post('/login', {})).status, 401)
  const res = await f.post('/login', { password: env.SERVER_PASS })
  assert.equal(res.status, 429)
  assert.ok(Number(res.headers.get('retry-after')) > 0)
})

test('page bootstrap preserves text without emitting literal HTML delimiters', () => {
  const html = pug.renderFile('src/app/views/index.pug', { _global: { label: '<label>' } })
  const line = html.match(/window\.et = (\{[^\n]*?\})/)[1]
  assert.equal(JSON.parse(line).label, '<label>')
  assert.ok(!line.includes('<'))
})
