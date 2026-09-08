import { useId } from 'react'

/** Dale stays still; the shared page filter supplies the interference. */
export function DailPortrait() {
  const glowId = useId()

  return (
    <div className="brief-portrait" aria-hidden="true">
      <div className="portrait-tilt">
        <img className="portrait-base" src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />
        <svg className="portrait-eye" viewBox="0 0 760 1013" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs><radialGradient id={glowId}>
            <stop offset="0" stopColor="#b8f5ff" stopOpacity="0.85" />
            <stop offset="0.28" stopColor="#36caff" stopOpacity="0.65" />
            <stop offset="0.6" stopColor="#008dff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#008dff" stopOpacity="0" />
          </radialGradient></defs>
          <g>
            <ellipse cx="450" cy="275" rx="30" ry="21" fill={`url(#${glowId})`} />
            <ellipse cx="450" cy="275" rx="3.5" ry="2.5" fill="#c6f8ff" opacity="0.4" />
          </g>
        </svg>
        <span className="portrait-light" />
      </div>
    </div>
  )
}
