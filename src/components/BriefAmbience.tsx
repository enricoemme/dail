import { useEffect, useRef, useState } from 'react'
import { sfx } from '../lib/audio/sfx'
import { musicStatus } from '../lib/audio/musicStatus'

export function BriefAmbience({ leaving }: { leaving: boolean }) {
  const audio = useRef<HTMLAudioElement>(null)
  const departing = useRef(leaving)
  departing.current = leaving
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const track = audio.current!
    let alive = true
    const start = () => {
      if (!alive || departing.current) return
      if (sfx.muted) { musicStatus.set('muted'); return }
      if (!track.paused) return
      void track.play().catch((error: unknown) => {
        if (!alive || departing.current || !track.paused) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        musicStatus.set(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'error')
      })
    }
    const sync = () => { track.muted = sfx.muted; musicStatus.set(sfx.muted ? 'muted' : track.paused ? 'loading' : 'playing'); if (!sfx.muted) start() }
    const visibility = () => { if (!document.hidden) start() }
    const onPlay = () => { if (alive) { setPlaying(true); musicStatus.set(sfx.muted ? 'muted' : 'playing') } }
    const onError = () => musicStatus.set('error')
    const onWaiting = () => { if (!track.paused && !sfx.muted) musicStatus.set('loading') }
    const retry = () => {
      if (track.error) { musicStatus.set('loading'); track.load() }
      sfx.setMuted(false)
      start()
    }
    musicStatus.set(sfx.muted ? 'muted' : 'loading')
    const onPause = () => { if (alive) { setPlaying(false); start() } }
    track.muted = sfx.muted
    track.volume = .45
    track.addEventListener('canplay', start)
    track.addEventListener('playing', onPlay)
    track.addEventListener('error', onError)
    track.addEventListener('waiting', onWaiting)
    window.addEventListener('dail-music-retry', retry)
    track.addEventListener('pause', onPause)
    window.addEventListener('click', start, true)
    window.addEventListener('touchend', start, true)
    window.addEventListener('pointerdown', start)
    window.addEventListener('pointerup', start)
    window.addEventListener('keydown', start)
    window.addEventListener('dail-mute-change', sync)
    document.addEventListener('visibilitychange', visibility)
    start()
    return () => {
      alive = false
      track.pause()
      track.removeEventListener('canplay', start)
      track.removeEventListener('playing', onPlay)
      track.removeEventListener('error', onError)
      track.removeEventListener('waiting', onWaiting)
      window.removeEventListener('dail-music-retry', retry)
      musicStatus.set('inactive')
      track.removeEventListener('pause', onPause)
      window.removeEventListener('click', start, true)
      window.removeEventListener('touchend', start, true)
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('pointerup', start)
      window.removeEventListener('keydown', start)
      window.removeEventListener('dail-mute-change', sync)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  useEffect(() => {
    const track = audio.current!
    const from = track.volume
    const target = leaving ? 0 : .45
    const start = performance.now()
    let frame = 0
    const fade = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start) / (leaving ? 700 : 1400)))
      track.volume = from + (target - from) * progress
      if (progress < 1) frame = requestAnimationFrame(fade)
      else if (leaving) track.pause()
    }
    frame = requestAnimationFrame(fade)
    return () => cancelAnimationFrame(frame)
  }, [playing, leaving])
  return <audio ref={audio} src={`${import.meta.env.BASE_URL}sfx/brief-music.mp3`} autoPlay muted={sfx.muted} loop preload="auto" />
}
