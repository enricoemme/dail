export type MusicStatus = 'inactive' | 'loading' | 'playing' | 'muted' | 'blocked' | 'error'
let status: MusicStatus = 'inactive'
export const musicStatus = {
  get: () => status,
  set(next: MusicStatus) {
    status = next
    window.dispatchEvent(new Event('dail-music-status'))
  },
}
export const MUSIC_LABELS: Record<MusicStatus, string> = {
  inactive: 'Music: main page only',
  loading: 'Music: loading…',
  playing: 'Music: playing',
  muted: 'Music: muted in settings',
  blocked: 'Music: autoplay blocked by browser',
  error: 'Music: file could not play',
}
