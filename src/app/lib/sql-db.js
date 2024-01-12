/**
 * nedb api wrapper
 */

import { Sequelize, DataTypes } from 'sequelize'
import uid from '../common/uid.js'

const sequelize = new Sequelize(
  process.env.SQL_DB_URL
)

function capitalizeFirstLetter (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export class SqlDb {
  constructor (params) {
    const Mod = sequelize.define(capitalizeFirstLetter(params.tableName), {
      _id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: uid
      },
      data: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      }
    }, {

    })
    this.Mod = Mod
  }

  convertData (inst) {
    const { _id, data } = inst
    return {
      _id,
      ...JSON.parse(data)
    }
  }

  parseData (inst) {
    const { _id, ...data } = inst
    return {
      _id,
      data: JSON.stringify(data)
    }
  }

  findOne (q) {
    return this.Mod.findOne(q)
      .then(this.convertData)
  }

  find (q = {}) {
    return this.Mod.find(q)
      .then(arr => arr.map(this.convertData))
  }

  insert (data) {
    return Array.isArray(data)
      ? this.Mod.bulkCreate(data.map(this.parseData)).then(() => 1)
      : this.Mod.create(this.parseData(data)).then(() => 1)
  }

  async update (q, up) {
    const inst = await this.findOne(q)
    const data = { ...inst.data, ...up }
    delete data._id
    return this.Mod.upsert({ data }, q)
  }
}
