import { createPortal } from 'react-dom'

/** A single smooth displacement wave across the entire game viewport. */
export function TakeoverWave({ warning }: { warning: boolean }) {
  return createPortal(<div className="takeover-viewport" aria-hidden="true">
    <svg width="0" height="0"><defs>
      <filter id="takeover-wave" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0 .012" numOctaves="1" seed="8" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="B">
          <animate attributeName="scale" values="0;7;4;0" keyTimes="0;.35;.65;1" dur="1.9s" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1" fill="freeze" />
        </feDisplacementMap>
      </filter>
    </defs></svg>
    {warning && <div className="takeover-warning">SIGNAL COMPROMISED</div>}
  </div>, document.body)
}
