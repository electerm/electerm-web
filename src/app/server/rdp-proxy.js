import net from 'net'
import tls from 'tls'
import log from '../common/log.js'
import proxySock from './socks.js'

// Debug prefix for all RDP proxy messages
const LOG_PREFIX = '[RDP-PROXY]'

// We use Node.js built-in tls module with rejectUnauthorized: false
// to accept self-signed RDP server certificates.
// This works because electerm-web runs in standard Node.js (not Electron with BoringSSL).

// RDCleanPath ASN.1 DER Constants
const VERSION_1 = 3390 // 3389 + 1

// ASN.1 tag constants
const TAG_SEQUENCE = 0x30
const TAG_INTEGER = 0x02
const TAG_OCTET_STRING = 0x04
const TAG_UTF8STRING = 0x0c

// Context-specific EXPLICIT tags used by RDCleanPath
const TAG_CTX = (n) => 0xa0 + n

// ASN.1 DER Low-Level Helpers

/**
 * Encode ASN.1 DER length bytes.
 */
function derEncodeLength (length) {
  if (length < 0x80) {
    return Buffer.from([length])
  }
  const bytes = []
  let temp = length
  while (temp > 0) {
    bytes.unshift(temp & 0xff)
    temp >>= 8
  }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}

/**
 * Wrap content with a tag and proper DER length encoding.
 */
function derWrap (tag, content) {
  const len = derEncodeLength(content.length)
  return Buffer.concat([Buffer.from([tag]), len, content])
}

/**
 * Encode an integer as ASN.1 DER INTEGER.
 */
function derEncodeInteger (value) {
  if (value === 0) {
    return derWrap(TAG_INTEGER, Buffer.from([0]))
  }
  const bytes = []
  let temp = value
  while (temp > 0) {
    bytes.unshift(temp & 0xff)
    temp >>= 8
  }
  // Add leading zero if high bit set (to keep unsigned)
  if (bytes[0] & 0x80) {
    bytes.unshift(0)
  }
  return derWrap(TAG_INTEGER, Buffer.from(bytes))
}

/**
 * Encode a UTF-8 string as ASN.1 DER UTF8String.
 */
function derEncodeUtf8String (str) {
  return derWrap(TAG_UTF8STRING, Buffer.from(str, 'utf-8'))
}

/**
 * Encode raw bytes as ASN.1 DER OCTET STRING.
 */
function derEncodeOctetString (buf) {
  return derWrap(TAG_OCTET_STRING, buf)
}

/**
 * Wrap content in a context-specific EXPLICIT tag [n].
 */
function derWrapContext (tagNum, content) {
  return derWrap(TAG_CTX(tagNum), content)
}

/**
 * Decode DER length at offset. Returns { length, bytesRead }.
 */
function derDecodeLength (buf, offset) {
  const first = buf[offset]
  if (first < 0x80) {
    return { length: first, bytesRead: 1 }
  }
  const numBytes = first & 0x7f
  let length = 0
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | buf[offset + 1 + i]
  }
  return { length, bytesRead: 1 + numBytes }
}

/**
 * Decode a DER TLV (Tag-Length-Value) at offset.
 * Returns { tag, value: Buffer, totalLength }.
 */
function derDecodeTLV (buf, offset) {
  const tag = buf[offset]
  const { length, bytesRead } = derDecodeLength(buf, offset + 1)
  const headerLen = 1 + bytesRead
  const value = buf.slice(offset + headerLen, offset + headerLen + length)
  return { tag, value, totalLength: headerLen + length }
}

/**
 * Decode an ASN.1 DER INTEGER to a JS number.
 */
function derDecodeInteger (buf) {
  let val = 0
  for (let i = 0; i < buf.length; i++) {
    val = (val << 8) | buf[i]
  }
  return val
}

/**
 * Decode all TLV elements within a constructed value (SEQUENCE, context tags, etc.).
 * Returns an array of { tag, value, totalLength }.
 */
function derDecodeChildren (buf) {
  const children = []
  let offset = 0
  while (offset < buf.length) {
    const tlv = derDecodeTLV(buf, offset)
    children.push(tlv)
    offset += tlv.totalLength
  }
  return children
}

// RDCleanPath PDU Parsing & Encoding

