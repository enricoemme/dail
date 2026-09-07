// Vercel serverless proxy for the VIKI DAIL-module completion write-back.
// Mirrors the local relay's /api/complete. Integration + completion secrets
// stay in Vercel env; returns the override digit issued by central.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  const integration = process.env.VIKI_INTEGRATION_SECRET
  const completeSecret = process.env.VIKI_COMPLETE_SECRET
  if (!integration || !completeSecret) return res.status(503).json({ error: 'no-secret' })

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {}
  const teamId = body.teamId
  if (!teamId) return res.status(400).json({ error: 'no-teamId' })

  const url =
    process.env.VIKI_COMPLETE_URL ||
    'https://viki-escape-room.replit.app/api/viki/modules/dail/complete'
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-viki-integration-secret': integration },
      body: JSON.stringify({
        teamId,
        secret: completeSecret,
        timeSeconds: Number(body.timeSeconds) || undefined,
        durationMs: Number(body.durationMs) || undefined,
      }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return res.status(502).json({ error: 'complete-failed', status: r.status })
    res.status(200).json(data)
  } catch (err) {
    console.error('completion failed:', err.message)
    res.status(502).json({ error: 'complete-failed' })
  }
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return {} }
}
