/**
 * export test username/password/host/port
 */
import { config } from 'dotenv'
import os from 'os'

config()
const platform = os.platform()

export const {
  env
} = process

export const TEST_HOST = env[`TEST_HOST_${platform}`] || env.TEST_HOST
export const TEST_PASS = env[`TEST_PASS_${platform}`] || env.TEST_PASS
export const TEST_USER = env[`TEST_USER_${platform}`] || env.TEST_USER

if (!TEST_HOST || !TEST_PASS || !TEST_USER) {
  throw new Error(`
    basic sftp test need TEST_HOST TEST_PASS TEST_USER env set,
    you can run "cp .sample.env .env" to create env file, then edit .env, fill all required field
  `)
}
