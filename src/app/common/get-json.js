import { readFileSync } from 'fs'
export default (pth) => {
  return JSON.parse(readFileSync(pth, 'utf8'))
}
