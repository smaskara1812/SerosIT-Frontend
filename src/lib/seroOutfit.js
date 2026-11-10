// The dress-up kit for Sero (Admin > Home Page > Customise Sero) and the code that puts an outfit on his drawing.
//
// An outfit is a `look`: { head, top, neck, face, extra }, each a style from the lists below and a colour (the top also has a print and a trim). The same lists live in
// backend/core/sero_look.py, which validates every look before it is saved: keep them in step. Nothing here ever takes markup from a person: styles come from these lists
// and colours are checked as #rrggbb again before they are drawn.
//
// How it is put on: the drawing (components/sero/sero.svg) is left as it is. `dress(svg, look)` adds a layer for the clothes to the torso, the neck and the face, swaps the
// contents of his hat group (so the hat still lifts and turns with his head, whatever he is wearing), and colours his sleeves. `dress(svg, null)` takes it all off again.

export const HEADS = [['hardhat', 'Safety hat'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['turban', 'Turban'], ['headphones', 'Headphones'], ['santa', 'Santa hat'], ['party', 'Party hat'], ['cowboy', 'Cowboy hat'], ['chef', 'Chef hat'], ['none', 'Bare head']]
export const TOPS = [['none', 'His own shell'], ['tee', 'T-shirt'], ['shirt', 'Shirt'], ['kurta', 'Kurta'], ['jacket', 'Jacket'], ['hoodie', 'Hoodie']]
export const NECKS = [['none', 'Nothing'], ['scarf', 'Scarf'], ['bandana', 'Bandana'], ['dupatta', 'Dupatta'], ['idcard', 'ID card on a lanyard']]
export const FACES = [['none', 'Nothing'], ['shades', 'Sunglasses'], ['specs', 'Round glasses']]
export const EXTRAS = [['none', 'Nothing'], ['garland', 'Flower garland'], ['bowtie', 'Bow tie'], ['necktie', 'Tie'], ['medal', 'Medal']]
export const PRINTS = [['none', 'Plain'], ['stripes', 'Stripes'], ['dots', 'Dots'], ['checks', 'Checks'], ['zigzag', 'Zigzag'], ['stars', 'Stars'], ['chevrons', 'Chevrons']]
export const LENGTHS = [['short', 'Short, to the hip'], ['regular', 'To the thigh'], ['long', 'Long, over the knees']]
export const TRIMS = [['none', 'No border'], ['hem', 'Hem'], ['collar', 'Neckline'], ['cuffs', 'Cuffs'], ['all', 'Hem, neckline and cuffs']]

export const DEFAULT_LOOK = {
  head: { style: 'hardhat', color: '#f58220' }, // his usual hat
  top: { style: 'none', color: '#2563eb', print: 'none', printColor: '#ffffff', trim: 'none', trimColor: '#ffffff', length: 'regular' },
  neck: { style: 'none', color: '#dc2626', stripe: null },
  face: { style: 'none', color: '#111827' },
  extra: { style: 'none', color: '#f59e0b' },
  shoes: { color: '#1f6fb5' }, // the upper of his shoes; the default is his own blue
}

const HEX = /^#[0-9a-fA-F]{6}$/
const col = (v, fallback) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback)
const pick = (v, list, fallback) => (list.some(([k]) => k === v) ? v : fallback)

// Any stored look -> a complete, safe one (unknown or missing parts fall back to his usual look).
export function normalizeLook(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = DEFAULT_LOOK
  const part = (k, list) => ({ style: pick(r[k]?.style, list, d[k].style), color: col(r[k]?.color, d[k].color) })
  return {
    head: part('head', HEADS),
    top: {
      ...part('top', TOPS),
      print: pick(r.top?.print, PRINTS, 'none'),
      printColor: col(r.top?.printColor, d.top.printColor),
      trim: pick(r.top?.trim, TRIMS, 'none'),
      trimColor: col(r.top?.trimColor, d.top.trimColor),
      length: pick(r.top?.length, LENGTHS, 'regular'),
    },
    neck: { ...part('neck', NECKS), stripe: r.neck?.stripe == null ? null : col(r.neck.stripe, null) },
    face: part('face', FACES),
    extra: part('extra', EXTRAS),
    shoes: { color: col(r.shoes?.color, d.shoes.color) },
  }
}

// ── colour helpers ───────────────────────────────────────────────────────────────────────────────

function mix(hex, to, t) {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const a = n(hex)
  const b = n(to)
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}
const darker = (hex, t = 0.22) => mix(hex, '#000000', t)
const lighter = (hex, t = 0.3) => mix(hex, '#ffffff', t)
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
// A colour that shows up on `hex`: used for buttons, seams and the like, so they are visible on light and dark cloth alike.
const contrast = (hex) => (lum(hex) > 0.55 ? darker(hex, 0.35) : lighter(hex, 0.45))

// ── prints: a repeating tile, clipped to the cloth ───────────────────────────────────────────────

