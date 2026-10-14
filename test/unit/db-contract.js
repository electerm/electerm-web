import { test } from 'node:test'
import assert from 'node:assert/strict'

/**
 * common db interface contract
 * every db implementation (built-in or custom) must pass these tests
 * @param {Function} dbAction dbAction of the db implementation
 * @param {string} [table] table name, must exist in the built-in sqlite impl
 * @param {string} [label] prefix for test names
 */
export function testDbContract (dbAction, table = 'bookmarks', label = 'db') {
  const id1 = 'contract-id-1'
  const id2 = 'contract-id-2'

  test(`${label} contract: insert one doc and read it back`, async () => {
    const inserted = await dbAction(table, 'insert', {
      _id: id1,
      name: 'hello',
      nested: { a: [1, 2, 3] }
    })
    assert.equal(inserted._id, id1)
    const found = await dbAction(table, 'findOne', { _id: id1 })
    assert.equal(found.name, 'hello')
    assert.deepEqual(found.nested, { a: [1, 2, 3] })
  })

  test(`${label} contract: insert generates _id when missing`, async () => {
    const inserted = await dbAction(table, 'insert', { name: 'no-id' })
    assert.equal(typeof inserted._id, 'string')
    assert.ok(inserted._id.length > 0)
    const found = await dbAction(table, 'findOne', { _id: inserted._id })
    assert.equal(found.name, 'no-id')
  })

  test(`${label} contract: insert many docs`, async () => {
    const inserted = await dbAction(table, 'insert', [
      { _id: id2, name: 'second' },
      { name: 'third' }
    ])
    assert.ok(Array.isArray(inserted))
    assert.equal(inserted.length, 2)
    assert.equal(inserted[0]._id, id2)
    assert.ok(inserted[1]._id)
  })

  test(`${label} contract: find returns all docs`, async () => {
    const all = await dbAction(table, 'find')
    assert.ok(Array.isArray(all))
    const ids = all.map(d => d._id)
    assert.ok(ids.includes(id1))
    assert.ok(ids.includes(id2))
  })

  test(`${label} contract: findOne returns null for missing doc`, async () => {
    const found = await dbAction(table, 'findOne', { _id: 'not-exist' })
    assert.ok(!found)
  })

  test(`${label} contract: update replaces doc by _id`, async () => {
    const changes = await dbAction(table, 'update', { _id: id1 }, {
      _id: id1,
      name: 'updated'
    })
    assert.ok(changes >= 1)
    const found = await dbAction(table, 'findOne', { _id: id1 })
    assert.equal(found.name, 'updated')
  })

  test(`${label} contract: update with upsert creates missing doc`, async () => {
    const changes = await dbAction(table, 'update', { _id: 'upsert-id' }, {
      _id: 'upsert-id',
      name: 'upserted'
    }, { upsert: true })
    assert.ok(changes >= 1)
    const found = await dbAction(table, 'findOne', { _id: 'upsert-id' })
    assert.equal(found.name, 'upserted')
  })

  test(`${label} contract: update without upsert creates nothing`, async () => {
    const changes = await dbAction(table, 'update', { _id: 'no-upsert-id' }, {
      _id: 'no-upsert-id',
      name: 'nope'
    })
    assert.equal(changes, 0)
    const found = await dbAction(table, 'findOne', { _id: 'no-upsert-id' })
    assert.ok(!found)
  })

  test(`${label} contract: remove deletes doc by _id`, async () => {
    const changes = await dbAction(table, 'remove', { _id: id2 })
    assert.equal(changes, 1)
    const found = await dbAction(table, 'findOne', { _id: id2 })
    assert.ok(!found)
  })

  test(`${label} contract: remove missing doc changes nothing`, async () => {
    const changes = await dbAction(table, 'remove', { _id: 'not-exist' })
    assert.equal(changes, 0)
  })

  test(`${label} contract: compactDatafile is a no-op`, async () => {
    const result = await dbAction(table, 'compactDatafile')
    assert.equal(result, undefined)
  })
}
