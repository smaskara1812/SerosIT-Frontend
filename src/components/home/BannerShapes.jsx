import { FONTS, shapeInfo, shapeSpec } from '@/lib/bannerShapes'
import { fillTokens } from '@/lib/bannerDesign'
import { ARTBOX, artPieces, isArt } from '@/lib/bannerArt'

// One shape of a design, drawn on the banner's 1200 x 360 canvas. All numbers come from a validated design. A shape can be
// a blend of two colours and can have an outline; a text label is drawn as real text. `uid` keeps the blend's id unique
// when several banners are on one page.
export function LayerShape({ layer, uid = 'x' }) {
  if (isArt(layer.type)) {
    const box = ARTBOX[layer.type]
    const pieces = artPieces(layer.type).map((p, i) => {
      const gid = `a${uid}${layer.id}${i}`.replace(/[^a-zA-Z0-9_-]/g, '')
      return (
        <g key={i}>
          {p.grad && (
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2={p.grad[2]} y2={p.grad[3]}>
                <stop offset="0" stopColor={p.grad[0]} />
                <stop offset="1" stopColor={p.grad[1]} />
              </linearGradient>
            </defs>
          )}
          {p.gd && (
            <defs>
              {p.gd.kind === 'radial' ? (
                <radialGradient id={gid} cx="0.5" cy="0.5" r="0.5">{p.gd.stops.map(([o, c, a], k) => <stop key={k} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}</radialGradient>
              ) : (
                <linearGradient id={gid} x1={p.gd.x1} y1={p.gd.y1} x2={p.gd.x2} y2={p.gd.y2}>{p.gd.stops.map(([o, c, a], k) => <stop key={k} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}</linearGradient>
              )}
            </defs>
          )}
          <path d={p.d} transform={p.t} opacity={p.op} fill={p.grad || p.gd ? `url(#${gid})` : p.fill} stroke={p.stroke} strokeWidth={p.sw} strokeDasharray={p.dash} strokeLinejoin="round" strokeLinecap={p.round ? 'round' : undefined} />
        </g>
      )
    })
    return (
      <g transform={`translate(${layer.x} ${layer.y}) rotate(${layer.rot || 0})`} opacity={layer.opacity ?? 1}>
        {box ? <g transform={`scale(${layer.w / box[0]} ${layer.h / box[1]}) translate(${-(box[0] / 2 + (box[2] || 0))} ${-(box[1] / 2 + (box[3] || 0))})`}>{pieces}</g> : <g transform={`scale(${layer.w} ${layer.h})`}>{pieces}</g>}
      </g>
    )
  }
  const spec = shapeSpec(layer)
  const gid = `g${uid}${layer.id}`.replace(/[^a-zA-Z0-9_-]/g, '')
  const blend = layer.fill2 ? gid : null
  const paint = blend ? `url(#${gid})` : layer.fill
  const outline = layer.stroke ? { stroke: layer.stroke, strokeWidth: layer.sw ?? 4, vectorEffect: 'non-scaling-stroke', strokeLinejoin: 'round', paintOrder: 'stroke' } : {}

  // The blend runs across the shape at the chosen angle, in the shape's own units.
  let gradient = null
  if (blend) {
    const unit = spec.unit
    const w = unit ? 1 : layer.w
    const h = unit ? 1 : layer.h
    const a = ((layer.grad ?? 90) * Math.PI) / 180
    const len = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2
    gradient = (
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={-len * Math.cos(a)} y1={-len * Math.sin(a)} x2={len * Math.cos(a)} y2={len * Math.sin(a)}>
          <stop offset="0" stopColor={layer.fill} />
          <stop offset="1" stopColor={layer.fill2} />
        </linearGradient>
      </defs>
    )
  }

  return (
    <g transform={`translate(${layer.x} ${layer.y}) rotate(${layer.rot || 0})`} opacity={layer.opacity ?? 1}>
      {gradient}
      {layer.type === 'text' ? (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={layer.size || 48}
          fontWeight={layer.bold === false ? 500 : 800}
          fontFamily={FONTS[layer.font || 'sans']}
          letterSpacing={layer.spacing || 0}
          fill={paint}
          {...outline}
        >
          {fillTokens(layer.text, {})}
        </text>
      ) : spec.stroke ? (
        <path d={spec.d} fill="none" stroke={paint} strokeWidth={spec.stroke} strokeLinecap="round" />
      ) : (
        <path d={spec.d} fill={paint} fillRule={spec.evenodd ? 'evenodd' : undefined} transform={spec.unit ? `scale(${layer.w} ${layer.h})` : undefined} {...outline} />
      )}
    </g>
  )
}

// A small picture of a shape for the editor's library and layer list.
export function ShapeGlyph({ type, fill = '#1c448a', size = 44 }) {
  if (type === 'text') {
    return (
      <svg viewBox="-55 -55 110 110" width={size} height={size} aria-hidden="true">
        <text textAnchor="middle" dominantBaseline="central" fontSize="64" fontWeight="800" fontFamily={FONTS.sans} fill={fill}>Aa</text>
      </svg>
    )
  }
  const info = shapeInfo(type)
  const aspect = info.w / info.h
  let w = aspect >= 1 ? 90 : 90 * aspect
  let h = aspect >= 1 ? 90 / aspect : 90
  if (type === 'wave') [w, h] = [96, 34]
  if (type === 'line') [w, h] = [96, 8]
  const layer = { type, x: 0, y: 0, w, h, rot: 0, fill, opacity: 1, n: type === 'star' ? 5 : type === 'wave' ? 3 : undefined, p: type === 'star' ? 0.45 : type === 'ring' ? 0.28 : type === 'wave' ? 0.22 : info.p }
  return (
    <svg viewBox="-55 -55 110 110" width={size} height={size} aria-hidden="true">
      <LayerShape layer={layer} uid="glyph" />
    </svg>
  )
}
