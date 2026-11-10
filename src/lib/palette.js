import { accessibleNavLeaves } from '@/lib/shortcuts'

// The command palette's brains: which pages and quick actions a person may reach, how a typed search ranks them, and the short list of what they opened last
// (kept in their own browser, one list per user; nothing is sent to the server).

export const OPEN_EVENT = 'seros:open-palette'
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT))

const ACTIONS = 'Quick Actions'
const MAX_PAGES = 8
const MAX_ACTIONS = 5
const MAX_RECENT = 6
const recentKey = (user) => `serosit.recent.${user?.user_id ?? user?.username ?? 'anon'}`

// The pages and the quick actions this person may open (the same access test as the sidebar and the shortcuts picker).
export function paletteEntries(user) {
  const all = accessibleNavLeaves(user)
  return { pages: all.filter((l) => l.groupLabel !== ACTIONS), actions: all.filter((l) => l.groupLabel === ACTIONS) }
}

// 0 = the name starts with what was typed, 1 = the name holds every typed word, 2 = only the area it sits in matches. null = no match. Every word has to match somewhere.
function rank(leaf, words) {
  const label = leaf.label.toLowerCase()
  const where = `${leaf.groupLabel || ''} ${leaf.sectionLabel || ''}`.toLowerCase()
  if (!words.every((w) => `${label} ${where}`.includes(w))) return null
  if (label.startsWith(words.join(' '))) return 0
  if (words.every((w) => label.includes(w))) return 1
  return 2
}

function pick(list, words, max) {
  return list
    .map((leaf) => ({ leaf, score: rank(leaf, words) }))
    .filter((r) => r.score !== null)
    .sort((a, b) => a.score - b.score || a.leaf.label.localeCompare(b.leaf.label))
    .slice(0, max)
    .map((r) => r.leaf)
}

export function searchEntries(entries, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  return { pages: pick(entries.pages, words, MAX_PAGES), actions: pick(entries.actions, words, MAX_ACTIONS) }
}

export function readRecent(user) {
  try {
    const list = JSON.parse(localStorage.getItem(recentKey(user)))
    return Array.isArray(list) ? list.filter((p) => typeof p === 'string').slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

// Remember a page the person opened (most recent first, no repeats).
export function rememberPage(user, path) {
  try {
    const next = [path, ...readRecent(user).filter((p) => p !== path)].slice(0, MAX_RECENT)
    localStorage.setItem(recentKey(user), JSON.stringify(next))
  } catch {
    /* private mode: no recent list, nothing else lost */
  }
}
