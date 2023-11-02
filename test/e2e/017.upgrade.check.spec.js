import {
  close,
  init
} from './common/common.js'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import log from './common/log.js'

const { describe } = it
it.setTimeout(100000)

describe('Upgrade check', function () {
  it('Upgrade check should work', async function () {
    const {
      client, context, app
    } = await init()
    await delay(4500)

    log('button:about')
    await client.click('.btns .open-about-icon')
    await delay(2500)
    const sel = '.ant-modal .ant-tabs-nav-list .ant-tabs-tab-active'
    await client.hasElem(sel)

    await client.click('.about-wrap .ant-btn-primary')
    await delay(9000)
    await client.hasElem('.upgrade-panel')
    await close(context, app)
  })
})
