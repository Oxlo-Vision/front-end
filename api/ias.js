const BLOCKED_RESPONSE_HEADERS = new Set([
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
])

export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL

  if (!backendUrl) {
    res.status(500).json({ error: 'BACKEND_URL no esta configurada en Vercel.' })
    return
  }

  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    res.status(405).json({ error: 'Metodo no permitido. Usa GET.' })
    return
  }

  const upstreamUrl = `${backendUrl.replace(/\/$/, '')}/api/ias`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: req.headers.accept || 'application/json',
      },
    })

    res.status(upstream.status)

    upstream.headers.forEach((value, key) => {
      if (!BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value)
      }
    })

    const bodyBuffer = Buffer.from(await upstream.arrayBuffer())
    res.send(bodyBuffer)
  } catch (error) {
    res.status(502).json({
      error: 'No se pudo contactar al backend.',
      details: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
