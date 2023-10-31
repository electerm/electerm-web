import { chromium } from 'playwright'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import extendClient from './common/client-extend.js'
import log from './common/log.js'
import { expect } from 'chai'

const { describe } = it
it.setTimeout(100000)

describe('auto upgrade check', function () {
  it('auto upgrade check should work', async function () {
    const app = await chromium.launch()
    const client = await app.newPage()
    extendClient(client)
    let v = ''
    while (v !== '0.0.0') {
      v = await client.evaluate(() => {
        if (window.et) {
          console.log('no retry set version')
          window.et.version = '0.0.0'
          return '0.0.0'
        }
        console.log('retry set version')
        return ''
      })
      await delay(2)
    }
    console.log('v', v)
    const len1 = 10000
    const sel = '.animate.upgrade-panel'
    for (let i = 0; i < len1; i++) {
      await delay(500)
      if (await client.elemExist(sel)) {
        break
      }
    }
    log('should show upgrade info')
    log('start download upgrade')
    await client.click('.upgrade-panel .ant-btn-primary')
    const fr = {}
    const len = 200
    for (let i = 0; i < len; i++) {
      await delay(500)
      const txt = await client.getText('.upgrade-panel .ant-btn-primary')
      console.log('txt', txt)
      if (txt.includes('Upgrading... 0% Cancel')) {
        fr.zero = 1
      } else if (
        txt.includes('% Cancel')
      ) {
        fr.progress = 1
      }
      if (fr.zero && fr.progress) {
        break
      }
    }
    expect(fr.progress).equal(1)
    expect(fr.zero).equal(1)
    await app.close().catch(console.log)
  })
})
