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
  /** Hide the verdict controls (used when replaying real clips on the riddle). */
  readOnly?: boolean
}

export function ClipCard({ player, clip, index, onMark, readOnly }: Props) {
  const [playing, setPlaying] = useState(player.currentId === clip.id)

  useEffect(() => player.onChange(() => setPlaying(player.currentId === clip.id)), [player, clip.id])

  return (
    <div className={'clip-row' + (playing ? ' clip-row-playing' : '')}>
      <button
        className={'clip-box' + (playing ? ' clip-box-playing' : '')}
        onClick={() => player.toggle(clip.id, clip.file)}
        aria-label={playing ? 'Stop clip' : 'Play clip'}
      >
        {!readOnly && <span className="clip-num">{index + 1}</span>}
        <span className="clip-play-icon">{playing ? '❚❚' : '▶'}</span>
        <AudioWaveform player={player} clipId={clip.id} seed={clip.id + index} />
      </button>

      {!readOnly && (
        <div className="verdict-toggle">
          <button
            className={'vt-opt vt-real' + (clip.mark === true ? ' vt-on' : '')}
            onClick={() => { sfx.chooseReal(); onMark(true) }}
          >
            Real
          </button>
          <button
            className={'vt-opt vt-ai' + (clip.mark === false ? ' vt-on' : '')}
            onClick={() => { sfx.chooseAI(); onMark(false) }}
          >
            AI
          </button>
        </div>
      )}
    </div>
  )
}
