import {
  close,
  init
} from './common/common.js'
import {
  test as it,
  expect
} from '@playwright/test'

import delay from './common/wait.js'
import log from './common/log.js'
import prefixer from './common/lang.js'

const { describe } = it
it.setTimeout(100000)

describe('init setting buttons', function () {
  it('all buttons open proper setting tab', async function () {
    const {
      client, context, app
    } = await init()
    const prefix = await prefixer()
    const e = prefix('common')
    // await client.waitUntilWindowLoaded()
    await delay(3500)

    log('button:edit')
    await client.click('.btns .anticon-plus-circle')
    await delay(3500)
    const sel = '.setting-wrap .ant-tabs-nav-list .ant-tabs-tab-active'
    const active = await client.element(sel)
    expect(active).toBeVisible()
    const text = await client.getText(sel)
    expect(text).toEqual(e('bookmarks'))

    log('close')
    await client.click('.setting-wrap .close-setting-wrap')
    await delay(900)

    log('open setting')
    await client.click('.btns .anticon-setting')
    await delay(2500)
    const active1 = await client.element(sel)
    expect(active1).toBeVisible()
    const text1 = await client.getText(sel)
    expect(text1).toEqual(e('setting'))
    log('close')
    await client.click('.setting-wrap .close-setting-wrap')
    await delay(900)

    log('button:new ssh')
    await client.click('.btns .anticon-plus-circle')
    await delay(1000)
    const active2 = await client.element(sel)
    expect(active2).toBeVisible()
    const text2 = await client.getText(sel)
    expect(text2).toEqual(e('bookmarks'))

    // log('tab it')
    // await client.click('.setting-wrap .ant-tabs-tab:nth-child(3)')
    // await delay(3100)
    // const text4 = await client.getText(sel)
    // expect(text4).toEqual(e('setting'))
    await client.click('.setting-wrap .close-setting-wrap')
    await delay(600)

    log('button:edit again')
    await client.click('.btns .anticon-plus-circle')
    await delay(600)
    const text5 = await client.getText(sel)
    expect(text5).toEqual(e('bookmarks'))
    await close(context, app)
  })
})
