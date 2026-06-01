/**
 * run cmd with terminal
 */

import { terminals } from './remote-common.js'
import { terminal, testConnection } from './session.js'
import { isDev } from '../common/runtime-constants.js'

export async function runCmd (ws, msg) {
  const { id, pid, cmd } = msg
  const term = terminals(pid)
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
  const { id, pid, cols, rows } = msg
  const term = terminals(pid)
  if (term) {
    term.resize(cols, rows)
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function toggleTerminalLog (ws, msg) {
  const { id, pid } = msg
  const term = terminals(pid)
  if (term) {
    term.toggleTerminalLog()
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function toggleTerminalLogTimestamp (ws, msg) {
  const { id, pid } = msg
  const term = terminals(pid)
  if (term) {
    term.toggleTerminalLogTimestamp()
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function setTerminalLogPath (ws, msg) {
  const { id, pid, logPath } = msg
  const term = terminals(pid)
  if (term) {
    term.setTerminalLogPath(logPath)
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function startTerminalLogFile (ws, msg) {
  const { id, pid, logFilePath, addTimeStampToTermLog } = msg
  const term = terminals(pid)
  if (term) {
    term.startTerminalLogFile(logFilePath, addTimeStampToTermLog)
  }
  ws.s({
    id,
    data: 'ok'
  })
}

export function createTerm (ws, msg) {
  const { id, body } = msg
  terminal(body, ws)
    .then(r => {
      const data = isDev
        ? {
            pid: r.pid,
            port: process.env.PORT
          }
        : {
            pid: r.pid
          }
      ws.s({
        id,
        data
      })
    })
    .catch(err => {
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
  testConnection(body, ws)
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
    .catch(err => {
      ws.s({
        id,
        error: {
          message: err.message || 'test failed',
          stack: err.stack || 'test failed'
        }
      })
    })
}