function printDefs(id, kind, c) {
  const tile = (w, h, inner, extra = '') => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${extra}>${inner}</pattern>`
  switch (kind) {
    case 'stripes':
      return tile(100, 14, `<rect y="0" width="100" height="6" fill="${c}"/>`)
    case 'dots':
      return tile(14, 14, `<circle cx="7" cy="7" r="2.6" fill="${c}"/>`)
    case 'checks':
      return tile(22, 22, `<rect width="11" height="11" fill="${c}"/><rect x="11" y="11" width="11" height="11" fill="${c}"/>`)
    case 'zigzag':
      return tile(16, 14, `<path d="M0 10 L4 4 L8 10 L12 4 L16 10" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`)
    case 'stars':
      return tile(22, 22, `<path d="M11 4 L12.8 9 L18 9.2 L13.9 12.4 L15.4 17.4 L11 14.4 L6.6 17.4 L8.1 12.4 L4 9.2 L9.2 9 Z" fill="${c}"/>`)
    case 'chevrons':
      return tile(22, 14, `<path d="M0 10 L11 3 L22 10" fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/>`)
    default:
      return ''
  }
}

// ── the head ─────────────────────────────────────────────────────────────────────────────────────

// His own hat is kept as drawn and only recoloured: the three oranges of the original become shades of the chosen colour.
function recolourHat(original, c) {
  return original.replace(/#F58220/gi, c).replace(/#D9680F/gi, darker(c, 0.2)).replace(/#FFA24D/gi, lighter(c, 0.32))
}

function headGear(head, original, uid) {
  const c = head.color
  const dk = darker(c, 0.25)
  const lt = lighter(c, 0.35)
  switch (head.style) {
    case 'hardhat':
      return recolourHat(original, c)
    case 'cap':
      return (
        `<path d="M90 106 Q88 46 150 44 Q212 46 210 106 Z" fill="${c}"/>` +
        `<path d="M150 46 L150 106 M122 50 Q112 78 108 106 M178 50 Q188 78 192 106" fill="none" stroke="${dk}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<circle cx="150" cy="45" r="5" fill="${dk}"/>` +
        `<path d="M104 62 Q112 50 130 47" fill="none" stroke="${lt}" stroke-width="4.5" stroke-linecap="round" opacity=".8"/>` +
        `<path d="M78 104 Q150 132 222 104 Q226 116 150 122 Q74 116 78 104 Z" fill="${dk}"/>` +
        `<path d="M92 108 Q150 126 208 108" fill="none" stroke="${lt}" stroke-width="2" stroke-linecap="round" opacity=".55"/>`
      )
    case 'beanie':
      return (
        `<path d="M92 108 Q88 52 150 50 Q212 52 208 108 Z" fill="${c}"/>` +
        `<path d="M104 70 Q114 56 132 53" fill="none" stroke="${lt}" stroke-width="4.5" stroke-linecap="round" opacity=".75"/>` +
        `<rect x="84" y="92" width="132" height="20" rx="9" fill="${dk}"/>` +
        [96, 108, 120, 132, 144, 156, 168, 180, 192, 204].map((x) => `<line x1="${x}" y1="95" x2="${x}" y2="109" stroke="${darker(c, 0.42)}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`).join('') +
        `<circle cx="150" cy="47" r="13" fill="${lt}"/><circle cx="146" cy="43" r="4" fill="${lighter(c, 0.6)}" opacity=".8"/>`
      )
    case 'turban': {
      // A wrapped turban: layered rolls of cloth that bulge a little wider than the head, twist lines across them, a pleated peak at the front and a brooch with a plume.
      const id = `${uid}-tb`
      const base = 'M82 114 C76 72 98 42 150 40 C202 42 224 72 218 114 Q150 128 82 114 Z'
      const rolls = [[112, c], [96, lighter(c, 0.1)], [80, c], [64, lighter(c, 0.08)], [50, c]]
      const gold = '#fbbf24'
      return (
        `<clipPath id="${id}"><path d="${base}"/></clipPath>` +
        `<path d="${base}" fill="${dk}"/>` +
        `<g clip-path="url(#${id})">` +
        rolls.map(([y, f], i) => `<path d="M64 ${y + 10} Q150 ${y - 30 - i * 2} 236 ${y + 10}" fill="none" stroke="${f}" stroke-width="19" stroke-linecap="round"/><path d="M64 ${y + 19} Q150 ${y - 21 - i * 2} 236 ${y + 19}" fill="none" stroke="${darker(c, 0.38)}" stroke-width="1.8" opacity=".75"/>`).join('') +
        [[94, 112, 128, 46], [112, 116, 160, 44], [134, 118, 186, 52], [160, 118, 206, 70]].map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1} Q${(x1 + x2) / 2 - 8} ${(y1 + y2) / 2 + 2} ${x2} ${y2}" fill="none" stroke="${darker(c, 0.3)}" stroke-width="2" opacity=".5"/>`).join('') +
        `<path d="M100 78 Q112 56 138 47" fill="none" stroke="${lt}" stroke-width="6" stroke-linecap="round" opacity=".5"/>` +
        `</g>` +
        `<path d="M122 116 Q150 70 178 116 Q150 108 122 116 Z" fill="${dk}"/><path d="M134 116 Q150 84 166 116" fill="none" stroke="${lt}" stroke-width="2" opacity=".6"/><path d="M142 114 Q150 92 158 114" fill="none" stroke="${darker(c, 0.4)}" stroke-width="1.8"/>` +
        `<path d="M150 90 Q172 78 180 44 Q154 58 150 90 Z" fill="${gold}"/><path d="M152 84 Q168 70 176 50" fill="none" stroke="${darker(gold, 0.3)}" stroke-width="1.4"/>` +
        `<circle cx="150" cy="96" r="8" fill="${gold}"/><circle cx="150" cy="96" r="4.6" fill="#dc2626"/><circle cx="148.4" cy="94.4" r="1.4" fill="#fff" opacity=".8"/>`
      )
    }
    case 'santa': {
      // A Santa hat: a red cap that flops over to the right, a thick fur band and a fur pompom.
      const fur = '#fffaf0'
      const furShade = '#e5dccb'
      return (
        `<path d="M88 106 Q86 48 150 44 Q206 44 214 106 Z" fill="${c}"/>` +
        `<path d="M176 50 Q226 54 234 104 Q216 84 196 82 Z" fill="${dk}"/>` +
        `<path d="M104 70 Q112 54 134 48" fill="none" stroke="${lt}" stroke-width="5" stroke-linecap="round" opacity=".55"/>` +
        `<rect x="78" y="92" width="144" height="24" rx="12" fill="${fur}"/>` +
        [92, 112, 132, 152, 172, 192, 208].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 92 : 96}" r="9" fill="${fur}"/>`).join('') +
        [100, 124, 148, 172, 196].map((x) => `<circle cx="${x}" cy="108" r="3" fill="${furShade}"/>`).join('') +
        `<circle cx="234" cy="104" r="12" fill="${fur}"/><circle cx="230" cy="100" r="3.6" fill="${furShade}" opacity=".7"/>`
      )
    }
    case 'party': {
      // A party hat: a striped cone with a pompom on top.
      const acc = contrast(c)
      return (
        `<path d="M106 108 L150 34 L194 108 Z" fill="${c}"/>` +
        `<path d="M117 90 L174 78 M127 74 L166 66 M137 58 L158 54" stroke="${acc}" stroke-width="6" stroke-linecap="round" opacity=".9"/>` +
        [[130, 100], [150, 96], [170, 100], [150, 84], [140, 74], [160, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff" opacity=".8"/>`).join('') +
        `<path d="M104 108 Q150 120 196 108" fill="none" stroke="${dk}" stroke-width="5" stroke-linecap="round"/>` +
        `<circle cx="150" cy="32" r="9" fill="${lt}"/><circle cx="147" cy="29" r="3" fill="#fff" opacity=".7"/>`
      )
    }
    case 'cowboy': {
      // A cowboy hat: a creased crown with a band and buckle, and a wide brim that curls up at both ends.
      const band = contrast(c)
      return (
        `<path d="M62 100 Q72 124 150 124 Q228 124 238 100 Q214 110 150 110 Q86 110 62 100 Z" fill="${dk}"/>` +
        `<path d="M104 106 Q98 56 126 48 Q150 58 174 48 Q202 56 196 106 Z" fill="${c}"/>` +
        `<path d="M126 50 Q150 66 174 50" fill="none" stroke="${dk}" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M110 78 Q114 58 128 52" fill="none" stroke="${lt}" stroke-width="5" stroke-linecap="round" opacity=".55"/>` +
        `<path d="M101 94 Q150 104 199 94 L200 108 Q150 116 100 108 Z" fill="${band}"/>` +
        `<rect x="141" y="95" width="18" height="12" rx="3" fill="#fbbf24"/><rect x="146" y="98" width="8" height="6" rx="1.5" fill="${c}"/>` +
        `<path d="M70 104 Q150 124 230 104" fill="none" stroke="${lt}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`
      )
    }
    case 'chef': {
      // A chef's toque: a pleated band under a tall, puffy top.
      return (
        `<path d="M94 108 L94 92 Q84 88 86 74 Q76 58 98 50 Q102 32 130 34 Q150 24 170 34 Q198 32 202 50 Q224 58 214 74 Q216 88 206 92 L206 108 Z" fill="${c}"/>` +
        `<path d="M100 74 Q104 56 122 48 M150 40 Q148 54 156 60 M194 74 Q192 60 180 52" fill="none" stroke="${dk}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>` +
        `<path d="M104 56 Q112 44 132 42" fill="none" stroke="${lt}" stroke-width="5" stroke-linecap="round" opacity=".7"/>` +
        `<rect x="92" y="92" width="116" height="18" rx="4" fill="${lt}"/>` +
        [108, 124, 140, 156, 172, 188].map((x) => `<line x1="${x}" y1="94" x2="${x}" y2="108" stroke="${dk}" stroke-width="1.8" opacity=".5"/>`).join('') +
        `<rect x="92" y="106" width="116" height="4" rx="2" fill="${dk}" opacity=".35"/>`
      )
    }
    case 'headphones': {
      // Over-ear headphones: a band over the top of his head and a cup on each side. His own hat is off.
      const cush = darker(c, 0.45)
      return (
        `<path d="M70 126 C64 38 236 38 230 126" fill="none" stroke="${dk}" stroke-width="11" stroke-linecap="round"/>` +
        `<path d="M70 126 C64 40 236 40 230 126" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>` +
        `<path d="M92 66 Q108 50 134 46" fill="none" stroke="${lt}" stroke-width="3.2" stroke-linecap="round" opacity=".7"/>` +
        `<rect x="56" y="112" width="30" height="50" rx="14" fill="${c}"/><rect x="214" y="112" width="30" height="50" rx="14" fill="${c}"/>` +
        `<rect x="76" y="118" width="12" height="38" rx="6" fill="${cush}"/><rect x="212" y="118" width="12" height="38" rx="6" fill="${cush}"/>` +
        `<rect x="60" y="120" width="8" height="20" rx="4" fill="${lt}" opacity=".55"/><rect x="232" y="120" width="8" height="20" rx="4" fill="${lt}" opacity=".55"/>`
      )
    }
    default:
      return ''
  }
}

