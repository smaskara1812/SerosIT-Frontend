// Fails when a list page that opens a record on its own screen does not remember the person's place.
//
// The rule (see hooks/useListReturn.js and hooks/usePersistedState.js): a list whose records open on their own route (App.jsx has "<list>/new" and
// "<list>/:id/edit" routes) must keep its filters, search and sort with usePersistedState AND return to the same batch or page and scroll position with
// useListReturn. An unpaged list may carry the comment "list-memory: unpaged" instead of using useListReturn, and a list that keeps its filters in the
// address (useSearchParams, so Back restores them) the comment "list-memory: filters in the address" instead of using usePersistedState.
//
//   npm run check:lists
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const app = readFileSync(join(root, 'App.jsx'), 'utf8')

// component name -> file, from the imports of App.jsx
const files = {}
for (const m of app.matchAll(/(?:const|import)\s+(\w+)\s*(?:=\s*lazy\(\(\)\s*=>\s*import\(|from\s*)['"]@\/([^'"]+)['"]/g)) files[m[1]] = m[2]

const routes = [...app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)([^>]*)\/>\}/g)].map((m) => ({ path: m[1], comp: m[2] }))
const bases = new Set(routes.filter((r) => /\/new$/.test(r.path)).map((r) => r.path.replace(/\/new$/, '')))

let bad = 0
for (const base of bases) {
  const list = routes.find((r) => r.path === base)
  if (!list) {
    console.log(`?    ${base}: has a /new route but no list route`)
    continue
  }
  const rel = files[list.comp]
  const file = rel && [rel, `${rel}.jsx`, `${rel}.js`].map((f) => join(root, f)).find((f) => existsSync(f))
  if (!file) {
    console.log(`?    ${base}: cannot find the file of ${list.comp}`)
    continue
  }
  const src = readFileSync(file, 'utf8')
  const persisted = src.includes('usePersistedState') || src.includes('list-memory: filters in the address')
  const returns = src.includes('useListReturn') || src.includes('list-memory: unpaged')
  const ok = persisted && returns
  if (!ok) bad += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${base}  (${list.comp}) ${ok ? '' : `needs ${[!persisted && 'usePersistedState (filters/search/sort)', !returns && 'useListReturn (batch/page and scroll)'].filter(Boolean).join(' and ')}`}`)
}
console.log(bad ? `\n${bad} list page(s) do not remember the person's place` : `\nall ${bases.size} list pages remember the person's place`)
process.exit(bad ? 1 : 0)
