import { chromium } from 'playwright'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import { expect } from 'chai'
import extendClient from './common/client-extend.js'
import log from './common/log.js'

const { describe } = it
it.setTimeout(100000)

describe('tabs', function () {
  it('double click to duplicate tab button works', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    await delay(4500)
    const tabsLenBefore = await client.countElem('.tabs .tab')
    const wrapsBefore = await client.countElem('.sessions > div')
    log('double click tab')
    await client.doubleClick('.tab')
    await delay(1500)
    const tabs0 = await client.countElem('.tabs .tab')
    expect(tabs0).equal(tabsLenBefore + 1)
    const wraps = await client.countElem('.sessions > div')
    expect(wraps).equal(wrapsBefore + 1)
    await delay(500)
    log('click add tab icon')
    await client.click('.tabs .tabs-add-btn')
    await delay(1500)
    const tabs1 = await client.countElem('.tabs .tab')
    expect(tabs1).equal(tabsLenBefore + 2)
    await app.close().catch(console.log)
  })
})