// ── the kurta ────────────────────────────────────────────────────────────────────────────────────

const KURTA_HEM = { short: 266, regular: 286, long: 306 } // where the hem falls; long hangs over his feet
const KURTA_FLARE = { short: 3, regular: 6, long: 11 } // how far the skirt swings out at the hem on each side

// A kurta: a band collar, a placket with buttons and (with a neckline border) embroidery down it, side slits with a pocket seam above each, a skirt that flares and a curved
// hem. The upper part is cut to his shell; the skirt below is free so it can hang past his body.
function kurtaLayer(top, uid) {
  const c = top.color
  const dk = darker(c, 0.25)
  const edge = top.trimColor
  const bt = contrast(c)
  const hem = KURTA_HEM[top.length] || KURTA_HEM.regular
  const f = KURTA_FLARE[top.length] || KURTA_FLARE.regular
  const trimOn = (what) => top.trim === what || top.trim === 'all'
  const clip = `${uid}-clip`
  const pid = `${uid}-print`
  const upper = Math.min(hem, 264)
  const L = 106 - f
  const R = 194 + f
  const skirt = `M106 ${upper - 2} L194 ${upper - 2} L${R} ${hem} Q150 ${hem + 7} ${L} ${hem} Z`
  const defs = printDefs(pid, top.print, top.printColor)
  let b = `<clipPath id="${clip}">${SHELL}</clipPath>`
  if (defs) b += `<defs>${defs}</defs>`
  // the upper body, cut to his shell
  b += `<g clip-path="url(#${clip})"><rect x="104" y="190" width="92" height="${upper - 190}" fill="${c}"/>`
  if (defs) b += `<rect x="104" y="190" width="92" height="${upper - 190}" fill="url(#${pid})"/>`
  b += `<rect x="104" y="190" width="13" height="${upper - 190}" fill="#000" opacity=".1"/><rect x="183" y="190" width="13" height="${upper - 190}" fill="#000" opacity=".12"/></g>`
  // the skirt
  if (hem > upper) {
    b += `<clipPath id="${clip}s"><path d="${skirt}"/></clipPath><path d="${skirt}" fill="${c}"/>`
    if (defs) b += `<g clip-path="url(#${clip}s)"><rect x="${L}" y="${upper - 2}" width="${R - L}" height="${hem - upper + 10}" fill="url(#${pid})"/></g>`
    b += `<path d="M106 ${upper - 2} L${L} ${hem} L${L + 14} ${hem + 1.5} L112 ${upper - 2} Z" fill="#000" opacity=".1"/><path d="M194 ${upper - 2} L${R} ${hem} L${R - 14} ${hem + 1.5} L188 ${upper - 2} Z" fill="#000" opacity=".13"/>`
    // soft folds in the skirt, and the side slits
    b += `<path d="M130 ${upper + 2} Q127 ${(upper + hem) / 2} 124 ${hem + 3} M170 ${upper + 2} Q173 ${(upper + hem) / 2} 176 ${hem + 3}" fill="none" stroke="#000" stroke-width="1.6" opacity=".12"/>`
    const slit = Math.min(26, hem - upper + 12)
    b += `<path d="M${L} ${hem} L${L + 6} ${hem + 1} L${L + 3 + (f * slit) / (hem - upper + 2)} ${hem - slit} Z M${R} ${hem} L${R - 6} ${hem + 1} L${R - 3 - (f * slit) / (hem - upper + 2)} ${hem - slit} Z" fill="${dk}" opacity=".55"/>`
    if (trimOn('hem')) b += `<path d="M${L} ${hem - 1} Q150 ${hem + 6} ${R} ${hem - 1}" fill="none" stroke="${edge}" stroke-width="8" stroke-linecap="butt"/><path d="M${L} ${hem - 6} Q150 ${hem + 1} ${R} ${hem - 6}" fill="none" stroke="${darker(edge, 0.3)}" stroke-width="1.4" opacity=".7"/>`
  } else if (trimOn('hem')) {
    b += `<path d="M106 ${upper - 7} L194 ${upper - 7}" stroke="${edge}" stroke-width="8"/>`
  }
  // pocket seams on the sides, the placket and its buttons, the band collar
  b += `<path d="M110 ${upper - 28} Q119 ${upper - 20} 121 ${upper - 6} M190 ${upper - 28} Q181 ${upper - 20} 179 ${upper - 6}" fill="none" stroke="${dk}" stroke-width="1.8" opacity=".6" stroke-linecap="round"/>`
  b += `<path d="M138 192 Q150 206 162 192 Z" fill="#1F6FB5"/>`
  const thread = trimOn('collar') ? edge : lighter(c, 0.35)
  b += `<path d="M150 197 L150 ${upper - 12}" stroke="${darker(c, 0.35)}" stroke-width="5.5" stroke-linecap="round" opacity=".5"/>`
  b += `<path d="M146.6 198 L146.6 ${upper - 12} M153.4 198 L153.4 ${upper - 12}" stroke="${thread}" stroke-width="1.5" opacity=".95"/>`
  if (trimOn('collar')) b += `<path d="M130 192 Q150 214 170 192" fill="none" stroke="${edge}" stroke-width="3" stroke-linecap="round"/><path d="M137 200 L150 213 L163 200" fill="none" stroke="${edge}" stroke-width="1.6" opacity=".9"/>`
  const gap = (upper - 14 - 204) / 3
  b += [0, 1, 2, 3].map((i) => `<circle cx="150" cy="${(206 + gap * i).toFixed(1)}" r="2.6" fill="${bt}"/><circle cx="149.2" cy="${(205.2 + gap * i).toFixed(1)}" r=".9" fill="#fff" opacity=".7"/>`).join('')
  b += `<rect x="135" y="187" width="30" height="10" rx="4.5" fill="${c}"/><rect x="135" y="187" width="30" height="10" rx="4.5" fill="none" stroke="${trimOn('collar') ? edge : dk}" stroke-width="1.8"/><circle cx="150" cy="192" r="1.8" fill="${bt}"/>`
  return { body: b, sleeve: c, cuff: trimOn('cuffs') ? edge : null }
}

