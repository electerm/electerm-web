import { chromium } from 'playwright'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import log from './common/log.js'
import { expect } from 'chai'
import prefixer from './common/lang.js'
import extendClient from './common/client-extend.js'

const { describe } = it
it.setTimeout(100000)

describe('history', function () {
  it('all buttons open proper history tab', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    const prefix = await prefixer()
    const e = prefix('common')
    await delay(4500)

    log('button:edit')
    await client.click('.btns .anticon-plus-circle')
    await delay(3500)
    const sel = '.setting-wrap .ant-tabs-nav-list .ant-tabs-tab-active'
    await client.hasElem(sel)
    await delay(1500)
    const text = await client.getText(sel)
    expect(text).equal(e('bookmarks'))

    log('tab it')
    await client.click('.setting-wrap .ant-tabs-nav-list .ant-tabs-tab')

    await delay(5000)
    const text4 = await client.getText(sel)
    expect(text4).equal(e('history'))

    log('auto focus works')
    log('list tab')
    const hl = await client.evaluate(() => {
      return window.store.history.length
    })
    expect(hl > 0).equal(true)
    await client.click('.setting-wrap .item-list-unit')
    const list1 = await client.getAttribute('.setting-wrap .item-list-unit:nth-child(1)', 'class')
    expect(list1.includes('active'))
    await app.close().catch(console.log)
  })
})
