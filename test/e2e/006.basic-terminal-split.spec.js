/**
 * basic ssh test
 * need TEST_HOST TEST_PASS TEST_USER env set
 */
import { test as it } from '@playwright/test'
import {
  close,
  init
} from './common/common.js'
import { expect } from 'chai'
import delay from './common/wait.js'

const { describe } = it
it.setTimeout(100000)

describe('terminal split', function () {
  it('split button works', async function () {
    const {
      client, context, app
    } = await init()
    await delay(8500)
    await client.click('.session-current .term-controls .icon-split')
    await delay(2200)
    let terms = await client.elements('.session-current .term-wrap')
    terms = await terms.count()
    expect(terms).equal(2)
    await client.click('.session-current .term-controls .icon-split')
    await delay(2200)
    terms = await client.elements('.session-current .term-wrap')
    terms = await terms.count()
    expect(terms).equal(3)
    await client.click('.session-current .term-controls .icon-trash')
    await delay(2000)
    terms = await client.elements('.session-current .term-wrap')
    terms = await terms.count()
    expect(terms).equal(2)
    await close(context, app)
  })
})