// ── the clothes on the torso (front view) ────────────────────────────────────────────────────────

// The shell is rect x106 y192 w88 h98 rx30. A top is a shape that sits inside it, so cloth never hangs outside his body.
const SHELL = '<rect x="106" y="192" width="88" height="98" rx="30"/>'

function topLayer(top, uid) {
  if (top.style === 'none') return { body: '', sleeve: null, cuff: null }
  if (top.style === 'kurta') return kurtaLayer(top, uid)
  const c = top.color
  const dk = darker(c, 0.25)
  const edge = top.trimColor
  const trimOn = (what) => top.trim === what || top.trim === 'all'
  const clip = `${uid}-clip`
  const pid = `${uid}-print`
  const bottom = top.style === 'jacket' ? 266 : 262
  let body = `<clipPath id="${clip}">${SHELL}</clipPath>`
  const defs = printDefs(pid, top.print, top.printColor)
  if (defs) body += `<defs>${defs}</defs>`
  body += `<g clip-path="url(#${clip})">`
  body += `<rect x="104" y="190" width="92" height="${bottom - 190}" fill="${c}"/>`
  if (top.style === 'jacket') {
    // the front is open: the inside shows down the middle, and the two halves have a lapel each
    body += `<rect x="104" y="190" width="92" height="${bottom - 190}" fill="${c}"/>`
  }
  if (defs) body += `<rect x="104" y="190" width="92" height="${bottom - 190}" fill="url(#${pid})"/>`
  // the fall of the cloth: a soft shade down each side
  body += `<rect x="104" y="190" width="14" height="${bottom - 190}" fill="#000" opacity=".1"/><rect x="182" y="190" width="14" height="${bottom - 190}" fill="#000" opacity=".12"/>`
  if (trimOn('hem')) body += `<rect x="104" y="${bottom - 9}" width="92" height="9" fill="${edge}"/>`
  body += '</g>'

  const bt = contrast(c)
  let detail = ''
  switch (top.style) {
    case 'tee':
      detail += `<path d="M130 192 Q150 212 170 192 Z" fill="#1F6FB5"/>`
      if (trimOn('collar')) detail += `<path d="M128 192 Q150 216 172 192" fill="none" stroke="${edge}" stroke-width="4.5" stroke-linecap="round"/>`
      break
    case 'shirt':
      detail += `<path d="M132 192 L150 214 L168 192 Z" fill="#1F6FB5"/>`
      detail += `<path d="M126 190 L150 218 L140 192 Z" fill="${trimOn('collar') ? edge : lighter(c, 0.5)}"/><path d="M174 190 L150 218 L160 192 Z" fill="${trimOn('collar') ? edge : lighter(c, 0.5)}"/>`
      detail += `<line x1="150" y1="218" x2="150" y2="258" stroke="${dk}" stroke-width="2"/>`
      detail += [226, 238, 250].map((y) => `<circle cx="150" cy="${y}" r="2.2" fill="${bt}"/>`).join('')
      detail += `<rect x="162" y="226" width="20" height="16" rx="3" fill="none" stroke="${dk}" stroke-width="2"/>`
      break
    case 'jacket':
      detail += `<path d="M144 192 L144 266 L156 266 L156 192 Z" fill="${lighter(c, 0.62)}"/>`
      detail += `<path d="M144 192 L144 266 M156 192 L156 266" stroke="${dk}" stroke-width="2.5"/>`
      detail += `<path d="M120 192 L142 192 L136 226 Z M180 192 L158 192 L164 226 Z" fill="${dk}"/>`
      detail += `<path d="M150 196 L150 262" stroke="${bt}" stroke-width="1.6" stroke-dasharray="2 3"/>`
      detail += `<rect x="146" y="204" width="8" height="10" rx="2" fill="${bt}"/>`
      if (trimOn('collar')) detail += `<path d="M120 192 L142 192 L136 226 Z M180 192 L158 192 L164 226 Z" fill="none" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>`
      break
    case 'hoodie':
      detail += `<path d="M112 196 Q150 228 188 196 Q184 186 150 186 Q116 186 112 196 Z" fill="${dk}"/>`
      detail += `<path d="M126 194 Q150 212 174 194" fill="none" stroke="#1F6FB5" stroke-width="9" stroke-linecap="round" opacity=".9"/>`
      detail += `<line x1="140" y1="208" x2="138" y2="232" stroke="${bt}" stroke-width="2.4" stroke-linecap="round"/><line x1="160" y1="208" x2="162" y2="232" stroke="${bt}" stroke-width="2.4" stroke-linecap="round"/>`
      detail += `<circle cx="138" cy="234" r="2.6" fill="${bt}"/><circle cx="162" cy="234" r="2.6" fill="${bt}"/>`
      detail += `<path d="M122 240 L178 240 L184 258 L116 258 Z" fill="${dk}" opacity=".55"/>`
      if (trimOn('collar')) detail += `<path d="M112 196 Q150 228 188 196" fill="none" stroke="${edge}" stroke-width="3.5" stroke-linecap="round"/>`
      break
    default:
      break
  }
  return { body: body + detail, sleeve: c, cuff: trimOn('cuffs') ? edge : null }
}