/**
 * Parse an RDCleanPath Request PDU from DER-encoded bytes.
 *
 * Returns: { destination, proxyAuth, x224ConnectionRequest, preconnectionBlob? }
 */
function parseRDCleanPathRequest (data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)

  // Outer SEQUENCE
  const outer = derDecodeTLV(buf, 0)
  if (outer.tag !== TAG_SEQUENCE) {
    throw new Error(`Expected SEQUENCE (0x30), got 0x${outer.tag.toString(16)}`)
  }

  const children = derDecodeChildren(outer.value)

  let version = null
  let destination = null
  let proxyAuth = null
  let x224ConnectionRequest = null
  let preconnectionBlob = null

  for (const child of children) {
    const ctxTag = child.tag & 0x1f // strip class bits to get tag number

    switch (ctxTag) {
      case 0: { // version
        const intTlv = derDecodeTLV(child.value, 0)
        version = derDecodeInteger(intTlv.value)
        break
      }
      case 2: { // destination
        const strTlv = derDecodeTLV(child.value, 0)
        destination = strTlv.value.toString('utf-8')
        break
      }
      case 3: { // proxy_auth
        const strTlv = derDecodeTLV(child.value, 0)
        proxyAuth = strTlv.value.toString('utf-8')
        break
      }
      case 5: { // preconnection_blob
        const strTlv = derDecodeTLV(child.value, 0)
        preconnectionBlob = strTlv.value.toString('utf-8')
        break
      }
      case 6: { // x224_connection_pdu
        const octTlv = derDecodeTLV(child.value, 0)
        x224ConnectionRequest = octTlv.value
        break
      }
    }
  }

  if (version !== VERSION_1) {
    throw new Error(`Unsupported RDCleanPath version: ${version} (expected ${VERSION_1})`)
  }
  if (!destination) {
    throw new Error('Missing destination in RDCleanPath request')
  }
  if (!x224ConnectionRequest) {
    throw new Error('Missing x224_connection_pdu in RDCleanPath request')
  }

  return { destination, proxyAuth, x224ConnectionRequest, preconnectionBlob }
}

/**
 * Build an RDCleanPath Response PDU as DER-encoded bytes.
 *
 * @param {string} serverAddr - Resolved server address (e.g. "192.168.2.31:3389")
 * @param {Buffer} x224Response - X.224 Connection Confirm bytes
 * @param {Buffer[]} certChain - Array of DER-encoded X.509 certificates
 * @returns {Buffer} DER-encoded RDCleanPath response
 */
function buildRDCleanPathResponse (serverAddr, x224Response, certChain) {
  const parts = []

  // [0] version
  parts.push(derWrapContext(0, derEncodeInteger(VERSION_1)))

  // [6] x224_connection_pdu
  parts.push(derWrapContext(6, derEncodeOctetString(x224Response)))

  // [7] server_cert_chain - SEQUENCE OF OCTET STRING
  const certOctets = certChain.map((cert) => derEncodeOctetString(cert))
  const certSeq = derWrap(TAG_SEQUENCE, Buffer.concat(certOctets))
  parts.push(derWrapContext(7, certSeq))

  // [9] server_addr
  parts.push(derWrapContext(9, derEncodeUtf8String(serverAddr)))

  return derWrap(TAG_SEQUENCE, Buffer.concat(parts))
}

/**
 * Build an RDCleanPath Error PDU as DER-encoded bytes.
 *
 * @param {number} errorCode - 1=general, 2=negotiation
 * @param {number} [httpStatusCode] - optional HTTP status code
 * @returns {Buffer} DER-encoded RDCleanPath error response
 */
function buildRDCleanPathError (errorCode, httpStatusCode) {
  const errParts = []

  // [0] error_code
  errParts.push(derWrapContext(0, derEncodeInteger(errorCode)))

  // [1] http_status_code (optional)
  if (httpStatusCode != null) {
    errParts.push(derWrapContext(1, derEncodeInteger(httpStatusCode)))
  }

  const errSeq = derWrap(TAG_SEQUENCE, Buffer.concat(errParts))

  const parts = []
  // [0] version
  parts.push(derWrapContext(0, derEncodeInteger(VERSION_1)))
  // [1] error
  parts.push(derWrapContext(1, errSeq))

  return derWrap(TAG_SEQUENCE, Buffer.concat(parts))
}

