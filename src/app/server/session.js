import {
  terminalTelnet,
  testConnectionTelnet
} from './session-telnet.js'

import {
  terminalSsh,
  testConnectionSsh
} from './session-ssh.js'

import {
  terminalLocal,
  testConnectionLocal
} from './session-local.js'

import {
  terminalSerial,
  testConnectionSerial
} from './session-serial.js'

import {
  terminalRdp,
  testConnectionRdp
} from './session-rdp.js'

export const terminal = async function (initOptions, ws) {
  const type = initOptions.termType || initOptions.type
  if (type === 'telnet') {
    return terminalTelnet(initOptions, ws)
  } else if (type === 'rdp') {
    return terminalRdp(initOptions, ws)
  } else if (type === 'serial') {
    return terminalSerial(initOptions, ws)
  } else if (type === 'local') {
    return terminalLocal(initOptions, ws)
  } else {
    return terminalSsh(initOptions, ws)
  }
}

/**
 * test ssh connection
 * @param {object} options
 */
export const testConnection = (initOptions) => {
  const type = initOptions.termType || initOptions.type
  if (type === 'telnet') {
    return testConnectionTelnet(initOptions)
  } else if (type === 'rdp') {
    return testConnectionRdp(initOptions)
  } else if (type === 'local') {
    return testConnectionLocal(initOptions)
  } else if (type === 'serial') {
    return testConnectionSerial(initOptions)
  } else {
    return testConnectionSsh(initOptions)
  }
}
