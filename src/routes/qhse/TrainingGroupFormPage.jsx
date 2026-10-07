import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconTrash } from '@/components/icons'

const MENU_KEY = 'qhse.training_group'
const API = '/api/qhse/training-group/'
const RANKS_API = '/api/qhse/training-group-ranks/'
const FIELD_LABELS = {
  training_group_hdr_name: 'Group Name', fs_category: 'Category', rank: 'Rank', mandatory_training: 'Mandatory Training',
  training_group_dtl_active: 'Active', training_group_hdr_active: 'Active',
}
const CATEGORY_FIELD = { type: 'select-remote', remote: `${API}categories/`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const RANK_FIELD = { type: 'select-remote', optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const invalidCls = 'border-destructive ring-2 ring-destructive/40'
const selectCls =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

function Field({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame error={error}>{children}</FieldFrame>
    </div>
  )
}

const rowKey = (r) => `${r.mandatory_training}|${r.training_group_dtl_active}`

export default function TrainingGroupFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canWrite = isEdit ? canEdit || canAdd : canAdd
  const canDelete = can(user, MENU_KEY, 'delete')

  const [name, setName] = useState('')
  const [hdr, setHdr] = useState(null)
  const [rows, setRows] = useState([])
  const [orig, setOrig] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [rowErrors, setRowErrors] = useState({})
  const bannerRef = useRef(null)
  const [rowQuery, setRowQuery] = useState('')
  const [categories, setCategories] = useState(null)
  const [add, setAdd] = useState({ category: '', rank: '', mandatory: '' })
  // Bumped whenever the group's ranks change, so the Rank picker reloads and
  // stops offering a rank that was just added.
  const [rankListVersion, setRankListVersion] = useState(0)
  const [adding, setAdding] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [rankName, setRankName] = useState('')
  const [confirmOff, setConfirmOff] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deletingRow, setDeletingRow] = useState(false)

  const inactive = isEdit && hdr && hdr.training_group_hdr_active !== 'Y'
  const writable = canWrite && !inactive
  const clearErr = (k) => setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev))

  function loadRows() {
    return apiFetch(`${RANKS_API}?hdr=${id}&page_size=1000`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data
        setRows(list)
        setOrig(Object.fromEntries(list.map((r) => [r.training_group_dtl_id, rowKey(r)])))
      })
  }

  function loadHdr() {
    return apiFetch(`${API}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        setHdr(data)
        setName(data.training_group_hdr_name)
      })
  }

  useEffect(() => {
    if (!isEdit) return
    Promise.all([loadHdr(), loadRows()])
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    apiFetch(`${API}categories/`)
      .then((r) => r.json())
      .then(setCategories)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  function pickCategory(category) {
    setAdd((a) => ({ category: category || '', rank: '', mandatory: a.mandatory }))
    clearErr('fs_category')
  }

  const changedRows = useMemo(() => rows.filter((r) => rowKey(r) !== orig[r.training_group_dtl_id]), [rows, orig])
  const hasChanges = isEdit ? changedRows.length > 0 : name.trim() !== ''

  function setRow(rowId, patch) {
    setRows((prev) => prev.map((r) => (r.training_group_dtl_id === rowId ? { ...r, ...patch } : r)))
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const shownRows = useMemo(() => {
    const q = rowQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => rowErrors[r.training_group_dtl_id] || `${r.rank_name} ${r.fs_category_name}`.toLowerCase().includes(q))
  }, [rows, rowQuery, rowErrors])

  async function handleCreate() {
    setError('')
    setFieldErrors({})
    setSaving(true)
    try {
      const res = await apiFetch(API, { method: 'POST', body: JSON.stringify({ training_group_hdr_name: name }) })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
        scrollToFirstFieldError()
        return
      }
      allowNextNavigation()
      toast.success('Group created — now add its ranks')
      navigate(`/qhse/training-group/${data.training_group_hdr_id}/edit`, { replace: true })
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function handleSwitchOff() {
    setSwitching(true)
    setError('')
    try {
      const res = await apiFetch(`${API}${id}/`, { method: 'PATCH', body: JSON.stringify({ training_group_hdr_active: 'N' }) })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        return
      }
      setConfirmOff(false)
      toast.success('Group made inactive — all its ranks were switched off')
      await Promise.all([loadHdr(), loadRows()])
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSwitching(false)
    }
  }

  async function handleAddRank() {
    setError('')
    setFieldErrors({})
    const missing = {}
    if (!add.category) missing.fs_category = 'This is required.'
    if (!add.rank) missing.rank = 'This is required.'
    if (!add.mandatory) missing.mandatory_training = 'This is required.'
    if (Object.keys(missing).length) {
      setFieldErrors(missing)
      showFormError(`Please choose ${[missing.fs_category && 'a Category', missing.rank && 'a Rank', missing.mandatory_training && 'Mandatory Training (Yes or No)'].filter(Boolean).join(', ')}.`, { setError, bannerRef })
      scrollToFirstFieldError()
      return
    }
    setAdding(true)
    try {
      const res = await apiFetch(RANKS_API, {
        method: 'POST',
        body: JSON.stringify({ hdr: Number(id), fs_category: Number(add.category), rank: Number(add.rank), mandatory_training: add.mandatory }),
      })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
        scrollToFirstFieldError()
        return
      }
      toast.success(`${data.rank_name} added`)
      setAdd((a) => ({ ...a, rank: '' }))
      setRankName('')
      setRankListVersion((v) => v + 1)
      await Promise.all([loadRows(), loadHdr()])
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setAdding(false)
    }
  }

  async function handleSaveRows() {
    setError('')
    const found = {}
    for (const r of changedRows) {
      if (r.mandatory_training !== 'Y' && r.mandatory_training !== 'N') found[r.training_group_dtl_id] = 'Choose Yes or No for Mandatory Training.'
    }
    setRowErrors(found)
    if (Object.keys(found).length) {
      const first = rows.find((r) => found[r.training_group_dtl_id])
      toast.error(`${first.rank_name}: ${found[first.training_group_dtl_id]}`)
      setError(`${Object.keys(found).length} rank(s) need fixing — they're outlined in red below.`)
      requestAnimationFrame(() => document.getElementById(`tg-row-${first.training_group_dtl_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setSaving(true)
    const failed = {}
    try {
      for (const r of changedRows) {
        const res = await apiFetch(`${RANKS_API}${r.training_group_dtl_id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ mandatory_training: r.mandatory_training, training_group_dtl_active: r.training_group_dtl_active }),
        })
        if (!res.ok) failed[r.training_group_dtl_id] = `${r.rank_name}: ${formatApiError(await res.json().catch(() => null), FIELD_LABELS)}`
      }
      if (Object.keys(failed).length) {
        setRowErrors(Object.fromEntries(Object.keys(failed).map((k) => [k, failed[k]])))
        showFormError(Object.values(failed).join('\n'), { setError, bannerRef })
      } else {
        allowNextNavigation()
        toast.success('Changes saved')
      }
      await loadRows()
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDeleteRow() {
    if (!deleteRow) return
    setDeletingRow(true)
    try {
      const res = await apiFetch(`${RANKS_API}${deleteRow.training_group_dtl_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        toast.success(`${deleteRow.rank_name} removed from the group`)
        setDeleteRow(null)
        setRankListVersion((v) => v + 1)
        await Promise.all([loadRows(), loadHdr()])
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || "Couldn't remove this rank. Please try again.")
      }
    } finally {
      setDeletingRow(false)
    }
  }

  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: isEdit && writable && !saving && hasChanges ? handleSaveRows : undefined,
  })

  if (notFound) return <Navigate to="/qhse/training-group" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const saveButton = (
    <Button onClick={handleSaveRows} disabled={saving || !hasChanges}>
      {saving ? 'Saving…' : 'Save changes'}
    </Button>
  )
  const heading = isEdit ? (hdr ? `Training Group — ${hdr.training_group_hdr_name}` : 'Training Group') : 'New Training Group'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {!isEdit && canAdd && (
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </Button>
        )}
        {isEdit && !loading && writable && saveButton}
      </div>

      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>
      )}
      {inactive && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">This group is inactive and can no longer be changed.</p>}
      {isEdit && !loading && !canWrite && !inactive && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to Training Group.</p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <Field label="Group Name" required error={fieldErrors.training_group_hdr_name}>
                <Input
                  value={name}
                  maxLength={30}
                  disabled={isEdit}
                  className={isEdit ? 'bg-muted' : ''}
                  onChange={(e) => {
                    setName(e.target.value)
                    clearErr('training_group_hdr_name')
                  }}
                />
              </Field>
              {isEdit && hdr && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">Active</Label>
                  <label className="flex h-9 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!inactive}
                      disabled={!writable}
                      onChange={() => setConfirmOff(true)}
                    />
                    <span className="text-muted-foreground">
                      {inactive ? 'Inactive — can’t be switched back on' : 'Untick to make this group, and all its ranks, inactive'}
                    </span>
                  </label>
                </div>
              )}
            </div>
            {!isEdit && <p className="mt-4 text-xs text-muted-foreground">The name can&apos;t be changed after the group is created. You&apos;ll add its ranks next.</p>}
          </div>

          {isEdit && (
            <div className="rounded-2xl border border-border bg-card p-4">
              {writable && (
                <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
                  <h2 className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">Add a rank</h2>
                  {categories && categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories are mapped to your account, so ranks can&apos;t be added. Ask an administrator.</p>
                  ) : (
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-4">
                      <Field label="Category" required error={fieldErrors.fs_category}>
                        <RemoteCombobox
                          field={CATEGORY_FIELD}
                          value={add.category || null}
                          labelValue={categoryName}
                          onChange={(v, raw) => {
                            setCategoryName(raw?.name || '')
                            pickCategory(v)
                          }}
                        />
                      </Field>
                      <Field label="Rank" required error={fieldErrors.rank}>
                        {add.category ? (
                          <RemoteCombobox
                            key={`${add.category}-${rankListVersion}`}
                            field={{ ...RANK_FIELD, remote: `${API}${id}/ranks/?category=${add.category}` }}
                            value={add.rank || null}
                            labelValue={rankName}
                            onChange={(v, raw) => {
                              setRankName(raw?.name || '')
                              setAdd((a) => ({ ...a, rank: v || '' }))
                              clearErr('rank')
                            }}
                          />
                        ) : (
                          <Input disabled placeholder="Select a category first" />
                        )}
                      </Field>
                      <Field label="Mandatory Training" required error={fieldErrors.mandatory_training}>
                        <select
                          value={add.mandatory}
                          onChange={(e) => {
                            setAdd((a) => ({ ...a, mandatory: e.target.value }))
                            clearErr('mandatory_training')
                          }}
                          className={selectCls}
                        >
                          <option value="">Select…</option>
                          <option value="Y">Yes</option>
                          <option value="N">No</option>
                        </select>
                      </Field>
                      <Button onClick={handleAddRank} disabled={adding}>
                        {adding ? 'Adding…' : 'Add rank'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
                <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Ranks in this group ({rows.length})</h2>
                <div className="flex items-center gap-2">
                  {rowQuery && (
                    <span className="text-xs text-muted-foreground">
                      Showing {shownRows.length} of {rows.length}
                    </span>
                  )}
                  <Input value={rowQuery} onChange={(e) => setRowQuery(e.target.value)} placeholder="Find a rank…" className="h-8 w-56" />
                </div>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-muted shadow-[0_1px_0_var(--border)]">
                    <tr>
                      {['Rank', 'Category', 'Mandatory Training', 'Active', ''].map((h) => (
                        <th key={h || 'x'} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No ranks in this group yet.</td>
                      </tr>
                    )}
                    {rows.length > 0 && shownRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No rank matches &ldquo;{rowQuery}&rdquo;.</td>
                      </tr>
                    )}
                    {shownRows.map((r, idx) => {
                      const rid = r.training_group_dtl_id
                      const dirty = rowKey(r) !== orig[rid]
                      const err = rowErrors[rid]
                      return (
                        <tr
                          key={rid}
                          id={`tg-row-${rid}`}
                          className={`border-t border-border/60 ${err ? 'bg-destructive/5' : dirty ? 'bg-amber-50 dark:bg-amber-950/20' : idx % 2 ? 'bg-muted/20' : ''}`}
                        >
                          <td className="px-3 py-1.5 font-medium">
                            {r.rank_name}
                            {r.is_repeat && (
                              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground" title="This rank appears more than once under this category in the group (from the old system)">
                                listed more than once
                              </span>
                            )}
                            {err && <span className="mt-0.5 block text-xs font-normal text-destructive">{err}</span>}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.fs_category_name}</td>
                          <td className="px-3 py-1.5">
                            <select
                              value={r.mandatory_training}
                              disabled={!writable}
                              onChange={(e) => setRow(rid, { mandatory_training: e.target.value })}
                              className={`h-8 rounded-md border border-input bg-transparent px-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-60 ${err ? invalidCls : ''}`}
                            >
                              {r.mandatory_training === '' && <option value="">Not set</option>}
                              <option value="Y">Yes</option>
                              <option value="N">No</option>
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              value={r.training_group_dtl_active}
                              disabled={!writable}
                              onChange={(e) => setRow(rid, { training_group_dtl_active: e.target.value })}
                              className="h-8 rounded-md border border-input bg-transparent px-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                            >
                              <option value="Y">Yes</option>
                              <option value="N">No</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {writable && (canEdit || canDelete) && (
                              <button
                                type="button"
                                title="Remove from group"
                                onClick={() => setDeleteRow(r)}
                                className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                              >
                                <IconTrash className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isEdit && writable && <div className="flex justify-end">{saveButton}</div>}
        </>
      )}

      <Dialog open={confirmOff} onOpenChange={(open) => !open && setConfirmOff(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make {hdr?.training_group_hdr_name} inactive?</DialogTitle>
            <DialogDescription>
              All {hdr?.active_dtl_count || 0} active ranks in it will be switched off too, and the group can&apos;t be changed or switched back on afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOff(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSwitchOff} disabled={switching}>
              {switching ? 'Saving…' : 'Make inactive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteRow)} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {deleteRow?.rank_name} from this group?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRow} disabled={deletingRow}>
              {deletingRow ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {leaveDialog}
    </div>
  )
}
