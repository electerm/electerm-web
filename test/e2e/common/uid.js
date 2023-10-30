/**
 * output uid with os name prefix
 */

import { nanoid } from 'nanoid'
import os from 'os'

const platform = os.platform()

export default () => {
  return platform + '_' + nanoid()
}
