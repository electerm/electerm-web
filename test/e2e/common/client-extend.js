/**
 * extend client functions
 */

import {
  expect
} from '@playwright/test'

export default (client) => {
  client.element = (sel) => {
    return client.locator(sel).first()
  }
  client.elements = client.locator
  client.click = async (sel, n = 0, parent) => {
    const sl = sel + ` >> nth=${n}`
    let s = client.locator(sl)
    if (parent) {
      s = s.locator('..')
    }
    await s.click()
  }
  client.elemExist = async (sel) => {
    try {
      await client.waitForSelector(sel, { timeout: 0 })
      return true
    } catch (error) {
      return false
    }
  }
  client.hasElem = async (sel, target = true) => {
    const s = client.locator(sel)
    const c = await s.count()
    expect(!!c).toEqual(target)
  }
  client.countElem = async (sel) => {
    const s = client.locator(sel)
    const c = await s.count()
    return c
  }
  client.hasFocus = async (sel) => {
    const s = await client.locator(sel).first()
    expect(s).toBeFocused()
  }
  client.getText = async (sel) => {
    const s = await client.locator(sel).first()
    return s.textContent()
  }
  client.setValue = async (sel, v) => {
    const s = await client.locator(sel)
    return s.fill(v)
  }
  client.getValue = async (sel) => {
    const s = await client.locator(sel)
    return s.inputValue()
  }
  client.rightClick = async function (sel, x, y) {
    const s = await client.locator(sel).first()
    await s.click({
      button: 'right',
      position: {
        x,
        y
      }
    })
  }
  client.doubleClick = async function (sel, n = 0) {
    const sl = sel + `>> nth=${n}`
    const s = await client.locator(sl)
    await s.dblclick()
  }
  client.readClipboard = async () => {
    return client.evaluate(
      async () => window.et.clipboard
    )
  }
  client.writeClipboard = (clipboardContentToWrite) => {
    client.evaluate(
      (v) => {
        window.et.clipboard = v
      }, clipboardContentToWrite
    )
  }
  client.getAttribute = async (sel, name) => {
    return client.$eval(sel, (e, name) => {
      return e.getAttribute(name)
    }, name)
  }

  return client
}
