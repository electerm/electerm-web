/**
 * serial port lib
 */
import { SerialPort } from 'serialport'
import log from '../common/log.js'

export function listSerialPorts () {
  return SerialPort.list()
    .catch((err) => {
      log.error(err)
      return []
    })
}
