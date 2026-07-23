interface Props {
  /** 0..1 journey progress — the ocean darkens as the team descends. */
  depth: number
}

/**
 * The living ocean behind every screen: a deep-water gradient that fades in
 * with progress (you sink as the case deepens) and soft animated sunlight
 * rays near the surface that weaken the further down you go.
 */
export function Backdrop({ depth }: Props) {
  const d = Math.min(1, Math.max(0, depth))
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="ocean-deep" style={{ opacity: d * 0.88 }} />
      <div className="rays" style={{ opacity: Math.max(0.12, 0.55 - d * 0.45) }}>
        <div className="ray-layer ray-a" />
        <div className="ray-layer ray-b" />
      </div>
    </div>
  )
}
