import { useEffect, useRef, useState } from 'react'
import { sfx } from '../lib/audio/sfx'
import { musicStatus } from '../lib/audio/musicStatus'

// Background briefing music. It plays UNMUTED as soon as the player interacts
// (mouse move / click / key / touch). Note a bare mouse-move is not a
// "user gesture" in a normal browser, so on load it starts on the first
// click; launch the kiosk Chrome with --autoplay-policy=no-user-gesture-required
// and it starts unmuted on the very first mouse-move (or immediately).
export function BriefAmbience({ leaving }: { leaving: boolean }) {
  const audio = useRef<HTMLAudioElement>(null)
  const departing = useRef(leaving)
  departing.current = leaving
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const track = audio.current!
    let alive = true

    const INTERACTIONS = ['mousemove', 'pointermove', 'pointerdown', 'pointerup', 'click', 'touchstart', 'keydown', 'wheel', 'scroll']
    const removeInteractions = () =>
      INTERACTIONS.forEach((e) => window.removeEventListener(e, play, true))

    function play() {
      if (!alive || departing.current || sfx.muted || !track.paused) return
      track.muted = false
      void track.play().catch((error: unknown) => {
        if (!alive || departing.current || !track.paused) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Browser refused (e.g. no gesture yet) — a later interaction retries.
        musicStatus.set(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'error')
      })
    }

    const status = () => musicStatus.set(sfx.muted ? 'muted' : track.paused ? 'blocked' : 'playing')
    const onPlay = () => { if (alive) { setPlaying(true); removeInteractions(); status() } }
    const onPause = () => { if (alive) { setPlaying(false); play() } }
    const onError = () => musicStatus.set('error')
    const onWaiting = () => { if (!track.paused && !sfx.muted) musicStatus.set('loading') }
    const onVisibility = () => { if (!document.hidden) play() }
    const onMuteChange = () => { track.muted = sfx.muted; if (sfx.muted) track.pause(); else play(); status() }
    const onRetry = () => { if (track.error) track.load(); sfx.setMuted(false); play() }

    track.volume = 0.45
    track.muted = sfx.muted
    musicStatus.set(sfx.muted ? 'muted' : 'loading')
    play() // starts immediately when autoplay is permitted (kiosk flag)

    track.addEventListener('canplay', play)
    track.addEventListener('playing', onPlay)
    track.addEventListener('pause', onPause)
    track.addEventListener('error', onError)
    track.addEventListener('waiting', onWaiting)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('dail-mute-change', onMuteChange)
    window.addEventListener('dail-music-retry', onRetry)
    INTERACTIONS.forEach((e) => window.addEventListener(e, play, true))

    return () => {
      alive = false
      track.pause()
      track.removeEventListener('canplay', play)
      track.removeEventListener('playing', onPlay)
      track.removeEventListener('pause', onPause)
      track.removeEventListener('error', onError)
      track.removeEventListener('waiting', onWaiting)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('dail-mute-change', onMuteChange)
      window.removeEventListener('dail-music-retry', onRetry)
      removeInteractions()
      musicStatus.set('inactive')
    }
  }, [])

  useEffect(() => {
    const track = audio.current!
    const from = track.volume
    const target = leaving ? 0 : 0.45
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

  return <audio ref={audio} src={`${import.meta.env.BASE_URL}sfx/brief-music.mp3`} loop preload="auto" />
}
