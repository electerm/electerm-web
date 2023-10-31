import { env } from './e2e/common/env.js'
import { defineConfig } from '@playwright/test'

const url = `http://${env.HOST}:${env.PORT}`

export default defineConfig({
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: 1,

  // // Reporter to use
  // reporter: 'html',

  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: url
  }
})
