/**
 * communication between webview and app
 * run functions in seprate process, avoid using electron.remote directly
 */

import { Sftp } from './session-sftp.js'
import { Ftp } from './session-ftp.js'
import {
  sftp,
  transfer,
  onDestroySftp,
  onDestroyTransfer
} from './remote-common.js'
import { Transfer } from './transfer.js'
import { FtpTransfer } from './ftp-transfer.js'
import fs from './fs.js'
import log from '../common/log.js'
import fetch from './fetch.js'
import sync from './sync.js'
import { verify } from '../lib/jwt.js'
import { runSync } from '../lib/run-sync.js'
import {
  createTerm,
  testTerm,
  resize,
  runCmd,
  toggleTerminalLog,
  toggleTerminalLogTimestamp
} from './terminal-api.js'

const {
  SERVER_USER
} = process.env

/**
 * add ws.s function
 * @param {*} ws
 */
const wsDec = (ws) => {
  ws.s = msg => {
    try {
      ws.send(JSON.stringify(msg))
    } catch (e) {
      log.error('ws send error')
      log.error(e)
    }
  }
  ws.on('error', log.error)
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
  ws._socket.setKeepAlive(true, 30 * 1000)
}

export function verifyWs (req) {
  const { token } = req.query
  const data = verify(token)
  if (SERVER_USER !== data.id) {
    throw new Error('not valid request')
  }
}

export function initWs (app) {
  // sftp function
  app.ws('/sftp/:id', (ws, req) => {
    verifyWs(req)
    wsDec(ws)
    const { id } = req.params
    ws.on('close', () => {
      onDestroySftp(id)
    })
    ws.on('message', (message) => {
      const msg = JSON.parse(message)
      const { action } = msg

      if (action === 'sftp-new') {
        const { id, terminalId, type } = msg
        const Cls = type === 'ftp' ? Ftp : Sftp
        sftp(id, new Cls({
          uid: id,
          terminalId,
          type
        }))
      } else if (action === 'sftp-func') {
        const { id, args, func, uid } = msg
        const inst = sftp(id)
        if (inst) {
          inst[func](...args)
            .then(data => {
              ws.s({
                id: uid,
                data
              })
            })
            .catch(err => {
              ws.s({
                id: uid,
                error: {
                  message: err.message,
                  stack: err.stack
                }
              })
            })
        }
      } else if (action === 'sftp-destroy') {
        const { id } = msg
        ws.close()
        onDestroySftp(id)
      }
    })
    // end
  })

  // transfer function
  app.ws('/transfer/:id', (ws, req) => {
    verifyWs(req)
    wsDec(ws)
    const { id } = req.params
    const { sftpId } = req.query
    ws.on('close', () => {
      onDestroyTransfer(id, sftpId)
    })
    ws.on('message', (message) => {
      const msg = JSON.parse(message)
      const { action } = msg

      if (action === 'transfer-new') {
        const { sftpId, id, isFtp } = msg
        const opts = Object.assign({}, msg, {
          sftp: sftp(sftpId).sftp,
          sftpId,
          ws
        })
        const Cls = isFtp ? FtpTransfer : Transfer
        transfer(id, sftpId, new Cls(opts))
      } else if (action === 'transfer-func') {
        const { id, func, args, sftpId } = msg
        if (func === 'destroy') {
          return onDestroyTransfer(id, sftpId)
        }
        transfer(id, sftpId)[func](...args)
      }
    })
    // end
  })

  // upgrade todo

  // common functions
  app.ws('/common/s', (ws, req) => {
    verifyWs(req)
    wsDec(ws)
    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message)
        const { action } = msg
        if (action === 'fetch') {
          fetch(ws, msg)
        } else if (action === 'sync') {
          sync(ws, msg)
        } else if (action === 'fs') {
          fs(ws, msg)
        } else if (action === 'create-terminal') {
          createTerm(ws, msg)
        } else if (action === 'test-terminal') {
          testTerm(ws, msg)
        } else if (action === 'resize-terminal') {
          resize(ws, msg)
        } else if (action === 'toggle-terminal-log') {
          toggleTerminalLog(ws, msg)
        } else if (action === 'toggle-terminal-log-timestamp') {
          toggleTerminalLogTimestamp(ws, msg)
        } else if (action === 'run-cmd') {
          runCmd(ws, msg)
        } if (action === 'runSync') {
          runSync(ws, msg)
        }
      } catch (e) {
        log.error(e)
      }
    })
  })
  // end
}
