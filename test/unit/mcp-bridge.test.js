import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import globalState from '../../src/app/server/global-state.js'
import { ElectermMCPServer } from '../../src/app/widgets/widget-mcp-server.js'

function connectPage (t) {
  const ws = new EventEmitter()
  ws.readyState = 1
  ws.send = message => { ws.request = JSON.parse(message) }
  globalState.addCommonWs(ws)
  t.after(() => ws.emit('close'))
  return ws
}

test('MCP calls follow connected pages and in-flight replies stay with their sender', async t => {
  const server = new ElectermMCPServer({ host: '127.0.0.1', port: 0 })
  await server.start()
  t.after(() => server.stop())

  const listTabs = () => server.sendToRenderer('tool-call', { toolName: 'list_tabs' }, 500)
  await assert.rejects(listTabs(), /No Electerm page connected/)

  const first = connectPage(t)
  const beforeRefresh = listTabs()
  const next = connectPage(t)
  const afterRefresh = listTabs()

  // Both pages can be live briefly during navigation. Only the page that
  // received a request can answer it, even if a newer page has connected.
  const oldReply = { requestId: first.request.requestId, result: ['first tab'] }
  globalState.emit('mcp-response', next, { ...oldReply, result: ['wrong tab'] })
  globalState.emit('mcp-response', next, { requestId: next.request.requestId, result: ['new tab'] })
  globalState.emit('mcp-response', first, oldReply)
  assert.deepEqual(await afterRefresh, ['new tab'])
  assert.deepEqual(await beforeRefresh, ['first tab'])

  const interrupted = listTabs()
  next.emit('close')
  await assert.rejects(interrupted, /page disconnected/)
  assert.equal(globalState.getCommonWs(), first)
  first.emit('close')
  await assert.rejects(listTabs(), /No Electerm page connected/)
})
