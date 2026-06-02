import log from '../common/log.js'
import expressWs from 'express-ws'
import {
  isWin
} from '../common/runtime-constants.js'
import { verifyWs, initWs } from '../server/dispatch-center.js'
import {
  terminals,
  cleanAllSessions
} from '../server/remote-common.js'
import { zmodemManager } from '../server/zmodem.js'
import { trzszManager } from '../server/trzsz.js'
import { xmodemManager } from '../server/xmodem.js'

function cleanup () {
  cleanAllSessions()
}

export function wsRoutes (app) {
  expressWs(app, undefined, {
    wsOptions: {
      perMessageDeflate: false
    }
  })
  app.ws('/spice/:pid', function (ws, req) {
    const { query } = req
    verifyWs(req)
    const { pid } = req.params
    const term = terminals(pid)
    log.debug('ws: connected to spice session ->', pid)
    term.start(query, ws)
    ws.on('error', (err) => {
      log.error(err)
    })
  })
  app.ws('/terminals/:pid', function (ws, req) {
    verifyWs(req)
    const term = terminals(req.params.pid)
    const { pid } = term
    log.debug('ws: connected to terminal ->', pid)

    const dataBuffer = []
    let sendTimeout = null

    // Auto-trigger XMODEM when the serial device sends a marker message.
    // The serial-shell.js sends these markers when the user types tx/rx.
    function detectXmodemMarker (text) {
      const txMatch = text.match(/\[XMODEM:TX:(.+?)\]/)
      if (txMatch) {
        ws.s({
          action: 'xmodem-event',
          event: 'auto-trigger-receive',
          name: txMatch[1]
        })
        return
      }
      const rxMatch = text.match(/\[XMODEM:RX\]/)
      if (rxMatch) {
        ws.s({
          action: 'xmodem-event',
          event: 'auto-trigger-send'
        })
      }
    }

    const flushBufferedData = () => {
      if (!dataBuffer.length) {
        sendTimeout = null
        return
      }
      const combinedData = Buffer.concat(dataBuffer.splice(0).map(d => Buffer.isBuffer(d) ? d : Buffer.from(d)))

      // Write to log (keep this)
      term.writeLog(combinedData)

      // Detect XMODEM auto-trigger markers from serial device
      if (term.port) {
        detectXmodemMarker(combinedData.toString('utf8'))
      }

      // Check for zmodem escape sequence before sending to client
      const zmodemConsumed = zmodemManager.handleData(pid, combinedData, term, ws)
      if (zmodemConsumed) {
        sendTimeout = null
        return
      }

      // Check for trzsz magic key before sending to client
      const trzszConsumed = trzszManager.handleData(pid, combinedData, term, ws)
      if (trzszConsumed) {
        sendTimeout = null
        return
      }

      // Check for xmodem protocol before sending to client
      const xmodemConsumed = xmodemManager.handleData(pid, combinedData, term, ws)
      if (xmodemConsumed) {
        sendTimeout = null
        return
      }

      // Not zmodem, trzsz, or xmodem data, send to WebSocket
      ws.send(combinedData)
      sendTimeout = null
    }

    // Create ws.s function for zmodem to send messages to client
    ws.s = (data) => {
      ws.send(JSON.stringify(data))
    }

    // In the WebSocket setup, replace the data handler:
    term.on('data', function (data) {
      // Check if zmodem session is active and handle data
      if (zmodemManager.isActive(pid)) {
        // Let zmodem handle the data, but still log it
        term.writeLog(data)
        zmodemManager.handleData(pid, data, term, ws)
        return
      }

      // Check if trzsz session is active and handle data
      if (trzszManager.isActive(pid)) {
        // Let trzsz handle the data, but still log it
        term.writeLog(data)
        trzszManager.handleData(pid, data, term, ws)
        return
      }

      // Check if xmodem session is active and handle data.
      // For serial terminals (term.port exists) a raw port listener (registered below)
      // bypasses rxLineEnding transformation and feeds raw bytes to xmodem.
      if (xmodemManager.isActive(pid)) {
        if (!term.port) {
          // Non-serial fallback (should not normally happen)
          term.writeLog(data)
          xmodemManager.handleData(pid, data, term, ws)
        }
        return
      }

      // Detect XMODEM auto-trigger markers from serial device
      if (term.port) {
        const text = Buffer.isBuffer(data) ? data.toString('utf8') : data
        detectXmodemMarker(text)
      }

      const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data)
      const shouldBypassBatch = chunk.length > 16384

      // Bypass batching for very large chunks to avoid parser desync.
      if (shouldBypassBatch) {
        if (sendTimeout) {
          clearTimeout(sendTimeout)
          sendTimeout = null
        }
        if (dataBuffer.length) {
          flushBufferedData()
        }
        term.writeLog(chunk)
        const zmodemConsumed = zmodemManager.handleData(pid, chunk, term, ws)
        if (zmodemConsumed) {
          return
        }
        const trzszConsumed = trzszManager.handleData(pid, chunk, term, ws)
        if (trzszConsumed) {
          return
        }
        const xmodemConsumed = xmodemManager.handleData(pid, chunk, term, ws)
        if (xmodemConsumed) {
          return
        }
        ws.send(chunk)
        return
      }

      // Buffer incoming data instead of sending immediately for normal text workload
      dataBuffer.push(chunk)

      // If no timeout is pending, schedule a batched send
      if (!sendTimeout) {
        sendTimeout = setTimeout(flushBufferedData, 10) // Small delay (10ms) to throttle; adjust based on testing
      }
    })

    // For serial terminals, register a raw data listener directly on the port to
    // feed binary XMODEM data to xmodemManager without rxLineEnding transformation.
    if (term.port) {
      term.port.on('data', function (rawData) {
        if (xmodemManager.isActive(pid)) {
          term.writeLog(rawData)
          xmodemManager.handleData(pid, rawData, term, ws)
        }
      })
    }

    function onClose () {
      // Cancel any pending batched send
      if (sendTimeout) {
        clearTimeout(sendTimeout)
        sendTimeout = null
      }
      // Clean up zmodem session
      zmodemManager.destroySession(pid)
      // Clean up trzsz session
      trzszManager.destroySession(pid)
      // Clean up xmodem session
      xmodemManager.destroySession(pid)
      term.kill()
      log.debug('Closed terminal ' + pid)
      // Clean things up
      ws.close && ws.close()
      cleanup()
    }

    term.on('close', onClose)
    if (term.isLocal && isWin) {
      term.on('exit', onClose)
    }

    ws.on('message', function (msg) {
      try {
        // Check if message is a zmodem or trzsz control message (JSON)
        if (typeof msg === 'string') {
          try {
            const parsed = JSON.parse(msg)
            if (parsed.action === 'zmodem-event') {
              zmodemManager.handleMessage(pid, parsed, term, ws)
              return
            }
            if (parsed.action === 'trzsz-event') {
              trzszManager.handleMessage(pid, parsed, term, ws)
              return
            }
            if (parsed.action === 'xmodem-event') {
              xmodemManager.handleMessage(pid, parsed, term, ws)
              return
            }
            if (parsed.action === 'keepalive') {
              // Write \n to the PTY.  In canonical mode the TTY line discipline
              // only delivers data to read() when a newline completes the line,
              // so \x00 (NUL) sits in the buffer and never wakes bash up.
              // A newline wakes bash's read(), resets the TMOUT alarm, and bash
              // simply re-displays the prompt.  The client suppresses that echo.
              term.write('\n\r\x1b[K')
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

    ws.on('error', (err) => {
      log.error(err)
    })

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