// ── the neck ─────────────────────────────────────────────────────────────────────────────────────

function neckLayer(neck) {
  const c = neck.color
  const dk = darker(c, 0.25)
  if (neck.style === 'scarf') {
    const s = neck.stripe
    return (
      `<path d="M118 188 Q150 206 182 188 L186 204 Q150 224 114 204 Z" fill="${c}"/>` +
      (s ? `<path d="M116 196 Q150 214 184 196" fill="none" stroke="${s}" stroke-width="3.2"/>` : '') +
      `<path d="M160 208 L178 204 L184 246 L166 250 Z" fill="${dk}"/>` +
      `<path d="M158 206 L176 202 L182 244 L164 248 Z" fill="${c}"/>` +
      (s ? `<path d="M160 222 L180 218 M162 232 L182 228" stroke="${s}" stroke-width="3.2"/>` : '') +
      [166, 171, 176, 181].map((x, i) => `<line x1="${x}" y1="${246 + i * -0.9}" x2="${x + 0.8}" y2="${254 - i * 0.9}" stroke="${dk}" stroke-width="2" stroke-linecap="round"/>`).join('')
    )
  }
  if (neck.style === 'dupatta') {
    // A dupatta: draped over one shoulder, falling across the chest to the opposite hip, with a border and tassels.
    const s = neck.stripe
    const lt = lighter(c, 0.3)
    return (
      `<path d="M114 190 Q150 200 186 190 L196 204 Q150 214 106 204 Z" fill="${c}"/>` +
      `<path d="M168 192 L196 206 Q168 244 128 276 L102 262 Q146 232 168 192 Z" fill="${c}"/>` +
      `<path d="M168 192 Q150 232 102 262" fill="none" stroke="${dk}" stroke-width="2" opacity=".5"/>` +
      `<path d="M178 202 Q154 240 112 268" fill="none" stroke="${lt}" stroke-width="3" opacity=".5"/>` +
      (s ? `<path d="M190 206 Q166 242 126 272" fill="none" stroke="${s}" stroke-width="4"/><path d="M110 258 L100 262 M118 266 L108 270 L112 264" fill="none" stroke="${s}" stroke-width="3"/>` : '') +
      [[106, 264], [112, 269], [118, 273], [124, 276]].map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 8}" stroke="${s || dk}" stroke-width="2.2" stroke-linecap="round"/>`).join('')
    )
  }
  if (neck.style === 'idcard') {
    // an ID card on a lanyard: two straps from the neck to a clip, and the card
    const lt = lighter(c, 0.35)
    return (
      `<path d="M126 190 L148 230 M174 190 L152 230" stroke="${c}" stroke-width="6" stroke-linecap="butt" fill="none"/>` +
      `<path d="M126 190 L148 230 M174 190 L152 230" stroke="${lt}" stroke-width="1.6" fill="none" opacity=".7"/>` +
      `<rect x="145" y="226" width="10" height="7" rx="2" fill="#94a3b8"/>` +
      `<rect x="135" y="232" width="30" height="36" rx="4" fill="#fff"/><rect x="135" y="232" width="30" height="36" rx="4" fill="none" stroke="#cbd5e1" stroke-width="1.4"/>` +
      `<rect x="135" y="232" width="30" height="8" rx="4" fill="${c}"/>` +
      `<circle cx="150" cy="249" r="6" fill="#cbd5e1"/><path d="M141 266 Q150 254 159 266 Z" fill="#cbd5e1"/>` +
      `<rect x="139" y="262" width="22" height="2.4" rx="1" fill="#94a3b8"/>`
    )
  }
  if (neck.style === 'bandana') {
    return (
      `<path d="M116 188 L184 188 L150 230 Z" fill="${c}"/>` +
      `<path d="M116 188 L184 188 L182 195 L118 195 Z" fill="${darker(c, 0.3)}"/>` +
      [[140, 204], [160, 204], [150, 214], [150, 198]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="${contrast(c)}"/>`).join('')
    )
  }
  return ''
}

// ── the extras: a garland of flowers, a bow tie ──────────────────────────────────────────────────

function extraLayer(extra) {
  const c = extra.color
  if (extra.style === 'garland') {
    const pts = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const x = 112 + 76 * t
      const y = 200 + Math.sin(Math.PI * t) * 46 - 0
      pts.push([x, y])
    }
    return (
      `<path d="M112 200 Q150 276 188 200" fill="none" stroke="#3f7d3a" stroke-width="3"/>` +
      pts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${(y + 0.4).toFixed(1)}" r="6.2" fill="${i % 2 ? lighter(c, 0.35) : c}"/><circle cx="${x.toFixed(1)}" cy="${(y + 0.4).toFixed(1)}" r="2.2" fill="${darker(c, 0.35)}"/>`).join('')
    )
  }
  if (extra.style === 'medal') {
    // a medal on a ribbon: the ribbon's two straps meet in a V, the medal hangs from the point
    const rb = contrast(c)
    return (
      `<path d="M126 190 L150 232 L138 192 Z M174 190 L150 232 L162 192 Z" fill="${rb}"/>` +
      `<path d="M138 192 L150 232 L162 192 Z" fill="${darker(rb, 0.25)}"/>` +
      `<circle cx="150" cy="242" r="12" fill="${c}"/><circle cx="150" cy="242" r="12" fill="none" stroke="${darker(c, 0.3)}" stroke-width="2"/><circle cx="150" cy="242" r="7.5" fill="none" stroke="${lighter(c, 0.5)}" stroke-width="1.6"/>` +
      `<path d="M150 236 L151.8 240.4 L156.5 240.6 L152.8 243.4 L154.1 248 L150 245.4 L145.9 248 L147.2 243.4 L143.5 240.6 L148.2 240.4 Z" fill="${lighter(c, 0.55)}"/>`
    )
  }
  if (extra.style === 'necktie') {
    const dk = darker(c, 0.3)
    return (
      `<path d="M143 194 L157 194 L154 204 L146 204 Z" fill="${dk}"/>` +
      `<path d="M146 203 L154 203 L160 246 L150 256 L140 246 Z" fill="${c}"/>` +
      `<path d="M150 206 L150 250" stroke="${dk}" stroke-width="1.6" opacity=".6"/><path d="M142 226 L158 220 M141 237 L159 231" stroke="${lighter(c, 0.45)}" stroke-width="3" opacity=".8"/>`
    )
  }
  if (extra.style === 'bowtie') {
    const dk = darker(c, 0.3)
    return (
      `<path d="M150 197 L128 187 L128 207 Z M150 197 L172 187 L172 207 Z" fill="${c}"/>` +
      `<path d="M150 197 L128 187 L128 207 Z M150 197 L172 187 L172 207 Z" fill="none" stroke="${dk}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<rect x="144" y="190" width="12" height="14" rx="4" fill="${dk}"/>`
    )
  }
  return ''
}

