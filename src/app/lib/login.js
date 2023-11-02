/**
 * simple login with password only
 */

import { createToken } from './jwt.js'

const {
  SERVER_PASS
} = process.env

export function login (req, res) {
  const { password } = req.body
  if (password !== SERVER_PASS) {
    return res.status(401).send('pass not right')
  }
  const token = createToken()
  res.send(token)
}
