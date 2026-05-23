/**
 * time formatter
 */

import dayjs from 'dayjs'

export default (
  time = new Date(),
  format = 'YYYY-MM-DD HH:mm:ss.SSS'
) => {
  return dayjs(time).format(format)
}
