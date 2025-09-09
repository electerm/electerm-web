/**
 * serial port lib
 */
import log from '../common/log.js'

export async function listSerialPorts () {
  return import('serialport')
    .then(({ SerialPort }) => SerialPort.list())
    .catch(err => {
      log.error('SerialPort not available or failed to list ports:', err)
      return []
    })
}
