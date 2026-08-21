// Mirrors the backend's HasMenuPermission: app admins bypass everything,
// everyone else needs the matching flag from /api/auth/me/'s perms map.
export function can(user, menuKey, action = 'view') {
  if (!user) return false
  if (user.is_app_admin) return true
  return Boolean(user.perms?.[menuKey]?.[action])
}
