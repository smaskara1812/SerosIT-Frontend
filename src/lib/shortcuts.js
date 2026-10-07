import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'
import { IconPlus } from '@/components/icons'

// "Start a new record" shortcuts for the bigger, multi-field forms worth
// jumping straight to past their list page — pickable from the
// customizable Shortcuts dialog, same as any page leaf below, rather than
// forced onto every user's Home screen. Gated on the 'add' permission
// (not the default 'view') via permAction, since pinning one only makes
// sense for a user who can actually create that record.
export const ACTION_SHORTCUTS = [
  {
    key: 'action-new-it-asset',
    label: 'New IT Asset',
    path: '/it-asset/it-assets/new',
    menuKey: 'it_asset.it_assets',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-it-asset-holder',
    label: 'New IT Asset Holder',
    path: '/it-asset/it-asset-holders/new',
    menuKey: 'it_asset.it_asset_holders',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-it-accessory',
    label: 'New IT Accessory',
    path: '/it-asset/it-accessories/new',
    menuKey: 'masters.it_accessories',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-it-accessory-holder',
    label: 'New IT Accessory Holder',
    path: '/it-asset/it-accessory-holders/new',
    menuKey: 'it_asset.it_accessory_holders',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-incident',
    label: 'New Incident',
    path: '/qhse/incident-details/new',
    menuKey: 'qhse.incident_details',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-hse-drill-record',
    label: 'New HSE Drill Record',
    path: '/qhse/hse-drill-record/new',
    menuKey: 'qhse.hse_drill_record',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-hse-weekly-drill',
    label: 'New HSE Weekly Drill',
    path: '/qhse/hse-weekly-drill/new',
    menuKey: 'qhse.hse_weekly_drill',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-corrective-action',
    label: 'New Corrective Action',
    path: '/qhse/corrective-actions/new',
    menuKey: 'qhse.corrective_actions',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-training-group',
    label: 'New Training Group',
    path: '/qhse/training-group/new',
    menuKey: 'qhse.training_group',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-training-org',
    label: 'New Training Org',
    path: '/qhse/training-org/new',
    menuKey: 'qhse.training_org',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-map-cert-to-rank',
    label: 'Map a Training Certificate to Ranks',
    path: '/qhse/cert-to-rank-mapping/new',
    menuKey: 'qhse.cert_to_rank_mapping',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  {
    key: 'action-new-training-log',
    label: 'New Training Log',
    path: '/qhse/training-log/new',
    menuKey: 'qhse.training_log',
    permAction: 'add',
    icon: IconPlus,
    groupLabel: 'Quick Actions',
  },
  // New Drilling Daily Report is deliberately NOT listed here — it's
  // already an always-on default in Home.jsx's own SHORTCUTS, and pinning
  // it again here would just duplicate that tile.
]

// Every real leaf page across the whole nav tree, flattened, with which
// top-level group it belongs to (for grouping the shortcut picker) —
// mirrors exactly how Sidebar.jsx decides what's visible, so "can this
// user add this as a shortcut" always matches "can this user actually
// reach this page from the sidebar." Plus the curated action shortcuts
// above, which aren't real nav entries but are pickable the same way.
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
  leaves.push(...ACTION_SHORTCUTS)
  return leaves
}

export function isLeafAccessible(leaf, user) {
  if (leaf.adminOnly && !user?.is_app_admin) return false
  if (!leaf.menuKey) return true
  return can(user, leaf.menuKey, leaf.permAction || 'view')
}

export function accessibleNavLeaves(user) {
  return allNavLeaves().filter((leaf) => isLeafAccessible(leaf, user))
}

// path -> leaf, built once per call from every leaf regardless of access —
// used to resolve a *stored* shortcut's label/icon. A path that no longer
// matches any leaf (page renamed/removed) simply resolves to undefined and
// the caller skips it, same as a dead bookmark. Real nav leaves win over
// an action shortcut sharing the same path (e.g. the drilling report "new"
// route exists as both a real nav path pattern and a quick action) since
// they're pushed first.
export function navLeavesByPath() {
  const map = new Map()
  for (const leaf of allNavLeaves()) {
    if (!map.has(leaf.path)) map.set(leaf.path, leaf)
  }
  return map
}
