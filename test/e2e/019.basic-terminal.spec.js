import { chromium } from 'playwright'
import os from 'os'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import basicTermTest from './common/basic-terminal-test.js'
import extendClient from './common/client-extend.js'

const platform = os.platform()
const isWin = platform.startsWith('win')
const { describe } = it
it.setTimeout(100000)

describe('terminal', function () {
  it('should open window and local terminal ls/dir command works', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    const cmd = isWin
      ? 'dir'
      : 'ls'
    await delay(13500)

    await basicTermTest(client, cmd)
    await app.close().catch(console.log)
  })
})
