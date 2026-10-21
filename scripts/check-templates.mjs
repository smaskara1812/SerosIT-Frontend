// Checks that every Banner Events template would be accepted by the server when saved (the rules in backend/core/banner_events.py),
// so a template can never be offered that cannot be saved. Run: npm run check:templates
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const py = fs.readFileSync(path.resolve('../backend/core/banner_events.py'), 'utf8')
const list = (name) => [...py.match(new RegExp(`${name} = \\(([\\s\\S]*?)\\n?\\)`))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
const SHAPES = new Set(list('SHAPES'))
const EDGE_TYPES = new Set(list('EDGE_TYPES'))
const MAX_LAYERS = Number(py.match(/MAX_LAYERS = (\d+)/)[1])
const MAX_EDGES = Number(py.match(/MAX_EDGES = (\d+)/)[1])
const HEX = /^#[0-9a-fA-F]{6}$/

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { TEMPLATES } = await vite.ssrLoadModule('/src/lib/bannerTemplates.js')
await vite.close()

const problems = []
for (const t of TEMPLATES) {
  const d = t.design
  const bad = (msg) => problems.push(`${t.key}: ${msg}`)
  if (d.text.greeting.length > 80) bad('greeting is over 80 characters')
  if (d.text.message.length > 200) bad('message is over 200 characters')
  if (d.text.caption.length > 40) bad('caption is over 40 characters')
  if (d.background.colors.length < 1 || d.background.colors.length > 3) bad(`background has ${d.background.colors.length} colours (1 to 3 allowed)`)
  for (const c of d.background.colors) if (!HEX.test(c)) bad(`bad background colour ${c}`)
  if (d.layers.length > MAX_LAYERS) bad(`${d.layers.length} shapes (at most ${MAX_LAYERS})`)
  if ((d.edges || []).length > MAX_EDGES) bad('too many border strips')
  for (const e of d.edges || []) {
    if (!EDGE_TYPES.has(e.type)) bad(`unknown border strip kind ${e.type}`)
    if (!e.colors.length || e.colors.length > 4) bad('a border strip needs one to four colours')
  }
  const ids = new Set()
  for (const l of d.layers) {
    if (!SHAPES.has(l.type)) bad(`shape type ${l.type} is not known to the server`)
    if (!HEX.test(l.fill)) bad(`shape ${l.id} has a bad colour ${l.fill}`)
    if (ids.has(l.id)) bad(`duplicate shape id ${l.id}`)
    ids.add(l.id)
    if (l.x < -200 || l.x > 1400 || l.y < -200 || l.y > 560) bad(`shape ${l.id} (${l.type}) is out of range`)
    if (l.w < 2 || l.w > 1600 || l.h < 2 || l.h > 900) bad(`shape ${l.id} (${l.type}) has a bad size`)
  }
}
if (problems.length) {
  console.error(`FAILED:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`All ${TEMPLATES.length} templates would be accepted by the server.`)
