import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  /** Unique key per screen. Changing it triggers the slide transition. */
  stepKey: string
  children: ReactNode
}

/**
 * Animated screen swapper. The current layer always renders live children (so
 * in-screen state like a selected answer updates immediately); when stepKey
 * changes, a frozen snapshot of the outgoing screen slides out while the new
 * one slides in.
 */
export function Stage({ stepKey, children }: Props) {
  const [prev, setPrev] = useState<{ key: string; node: ReactNode } | null>(null)

  const committedKeyRef = useRef(stepKey)
  const committedNodeRef = useRef<ReactNode>(children)

  // Transition effect — runs only when the step actually changes. At this
  // point committedNodeRef still holds the PREVIOUS render's children (the
  // commit effect below hasn't run yet for this render).
  useEffect(() => {
    if (stepKey !== committedKeyRef.current) {
      setPrev({ key: committedKeyRef.current, node: committedNodeRef.current })
      committedKeyRef.current = stepKey
      const t = window.setTimeout(() => setPrev(null), 640)
      return () => window.clearTimeout(t)
    }
  }, [stepKey])

  // Commit effect — runs every render, after the transition effect, recording
  // the latest children as "what's on screen now".
  useEffect(() => {
    committedNodeRef.current = children
  })

  return (
    <div className="stage" data-animating={prev ? '' : undefined}>
      {prev && (
        <div key={'p-' + prev.key} className="stage-layer stage-leaving">
          {prev.node}
        </div>
      )}
      <div key={'c-' + stepKey} className="stage-layer stage-entering">
        {children}
      </div>
    </div>
  )
}
