import { chromium } from 'playwright'
import { config } from 'dotenv'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import log from './common/log.js'
import { expect } from 'chai'
import prefixer from './common/lang.js'
import extendClient from './common/client-extend.js'

config()

const {
  GIST_ID,
  GIST_TOKEN,
  GITEE_TOKEN,
  GITEE_ID,
  CUSTOM_SYNC_URL,
  CUSTOM_SYNC_USER,
  CUSTOM_SYNC_SECRET
} = process.env

const { describe } = it
it.setTimeout(100000)

describe('data sync', function () {
  it('all buttons open proper terminal themes tab', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    const prefix = await prefixer()
    const e = prefix('common')

    await delay(3500)

    log('button:open sync')
    await client.click('.btns .anticon-cloud-sync')
    await delay(500)
    const sel = '.setting-wrap .ant-tabs-nav-list .ant-tabs-tab-active'
    await client.hasElem(sel)
    await delay(500)
    const text = await client.getText(sel)
    expect(text.toLowerCase()).equal(e('setting').toLowerCase())

    // create theme
    log('save github token / id')

    await client.setValue('#sync-input-token-github', GIST_TOKEN)
    await client.setValue('#sync-input-gistId-github', GIST_ID)
    await delay(1000)
    await client.click('.setting-wrap .sync-btn-save')
    await delay(5000)
    await client.click('.setting-wrap .sync-btn-down')
    await delay(5000)
    const bks = await client.evaluate(() => {
      return window.store.getBookmarks()
    })
    expect(bks.length > 3).equal(true)

    log('save gitee token / id')

    await client.click('.setting-wrap [id*="tab-gitee"]')
    await client.evaluate(() => {
      return window.store.setBookmarks([])
    })
    await delay(3000)

    await client.setValue('#sync-input-token-gitee', GITEE_TOKEN)
    await client.setValue('#sync-input-gistId-gitee', GITEE_ID)
    await delay(1000)
    await client.click('.setting-wrap .sync-btn-save:visible')
    await delay(6000)
    await client.click('.setting-wrap .sync-btn-down:visible')
    await delay(6000)
    const bks1 = await client.evaluate(() => {
      return window.store.getBookmarks()
    })
    expect(bks1.length > 3).equal(true)

    log('save custom props')

    await client.click('.setting-wrap [id*="tab-custom"]')
    await client.evaluate(() => {
      return window.store.setBookmarks([])
    })
    await delay(3000)

    await client.setValue('#sync-input-url-custom', CUSTOM_SYNC_URL)
    await client.setValue('#sync-input-token-custom', CUSTOM_SYNC_SECRET)
    await client.setValue('#sync-input-gistId-custom', CUSTOM_SYNC_USER)
    await delay(1000)
    await client.click('.setting-wrap .sync-btn-save:visible')
    await delay(6000)
    await client.click('.setting-wrap .sync-btn-down:visible')
    await delay(6000)
    const bks3 = await client.evaluate(() => {
      return window.store.getBookmarks()
    })
    expect(bks3.length > 3).equal(true)
  })
})
