import { useId } from 'react'
import { shapeSpec } from '@/lib/bannerShapes'

// Border strips along the top or bottom edge of a banner. Each is one repeating tile, so it runs the whole width of the banner
// whatever the screen, instead of stopping where a fixed drawing ends. Sizes are in screen pixels. A bottom strip is the top
// one turned upside down, so flags, lanterns and icicles point up from the foot.
const LOOPS = 2 // sagging loops per tile
const PER = 6 // items per loop (12 per tile, so one to four colours repeat evenly)

const star = (cx, cy, R, r) => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 ? r : R
    d += `${i ? 'L' : 'M'}${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`
  }
  return d + 'Z'
}

function build(edge) {
  const { type, size: S, colors } = edge
  const gap = edge.spacing ?? 1
  const pick = (i) => colors[i % colors.length]
  const loopW = S * PER * 0.85 * gap
  const P = loopW * LOOPS
  const itemW = loopW / PER
  const r = S * 0.34
  const amp = Math.max(4, S - 2 * r - 3)
  const out = []
  const sagString = (l, y0, depth, colour) => (
    <path key={`s${l}`} d={`M${l * loopW},${y0} Q${l * loopW + loopW / 2},${y0 + depth * 2} ${(l + 1) * loopW},${y0}`} fill="none" stroke={colour} strokeWidth="1.6" strokeOpacity="0.8" />
  )

  for (let l = 0; l < LOOPS; l++) {
    const x0 = l * loopW
    if (type === 'garland') out.push(sagString(l, r, amp, '#166534'))
    if (['bunting', 'lights', 'lanterns', 'toran'].includes(type)) out.push(sagString(l, 3, type === 'toran' ? 0 : amp, '#475569'))
    for (let k = 0; k < PER; k++) {
      const i = l * PER + k
      const t = (k + 0.5) / PER
      const x = x0 + t * loopW
      const sag = Math.sin(Math.PI * t)
      if (type === 'garland') {
        const spec = shapeSpec({ type: 'flower' })
        out.push(
          <g key={i} transform={`translate(${x} ${r + amp * sag}) rotate(${(i * 37) % 60})`}>
            <path d={spec.d} fill={pick(i)} fillRule={spec.evenodd ? 'evenodd' : undefined} transform={spec.unit ? `scale(${r * 2} ${r * 2})` : undefined} />
            <circle r={r * 0.24} fill="#7c2d12" fillOpacity="0.55" />
          </g>,
        )
      } else if (type === 'bunting') {
        const y = 3 + amp * sag
        const w = itemW * 0.72
        out.push(<path key={i} d={`M${x - w / 2},${y} L${x + w / 2},${y} L${x},${y + S * 0.62} Z`} fill={pick(i)} />)
      } else if (type === 'lights') {
        const y = 3 + amp * sag
        out.push(
          <g key={i}>
            <rect x={x - 2} y={y} width="4" height="5" rx="1" fill="#475569" />
            <circle cx={x} cy={y + 5 + S * 0.16} r={S * 0.16 + 1.5} fill={pick(i)} />
            <circle cx={x} cy={y + 5 + S * 0.16} r={S * 0.3} fill={pick(i)} fillOpacity="0.22" />
          </g>,
        )
      } else if (type === 'lanterns') {
        const y = 3 + amp * sag * 0.8
        const w = Math.min(itemW * 0.55, S * 0.4)
        const h = S * 0.5
        out.push(
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={y + 4} stroke="#475569" strokeWidth="1.4" />
            <rect x={x - w / 2 + 2} y={y + 3} width={w - 4} height="3" rx="1" fill="#b45309" />
            <rect x={x - w / 2} y={y + 6} width={w} height={h} rx={w * 0.38} fill={pick(i)} />
            <ellipse cx={x} cy={y + 6 + h / 2} rx={w * 0.14} ry={h * 0.42} fill="#fff" fillOpacity="0.35" />
          </g>,
        )
      } else if (type === 'toran') {
        const len = S * (0.62 + 0.12 * (k % 2))
        const w = itemW * 0.42
        out.push(
          <g key={i}>
            <path d={`M${x},3 C${x - w},${len * 0.35} ${x - w * 0.5},${len * 0.8} ${x},${len + 3} C${x + w * 0.5},${len * 0.8} ${x + w},${len * 0.35} ${x},3 Z`} fill={pick(i)} />
            <line x1={x} y1="3" x2={x} y2={len * 0.85} stroke="#fff" strokeOpacity="0.3" strokeWidth="1" />
            <circle cx={x + itemW / 2} cy="4" r="2.6" fill="#fbbf24" />
          </g>,
        )
      } else if (type === 'pearls') {
        for (let m = 0; m < 2; m++) {
          const tt = (k + m / 2 + 0.25) / PER
          const px = x0 + tt * loopW
          out.push(<circle key={`${i}-${m}`} cx={px} cy={r * 0.6 + amp * 0.85 * Math.sin(Math.PI * tt)} r={Math.max(2.5, S * (m ? 0.1 : 0.14))} fill={pick(i + m)} />)
        }
      } else if (type === 'icicles') {
        const len = S * [1, 0.55, 0.8, 0.45, 0.92, 0.65][k]
        const w = itemW * 0.8
        out.push(<path key={i} d={`M${x - w / 2},${S * 0.1} L${x + w / 2},${S * 0.1} L${x + w * 0.05},${len} Z`} fill={pick(i)} />)
      } else if (type === 'zigzag') {
        const w = itemW
        out.push(<path key={i} d={`M${x - w / 2},0 L${x + w / 2},0 L${x},${S * 0.8} Z`} fill={pick(i)} />)
      } else if (type === 'stars') {
        const R = S * (0.2 + 0.1 * (k % 3) / 2)
        out.push(<path key={i} d={star(x, S * 0.5 + Math.sin(i * 1.7) * S * 0.18, R, R * 0.45)} fill={pick(i)} />)
      } else if (type === 'diamonds') {
        const hw = Math.min(itemW * 0.32, S * 0.3)
        const hh = S * 0.34
        const cy = S * 0.5
        out.push(
          <g key={i}>
            <path d={`M${x},${cy - hh} L${x + hw},${cy} L${x},${cy + hh} L${x - hw},${cy} Z`} fill={pick(i)} />
            <circle cx={x + itemW / 2} cy={cy} r={Math.max(1.8, S * 0.06)} fill={pick(i + 1)} />
          </g>,
        )
      } else if (type === 'scallop') {
        out.push(<circle key={i} cx={x} cy={S * 0.45} r={itemW * 0.5} fill={colors[0]} />)
      }
    }
  }
  if (type === 'scallop') out.unshift(<rect key="b" x="0" y="0" width={P} height={S * 0.45} fill={colors[0]} />)
  if (type === 'icicles') out.unshift(<rect key="b" x="0" y="0" width={P} height={S * 0.14} fill={colors[0]} />)
  if (type === 'zigzag') out.unshift(<rect key="b" x="0" y="0" width={P} height={S * 0.12} fill={colors[0]} />)
  if (type === 'waves') {
    const w = P / 4
    const wave = (y, a, fill, op, off) => {
      let d = `M${off - w},${y}`
      for (let m = 0; m < 6; m++) d += ` Q${off - w + m * w + w / 4},${y - a} ${off - w + m * w + w / 2},${y} T${off - w + (m + 1) * w},${y}`
      return <path key={`${y}${off}`} d={`${d} L${off + 6 * w},0 L${off - w},0 Z`} fill={fill} fillOpacity={op} />
    }
    out.push(wave(S * 0.78, S * 0.3, colors[1] || colors[0], colors[1] ? 1 : 0.45, w / 2), wave(S * 0.55, S * 0.3, colors[0], 1, 0))
  }
  if (type === 'bands') {
    const h = S / colors.length
    colors.forEach((c, i) => out.push(<rect key={i} x="0" y={i * h} width={P} height={h + 0.5} fill={c} />))
  }
  return { P, content: <>{out}</> }
}

function Strip({ edge, uid, index }) {
  const { P, content } = build(edge)
  const id = `be${uid}${index}`
  const bottom = edge.edge === 'bottom'
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 w-full"
      style={{ [bottom ? 'bottom' : 'top']: 0, height: edge.size, opacity: edge.opacity, transform: bottom ? 'scaleY(-1)' : undefined }}
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={P} height={edge.size} patternUnits="userSpaceOnUse" overflow="hidden">{content}</pattern>
      </defs>
      <rect width="100%" height={edge.size} fill={`url(#${id})`} />
    </svg>
  )
}

export default function BannerEdges({ edges }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  if (!edges?.length) return null
  return edges.map((e, i) => <Strip key={i} edge={e} uid={uid} index={i} />)
}
