/**
 * common functions for remote process handling,
 * for sftp, terminal and transfer
 */

// const _ = require('loadsh')

export function session (sessionId) {
  return global.sessions[sessionId]
}

export function sftp (id, sessionId, inst) {
  const ss = session(sessionId)
  if (!ss) {
    return
  }
  if (inst) {
    ss.sftps[id] = inst
    return inst
  }
  return ss.sftps[id]
}

export function terminals (id, sessionId, inst) {
  const ss = session(sessionId)
  if (!ss) {
    return
  }
  if (inst) {
    ss.terminals[id] = inst
    return inst
  }
  return ss.terminals[id]
}

export function transfer (id, sftpId, sessionId, inst) {
  const ss = sftp(sftpId, sessionId)
  if (!ss) {
    return
  }
  if (inst) {
    ss.transfers[id] = inst
    return inst
  }
  return ss.transfers[id]
}

export function onDestroySftp (id, sessionId) {
  const inst = sftp(id, sessionId)
  inst && inst.kill && inst.kill()
}

export function onDestroyTerminal (id, sessionId) {
  const inst = sftp(id, sessionId)
  inst && inst.kill && inst.kill()
}

export function onDestroyTransfer (id, sftpId, sessionId) {
  const sftpInst = sftp(sftpId, sessionId)
  const inst = transfer(id, sftpId, sessionId)
  inst && inst.destroy && inst.destroy()
  sftpInst && delete sftpInst.transfers[id]
}
