// Team-roster / completion API calls.
//
// On the kiosk the relay serves these at a relative /api/* path. On a static
// host (GitHub Pages) there's no relay, so we fall back to the Vercel
// serverless functions, which hold the secrets and allow cross-origin.
//
// Every request has a timeout: a blocked network (e.g. a corporate proxy that
// stalls rather than rejects) must surface as a clean failure — otherwise the
// UI hangs on "Loading teams…" forever with no way to retry.
const FALLBACK_ORIGIN = 'https://dail-phi.vercel.app'

async function fetchWithTimeout(url: string, init: RequestInit | undefined, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    const r = await fetchWithTimeout(path, init, 6000)
    if (r.ok) return r
  } catch {
    /* relative call unavailable or timed out — fall through to Vercel */
  }
  // Throws (and rejects the caller) if the fallback also times out, so the UI
  // can show a retry instead of hanging.
  return fetchWithTimeout(FALLBACK_ORIGIN + path, init, 8000)
}