// Network: Destination Parsing

/**
 * Parse a destination string into { host, port }.
 * Handles IPv6 "[::1]:3389" and regular "host:port" formats.
 * Default port is 3389.
 */
function parseDestination (destination) {
  // IPv6: [host]:port
  if (destination.startsWith('[')) {
    const bracketEnd = destination.indexOf(']')
    if (bracketEnd === -1) throw new Error(`Invalid IPv6 destination: ${destination}`)
    const host = destination.slice(1, bracketEnd)
    const rest = destination.slice(bracketEnd + 1)
    const port = rest.startsWith(':') ? parseInt(rest.slice(1), 10) : 3389
    return { host, port }
  }

  // Regular host:port
  const lastColon = destination.lastIndexOf(':')
  if (lastColon === -1) {
    return { host: destination, port: 3389 }
  }
  const host = destination.slice(0, lastColon)
  const port = parseInt(destination.slice(lastColon + 1), 10)
  if (isNaN(port)) {
    return { host: destination, port: 3389 }
  }
  return { host, port }
}

// Network: TCP + X.224 + TLS + Cert Extraction

/**
 * Create a TCP connection (direct or through proxy)
 * @param {string} host
 * @param {number} port
 * @param {object} options
 * @param {string} options.proxy - Proxy URL
 * @param {number} options.readyTimeout - Connection timeout
 * @param {Buffer} x224Request - X.224 Connection Request to send
 * @param {function} logPrefix - Log prefix function
 * @returns {Promise<net.Socket>}
 */
async function createTcpConnection (host, port, options, x224Request, logPrefix) {
  if (options.proxy) {
    log.debug(`${logPrefix} Connecting through proxy: ${options.proxy}`)
    const proxyResult = await proxySock({
      readyTimeout: options.readyTimeout || 15000,
      host,
      port,
      proxy: options.proxy
    })
    const tcpSocket = proxyResult.socket
    log.debug(`${logPrefix} Proxy connection established`)

    // Send X.224 Connection Request over proxied connection
    tcpSocket.write(x224Request, () => {
      log.debug(`${logPrefix} Sent X.224 Connection Request (${x224Request.length} bytes)`)
    })
    return tcpSocket
  }

  return new Promise((resolve, reject) => {
    const tcpSocket = net.createConnection({ host, port }, () => {
      log.debug(`${logPrefix} TCP connection established`)

      // Send X.224 Connection Request over raw TCP
      tcpSocket.write(x224Request, () => {
        log.debug(`${logPrefix} Sent X.224 Connection Request (${x224Request.length} bytes)`)
      })
      resolve(tcpSocket)
    })
    tcpSocket.once('error', (err) => {
      reject(new Error(`TCP connection failed: ${err.message}`))
    })
  })
}

/**
 * Perform the RDP proxy handshake:
 * 1. TCP connect to RDP server (optionally through proxy)
 * 2. Send X.224 Connection Request (raw TCP)
 * 3. Read X.224 Connection Confirm (raw TCP)
 * 4. TLS handshake via Node.js tls module (with rejectUnauthorized: false)
 * 5. Extract server certificates
 *
 * @param {string} host
 * @param {number} port
 * @param {Buffer} x224Request - X.224 Connection Request bytes
 * @param {object} options - Optional settings
 * @param {string} options.proxy - Proxy URL (e.g., 'socks5://127.0.0.1:1080' or 'http://proxy:8080')
 * @param {number} options.readyTimeout - Connection timeout in ms
 * @returns {Promise<{ x224Response: Buffer, certChain: Buffer[], tlsSocket: tls.TLSSocket, tcpSocket: net.Socket }>}
 */
