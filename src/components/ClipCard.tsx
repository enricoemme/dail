import { useEffect, useState } from 'react'
import type { ClipPlayer } from '../lib/audio/clipPlayer'
import type { GridClip } from '../types'
import { sfx } from '../lib/audio/sfx'
import { AudioWaveform } from './AudioWaveform'

interface Props {
  player: ClipPlayer
  clip: GridClip
  index: number
  onMark: (mark: boolean) => void
  /** Hide the verdict controls (used when replaying clips on later screens). */
  readOnly?: boolean
  /** Whether the team has listened to this clip (ticks the clip number). */
  heard?: boolean
  /** Confirmed fake: glows green, controls disabled. */
  locked?: boolean
}

export function ClipCard({ player, clip, index, onMark, readOnly, heard, locked }: Props) {
  const [playing, setPlaying] = useState(player.currentId === clip.id)

  useEffect(() => player.onChange(() => setPlaying(player.currentId === clip.id)), [player, clip.id])

  const rowClass = locked
    ? ' clip-row-locked'
    : !readOnly && clip.mark !== null
      ? clip.mark ? ' clip-row-real' : ' clip-row-ai'
      : ''

  return (
    <div className={'clip-row' + (playing ? ' clip-row-playing' : '') + rowClass}>
      <button
        className={'clip-box' + (playing ? ' clip-box-playing' : '')}
        onClick={() => player.toggle(clip.id, clip.file)}
        aria-label={playing ? 'Stop clip' : 'Play clip'}
      >
        {!readOnly && (
          <span className={'clip-num' + (heard ? ' clip-num-heard' : '')} title={heard ? 'Listened' : undefined}>
            {index + 1}
          </span>
        )}
        <span className="clip-play-icon">{playing ? '❚❚' : '▶'}</span>
        <AudioWaveform player={player} clipId={clip.id} seed={clip.id + index} />
      </button>

      {!readOnly && (
        <div className={'verdict-toggle' + (locked ? ' verdict-locked' : '')}>
          <button
            className={'vt-opt vt-real' + (clip.mark === true ? ' vt-on' : '')}
            disabled={locked}
            onClick={() => { sfx.chooseReal(); onMark(true) }}
          >
            Real
          </button>
          <button
            className={'vt-opt vt-ai' + (clip.mark === false ? ' vt-on' : '')}
            disabled={locked}
            onClick={() => { sfx.chooseAI(); onMark(false) }}
          >
            {locked ? 'AI identified ✓' : 'AI'}
          </button>
        </div>
      )}
    </div>
  )
}
