/**
 * timeout setting
 * need TEST_HOST TEST_PASS TEST_USER env set
 */

import { chromium } from 'playwright'
import { test as it } from '@playwright/test'
import { expect } from 'chai'
import delay from './common/wait.js'
import log from './common/log.js'
import {
  TEST_HOST,
  TEST_PASS,
  TEST_USER
} from './common/env.js'
import extendClient from './common/client-extend.js'

const { describe } = it
it.setTimeout(100000)

describe('timeout setting', function () {
  it('timeout setting works', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    await delay(4000)

    log('set timeout to 100')
    await client.evaluate(() => {
      window.store.setConfig({
        sshReadyTimeout: 100
      })
    })
    await delay(400)

    const timeout = await client.evaluate(() => {
      return window.store.config.sshReadyTimeout
    })
    await delay(150)
    expect(timeout).equal(100)

    log('open new ssh and timeout')
    await client.click('.btns .anticon-plus-circle')
    await delay(2500)
    await client.setValue('#ssh-form_host', TEST_HOST)
    await client.setValue('#ssh-form_username', TEST_USER)
    await client.setValue('#ssh-form_password', TEST_PASS)
    await client.click('.setting-wrap .ant-btn-primary')
    await delay(5500)
    const errSel = '.ant-notification-notice  .ant-notification-notice-content .common-err'
    for (let i = 0; i < 25; i++) {
      await delay(500)
      const errExist = await client.elemExist(errSel)
      if (errExist) {
        break
      }
    }
    const txt = await client.getText(errSel)
    expect(txt.includes('Timed out')).equal(true)

    log('set timeout to 50000')
    await delay(1500)
    await client.evaluate(() => {
      window.store.setConfig({
        sshReadyTimeout: 50000
      })
    })
    await delay(1555)
    const timeout1 = await client.evaluate(() => {
      return window.store.config.sshReadyTimeout
    })
    await delay(150)
    expect(timeout1).equal(50000)
    await delay(400)
    await app.close().catch(console.log)
  })
})
