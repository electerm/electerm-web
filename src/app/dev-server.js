// The shared renderer requests widget assets from the page origin. Forward
// those requests to the backend that owns the widget files and login session.
import conf from '../../build/vite/conf.js'
import { env } from '../../build/vite/common.js'

conf.plugins.push({
  name: 'widget-assets-proxy',
  config: () => ({
    server: {
      proxy: {
        '/api/widget-assets/': `http://${env.HOST || '127.0.0.1'}:${env.PORT || 5572}`
      }
    }
  })
})

await import('../../build/vite/dev-server.js')
