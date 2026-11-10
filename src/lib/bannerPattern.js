// The geometry behind a banner's pattern, shared by the banner itself (components/home/BannerArt.jsx) and by the sidebar when a banner has "sidebar" switched on
// (components/home/BannerPattern.jsx). The banner is drawn on a 1200 x 360 canvas; the sidebar on a tall 240 x 900 one.

export const BANNER_W = 1200
export const BANNER_H = 360

// Wavy contour lines like the ones on a chart, drawn from a formula. `step` is the gap between lines.
export function contourLines(step, phase = 0, wobble = 1, w = BANNER_W, h = BANNER_H) {
  const out = []
  const count = Math.ceil((h - 30) / step) + 1
  for (let i = 0; i < count; i++) {
    const y0 = 30 + i * step
    let d = ''
    for (let x = 0; x <= w; x += 20) {
      const y = y0 + 16 * wobble * Math.sin(x / 170 + i * 0.55 + phase) + 7 * wobble * Math.sin(x / 63 + i * 1.3 + phase)
      d += `${x === 0 ? 'M' : ' L'}${x},${y.toFixed(1)}`
    }
    out.push(d)
  }
  return out
}

// Rays fanning out from a point below the canvas: [x, y, radius] of that point (the banner's by default).
export function sunburstRays(scale, [ox, oy, R] = [900, 420, 1600]) {
  const n = Math.max(8, Math.round(22 / scale)) * 2
  const rays = []
  for (let i = 0; i < n; i += 2) {
    const a0 = Math.PI + (i / n) * Math.PI
    const a1 = Math.PI + ((i + 1) / n) * Math.PI
    rays.push(`M${ox},${oy} L${(ox + R * Math.cos(a0)).toFixed(1)},${(oy + R * Math.sin(a0)).toFixed(1)} L${(ox + R * Math.cos(a1)).toFixed(1)},${(oy + R * Math.sin(a1)).toFixed(1)} Z`)
  }
  return rays
}
