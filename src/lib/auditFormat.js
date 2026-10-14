// Shared by the Audit Trail page and the record History dialog.

export const ACTION_COLORS = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  permission_change: 'bg-blue-100 text-blue-700',
  password_change: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  deactivate: 'bg-amber-100 text-amber-700',
  export: 'bg-purple-100 text-purple-700',
  login: 'bg-gray-100 text-gray-600',
  login_failed: 'bg-red-100 text-red-700',
  logout: 'bg-gray-100 text-gray-600',
  revert: 'bg-amber-100 text-amber-800',
  revert_delete: 'bg-amber-100 text-amber-800',
  revert_restore: 'bg-amber-100 text-amber-800',
}

// What each action is called where a person reads the history.
export const ACTION_LABELS = {
  create: 'Created',
  update: 'Edited',
  delete: 'Deleted',
  revert: 'Reverted',
  revert_delete: 'Creation undone',
  revert_restore: 'Deleted record restored',
}

// Every diff value used to be a plain scalar (string/number/date), where String(v) reads fine. Some
// fields carry an array of objects (Approver Mapping's details), where String() gives a useless
// "[object Object]". JSON.stringify for anything non-scalar keeps this generic.
export function formatDiffValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
