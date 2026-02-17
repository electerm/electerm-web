import strip from 'strip-ansi'
import log from '../common/log.js'
import expressWs from 'express-ws'
import {
  isWin
} from '../common/runtime-constants.js'
import { verifyWs, initWs } from '../server/dispatch-center.js'
import {
  terminals
} from '../server/remote-common.js'
import { zmodemManager } from '../server/zmodem.js'

export function wsRoutes (app) {
  expressWs(app, undefined, {
    wsOptions: {
      perMessageDeflate: {
        zlibDeflateOptions: {
        // See zlib defaults.
          chunkSize: 1024 * 8,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 * 8 // Size (in bytes) below which messages
      // should not be compressed.
      }
    }
  })
  app.ws('/terminals/:pid', function (ws, req) {
    verifyWs(req)
    const term = terminals(req.params.pid)
    const { pid } = term
    log.debug('ws: connected to terminal ->', pid)
    const dataBuffer = []
    let sendTimeout = null
    // Create ws.s function for zmodem to send messages to client
    ws.s = (data) => {
      ws.send(JSON.stringify(data))
    }
    term.on('data', function (data) {
      try {
        // Check if zmodem session is active and handle data
        if (zmodemManager.isActive(pid)) {
          // Let zmodem handle the data, but still log it
          term.writeLog(data)
          zmodemManager.handleData(pid, data, term, ws)
          return
        }
        if (term.sessionLogger) {
          const dt = term.initOptions.addTimeStampToTermLog
            ? `[${new Date()}] `
            : ''
          term.sessionLogger.write(`${dt}${strip(data.toString())}`)
        }

        // Buffer incoming data instead of sending immediately
        dataBuffer.push(data)

        // If no timeout is pending, schedule a batched send
        if (!sendTimeout) {
          sendTimeout = setTimeout(() => {
            // Combine buffered data (optional: limit size to avoid memory issues)
            const combinedData = Buffer.concat(dataBuffer.splice(0).map(d => Buffer.isBuffer(d) ? d : Buffer.from(d)))

            // Check for zmodem escape sequence before sending to client
            const consumed = zmodemManager.handleData(pid, combinedData, term, ws)
            if (!consumed) {
              // Not zmodem data, send to WebSocket
              ws.send(combinedData)
            }

            // Reset timeout
            sendTimeout = null
          }, 10) // Small delay (10ms) to throttle; adjust based on testing
        }
      } catch (ex) {
        console.log(ex)
      // The WebSocket is not open, ignore
      }
    })

    function onClose () {
      // Clean up zmodem session
      zmodemManager.destroySession(pid)
      term.kill()
      log.debug('Closed terminal ' + pid)

      // Clean things up
      ws.close && ws.close()
    }

    term.on('close', onClose)
    if (term.isLocal && isWin) {
      term.on('exit', onClose)
    }
    ws.on('message', function (msg) {
      try {
        // Check if message is a zmodem control message (JSON)
        if (typeof msg === 'string') {
          try {
            const parsed = JSON.parse(msg)
            if (parsed.action === 'zmodem-event') {
              zmodemManager.handleMessage(pid, parsed, term, ws)
              return
            }
          } catch (e) {
            // Not JSON, treat as regular terminal input
          }
        }
        term.write(msg)
      } catch (ex) {
        log.error(ex)
      }
    })

    ws.on('error', log.error)

    ws.on('close', onClose)
  })
  app.ws('/rdp/:pid', function (ws, req) {
    const { width, height } = req.query
    verifyWs(req)
    const term = terminals(req.params.pid)
    term.ws = ws
    term.start(width, height)
    const { pid } = term
    log.debug('ws: connected to rdp session ->', pid)
    ws.on('error', log.error)
  })
  app.ws('/vnc/:pid', function (ws, req) {
    const { query } = req
    verifyWs(req)
    const { pid } = req.params
    const term = terminals(pid)
    term.ws = ws
    term.start(query)
    log.debug('ws: connected to vnc session ->', pid)
    ws.on('error', log.error)
  })
  initWs(app)
}