// ── the face ─────────────────────────────────────────────────────────────────────────────────────

function faceLayer(face) {
  const c = face.color
  if (face.style === 'specs') {
    return (
      `<g fill="none" stroke="${c}" stroke-width="3.4">` +
      `<circle cx="126" cy="136" r="17" fill="#fff" fill-opacity=".12"/><circle cx="174" cy="136" r="17" fill="#fff" fill-opacity=".12"/>` +
      `<path d="M143 134 Q150 129 157 134" stroke-linecap="round"/><path d="M109 132 L98 128 M191 132 L202 128" stroke-linecap="round"/></g>` +
      `<path d="M116 126 Q120 122 126 121" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`
    )
  }
  if (face.style !== 'shades') return ''
  return (
    `<g>` +
    `<rect x="108" y="119" width="38" height="30" rx="11" fill="${c}" opacity=".9"/><rect x="154" y="119" width="38" height="30" rx="11" fill="${c}" opacity=".9"/>` +
    `<rect x="108" y="119" width="38" height="30" rx="11" fill="none" stroke="${lighter(c, 0.45)}" stroke-width="2.4"/><rect x="154" y="119" width="38" height="30" rx="11" fill="none" stroke="${lighter(c, 0.45)}" stroke-width="2.4"/>` +
    `<path d="M146 130 Q150 126 154 130" fill="none" stroke="${lighter(c, 0.45)}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M108 128 L96 124 M192 128 L204 124" stroke="${lighter(c, 0.45)}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M116 125 L124 125 M162 125 L170 125" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>` +
    `</g>`
  )
}

