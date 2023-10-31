import { encObj, decObj } from '../../src/electerm-react/common/pass-enc.js'
import { expect } from 'chai'
import {
  test as it
} from '@playwright/test'

const { describe } = it

it.setTimeout(100000)

describe('enc/dec funcs', function () {
  it('dec/dec', async function () {
    const rr = 'AZaz/.,;sd7s87dfds#2342834_+=-!@$%^&*()'
    const r = encObj({
      password: rr
    })
    console.log(r)
    const r2 = decObj(r)
    console.log(r2)
    expect(r2.password).equal(rr)
  })
})
