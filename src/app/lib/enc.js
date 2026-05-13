/**
 * data encrypt/decrypt
 *
 * New format (GCM): 'gcm:<iv_hex>:<salt_hex>:<authtag_hex>:<ciphertext_hex>'
 * Legacy format: '<ciphertext_hex>' (pure hex, no colons — aes-192-cbc)
 *
 * decrypt/decryptAsync detect the format automatically via the 'gcm:' prefix,
 * so old data encrypted with the static IV/salt continues to work without migration.
 */

import crypto from 'crypto'

const algorithmDefault = 'aes-256-gcm'

// Legacy constants — kept only for decrypting old data (aes-192-cbc)
const LEGACY_ALGORITHM = 'aes-192-cbc'
const LEGACY_IV = Buffer.alloc(16, 0)
const LEGACY_SALT = 'salt'
const LEGACY_KEY_LENGTH = 24
const IV_LENGTH = 12 // 12 bytes is recommended for GCM
const SALT_LENGTH = 16
const KEY_LENGTH = 32 // aes-256 requires a 32-byte key

const funcs = {}

function scryptAsync (...args) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(...args, (err, result) => {
      if (err) {
        reject(err)
      }
      resolve(result)
    })
  )
}

funcs.encrypt = function (
  str = '',
  password,
  algorithm = algorithmDefault
) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = crypto.scryptSync(password, salt, KEY_LENGTH)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(str, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return 'gcm:' + iv.toString('hex') + ':' + salt.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

funcs.decrypt = function (
  encrypted = '',
  password,
  algorithm = algorithmDefault
) {
  if (encrypted.startsWith('gcm:')) {
    // New format: gcm:iv_hex:salt_hex:authtag_hex:ciphertext_hex
    const parts = encrypted.split(':')
    const iv = Buffer.from(parts[1], 'hex')
    const salt = Buffer.from(parts[2], 'hex')
    const authTag = Buffer.from(parts[3], 'hex')
    const ciphertext = parts[4]
    const key = crypto.scryptSync(password, salt, KEY_LENGTH)
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
  // Legacy format: aes-192-cbc with static IV and salt
  const key = crypto.scryptSync(password, LEGACY_SALT, LEGACY_KEY_LENGTH)
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, LEGACY_IV)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export const encryptAsync = async function (
  str = '',
  password,
  algorithm = algorithmDefault
) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = await scryptAsync(password, salt, KEY_LENGTH)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(str, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return 'gcm:' + iv.toString('hex') + ':' + salt.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

export const decryptAsync = async function (
  encrypted = '',
  password,
  algorithm = algorithmDefault
) {
  if (encrypted.startsWith('gcm:')) {
    // New format: gcm:iv_hex:salt_hex:authtag_hex:ciphertext_hex
    const parts = encrypted.split(':')
    const iv = Buffer.from(parts[1], 'hex')
    const salt = Buffer.from(parts[2], 'hex')
    const authTag = Buffer.from(parts[3], 'hex')
    const ciphertext = parts[4]
    const key = await scryptAsync(password, salt, KEY_LENGTH)
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
  // Legacy format: aes-192-cbc with static IV and salt
  const key = await scryptAsync(password, LEGACY_SALT, LEGACY_KEY_LENGTH)
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, LEGACY_IV)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
