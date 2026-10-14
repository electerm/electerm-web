import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cwd, version } from './common.js'
import { resolve } from 'path'
import def from './def.js'

function buildInput () {
  return {
    electerm: resolve(cwd, 'src/client/entry-web/electerm.jsx'),
    basic: resolve(cwd, 'src/client/entry-web/basic.js'),
    worker: resolve(cwd, 'src/client/entry-web/worker.js')
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // commonjs(),
    react({ include: /\.(mdx|js|jsx|ts|tsx|mjs)$/ })
  ],
  define: def,
  publicDir: false,
  // the login page's 3D logo model (simple-auth/login-logo-3d.js) is imported
  // as a URL and emitted next to the other assets
  assetsInclude: ['**/*.glb'],
  legacy: {
    inconsistentCjsInterop: true
  },
  resolve: {
    alias: {
      'ironrdp-wasm': resolve(cwd, 'node_modules/ironrdp-wasm/pkg/rdp_client.js'),
      '@novnc/novnc/core/rfb': resolve(cwd, 'node_modules/@novnc/novnc/core/rfb.js'),
      // @xterm/addon-ligatures bundles lru-cache@11, which calls
      // channel()/tracingChannel() from node:diagnostics_channel at import time.
      // In the renderer (browser) context Vite stubs Node builtins and the call
      // throws. lru-cache only uses it for optional metrics, so a no-op stub is
      // safe. Covers both bare `diagnostics_channel` and the `node:` prefix.
      'node:diagnostics_channel': resolve(cwd, 'build/vite/diagnostics-channel-stub.js'),
      diagnostics_channel: resolve(cwd, 'build/vite/diagnostics-channel-stub.js')
    }
  },
  optimizeDeps: {
    exclude: ['ironrdp-wasm']
  },
  // assetsInclude: ['**/*.wasm'],
  root: resolve(cwd),
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    codeSplitting: false,
    emptyOutDir: false,
    outDir: resolve(cwd, 'dist/assets'),
    rollupOptions: {
      input: buildInput(),
      output: {
        format: 'esm',
        entryFileNames: `js/[name]-${version}.js`,
        chunkFileNames: `chunk/[name]-${version}-[hash].js`,
        assetFileNames: chunkInfo => {
          const { name } = chunkInfo
          if (/\.(png|jpe?g|gif|svg|webp|ico|bmp)$/i.test(name)) {
            return `images/${name}`
          } else if (name && name.endsWith('.css')) {
            return `css/style-${version}[extname]`
          } else {
            return 'assets/[name]-[hash][extname]'
          }
        }
      }
    }
  }
})
