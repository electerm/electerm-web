/**
 * ipc main
 */

import * as constants from '../common/runtime-constants.js'
import { transferKeys } from '../server/transfer.js'
import fs from 'fs'
import os from 'os'
import _ from 'lodash'
import { sep } from 'path'
import { getConfig } from './init.js'
import copy from 'json-deep-copy'

export async function getConstants (req, res) {
  const config = await getConfig(true)
  const data = {
    osInfoData: (() => {
      return Object.keys(os).map((k, i) => {
        const vf = os[k]
        if (!_.isFunction(vf)) {
          return null
        }
        let v
        try {
          v = vf()
        } catch (e) {
          return null
        }
        if (!v) {
          return null
        }
        v = JSON.stringify(v, null, 2)
        return { k, v }
      }).filter(d => d)
    })(),
    config,
    sep,
    fsConstants: fs.constants,
    ...constants,
    env: process.env,
    versions: copy(process.versions),
    transferKeys
  }
  res.send(
    data
  )
}
