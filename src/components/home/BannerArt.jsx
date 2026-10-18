import { useId, useMemo } from 'react'
import { LayerShape } from '@/components/home/BannerShapes'
import { shapesAlign } from '@/lib/bannerDesign'

const W = 1200
const H = 360

// Wavy contour lines like the ones on a chart, drawn from a formula. `step` is the gap between lines.
function contourLines(step, phase = 0, wobble = 1) {
  const out = []
  const count = Math.ceil((H - 30) / step) + 1
  for (let i = 0; i < count; i++) {
    const y0 = 30 + i * step
    let d = ''
    for (let x = 0; x <= W; x += 20) {
      const y = y0 + 16 * wobble * Math.sin(x / 170 + i * 0.55 + phase) + 7 * wobble * Math.sin(x / 63 + i * 1.3 + phase)
      d += `${x === 0 ? 'M' : ' L'}${x},${y.toFixed(1)}`
    }
    out.push(d)
  }
  return out
}

function sunburstRays(scale) {
  const n = Math.max(8, Math.round(22 / scale)) * 2
  const ox = 900
  const oy = 420
  const R = 1600
  const rays = []
  for (let i = 0; i < n; i += 2) {
    const a0 = Math.PI + (i / n) * Math.PI
    const a1 = Math.PI + ((i + 1) / n) * Math.PI
    rays.push(`M${ox},${oy} L${(ox + R * Math.cos(a0)).toFixed(1)},${(oy + R * Math.sin(a0)).toFixed(1)} L${(ox + R * Math.cos(a1)).toFixed(1)},${(oy + R * Math.sin(a1)).toFixed(1)} Z`)
  }
  return rays
}

// The banner's background art for a design: a pattern, the contour lines and the shapes on top. Static, decorative, hidden from assistive
// technology. Colours and numbers come from a validated design, so nothing here is ever markup from a person.
export default function BannerArt({ design }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { pattern, contours } = design
  const s = pattern.scale
  const lineCount = [0, 9, 13, 19][contours.density] || 13
  const lines = useMemo(() => contourLines((H - 40) / lineCount), [lineCount])
  const topo = useMemo(() => (pattern.type === 'topo' ? contourLines(20 * s, 1.7, 1.4) : []), [pattern.type, s])
  const rays = useMemo(() => (pattern.type === 'sunburst' ? sunburstRays(s) : []), [pattern.type, s])
  const pid = `bp${uid}`
  const stroke = { fill: 'none', stroke: pattern.color }

  return (
    <>
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        {pattern.type === 'dots' && (
          <pattern id={pid} width={26 * s} height={26 * s} patternUnits="userSpaceOnUse"><circle cx={13 * s} cy={13 * s} r={2.4 * s} fill={pattern.color} /></pattern>
        )}
        {pattern.type === 'stripes' && (
          <pattern id={pid} width={22 * s} height={22 * s} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width={7 * s} height={22 * s} fill={pattern.color} /></pattern>
        )}
        {pattern.type === 'waves' && (
          <pattern id={pid} width={48 * s} height={22 * s} patternUnits="userSpaceOnUse"><path d={`M0,${11 * s} Q${12 * s},0 ${24 * s},${11 * s} T${48 * s},${11 * s}`} {...stroke} strokeWidth="1.6" /></pattern>
        )}
        {pattern.type === 'grid' && (
          <pattern id={pid} width={36 * s} height={36 * s} patternUnits="userSpaceOnUse"><path d={`M${36 * s},0 L0,0 L0,${36 * s}`} {...stroke} strokeWidth="1" /></pattern>
        )}
        {pattern.type === 'chevrons' && (
          <pattern id={pid} width={40 * s} height={26 * s} patternUnits="userSpaceOnUse"><path d={`M0,${20 * s} L${20 * s},${6 * s} L${40 * s},${20 * s}`} {...stroke} strokeWidth="2" /></pattern>
        )}
      </defs>

      {['dots', 'stripes', 'waves', 'grid', 'chevrons'].includes(pattern.type) && <rect width={W} height={H} fill={`url(#${pid})`} opacity={pattern.opacity} />}
      {pattern.type === 'sunburst' && <g fill={pattern.color} opacity={pattern.opacity}>{rays.map((d, i) => <path key={i} d={d} />)}</g>}
      {pattern.type === 'topo' && (
        <g {...stroke} strokeWidth="1.2" opacity={Math.min(1, pattern.opacity * 2.5)}>{topo.map((d, i) => <path key={i} d={d} />)}</g>
      )}

      {contours.on && (
        <g fill="none" stroke={contours.color} strokeWidth="1">
          {lines.map((d, i) => <path key={i} d={d} strokeOpacity={Math.max(contours.opacity - i * 0.004, 0.03)} />)}
        </g>
      )}

    </svg>
    {design.layers?.length > 0 && (
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio={shapesAlign(design.layout)} aria-hidden="true">
        {design.layers.map((l) => <LayerShape key={l.id} layer={l} uid={uid} />)}
      </svg>
    )}
    </>
  )
}
