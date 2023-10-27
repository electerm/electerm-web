import { config } from 'dotenv'
import log from 'electron-log'

config()
log.transports.console.format = '{h}:{i}:{s} {level} › {text}'

export default log
