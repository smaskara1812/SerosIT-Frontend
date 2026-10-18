import { FONTS, shapeInfo, shapeSpec } from '@/lib/bannerShapes'
import { fillTokens } from '@/lib/bannerDesign'

// One shape of a design, drawn on the banner's 1200 x 360 canvas. All numbers come from a validated design. A shape can be
// a blend of two colours and can have an outline; a text label is drawn as real text. `uid` keeps the blend's id unique
// when several banners are on one page.
export function LayerShape({ layer, uid = 'x' }) {
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
