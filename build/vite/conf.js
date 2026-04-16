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
  legacy: {
    inconsistentCjsInterop: true
  },
  resolve: {
    alias: {
      'ironrdp-wasm': resolve(cwd, 'node_modules/ironrdp-wasm/pkg/rdp_client.js')
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
    emptyOutDir: false,
    outDir: resolve(cwd, 'dist/assets'),
    rollupOptions: {
      input: buildInput(),
      output: {
        inlineDynamicImports: false,
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
