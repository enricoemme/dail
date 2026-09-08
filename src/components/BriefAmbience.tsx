import { useEffect, useRef, useState } from 'react'
import { sfx } from '../lib/audio/sfx'

export function BriefAmbience({ leaving }: { leaving: boolean }) {
  const audio = useRef<HTMLAudioElement>(null)
  const departing = useRef(leaving)
  departing.current = leaving
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const track = audio.current!
    let alive = true
    const start = () => {
      if (sfx.muted || departing.current || !track.paused) return
      void track.play().catch(() => { /* Retry on interaction when autoplay is blocked. */ })
    }
    const sync = () => { track.muted = sfx.muted; if (!sfx.muted) start() }
    const visibility = () => { if (!document.hidden) start() }
    const onPlay = () => { if (alive) setPlaying(true) }
    const onPause = () => { if (alive) { setPlaying(false); start() } }
    track.muted = sfx.muted
    track.volume = .45
    track.addEventListener('canplay', start)
    track.addEventListener('play', onPlay)
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
      track.removeEventListener('play', onPlay)
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
