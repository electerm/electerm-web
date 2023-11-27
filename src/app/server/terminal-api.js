/**
 * run cmd with terminal
 */

import { terminals } from './remote-common.js'
import { terminal, testConnection } from './session.js'
import log from '../common/log.js'

export async function runCmd (ws, msg) {
  const { id, pid, sessionId, cmd } = msg
  const term = terminals(pid, sessionId)
  let txt = ''
  if (term) {
    txt = await term.runCmd(cmd)
  }
  ws.s({
    id,
    data: txt
  })
}

export function resize (ws, msg) {
  const { id, pid, sessionId, cols, rows } = msg
  const term = terminals(pid, sessionId)
  if (term) {
    term.resize(cols, rows)
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function toggleTerminalLog (ws, msg) {
  const { id, pid, sessionId } = msg
  const term = terminals(pid, sessionId)
  if (term) {
    term.toggleTerminalLog()
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function toggleTerminalLogTimestamp (ws, msg) {
  const { id, pid, sessionId } = msg
  const term = terminals(pid, sessionId)
  if (term) {
    term.toggleTerminalLogTimestamp()
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function createTerm (ws, msg) {
  const { id, body } = msg
  terminal(body, ws)
    .then(data => {
      ws.s({
        id,
        data: data.pid
      })
    })
    .catch(err => {
      log.error(err)
      ws.s({
        id,
        error: {
          message: err.message,
          stack: err.stack
        }
      })
    })
}

export function testTerm (ws, msg) {
  const { id, body } = msg
  testConnection(body)
    .then(data => {
      if (data) {
        ws.s({
          id,
          data
        })
      } else {
        ws.s({
          id,
          error: {
            message: 'test failed',
            stack: 'test failed'
          }
        })
      }
    })
}
