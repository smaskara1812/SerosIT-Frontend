import { useId, useMemo } from 'react'
import { BANNER_H, BANNER_W, contourLines, sunburstRays } from '@/lib/bannerPattern'

// A banner's pattern (dots, stripes, waves, grid, chevrons, sunburst or contours) as SVG shapes to place inside an <svg> that is `w` x `h`. `id` keeps the tile's name unique on
// the page. Nothing here is markup from a person: the colours and numbers come from a validated design.
export function PatternShapes({ pattern, w = BANNER_W, h = BANNER_H, id, sunburst }) {
  const s = pattern.scale
  const topo = useMemo(() => (pattern.type === 'topo' ? contourLines(20 * s, 1.7, 1.4, w, h) : []), [pattern.type, s, w, h])
  const rays = useMemo(() => (pattern.type === 'sunburst' ? sunburstRays(s, sunburst) : []), [pattern.type, s, sunburst])
  const stroke = { fill: 'none', stroke: pattern.color }
  return (
    <>
      <defs>
        {pattern.type === 'dots' && (
          <pattern id={id} width={26 * s} height={26 * s} patternUnits="userSpaceOnUse"><circle cx={13 * s} cy={13 * s} r={2.4 * s} fill={pattern.color} /></pattern>
        )}
        {pattern.type === 'stripes' && (
          <pattern id={id} width={22 * s} height={22 * s} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width={7 * s} height={22 * s} fill={pattern.color} /></pattern>
        )}
        {pattern.type === 'waves' && (
          <pattern id={id} width={48 * s} height={22 * s} patternUnits="userSpaceOnUse"><path d={`M0,${11 * s} Q${12 * s},0 ${24 * s},${11 * s} T${48 * s},${11 * s}`} {...stroke} strokeWidth="1.6" /></pattern>
        )}
        {pattern.type === 'grid' && (
          <pattern id={id} width={36 * s} height={36 * s} patternUnits="userSpaceOnUse"><path d={`M${36 * s},0 L0,0 L0,${36 * s}`} {...stroke} strokeWidth="1" /></pattern>
        )}
        {pattern.type === 'chevrons' && (
          <pattern id={id} width={40 * s} height={26 * s} patternUnits="userSpaceOnUse"><path d={`M0,${20 * s} L${20 * s},${6 * s} L${40 * s},${20 * s}`} {...stroke} strokeWidth="2" /></pattern>
        )}
      </defs>
      {['dots', 'stripes', 'waves', 'grid', 'chevrons'].includes(pattern.type) && <rect width={w} height={h} fill={`url(#${id})`} opacity={pattern.opacity} />}
      {pattern.type === 'sunburst' && <g fill={pattern.color} opacity={pattern.opacity}>{rays.map((d, i) => <path key={i} d={d} />)}</g>}
      {pattern.type === 'topo' && (
        <g {...stroke} strokeWidth="1.2" opacity={Math.min(1, pattern.opacity * 2.5)}>{topo.map((d, i) => <path key={i} d={d} />)}</g>
      )}
    </>
  )
}

const SIDE_W = 240
const SIDE_H = 900

// The pattern for the app's sidebar when a live banner includes it. It is always the same quiet one, whatever the banner's own pattern is: small, widely spaced dots in the
// sidebar's text colour at very low strength, so the menu stays easy to read. `fg` is the sidebar's text colour as an "r g b" triple (white on dark, navy on light).
const QUIET = { type: 'dots', scale: 1.15, opacity: 0.09 }

export default function SidebarPattern({ fg = '255 255 255', className = 'absolute inset-0 h-full w-full' }) {
  const id = `sp${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const pattern = { ...QUIET, color: `rgb(${fg})` }
  return (
    <svg className={className} viewBox={`0 0 ${SIDE_W} ${SIDE_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <PatternShapes pattern={pattern} w={SIDE_W} h={SIDE_H} id={id} />
    </svg>
  )
}
