import log from '../common/log.js'
import { connect, createServer } from 'net'
import socks from 'socksv5'

export function forwardRemoteToLocal ({
  conn,
  sshTunnelRemotePort,
  sshTunnelLocalPort,
  sshTunnelRemoteHost = '127.0.0.1',
  sshTunnelLocalHost = '127.0.0.1'
}) {
  let server = null
  conn.on('tcp connection', (info, accept, reject) => {
    const srcStream = accept() // Source stream for forwarding
    conn.emit('forwardIn', srcStream)
  }).on('forwardIn', (srcStream) => {
    // Connect the local machine source stream to the local port
    server = connect(sshTunnelLocalPort, sshTunnelLocalHost)
    srcStream.pipe(server).pipe(srcStream)
  }).on('close', () => {
    server && server.close && server.close()
    log.log('SSH connection closed')
  })
  // Forward the remote server's port to the local machine's port
  conn.forwardIn(sshTunnelRemoteHost, sshTunnelRemotePort, (err) => {
    if (err) {
      log.error('Error forwarding port:', err)
    }
    log.log(`Port forwarded: remote:${sshTunnelRemoteHost}:${sshTunnelRemotePort} => local:${sshTunnelLocalPort}`)
  })
}

export function forwardLocalToRemote ({
  conn,
  sshTunnelRemotePort,
  sshTunnelLocalPort,
  sshTunnelRemoteHost = '127.0.0.1',
  sshTunnelLocalHost = '127.0.0.1'
}) {
  const localServer = createServer((socket) => {
    conn.forwardOut(sshTunnelLocalHost, sshTunnelLocalPort, sshTunnelRemoteHost, sshTunnelRemotePort, (err, remoteSocket) => {
      if (err) {
        log.error('Error forwarding connection:', err)
        socket.end()
        return
      }
      socket.pipe(remoteSocket).pipe(socket)
    })
  })
  // Start listening for local connections
  localServer.listen(sshTunnelLocalPort, sshTunnelLocalHost, () => {
    log.log(`Local server listening on port ${sshTunnelLocalPort}`)
  })
  conn.on('close', () => {
    localServer && localServer.close()
  })
}

export function dynamicForward ({
  conn,
  sshTunnelLocalPort,
  sshTunnelLocalHost = '127.0.0.1'
}) {
  return new Promise((resolve, reject) => {
    socks.createServer((info, accept, deny) => {
      conn.forwardOut(
        info.srcAddr,
        info.srcPort,
        info.dstAddr,
        info.dstPort,
        (err, stream) => {
          if (err) {
            deny()
            return reject(err)
          }
          const clientSocket = accept(true)
          if (clientSocket) {
            stream.pipe(clientSocket).pipe(stream).on('close', () => {
              conn.end()
            })
          }
        })
    }).listen(sshTunnelLocalPort, sshTunnelLocalHost, () => {
      log.log(`SOCKS server listening on ${sshTunnelLocalHost}:${sshTunnelLocalPort}`)
      resolve(1)
    }).useAuth(socks.auth.None())
  })
}
