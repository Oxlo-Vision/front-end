const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

function resolveTargetPath(pathSegments) {
  if (!pathSegments || pathSegments.length === 0) {
    return '/api'
  }

  if (pathSegments[0] === 'v1') {
    return `/${pathSegments.join('/')}`
  }

  return `/api/${pathSegments.join('/')}`
}

function buildForwardHeaders(headers) {
  const result = {}

  Object.entries(headers || {}).forEach(([key, value]) => {
    const headerName = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(headerName)) {
      return
    }
    if (typeof value === 'undefined') {
      return
    }
    result[key] = Array.isArray(value) ? value.join(',') : String(value)
  })

  return result
}

export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL

  if (!backendUrl) {
    res.status(500).json({
      error: 'BACKEND_URL no esta configurada en Vercel.',
    })
    return
  }

  const pathParam = req.query?.path
  const pathSegments = Array.isArray(pathParam)
    ? pathParam
    : typeof pathParam === 'string'
      ? [pathParam]
      : []

  const targetPath = resolveTargetPath(pathSegments)
  const queryString = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const upstreamUrl = `${backendUrl.replace(/\/$/, '')}${targetPath}${queryString}`

  const method = req.method || 'GET'
  const headers = buildForwardHeaders(req.headers)

  let body
  if (method !== 'GET' && method !== 'HEAD') {
    if (typeof req.body === 'string') {
      body = req.body
    } else if (req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body)
      if (!headers['content-type'] && !headers['Content-Type']) {
        headers['content-type'] = 'application/json'
      }
    }
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body,
    })

    res.status(upstreamResponse.status)

    upstreamResponse.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value)
      }
    })

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer())
    res.send(buffer)
  } catch (error) {
    res.status(502).json({
      error: 'No se pudo contactar al backend.',
      details: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
