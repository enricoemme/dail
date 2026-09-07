import { useLayoutEffect, type ReactNode } from 'react'

/** Mount each screen once so outgoing screens cannot restart audio or timers. */
export function Stage({ stepKey, children }: { stepKey: string; children: ReactNode }) {
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [stepKey])
  return (
    <div className="stage">
      <div key={stepKey} className="stage-layer stage-entering">
        {children}
      </div>
    </div>
  )
}
