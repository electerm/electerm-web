/**
 * language fix
 */

import { get } from 'lodash-es'
import { en_us as en } from '@electerm/electerm-locales/esm/en_us.mjs'

function capitalizeFirstLetter (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export default async () => {
  const { lang } = en
  return prefix => {
    return (id) => {
      return capitalizeFirstLetter(get(lang, `${prefix}.${id}`) || id)
    }
  }
}