async function performRDPHandshake (host, port, x224Request, options = {}) {
  const logPrefix = `${LOG_PREFIX} [${host}:${port}]`

  // Step 1: TCP connect (direct or through proxy)
  let tcpSocket
  try {
    tcpSocket = await createTcpConnection(host, port, options, x224Request, logPrefix)
  } catch (err) {
    throw new Error(`Connection failed: ${err.message}`)
  }

  return new Promise((resolve, reject) => {
    let settled = false

    function settle (err, result) {
      if (settled) return
      settled = true
      if (err) reject(err)
      else resolve(result)
    }

    tcpSocket.once('error', (err) => {
      settle(new Error(`TCP connection failed: ${err.message}`))
    })

    // Step 3: Read X.224 Connection Confirm
    tcpSocket.once('data', (x224Response) => {
      log.debug(`${logPrefix} Received X.224 Connection Confirm (${x224Response.length} bytes)`)

      if (x224Response.length === 0) {
        tcpSocket.destroy()
        settle(new Error('RDP server closed connection without X.224 response'))
        return
      }

      // Remove all listeners before upgrading to TLS
      tcpSocket.removeAllListeners('error')
      tcpSocket.removeAllListeners('data')

      // Step 4: TLS handshake via Node.js tls module
      log.debug(`${logPrefix} Starting TLS handshake`)

      const tlsSocket = tls.connect({
        socket: tcpSocket,
        rejectUnauthorized: false // Accept self-signed RDP certificates
      }, () => {
        log.debug(`${logPrefix} TLS handshake completed`)

        // Step 5: Extract certificate chain
        const certChain = extractCertChain(tlsSocket)
        log.debug(`${logPrefix} Extracted ${certChain.length} certificate(s)`)

        settle(null, {
          x224Response: Buffer.from(x224Response),
          certChain,
          tlsSocket,
          tcpSocket
        })
      })

      tlsSocket.once('error', (err) => {
        log.error(`${logPrefix} TLS error: ${err.message}`)
        settle(new Error(`TLS handshake failed: ${err.message}`))
      })

      // Timeout for the TLS handshake
      tlsSocket.setTimeout(15000, () => {
        tlsSocket.destroy()
        settle(new Error('TLS handshake timed out'))
      })
    })

    // Timeout for the whole handshake
    tcpSocket.setTimeout(15000, () => {
      tcpSocket.destroy()
      settle(new Error('Connection timed out'))
    })
  })
}

/**
 * Extract the certificate chain from a TLS socket.
 * Returns an array of DER-encoded certificates.
 */
function extractCertChain (tlsSocket) {
  const result = []
  try {
    const peerCert = tlsSocket.getPeerCertificate(true)
    if (peerCert) {
      // The 'raw' property contains the DER-encoded certificate
      if (peerCert.raw) {
        result.push(peerCert.raw)
      }
      // Check for issuer certificate in the chain
      let cert = peerCert
      while (cert.issuerCertificate && cert.issuerCertificate !== cert) {
        if (cert.issuerCertificate.raw) {
          result.push(cert.issuerCertificate.raw)
        }
        cert = cert.issuerCertificate
      }
    }
  } catch (e) {
    log.error(`${LOG_PREFIX} Error extracting cert chain: ${e.message}`)
  }
  return result
}

// Bidirectional Relay: WebSocket <-> TLS Socket <-> TCP

/**
 * Set up bidirectional relay between a WebSocket and a TLS socket.
 *
 * Browser (WASM) -> WebSocket -> Proxy -> TLS Socket -> TCP -> RDP Server
 * RDP Server -> TCP -> TLS Socket -> Proxy -> WebSocket -> Browser (WASM)
 *
 * @param {WebSocket} ws - The WebSocket connection to the browser
 * @param {tls.TLSSocket} tlsSocket - The TLS socket connected to RDP server
 * @param {net.Socket} tcpSocket - The underlying TCP socket
 */
function setupTlsRelay (ws, tlsSocket, tcpSocket) {
  let wsBytesForwarded = 0
  let tlsBytesForwarded = 0

  const logPrefix = `${LOG_PREFIX} [relay]`

  // TLS Socket -> WebSocket (RDP server -> browser)
  tlsSocket.on('data', (data) => {
    tlsBytesForwarded += data.length
    try {
      if (ws.readyState === 1 /* OPEN */) {
        ws.send(data)
      }
    } catch (err) {
      log.error(`${logPrefix} TLS->WS write error:`, err.message)
    }
  })

  // WebSocket -> TLS Socket (browser -> RDP server)
  ws.on('message', (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
    wsBytesForwarded += buf.length
    try {
      tlsSocket.write(buf)
    } catch (err) {
      log.error(`${logPrefix} WS->TLS write error:`, err.message)
    }
  })

  // Cleanup on close
  const cleanup = (source) => {
    log.debug(`${logPrefix} ${source} closed - WS->TLS: ${wsBytesForwarded} bytes, TLS->WS: ${tlsBytesForwarded} bytes`)
    if (!tcpSocket.destroyed) tcpSocket.destroy()
    if (ws.readyState === 1) {
      try { ws.close() } catch (_) {}
    }
  }

  tlsSocket.on('end', () => cleanup('TLS'))
  tlsSocket.on('error', (err) => {
    log.error(`${logPrefix} TLS error:`, err.message)
    cleanup('TLS (error)')
  })

  tcpSocket.on('end', () => cleanup('TCP'))
  tcpSocket.on('error', (err) => {
    log.error(`${logPrefix} TCP error:`, err.message)
    cleanup('TCP (error)')
  })

  ws.on('close', () => cleanup('WebSocket'))
  ws.on('error', (err) => {
    log.error(`${logPrefix} WebSocket error:`, err.message)
    cleanup('WebSocket (error)')
  })
}

