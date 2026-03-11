/**
 * read ssh config
 */
import { loadAndConvert } from 'ssh-config-loader'

export async function loadSshConfig () {
  return loadAndConvert()
}
