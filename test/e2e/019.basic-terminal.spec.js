import {
  close,
  init
} from './common/common.js'
import os from 'os'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import basicTermTest from './common/basic-terminal-test.js'

const platform = os.platform()
const isWin = platform.startsWith('win')
const { describe } = it
it.setTimeout(100000)

describe('terminal', function () {
  it('should open window and local terminal ls/dir command works', async function () {
    const {
      client, context, app
    } = await init()
    const cmd = isWin
      ? 'dir'
      : 'ls'
    await delay(13500)

    await basicTermTest(client, cmd)
    await close(context, app)
  })
})