// Main Handler: Process a WebSocket connection

/**
 * Handle a new WebSocket connection from the browser's WASM RDP client.
 *
 * Protocol:
 * 1. Receive RDCleanPath Request (ASN.1 DER binary message)
 * 2. Parse destination, X.224 connection request
 * 3. TCP connect to RDP server, send X.224, receive X.224 confirm
 * 4. TLS handshake, extract server certificates
 * 5. Send RDCleanPath Response back to browser
 * 6. Bidirectional relay: WebSocket <-> TLS
 *
 * @param {WebSocket} ws - The WebSocket connection
 * @param {object} options - Optional settings
 * @param {string} options.proxy - Proxy URL (e.g., 'socks5://127.0.0.1:1080' or 'http://proxy:8080')
 * @param {number} options.readyTimeout - Connection timeout in ms
 */
function handleConnection (ws, options = {}) {
  log.debug(`${LOG_PREFIX} New WebSocket connection for RDP proxy`)

  // Wait for the first binary message: RDCleanPath Request
  ws.once('message', async (data) => {
    try {
      const requestData = Buffer.isBuffer(data) ? data : Buffer.from(data)
      log.debug(`${LOG_PREFIX} Received RDCleanPath request (${requestData.length} bytes)`)

      // Step 1: Parse RDCleanPath request
      const request = parseRDCleanPathRequest(requestData)
      log.debug(`${LOG_PREFIX} RDCleanPath Request -> destination: ${request.destination}, proxyAuth: ${request.proxyAuth}`)

      // Step 2: Parse destination
      const { host, port } = parseDestination(request.destination)
      log.debug(`${LOG_PREFIX} Connecting to RDP server at ${host}:${port}`)

      // Step 3-5: TCP + X.224 + TLS + Certs
      const { x224Response, certChain, tlsSocket, tcpSocket } = await performRDPHandshake(
        host,
        port,
        request.x224ConnectionRequest,
        options
      )

      // Step 6: Build and send RDCleanPath response
      const serverAddr = `${host}:${port}`
      const responsePdu = buildRDCleanPathResponse(serverAddr, x224Response, certChain)
      log.debug(`${LOG_PREFIX} Sending RDCleanPath response (${responsePdu.length} bytes) to browser`)
      ws.send(responsePdu)

      log.debug(`${LOG_PREFIX} RDP proxy handshake complete - starting bidirectional relay`)

      // Step 7: Bidirectional relay
      setupTlsRelay(ws, tlsSocket, tcpSocket)
    } catch (err) {
      log.error(`${LOG_PREFIX} RDP proxy handshake error:`, err.message)
      log.error(`${LOG_PREFIX} Stack:`, err.stack)

      // Try to send error response to client
      try {
        const errorPdu = buildRDCleanPathError(1, 502)
        ws.send(errorPdu)
      } catch (_) {}

      try { ws.close() } catch (_) {}
    }
  })

  ws.on('error', (err) => {
    log.error(`${LOG_PREFIX} WebSocket error:`, err.message)
  })
}

// Backward compatibility alias
const setupForgeRelay = setupTlsRelay

export {
  handleConnection,
  parseRDCleanPathRequest,
  buildRDCleanPathResponse,
  buildRDCleanPathError,
  parseDestination,
  performRDPHandshake,
  setupTlsRelay,
  setupForgeRelay // backward compatibility
}
