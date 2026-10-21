import { useEffect } from 'react'

// The fonts a banner can use for its greeting, its message and its text labels. They are bundled with the app (no outside requests),
// and a font's files are fetched only when a banner actually uses it. `default` is the app's own font. If a font cannot load, the
// text simply shows in the fallback of its stack, so a banner never breaks.
const font = (key, label, family, fallback, weight, load, hint) => ({ key, label, css: `'${family}', ${fallback}`, weight, load, hint })
const SANS = 'system-ui, sans-serif'
const SERIF = "Georgia, 'Times New Roman', serif"
const CURSIVE = 'cursive, system-ui, sans-serif'

export const BANNER_FONTS = [
  { key: 'default', label: 'Seros (usual)', css: null, weight: 700, hint: 'The app’s own font' },
  font('poppins', 'Poppins', 'Poppins', SANS, 700, () => Promise.all([import('@fontsource/poppins/latin-400.css'), import('@fontsource/poppins/latin-700.css')]), 'Clean and modern'),
  font('montserrat', 'Montserrat', 'Montserrat', SANS, 700, () => Promise.all([import('@fontsource/montserrat/latin-400.css'), import('@fontsource/montserrat/latin-700.css')]), 'Wide and confident'),
  font('lora', 'Lora', 'Lora', SERIF, 700, () => Promise.all([import('@fontsource/lora/latin-400.css'), import('@fontsource/lora/latin-700.css')]), 'Warm book serif'),
  font('playfair', 'Playfair Display', 'Playfair Display', SERIF, 700, () => Promise.all([import('@fontsource/playfair-display/latin-400.css'), import('@fontsource/playfair-display/latin-700.css')]), 'Elegant and high contrast'),
  font('cinzel', 'Cinzel', 'Cinzel', SERIF, 700, () => Promise.all([import('@fontsource/cinzel/latin-400.css'), import('@fontsource/cinzel/latin-700.css')]), 'Stately capitals, royal'),
  font('yatra', 'Yatra One', 'Yatra One', SERIF, 400, () => import('@fontsource/yatra-one/latin-400.css'), 'Festive, Indian feel'),
  font('bebas', 'Bebas Neue', 'Bebas Neue', SANS, 400, () => import('@fontsource/bebas-neue/latin-400.css'), 'Tall and strong capitals'),
  font('pacifico', 'Pacifico', 'Pacifico', CURSIVE, 400, () => import('@fontsource/pacifico/latin-400.css'), 'Friendly brush script'),
  font('caveat', 'Caveat', 'Caveat', CURSIVE, 700, () => Promise.all([import('@fontsource/caveat/latin-400.css'), import('@fontsource/caveat/latin-700.css')]), 'Handwritten'),
  font('baloo', 'Baloo 2', 'Baloo 2', SANS, 700, () => Promise.all([import('@fontsource/baloo-2/latin-400.css'), import('@fontsource/baloo-2/latin-700.css')]), 'Round and playful'),
]

const BY_KEY = Object.fromEntries(BANNER_FONTS.map((f) => [f.key, f]))
export const FONT_KEYS = BANNER_FONTS.map((f) => f.key)

// The CSS font stack for a key, or undefined for the app's own font.
export const fontFamily = (key) => BY_KEY[key]?.css || undefined
// The weight a font is meant to be read at in a heading (some have only one weight).
export const titleWeight = (key) => BY_KEY[key]?.weight ?? 700

const started = new Map()
export function loadFont(key) {
  const f = BY_KEY[key]
  if (!f?.load) return Promise.resolve()
  if (!started.has(key)) started.set(key, f.load().catch(() => started.delete(key)))
  return started.get(key)
}

// Fetches the files of the given fonts (once each) so text set in them shows properly.
export function useBannerFonts(keys) {
  const list = [...new Set(keys.filter(Boolean))].sort().join(',')
  useEffect(() => {
    list.split(',').filter(Boolean).forEach((k) => loadFont(k))
  }, [list])
}
