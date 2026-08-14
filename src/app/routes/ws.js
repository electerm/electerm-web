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

// True when the buffered data ends mid-way through a multi-byte UTF-8
// sequence (CJK chars are 3 bytes). Slow SSH servers (embedded router CLIs)
// often deliver one char split across TCP segments; flushing such a buffer
// right away would push a partial char to the client. Only the tail of the
// last buffer is inspected (at most 4 bytes), so this is O(1).
function hasIncompleteTrailingUtf8 (bufs) {
  const last = bufs[bufs.length - 1]
  if (!last) {
    return false
  }
  const buf = Buffer.isBuffer(last) ? last : Buffer.from(last)
  const len = buf.length
  if (!len) {
    return false
  }
  // Count trailing continuation bytes (10xxxxxx), at most 3
  let cont = 0
  while (cont < 3 && cont < len && (buf[len - 1 - cont] & 0xc0) === 0x80) {
    cont++
  }
  const leadIdx = len - 1 - cont
  if (leadIdx < 0) {
    // Whole buffer is continuation bytes; the lead byte was in a chunk that
    // was already flushed, so holding can not reassemble anything.
    return false
  }
  const lead = buf[leadIdx]
  if (lead < 0xc0) {
    // ASCII last byte, or stray continuations after ASCII: nothing to wait for
    return false
  }
  // Expected continuation count for this lead byte:
  // 110xxxxx -> 1, 1110xxxx -> 2, 11110xxx -> 3
  const needed = lead < 0xe0 ? 1 : lead < 0xf0 ? 2 : 3
  return cont < needed
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
    // Time of the last actual flush. Lets a chunk arriving after an idle gap
    // (keystroke echo, command result) skip the coalescing delay entirely,
    // so only chunks arriving inside an active burst (floods) pay the 10ms
    // wait. Mirrors the client-side coalescing fast path.
    let lastFlushTime = 0
    const flushIntervalMs = 10

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
      lastFlushTime = Date.now()
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

      // Idle fast path: if nothing has been flushed within the coalescing
      // window, this is the start of a new burst (or a lone interactive
      // echo) rather than a continuation of a flood - send it right away
      // instead of paying the fixed delay. Only chunks arriving while a
      // burst is already in flight (elapsed < flushIntervalMs) get batched.
      const elapsed = Date.now() - lastFlushTime
      if (elapsed >= flushIntervalMs) {
        // Never fast-flush a buffer that ends mid-way through a multi-byte
        // UTF-8 char: a slow peer (router CLI) may deliver one char split
        // across TCP segments, and the remaining bytes usually land within a
        // few ms. Hold one coalescing window so they get concatenated first
        // (the completing chunk then flushes immediately via this same fast
        // path). Bounded by the timeout, so it can not stick.
        if (hasIncompleteTrailingUtf8(dataBuffer)) {
          if (!sendTimeout) {
            sendTimeout = setTimeout(flushBufferedData, flushIntervalMs)
          }
          return
        }
        if (sendTimeout) {
          clearTimeout(sendTimeout)
          sendTimeout = null
        }
        flushBufferedData()
        return
      }

      // If no timeout is pending, schedule a batched send
      if (!sendTimeout) {
        sendTimeout = setTimeout(flushBufferedData, flushIntervalMs - elapsed)
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
