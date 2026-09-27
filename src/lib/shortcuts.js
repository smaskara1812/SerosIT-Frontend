import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'

// Every real leaf page across the whole nav tree, flattened, with which
// top-level group it belongs to (for grouping the shortcut picker) —
// mirrors exactly how Sidebar.jsx decides what's visible, so "can this
// user add this as a shortcut" always matches "can this user actually
// reach this page from the sidebar."
export function allNavLeaves() {
  const leaves = []
  for (const group of navTree) {
    if (group.key === 'home') continue
    if (group.sections) {
      for (const section of group.sections) {
        for (const item of section.items) {
          leaves.push({ ...item, groupLabel: group.label, groupKey: group.key, adminOnly: group.adminOnly })
        }
      }
    } else if (group.path) {
      leaves.push({ ...group, groupLabel: group.label, groupKey: group.key })
    }
  }
  return leaves
}

export function isLeafAccessible(leaf, user) {
  if (leaf.adminOnly && !user?.is_app_admin) return false
  if (!leaf.menuKey) return true
  return can(user, leaf.menuKey)
}

export function accessibleNavLeaves(user) {
  return allNavLeaves().filter((leaf) => isLeafAccessible(leaf, user))
}

// path -> leaf, built once per call from every leaf regardless of access —
// used to resolve a *stored* shortcut's label/icon. A path that no longer
// matches any leaf (page renamed/removed) simply resolves to undefined and
// the caller skips it, same as a dead bookmark.
export function navLeavesByPath() {
  const map = new Map()
  for (const leaf of allNavLeaves()) {
    if (!map.has(leaf.path)) map.set(leaf.path, leaf)
  }
  return map
}
