// Leaderboard persistence (localStorage) and CSV export for the end-of-day
// winner announcement.

import type { LeaderboardEntry } from '../types'

const STORAGE_KEY = 'human-or-not-leaderboard-v1'

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Rank: score desc, then total time asc. */
export function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.score - a.score || a.totalMs - b.totalMs)
}

/** Save an entry and return its 1-based leaderboard position. */
export function saveEntry(entry: LeaderboardEntry): number {
  const entries = loadLeaderboard()
  entries.push(entry)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (err) {
    console.error('Could not persist leaderboard:', err)
  }
  const ranked = sortEntries(entries)
  return ranked.findIndex((e) => e === entries[entries.length - 1]) + 1 || ranked.length
}

export function clearLeaderboard(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${m}:${String(s).padStart(2, '0')}.${tenths}`
}

export function downloadCsv(): void {
  const ranked = sortEntries(loadLeaderboard())
  const header = [
    'rank', 'name', 'score', 'total_time', 'total_ms',
    'round1', 'round2', 'round3', 'round4', 'round5', 'played_at',
  ]
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const rows = ranked.map((e, i) => {
    const perRound = Array.from({ length: 5 }, (_, r) => {
      const res = e.perRound[r]
      if (!res) return ''
      return `${res.skipped ? 'skipped' : res.won ? 'won' : 'lost'} (${formatMs(res.ms)})`
    })
    return [
      String(i + 1), e.name, String(e.score), formatMs(e.totalMs), String(e.totalMs),
      ...perRound, e.playedAt,
    ].map(escape).join(',')
  })
  const csv = [header.join(','), ...rows].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `human-or-not-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
