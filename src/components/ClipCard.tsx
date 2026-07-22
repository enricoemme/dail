import { useEffect, useState } from 'react'
import type { ClipPlayer } from '../lib/audio/clipPlayer'
import type { GridClip } from '../types'
import { AudioWaveform } from './AudioWaveform'

interface Props {
  player: ClipPlayer
  clip: GridClip
  index: number
  onMark: (mark: boolean) => void
  /** Hide the yes/no controls (used when replaying real clips on the riddle). */
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
        <span className="clip-play-icon">{playing ? '❚❚' : '▶'}</span>
        <AudioWaveform player={player} clipId={clip.id} seed={clip.id + index} />
      </button>

      {!readOnly && (
        <div className="yesno">
          <button
            className={'yesno-opt' + (clip.mark === true ? ' yesno-on' : '')}
            onClick={() => onMark(true)}
          >
            yes
          </button>
          <span className="yesno-slash">/</span>
          <button
            className={'yesno-opt' + (clip.mark === false ? ' yesno-on' : '')}
            onClick={() => onMark(false)}
          >
            no
          </button>
        </div>
      )}
    </div>
  )
}
