/**
 * web worker
 */

self.insts = {}

function createWs (
  type,
  id,
  sftpId = '',
  config
) {
  // init gloabl ws
  const { host, port, tokenElecterm, server = '' } = config
  const ss = self.currentUrl || server
  const s = ss
    ? ss.replace(/https?:\/\//, '').replace(/\/$/, '')
    : `${host}:${port}`
  const pre = ss.startsWith('https') ? 'wss' : 'ws'
  const wsUrl = `${pre}://${s}/${type}/${id}?sftpId=${sftpId}&token=${tokenElecterm}`
  const ws = new WebSocket(wsUrl)
  ws.s = msg => {
    ws.send(JSON.stringify(msg))
  }
  ws.id = id
  // Buffer incoming messages until at least one `message` listener is
  // registered. Nothing else listens on this socket before the client sends
  // an `addEventListener` action, so anything the server sends in that window
  // is otherwise dropped on the floor — e.g. the `session-interactive` prompt
  // sent during SSH host-key verification on a first connect, which leaves the
  // connection hanging forever waiting for an answer that never arrives.
  ws._messageBuffer = []
  ws._bufferActive = true
  ws._bufferHandler = (evt) => {
    if (ws._bufferActive) {
      ws._messageBuffer.push(evt.data)
    }
  }
  ws.addEventListener('message', ws._bufferHandler)
  ws.once = (callack, id) => {
    const func = (evt) => {
      const arg = JSON.parse(evt.data)
      if (id === arg.id) {
        callack(arg)
        ws.removeEventListener('message', func)
      }
    }
    ws.addEventListener('message', func)
  }
  ws.onclose = () => {
    if (ws.dup) {
      return
    }
    send({
      id: ws.id,
      action: 'close'
    })
    delete self.insts[ws.id]
  }
  return new Promise((resolve) => {
    ws.onopen = () => {
      if (self.insts[ws.id]) {
        ws.dup = true
        ws.close()
        resolve(null)
      } else {
        resolve(ws)
      }
    }
  })
}

function send (data) {
  self.postMessage(data)
}

async function onMsg (e) {
  const {
    id,
    wsId,
    args,
    action,
    type,
    persist,
    url
  } = e.data
  if (action === 'init-url') {
    self.currentUrl = url
    return false
  }
  if (action === 'create') {
    const inst = self.insts[id]
    if (inst instanceof WebSocket) {
      return send({
        action,
        id,
        persist
      }, '*')
    } else if (inst) {
      return false
    } else {
      const ws = await createWs(...args)
      if (ws) {
        self.insts[id] = ws
      }
    }
    send({
      action,
      persist,
      id
    }, '*')
  } else if (action === 'once') {
    const ws = self.insts[wsId]
    if (ws) {
      const cb = (data) => {
        send({
          id,
          wsId,
          data
        })
      }
      ws.once(cb, id)
    }
  } else if (action === 'close') {
    const ws = self.insts[wsId]
    if (ws) {
      ws.close()
    }
  } else if (action === 's') {
    const ws = self.insts[wsId]
    if (ws) {
      ws.s(...args)
    }
  } else if (action === 'addEventListener') {
    const ws = self.insts[wsId]
    if (ws) {
      // Support multiple listeners using a Map keyed by listener ID
      if (!ws.listeners) {
        ws.listeners = new Map()
      }
      // Check if this listener ID already exists (prevent duplicates for same ID)
      if (ws.listeners.has(id)) {
        ws.removeEventListener(type, ws.listeners.get(id).cb)
      }
      const cb = (e) => {
        send({
          wsId,
          id,
          data: {
            data: e.data
          }
        })
      }
      ws.listeners.set(id, { type, cb })
      ws.addEventListener(type, cb)
      // Flush the backlog to the newly registered listener, then stop
      // buffering: from here on messages go straight to the callback above.
      // The array is kept for a few seconds so a second addEventListener call
      // (e.g. the MCP handler) can also see the backlog.
      if (type === 'message' && ws._messageBuffer && ws._messageBuffer.length > 0) {
        for (const bufData of ws._messageBuffer) {
          send({
            wsId,
            id,
            data: {
              data: bufData
            }
          })
        }
      }
      if (type === 'message' && ws._bufferActive) {
        ws._bufferActive = false
        if (ws._bufferHandler) {
          ws.removeEventListener('message', ws._bufferHandler)
          ws._bufferHandler = null
        }
        setTimeout(() => {
          ws._messageBuffer = null
        }, 5000)
      }
    }
  } else if (action === 'removeEventListener') {
    const ws = self.insts[wsId]
    if (ws && ws.listeners && ws.listeners.has(id)) {
      const listener = ws.listeners.get(id)
      ws.removeEventListener(listener.type, listener.cb)
      ws.listeners.delete(id)
    }
  }
}

self.addEventListener('message', onMsg)
setTimeout(() => {
  send({
    action: 'worker-init'
  })
}, 10)
