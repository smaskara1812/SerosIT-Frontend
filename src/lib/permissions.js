// Mirrors the backend's HasMenuPermission: app admins bypass everything,
// everyone else needs the matching flag from /api/auth/me/'s perms map.
export function can(user, menuKey, action = 'view') {
  if (!user) return false
  if (user.is_app_admin) return true
  return Boolean(user.perms?.[menuKey]?.[action])
}

// Admin pages are for App Admins, except a page marked `openToRights` in the nav (the Notice Board): anyone an admin has
// granted that page's rights may open it, and the Admin group then shows for them with only that page in it.
export function navItemVisible(item, group, user) {
  if (group?.adminOnly && !user?.is_app_admin) return Boolean(item.openToRights && item.menuKey && can(user, item.menuKey))
  return !item.menuKey || can(user, item.menuKey)
}

export function navGroupVisible(group, user) {
  if (!group.adminOnly || user?.is_app_admin) return true
  return (group.sections || []).some((s) => s.items.some((i) => navItemVisible(i, group, user)))
}
