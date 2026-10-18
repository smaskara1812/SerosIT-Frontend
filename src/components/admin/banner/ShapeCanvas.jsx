import { useEffect, useRef, useState } from 'react'
import { textBox } from '@/lib/bannerShapes'

// The editing layer that sits over the preview banner on the Shapes tab. It uses the same 1200 x 360 canvas and the same
// fit as the banner's own art, so a click or drag lands exactly where it appears, at any preview size. Dragging a shape
// moves it, the corner and side handles resize it, and the round handle above it turns it.

const HANDLES = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]
const CURSORS = { '-1,-1': 'nwse-resize', '0,-1': 'ns-resize', '1,-1': 'nesw-resize', '1,0': 'ew-resize', '1,1': 'nwse-resize', '0,1': 'ns-resize', '-1,1': 'nesw-resize', '-1,0': 'ew-resize' }
const MIN = 4
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const rad = (d) => (d * Math.PI) / 180

export default function ShapeCanvas({ layers, selectedId, onSelect, onStart, onLive, align = 'xMaxYMax meet' }) {
  const ref = useRef(null)
  const drag = useRef(null)
  const [k, setK] = useState(1) // canvas units per screen pixel, so handles keep one size on screen

  // Runs after every render because the preview's scale changes without this element resizing; it only sets state when
  // the measured scale really changed, so it cannot loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = ref.current?.getScreenCTM()
    if (m && m.a && Math.abs(1 / m.a - k) > 0.001) setK(1 / m.a)
  })

  const point = (e) => {
    const m = ref.current.getScreenCTM().inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
    return { x: p.x, y: p.y }
  }
  const begin = (e, mode, layer, handle) => {
    e.stopPropagation()
    e.preventDefault()
    ref.current.setPointerCapture(e.pointerId)
    onSelect(layer.id)
    onStart()
    drag.current = { mode, id: layer.id, handle, start: point(e), orig: { ...layer } }
  }
  const move = (e) => {
    const g = drag.current
    if (!g) return
    const p = point(e)
    const o = g.orig
    const dx = p.x - g.start.x
    const dy = p.y - g.start.y
    if (g.mode === 'move') {
      onLive(g.id, { x: Math.round(clamp(o.x + dx, -100, 1300)), y: Math.round(clamp(o.y + dy, -100, 460)) })
    } else if (g.mode === 'rotate') {
      let a = (Math.atan2(p.y - o.y, p.x - o.x) * 180) / Math.PI + 90
      if (e.shiftKey) a = Math.round(a / 15) * 15
      onLive(g.id, { rot: Math.round(((a + 540) % 360) - 180) })
    } else {
      const r = rad(o.rot || 0)
      const c = Math.cos(r)
      const s = Math.sin(r)
      const ldx = dx * c + dy * s
      const ldy = -dx * s + dy * c
      const [sx, sy] = g.handle
      let w = o.w
      let h = o.h
      let extra = {}
      if (sx && sy) {
        const f = Math.max(0.05, 1 + ((sx * ldx) / o.w + (sy * ldy) / o.h) / 2)
        if (o.type === 'text') {
          // Dragging a corner of a text label changes its size, so the words stay in proportion.
          const size = clamp(Math.round((o.size || 48) * f), 8, 240)
          const box = textBox({ ...o, size })
          w = box.w
          h = box.h
          extra = { size }
        } else {
          w = o.w * f
          h = o.h * f
        }
      } else if (sx) w = o.w + sx * ldx
      else h = o.h + sy * ldy
      w = clamp(w, MIN, 1600)
      h = clamp(h, MIN, 900)
      const lx = (sx * (w - o.w)) / 2
      const ly = (sy * (h - o.h)) / 2
      onLive(g.id, { ...extra, w: Math.round(w), h: Math.round(h), x: Math.round(o.x + lx * c - ly * s), y: Math.round(o.y + lx * s + ly * c) })
    }
  }
  const end = (e) => {
    drag.current = null
    try {
      ref.current.releasePointerCapture(e.pointerId)
    } catch {
      /* nothing was captured */
    }
  }

  const sel = layers.find((l) => l.id === selectedId)
  const hs = 9 * k
  return (
    <svg
      ref={ref}
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 360"
      preserveAspectRatio={align}
      style={{ pointerEvents: 'none', touchAction: 'none' }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      aria-label="Shape editing area"
    >
      <rect x="-3000" y="-3000" width="7200" height="6360" fill="transparent" style={{ pointerEvents: 'all' }} onPointerDown={() => onSelect(null)} />
      {layers.map((l) => (
        <g key={l.id} transform={`translate(${l.x} ${l.y}) rotate(${l.rot || 0})`}>
          <rect x={-l.w / 2} y={-Math.max(l.h, 16 * k) / 2} width={l.w} height={Math.max(l.h, 16 * k)} fill="transparent" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => begin(e, 'move', l)} />
        </g>
      ))}
      {sel && (
        <g transform={`translate(${sel.x} ${sel.y}) rotate(${sel.rot || 0})`}>
          <rect x={-sel.w / 2} y={-sel.h / 2} width={sel.w} height={sel.h} fill="none" stroke="#ffffff" strokeWidth={3.5 * k} style={{ pointerEvents: 'none' }} />
          <rect x={-sel.w / 2} y={-sel.h / 2} width={sel.w} height={sel.h} fill="none" stroke="#2563eb" strokeWidth={1.6 * k} style={{ pointerEvents: 'none' }} />
          <line x1="0" y1={-sel.h / 2} x2="0" y2={-sel.h / 2 - 22 * k} stroke="#2563eb" strokeWidth={1.4 * k} style={{ pointerEvents: 'none' }} />
          <circle cx="0" cy={-sel.h / 2 - 28 * k} r={7 * k} fill="#fff" stroke="#2563eb" strokeWidth={2 * k} style={{ pointerEvents: 'all', cursor: 'grab' }} onPointerDown={(e) => begin(e, 'rotate', sel)} />
          {HANDLES.filter(([sx, sy]) => sel.type !== 'text' || (sx && sy)).map(([sx, sy]) => (
            <rect
              key={`${sx},${sy}`}
              x={(sx * sel.w) / 2 - hs / 2}
              y={(sy * sel.h) / 2 - hs / 2}
              width={hs}
              height={hs}
              rx={hs * 0.2}
              fill="#fff"
              stroke="#2563eb"
              strokeWidth={1.6 * k}
              style={{ pointerEvents: 'all', cursor: CURSORS[`${sx},${sy}`] }}
              onPointerDown={(e) => begin(e, 'resize', sel, [sx, sy])}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
