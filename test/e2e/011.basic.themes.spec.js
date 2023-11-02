import {
  close,
  init
} from './common/common.js'
import delay from './common/wait.js'
import { test as it } from '@playwright/test'
import log from './common/log.js'
import { expect } from 'chai'
import prefixer from './common/lang.js'

const { describe } = it
it.setTimeout(100000)

describe('terminal themes', function () {
  it('all buttons open proper terminal themes tab', async function () {
    const {
      client, context, app
    } = await init()
    const prefix = await prefixer()
    const e = prefix('common')
    const t = prefix('terminalThemes')
    await delay(3500)

    log('button:edit')
    await client.click('.btns .anticon-picture')
    await delay(500)
    const sel = '.setting-wrap .ant-tabs-nav-list .ant-tabs-tab-active'
    await client.hasElem(sel)
    await delay(500)
    const text = await client.getText(sel)
    expect(text).equal(t('uiThemes'))

    const v = await client.getValue('.setting-wrap #terminal-theme-form_themeName')
    const tx = await client.getText('.setting-wrap .item-list-unit.active')
    const txd = await client.getText('.setting-wrap .item-list-unit.current')
    expect(v).equal(t('newTheme'))
    expect(tx).equal(t('newTheme'))
    expect(txd).equal(t('default'))

    // create theme
    log('create theme')
    const themePrev = await client.evaluate(() => {
      return window.store.terminalThemes.length
    })
    const themeIterm = await client.evaluate(() => {
      return window.store.itermThemes.length
    })
    await client.click('.setting-wrap .ant-btn-primary')

    const themeNow = await client.evaluate(() => {
      return window.store.terminalThemes.length
    })
    await delay(1000)
    expect(themeNow).equal(themePrev + 1)
    console.log()

    expect(themeIterm > 10).equal(true)

    log('tab it')
    await client.click('.setting-wrap .ant-tabs-tab', 2)
    await delay(100)
    const text4 = await client.getText(sel)
    expect(text4).equal(e('setting'))
    await close(context, app)
  })
})
