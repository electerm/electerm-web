import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import log from './common/log.js'
import { expect } from 'chai'
import prefixer from './common/lang.js'
import {
  close,
  init
} from './common/common.js'

const { describe } = it
it.setTimeout(100000)

describe('bookmark groups', function () {
  it('all buttons open proper bookmark tab', async function () {
    const {
      client, context, app
    } = await init()
    const prefix = await prefixer()
    const e = prefix('common')
    await delay(3500)

    log('button:edit')
    await client.click('.btns .anticon-plus-circle')
    await delay(2500)
    const sel = '.setting-wrap .ant-tabs-nav-list .ant-tabs-tab-active'
    await client.hasElem(sel)
    const text = await client.getText(sel)
    expect(text).equal(e('bookmarks'))

    log('click add category button')
    await client.click('.setting-wrap .anticon-folder.with-plus')

    const id = 'u567'
    await client.setValue('.setting-wrap .item-list-wrap input.ant-input', id)

    log('save it')
    const bookmarkGroupsCountPrev = await client.evaluate(() => {
      return window.store.bookmarkGroups.length
    })
    await delay(200)
    await client.click('.setting-wrap .ant-input-group-addon .anticon-check')
    await delay(1200)
    const bookmarkGroupsCount = await client.evaluate(() => {
      return window.store.bookmarkGroups.length
    })
    expect(bookmarkGroupsCountPrev + 1).equal(bookmarkGroupsCount)
    await client.evaluate(() => {
      return window.store.setBookmarkGroups(
        window.store.bookmarkGroups.filter(d => d !== 'u567')
      )
    })
    await close(context, app)
  })
})