// ── the side view (while he strolls): a simpler version of the same look ─────────────────────────

function sideHat(head, original) {
  const c = head.color
  const dk = darker(c, 0.25)
  const lt = lighter(c, 0.35)
  switch (head.style) {
    case 'hardhat':
      return recolourHat(original, c)
    case 'cap':
      return `<path d="M96 104 Q94 46 148 44 Q202 46 200 104 Z" fill="${c}"/><path d="M104 62 Q112 50 130 47" fill="none" stroke="${lt}" stroke-width="4" stroke-linecap="round" opacity=".8"/><path d="M180 104 Q236 108 230 118 Q196 120 180 112 Z" fill="${dk}"/><circle cx="148" cy="45" r="5" fill="${dk}"/>`
    case 'beanie':
      return `<path d="M96 108 Q92 52 148 50 Q204 52 200 108 Z" fill="${c}"/><rect x="90" y="92" width="116" height="20" rx="9" fill="${dk}"/><circle cx="148" cy="47" r="13" fill="${lt}"/>`
    case 'turban':
      return `<path d="M88 112 Q82 52 148 44 Q214 52 208 112 Q148 126 88 112 Z" fill="${c}"/><path d="M90 98 Q148 80 206 98 M88 84 Q148 62 208 84 M94 70 Q148 50 204 70" fill="none" stroke="${dk}" stroke-width="3" stroke-linecap="round"/><path d="M104 108 Q130 70 176 52" fill="none" stroke="${lt}" stroke-width="4" stroke-linecap="round" opacity=".5"/><path d="M166 92 Q188 80 194 50 Q170 62 166 92 Z" fill="#fbbf24"/><circle cx="168" cy="98" r="7" fill="#fbbf24"/><circle cx="168" cy="98" r="4" fill="#dc2626"/>`
    case 'santa':
      return `<path d="M94 108 Q92 50 148 46 Q200 46 206 108 Z" fill="${c}"/><path d="M168 52 Q214 56 224 102 Q206 84 188 82 Z" fill="${dk}"/><rect x="86" y="94" width="126" height="22" rx="11" fill="#fffaf0"/><circle cx="224" cy="102" r="12" fill="#fffaf0"/>`
    case 'party':
      return `<path d="M108 110 L148 36 L188 110 Z" fill="${c}"/><path d="M118 92 L174 80 M128 76 L166 68" stroke="${contrast(c)}" stroke-width="6" stroke-linecap="round" opacity=".9"/><circle cx="148" cy="33" r="9" fill="${lt}"/>`
    case 'cowboy':
      return `<path d="M72 106 Q84 124 156 124 Q222 124 232 104 Q210 112 156 110 Q96 110 72 106 Z" fill="${dk}"/><path d="M104 108 Q100 58 128 50 Q150 58 176 50 Q204 58 198 108 Z" fill="${c}"/><path d="M103 96 Q150 106 199 96 L200 110 Q150 118 102 110 Z" fill="${contrast(c)}"/><rect x="140" y="97" width="18" height="12" rx="3" fill="#fbbf24"/>`
    case 'chef':
      return `<path d="M98 108 L98 92 Q88 88 90 74 Q80 58 102 50 Q106 32 134 34 Q152 24 172 34 Q198 32 202 50 Q222 58 212 74 Q214 88 204 92 L204 108 Z" fill="${c}"/><rect x="96" y="92" width="108" height="18" rx="4" fill="${lt}"/><path d="M104 74 Q108 56 126 48" fill="none" stroke="${dk}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`
    case 'headphones':
      return `<path d="M126 128 Q116 48 156 46 Q192 46 192 100" fill="none" stroke="${dk}" stroke-width="10" stroke-linecap="round"/><path d="M126 128 Q118 50 156 48 Q190 48 190 100" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle cx="128" cy="140" r="20" fill="${c}"/><circle cx="128" cy="140" r="12" fill="${darker(c, 0.45)}"/><circle cx="122" cy="132" r="4" fill="${lt}" opacity=".6"/>`
    default:
      return ''
  }
}

