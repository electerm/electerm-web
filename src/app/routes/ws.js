import strip from 'strip-ansi'
import log from '../common/log.js'
import expressWs from 'express-ws'
import { verifyWs, initWs } from '../server/dispatch-center.js'
import {
  terminals
} from '../server/remote-common.js'

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
    const { sessionId } = req.query
    verifyWs(req)
    const term = terminals(req.params.pid, sessionId)
    const { pid } = term
    log.debug('ws: connected to terminal ->', pid)

    term.on('data', function (data) {
      try {
        if (term.sessionLogger) {
          term.sessionLogger.write(`[${new Date()}] ${strip(data.toString())}`)
        }
        ws.send(Buffer.from(data))
      } catch (ex) {
        console.log('kkk', ex)
      // The WebSocket is not open, ignore
      }
    })

    function onClose () {
      term.kill()
      log.debug('Closed terminal ' + pid)

      // Clean things up
      ws.close && ws.close()
    }

    term.on('close', onClose)

    ws.on('message', function (msg) {
      try {
        term.write(msg)
      } catch (ex) {
        log.error(ex)
      }
    })

    ws.on('error', log.error)

    ws.on('close', onClose)
  })
  initWs(app)
}
