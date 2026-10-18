// The banner design document (see backend core/banner_events.py, which validates the same shape): colours, words, layout,
// a pattern and contour lines. Everything here is plain data plus a few helpers for the editor and the renderer.

export const DEFAULT_DESIGN = {
  v: 1,
  layout: 'standard',
  text: { greeting: '', message: '', caption: '', color: null },
  background: { type: 'gradient', colors: ['#1c448a', '#17356f', '#0f2650'], angle: 118 },
  pattern: { type: 'none', color: '#ffffff', opacity: 0.12, scale: 1 },
  contours: { on: true, color: '#ffffff', opacity: 0.13, density: 2 },
  showLastSignIn: true,
  search: { tint: '#ffffff' },
  notice: { x: null, y: 0 }, // across and down, 0 to 100 (null across = the side the layout puts it on)
  edges: [], // border strips along the top or bottom: { edge, type, size, colors, opacity }
  layers: [],
}

export const cloneDesign = (d) => JSON.parse(JSON.stringify(d))

// A design from the server with anything missing filled in, so the renderer never meets a gap.
export function withDefaults(d) {
  const base = cloneDesign(DEFAULT_DESIGN)
  if (!d) return base
  return {
    ...base,
    ...d,
    text: { ...base.text, ...d.text },
    background: { ...base.background, ...d.background },
    pattern: { ...base.pattern, ...d.pattern },
    contours: { ...base.contours, ...d.contours },
    search: { ...base.search, ...d.search },
    notice: legacyNotice({ ...base.notice, ...d.notice }),
    edges: d.edges || [],
  }
}

export const LAYOUTS = [
  { key: 'standard', label: 'Standard', hint: 'Greeting and search on the left, the notice on the right.' },
  { key: 'mirrored', label: 'Mirrored', hint: 'Greeting and search on the right, the notice on the left.' },
  { key: 'centred', label: 'Centred', hint: 'Everything in the middle, the notice underneath.' },
]

// A saved design from before the notice had fine control used top / middle / bottom; read that as an up-and-down position.
function legacyNotice(n) {
  if (!n.at) return { x: n.x ?? null, y: n.y ?? 0 }
  return { x: n.x ?? null, y: n.y ?? { top: 0, middle: 50, bottom: 100 }[n.at] ?? 0 }
}

export const PATTERNS = [
  { key: 'none', label: 'None' },
  { key: 'dots', label: 'Dots' },
  { key: 'stripes', label: 'Stripes' },
  { key: 'waves', label: 'Waves' },
  { key: 'grid', label: 'Grid' },
  { key: 'chevrons', label: 'Chevrons' },
  { key: 'sunburst', label: 'Sunburst' },
  { key: 'topo', label: 'Contours' },
]

export const PALETTE = [
  '#1c448a', '#0f2650', '#3dbdb0', '#0ea5e9', '#16a34a', '#0f5132', '#f5c400', '#ff9933',
  '#d94b2b', '#ec4899', '#7c3aed', '#2b1055', '#111827', '#ffffff', '#fde68a', '#dbeafe',
]

// Ready-made looks: colours, pattern and lines only, never the words.
const look = (background, pattern, contours, color = null, tint = '#ffffff') => ({ background, pattern, contours, text: { color }, search: { tint } })
export const PRESETS = [
  { key: 'seros', label: 'Seros navy', ...look({ type: 'gradient', colors: ['#1c448a', '#17356f', '#0f2650'], angle: 118 }, { type: 'none', color: '#ffffff', opacity: 0.12, scale: 1 }, { on: true, color: '#ffffff', opacity: 0.13, density: 2 }, null, '#ffffff') },
  { key: 'tricolour', label: 'Tricolour', ...look({ type: 'gradient', colors: ['#ffb066', '#f6f1e6', '#8fdc9a'], angle: 90 }, { type: 'none', color: '#0f2650', opacity: 0.1, scale: 1 }, { on: false, color: '#0f2650', opacity: 0.12, density: 2 }, null, '#fffdf6') },
  { key: 'safety', label: 'Safety yellow', ...look({ type: 'gradient', colors: ['#f5c400', '#e8a900'], angle: 100 }, { type: 'stripes', color: '#111827', opacity: 0.1, scale: 1.2 }, { on: false, color: '#111827', opacity: 0.12, density: 2 }, null, '#fffbe6') },
  { key: 'night', label: 'Celebration', ...look({ type: 'gradient', colors: ['#2b1055', '#7c3aed'], angle: 120 }, { type: 'dots', color: '#fde68a', opacity: 0.28, scale: 1.2 }, { on: false, color: '#ffffff', opacity: 0.12, density: 2 }, null, '#f5f0ff') },
  { key: 'green', label: 'Fresh green', ...look({ type: 'gradient', colors: ['#0f5132', '#16a34a'], angle: 110 }, { type: 'waves', color: '#ffffff', opacity: 0.14, scale: 1.3 }, { on: false, color: '#ffffff', opacity: 0.12, density: 2 }, null, '#f0fdf4') },
  { key: 'sunrise', label: 'Warm sunrise', ...look({ type: 'gradient', colors: ['#ff7e5f', '#feb47b'], angle: 100 }, { type: 'sunburst', color: '#ffffff', opacity: 0.18, scale: 1 }, { on: false, color: '#ffffff', opacity: 0.12, density: 2 }, null, '#fff5ee') },
  { key: 'calm', label: 'Calm blue', ...look({ type: 'gradient', colors: ['#dbeafe', '#93c5fd'], angle: 110 }, { type: 'topo', color: '#1c448a', opacity: 0.16, scale: 1 }, { on: false, color: '#1c448a', opacity: 0.12, density: 2 }, null, '#f4f9ff') },
  { key: 'charcoal', label: 'Charcoal', ...look({ type: 'solid', colors: ['#111827'], angle: 0 }, { type: 'grid', color: '#ffffff', opacity: 0.07, scale: 1 }, { on: true, color: '#ffffff', opacity: 0.08, density: 2 }, null, '#f1f5f9') },
]

