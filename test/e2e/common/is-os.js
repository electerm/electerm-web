/**
 * some test may need only run in some os
 */

import os from 'os'
const platform = os.platform()

export default (osName) => {
  return platform === osName
}
