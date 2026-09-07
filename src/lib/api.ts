// Team-roster / completion API calls.
//
// On the kiosk the relay serves these at a relative /api/* path. On a static
// host (GitHub Pages) there's no relay, so we fall back to the Vercel
// serverless functions, which hold the secrets and allow cross-origin. On the
// kiosk the relative call succeeds first, so the fallback never fires.
const FALLBACK_ORIGIN = 'https://dail-phi.vercel.app'

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    const r = await fetch(path, init)
    if (r.ok) return r
  } catch {
    /* relative call unavailable (static host) — fall through */
  }
  return fetch(FALLBACK_ORIGIN + path, init)
}
