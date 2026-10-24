/**
 * The script every custom widget UI gets: window.electerm.
 *
 * Injected into the widget's html by ./protocol.js, so a widget author writes a
 * normal web page and calls the host through this object. Everything crossing
 * the boundary is JSON-serialisable and the host answers over postMessage (the
 * widget document is served from its own url, and the host is the electerm
 * window that embeds it in an iframe).
 *
 * Kept as a plain string (ES5, no imports) because it is shipped as-is to a
 * document the bundler never sees.
 */

const bridgeSource = `(function () {
  if (window.electerm) {
    return
  }
  var pending = {}
  var seq = 0
  var readyResolve
  var ready = new Promise(function (resolve) {
    readyResolve = resolve
  })

  function request (method, args) {
    return new Promise(function (resolve, reject) {
      var reqId = ++seq
      pending[reqId] = { resolve: resolve, reject: reject }
      parent.postMessage({
        __electermWidget: true,
        reqId: reqId,
        method: method,
        args: args || []
      }, '*')
    })
  }

  function applyInit (init) {
    if (!init) {
      return
    }
    var vars = init.cssVars || {}
    Object.keys(vars).forEach(function (name) {
      document.documentElement.style.setProperty(name, vars[name])
    })
    if (init.colorScheme) {
      document.documentElement.style.colorScheme = init.colorScheme
    }
    readyResolve(init)
  }

  window.addEventListener('message', function (evt) {
    var data = evt.data
    if (!data || data.__electermWidgetHost !== true) {
      return
    }
    if (data.method === 'init') {
      applyInit(data.data)
      return
    }
    var item = pending[data.reqId]
    if (!item) {
      return
    }
    delete pending[data.reqId]
    if (data.ok) {
      item.resolve(data.result)
    } else {
      item.reject(new Error(data.error || 'electerm widget call failed'))
    }
  })

  // Desktop keeps the id in the scheme (electerm-widget://<id>/<file>), the web
  // app in the path (/api/widget-ui/<id>/<file>); everything after the id is
  // the file, so neither can be read off a fixed slice of the pathname.
  function widgetId () {
    var parts = location.pathname.split('/')
    var marker = parts.indexOf('widget-ui')
    if (marker > -1 && parts[marker + 1]) {
      return decodeURIComponent(parts[marker + 1])
    }
    if (location.protocol === 'electerm-widget:') {
      return decodeURIComponent(location.hostname)
    }
    return decodeURIComponent(parts.slice(-2)[0] || '')
  }

  window.electerm = {
    // the widget id
    id: widgetId(),
    ready: ready,
    // call a function exported by the widget's main-process module
    call: function (name) {
      var args = Array.prototype.slice.call(arguments, 1)
      return request('call', [name].concat(args))
    },
    getConfig: function () {
      return request('getConfig')
    },
    updateConfig: function (patch) {
      return request('updateConfig', [patch])
    },
    openDialog: function (opts) {
      return request('openDialog', [opts])
    },
    saveDialog: function (opts) {
      return request('saveDialog', [opts])
    },
    copy: function (text) {
      return request('copy', [text])
    },
    openExternal: function (url) {
      return request('openExternal', [url])
    },
    openTab: function (tab) {
      return request('openTab', [tab])
    },
    log: function () {
      return request('log', Array.prototype.slice.call(arguments))
    }
  }
})()
`

export default bridgeSource
