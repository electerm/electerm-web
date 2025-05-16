/**
 * common functions for remote process handling,
 * for sftp, terminal and transfer
 */

// const _ = require('loadsh')
import globalState from './global-state.js'

export function session (id) {
  return globalState.getSession(id)
}

export function sftp (id, inst) {
  if (inst) {
    globalState.setSession(id, inst)
    return inst
  }
  return globalState.getSession(id)
}

export function terminals (id, inst) {
  if (inst) {
    globalState.setSession(id, inst)
    return inst
  }
  return globalState.getSession(id)
}

export function transfer (id, sftpId, inst) {
  const ss = sftp(sftpId)
  if (!ss) {
    return
  }
  if (inst) {
    ss.transfers[id] = inst
    return inst
  }
  return ss.transfers[id]
}

export function onDestroySftp (id) {
  const inst = sftp(id)
  inst && inst.kill && inst.kill()
}

export function onDestroyTerminal (id) {
  onDestroySftp(id)
}

export function onDestroyTransfer (id, sftpId) {
  const sftpInst = sftp(sftpId)
  const inst = transfer(id, sftpId)
  inst && inst.destroy && inst.destroy()
  sftpInst && delete sftpInst.transfers[id]
}
