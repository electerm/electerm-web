import { chromium } from 'playwright'
import extendClient from './client-extend.js'

export async function init () {
  const app = await chromium.launch()
  const context = await app.newContext()
  await context.addInitScript(() => {
    window.localStorage.setItem('tokenElecterm', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluIiwiaWF0IjoxNjk4ODAxMDYwLCJleHAiOjU0ODU3MTMwNjB9.hUDysGzW06igCstugLs1ziuqhXLkKGaoICkFQ0NkFPA')
  })
  const client = await context.newPage()
  extendClient(client, app)
  await client.goto('/')
  return {
    client, context, app
  }
}

export async function close (context, app) {
  await context.close().catch(console.log)
  await app.close().catch(console.log)
}