function sideTop(top, uid) {
  if (top.style === 'none') return ''
  const c = top.color
  const dk = darker(c, 0.25)
  const clip = `${uid}-sclip`
  const pid = `${uid}-sprint`
  const bottom = top.style === 'kurta' ? KURTA_HEM[top.length] || 286 : 262
  const defs = printDefs(pid, top.print, top.printColor)
  const edge = top.trimColor
  const hem = top.trim === 'hem' || top.trim === 'all'
  return (
    `<clipPath id="${clip}"><rect x="125" y="192" width="50" height="98" rx="24"/></clipPath>` +
    (defs ? `<defs>${defs}</defs>` : '') +
    `<g clip-path="url(#${clip})"><rect x="123" y="190" width="54" height="${bottom - 190}" fill="${c}"/>` +
    (defs ? `<rect x="123" y="190" width="54" height="${bottom - 190}" fill="url(#${pid})"/>` : '') +
    `<rect x="123" y="190" width="10" height="${bottom - 190}" fill="#000" opacity=".1"/>` +
    (hem ? `<rect x="123" y="${bottom - 9}" width="54" height="9" fill="${edge}"/>` : '') +
    (top.style === 'jacket' ? `<line x1="168" y1="192" x2="168" y2="${bottom}" stroke="${dk}" stroke-width="2.5"/>` : '') +
    `</g>`
  )
}

// ── putting it on and taking it off ──────────────────────────────────────────────────────────────

let counter = 0
const WEAR = 'sero-wear'

function setStyle(svg, selector, prop, value) {
  svg.querySelectorAll(selector).forEach((el) => {
    if (value) el.style[prop] = value
    else el.style[prop] = ''
  })
}

// Dress the drawing (an <svg class="sero">) in `look`, or take everything off with null. Safe to call again with a new look.
export function dress(svg, rawLook) {
  if (!svg) return
  svg.querySelectorAll(`.${WEAR}`).forEach((el) => el.remove())
  const hat = svg.querySelector('.sero-hat')
  const sideHead = svg.querySelector('.sero-side-head')
  if (hat && hat.dataset.original == null) hat.dataset.original = hat.innerHTML
  if (sideHead && !sideHead.dataset.hatStart) {
    // the side view's hat is its last few shapes: from the hat dome to the end
    const kids = [...sideHead.children]
    const start = kids.findIndex((k) => k.tagName === 'path' && /^M96 102/.test(k.getAttribute('d') || ''))
    sideHead.dataset.hatStart = String(start)
    sideHead.dataset.originalHat = kids.slice(start).map((k) => k.outerHTML).join('')
  }
  const look = rawLook ? normalizeLook(rawLook) : null
  const uid = `swr${++counter}`
  const usual = !look || JSON.stringify(look) === JSON.stringify(DEFAULT_LOOK)

  // the hat
  if (hat) hat.innerHTML = usual ? hat.dataset.original : headGear(look.head, hat.dataset.original, uid)
  if (sideHead) {
    const kids = [...sideHead.children]
    const start = Number(sideHead.dataset.hatStart)
    kids.slice(start).forEach((k) => k.remove())
    sideHead.insertAdjacentHTML('beforeend', usual ? sideHead.dataset.originalHat : sideHat(look.head, sideHead.dataset.originalHat))
  }

  // sleeves and cuffs back to his own blue
  setStyle(svg, '.sero-arm-l > line, .sero-arm-r > line', 'stroke', null)
  setStyle(svg, '.sero-fore-l-seg > rect, .sero-fore-r-seg > rect', 'fill', null)
  setStyle(svg, '.sero-arm-far > line', 'stroke', null)
  const shoeParts = '.sero-foot-l > rect:first-of-type, .sero-foot-r > rect:first-of-type, .sero-boot > rect:first-of-type' // the upper of each shoe; the soles stay dark
  setStyle(svg, shoeParts, 'fill', null)
  if (usual) return
  if (look.shoes.color !== DEFAULT_LOOK.shoes.color) setStyle(svg, shoeParts, 'fill', look.shoes.color)

  const top = topLayer(look.top, uid)
  const torso = svg.querySelector('.sero-torso')
  if (torso) {
    const neck = neckLayer(look.neck)
    const extra = extraLayer(look.extra)
    torso.insertAdjacentHTML('beforeend', `<g class="${WEAR}">${top.body}${neck}${extra}</g>`)
  }
  if (top.sleeve) {
    setStyle(svg, '.sero-arm-l > line, .sero-arm-r > line', 'stroke', top.sleeve)
    setStyle(svg, '.sero-fore-l-seg > rect, .sero-fore-r-seg > rect', 'fill', top.sleeve)
    setStyle(svg, '.sero-arm-far > line', 'stroke', darker(top.sleeve, 0.18))
    if (top.cuff) {
      svg.querySelectorAll('.sero-fore-l-seg, .sero-fore-r-seg').forEach((g) => {
        g.insertAdjacentHTML('beforeend', `<rect class="${WEAR}" x="-8" y="11" width="16" height="7" rx="1.5" fill="${top.cuff}"/>`)
      })
    }
  }
  const face = svg.querySelector('.sero-face')
  if (face && look.face.style !== 'none') face.insertAdjacentHTML('beforeend', `<g class="${WEAR}">${faceLayer(look.face)}</g>`)
  const side = svg.querySelector('.sero-side-bob')
  if (side) {
    const sideTorso = sideTop(look.top, uid)
    const anchor = side.querySelector('.sero-side-head')
    if (sideTorso && anchor) anchor.insertAdjacentHTML('beforebegin', `<g class="${WEAR}">${sideTorso}</g>`)
  }
}