export function applyPreset(design, preset) {
  const next = cloneDesign(design)
  next.background = cloneDesign(preset.background)
  next.pattern = cloneDesign(preset.pattern)
  next.contours = cloneDesign(preset.contours)
  next.text.color = preset.text.color
  next.search = cloneDesign(preset.search)
  return next
}

// ── colour helpers ───────────────────────────────────────────────────────────────────────────────

function channels(hex) {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
export function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = '#ffffff'
const NAVY = '#0f2650'

// The text colour that reads best across every stop of the background (white or deep navy).
export function autoTextColor(design) {
  const stops = design.background.colors
  const worst = (c) => Math.min(...stops.map((s) => contrast(c, s)))
  return worst(WHITE) >= worst(NAVY) ? WHITE : NAVY
}
export const textColorOf = (design) => design.text.color || autoTextColor(design)
export const toneOf = (design) => (textColorOf(design) === NAVY || luminance(textColorOf(design)) < 0.4 ? 'light' : 'dark')

// The worst contrast between the words and the background, and a plain-words note when it is poor.
export function readability(design) {
  const text = textColorOf(design)
  const worst = Math.min(...design.background.colors.map((s) => contrast(text, s)))
  if (worst >= 4.5) return { ok: true, ratio: worst }
  return { ok: false, ratio: worst, fixable: !design.text.color ? false : true }
}

export function backgroundCss(design) {
  const { type, colors, angle } = design.background
  if (type === 'solid' || colors.length === 1) return colors[0]
  const stops = colors.map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ')
  return `linear-gradient(${angle}deg, ${stops})`
}

// The words a design may use that change by themselves: {name} (the person's first name), {date} (today), {year} (this year)
// and {newyear} (the year the next New Year brings: this year until the middle of the year, then next year).
export function yearTokens(now = new Date()) {
  const y = now.getFullYear()
  return { year: String(y), newyear: String(now.getMonth() >= 6 ? y + 1 : y) }
}

// "Happy Diwali, {name}" with the person's first name filled in, and the same for the other tokens. Anything else in braces
// stays as typed.
export function fillTokens(text, tokens) {
  const map = Object.fromEntries(Object.entries({ ...yearTokens(), ...tokens }).map(([k, v]) => [k.toLowerCase(), v]))
  return (text || '').replace(/\{(\w+)\}/g, (m, k) => (k.toLowerCase() in map ? map[k.toLowerCase()] ?? '' : m)).replace(/\s+,/g, ',').trim()
}

// Where the shapes sit on the banner. They are drawn on a 1200 x 360 canvas that is fitted to the banner's HEIGHT and tucked
// into its right-hand corner (the middle, for the centred layout), so on a very wide screen nothing is cropped and it all
// stays beside the notice, instead of being cut off top and bottom.
export const shapesAlign = (layout) => (layout === 'centred' ? 'xMidYMax meet' : 'xMaxYMax meet')

// Today's date as YYYY-MM-DD in the browser's own calendar (never through toISOString, which reads the UTC date).
export function localDateString(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Soft tints for the search box, to sit comfortably in a theme. It must stay light, because the words in it are dark.
export const SOFT_TINTS = ['#ffffff', '#fffbe6', '#fff5ee', '#fff1f2', '#fdf2f8', '#f5f0ff', '#eff6ff', '#ecfeff', '#f0fdf4', '#f1f5f9']

// A colour pulled towards white until it is light enough to be a search tint.
export function softenTint(hex) {
  let c = hex
  for (let i = 0; i < 12 && luminance(c) < 0.72; i++) {
    const [r, g, b] = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16))
    const mix = (v) => Math.round(v + (255 - v) * 0.25).toString(16).padStart(2, '0')
    c = `#${mix(r)}${mix(g)}${mix(b)}`
  }
  return c
}

export const EDGE_TYPES = [
  { key: 'garland', label: 'Flower garland' },
  { key: 'toran', label: 'Leaf toran' },
  { key: 'bunting', label: 'Bunting flags' },
  { key: 'lights', label: 'String lights' },
  { key: 'lanterns', label: 'Hanging lanterns' },
  { key: 'pearls', label: 'Pearl strand' },
  { key: 'icicles', label: 'Icicles' },
  { key: 'zigzag', label: 'Zigzag' },
  { key: 'scallop', label: 'Scalloped edge' },
  { key: 'waves', label: 'Waves' },
  { key: 'stars', label: 'Row of stars' },
  { key: 'diamonds', label: 'Diamond chain' },
  { key: 'bands', label: 'Colour bands' },
]
