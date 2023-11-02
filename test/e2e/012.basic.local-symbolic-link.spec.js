import {
  close,
  init
} from './common/common.js'
import { test as it } from '@playwright/test'
import delay from './common/wait.js'
import { expect } from 'chai'

const { describe } = it
it.setTimeout(100000)

describe('symbolic links support', function () {
  it('symbolic links support works', async function () {
    const {
      client, context, app
    } = await init()
    await delay(4500)
    const tmp = 'tmp-' + (+new Date())
    const cmd = `cd ~ && mkdir ${tmp} && cd ${tmp} && touch x.js && mkdir xx && ln -s x.js xk && ln -s xx xxk`
    await client.keyboard.type(cmd)
    await client.keyboard.press('Enter')
    await delay(1900)
    await client.click('.session-current .term-sftp-tabs .fileManager')
    await delay(300)
    await client.click('.session-current .anticon-reload')
    await delay(2500)
    await client.doubleClick('.session-current .file-list.local .real-file-item')

    await delay(5000)
    const localFileList = await client.countElem('.session-current .file-list.local .sftp-item')
    expect(localFileList >= 5).equal(true)
    await client.click('.session-current .term-sftp-tabs .terminal')
    await delay(500)
    const cmd1 = `cd ~ && rm -rf ${tmp}`
    await client.keyboard.type(cmd1)
    await client.keyboard.press('Enter')
    await close(context, app)
  })
})
