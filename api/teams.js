// Vercel serverless proxy for the VIKI team roster. Mirrors the local relay's
// /api/teams so the hosted site works too. GM secret stays in Vercel env.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const secret = process.env.VIKI_GM_SECRET
  if (!secret) return res.status(503).json({ error: 'no-secret' })
  const url =
    process.env.VIKI_TEAMS_URL ||
    'https://viki-escape-room.replit.app/api/viki/teams/visible'
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'x-gm-secret': secret } })
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    const raw = await r.json()
    const data = (Array.isArray(raw) ? raw : []).map((t) => ({ id: t.id, name: t.name }))
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300')
    res.status(200).json(data)
  } catch (err) {
    console.error('teams fetch failed:', err.message)
    res.status(502).json({ error: 'fetch-failed' })
  }
}
