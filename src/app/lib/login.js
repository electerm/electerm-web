/**
 * simple login with password only
 */

import jwt from 'jsonwebtoken'

const {
  SERVER_PASS,
  SERVER_USER
} = process.env

export function login (req, res) {
  const { password } = req.body
  if (password !== SERVER_PASS) {
    return res.status(401).send('pass not right')
  }
  const token = jwt.sign({
    id: SERVER_USER
  }, process.env.SERVER_SECRET, { expiresIn: '120y' })
  res.send(token)
}
