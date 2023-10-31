/**
 * quick commands test
 * need TEST_HOST TEST_PASS TEST_USER env set
 */

import { chromium } from 'playwright'
import { test as it } from '@playwright/test'
import { expect } from 'chai'
import delay from './common/wait.js'
import log from './common/log.js'
import extendClient from './common/client-extend.js'

const { describe } = it
it.setTimeout(100000)

describe('quick commands', function () {
  it('quick commands form', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    log('open setting')
    await delay(2000)
    await client.click('.btns .anticon-setting')
    await delay(2500)
    log('click quick commands')
    await client.click('.setting-tabs [role="tab"]', 4)
    // await client.click('.setting-tabs [role="tab"]', 4)
    await client.setValue(
      '.setting-tabs-quick-commands input#name',
      'ls'
    )
    await client.setValue(
      '.setting-tabs-quick-commands textarea.ant-input',
      'ls'
    )
    const qmlist1 = await client.countElem('.setting-tabs-quick-commands .item-list-unit')
    await delay(150)
    await client.click('.setting-tabs-quick-commands .ant-btn-dashed')
    await delay(2550)
    const qmlist2 = await client.countElem('.setting-tabs-quick-commands .item-list-unit')
    expect(qmlist2).equal(qmlist1 + 1)
    await client.evaluate(() => {
      window.postMessage({
        action: 'update-tabs',
        update: {
          quickCommands: [
            {
              name: 'xx',
              command: 'ls'
            }
          ]
        },
        id: window.store.currentTab.id
      }, '*')
    })
    await delay(1150)
    const c1 = await client.evaluate(() => {
      return window.store.quickCommands.length
    })
    const c2 = await client.evaluate(() => {
      return window.store.currentQuickCommands.length
    })
    expect(c2).equal(c1 + 1)
    await app.close().catch(console.log)
  })
})
