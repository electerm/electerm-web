/**
 * basic ssh test
 * need TEST_HOST TEST_PASS TEST_USER env set
 */
import { test as it } from '@playwright/test'
import {
  TEST_HOST,
  TEST_PASS,
  TEST_USER
} from './common/env.js'
import {
  close,
  init
} from './common/common.js'
import { expect } from 'chai'
import delay from './common/wait.js'
import basicTermTest from './common/basic-terminal-test.js'

const { describe } = it
it.setTimeout(100000)

describe('ssh', function () {
  it('should open window and basic ssh ls command works', async function () {
    const {
      client, context, app
    } = await init()
    await delay(4500)
    const cmd = 'ls'
    await delay(4500)
    await client.click('.btns .anticon-plus-circle')
    await delay(500)
    await client.setValue('#ssh-form_host', TEST_HOST)
    await client.setValue('#ssh-form_username', TEST_USER)
    await client.setValue('#ssh-form_password', TEST_PASS)
    await client.click('.setting-wrap .ant-btn-primary')
    await delay(1500)
    let tabsCount = await client.elements('.tabs .tabs-wrapper .tab')
    tabsCount = await tabsCount.count()
    expect(tabsCount).equal(2)
    await delay(4010)
    await basicTermTest(client, cmd)
    await app.close().catch(console.log)
    await close(context, app)
  })
})
