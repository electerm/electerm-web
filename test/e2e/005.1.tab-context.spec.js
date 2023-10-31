/**
 * basic ssh test
 * need TEST_HOST TEST_PASS TEST_USER env set
 */

import { chromium } from 'playwright'
import {
  test as it
} from '@playwright/test'
import { expect } from 'chai'
import delay from './common/wait.js'

import extendClient from './common/client-extend.js'

const { describe } = it
it.setTimeout(100000)

describe('ssh', function () {
  it('should open window and basic ssh ls command works', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    await delay(4500)
    await delay(4500)
    await client.rightClick('.tabs .tab', 10, 10)
    await client.click('.context-menu.show .anticon-copy')
    await delay(4500)
    const tabsCount = await client.evaluate(() => {
      return window.store.tabs.length
    })
    expect(tabsCount).equal(2)
  })
})
