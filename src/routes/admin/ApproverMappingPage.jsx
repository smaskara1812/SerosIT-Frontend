import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RemoteCombobox, TilePicker } from '@/routes/masters/MasterCrudPage'
import { IconSearch, IconTrash, IconPlus } from '@/components/icons'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'

const MENU_KEY = 'admin.approver_mapping'
const API = '/api/masters/approver-mappings/'

const APPROVAL_CODE_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/approval-codes/',
  optionLabel: 'approval_code',
  optionValue: 'approval_code_id',
  labelField: 'approval_code',
}
const USER_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/users/',
  optionLabel: 'display_name',
  optionValue: 'user_id',
  labelField: 'display_name',
}
const RIG_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/rigs/',
  optionLabel: 'rig_name',
  optionValue: 'rig_id',
  labelField: 'rig_name',
}
const DEPT_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/departments/',
  optionLabel: 'dept_dispname',
  optionValue: 'dept_id',
  labelField: 'dept_dispname',
}

const ACTIVE_OPTIONS = [
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' },
]

const SORT_OPTIONS = [
  { value: 'approval_code', label: 'Approval Code (A–Z)' },
  { value: '-approval_code', label: 'Approval Code (Z–A)' },
  { value: 'level', label: 'Level (Low–High)' },
  { value: '-level', label: 'Level (High–Low)' },
  { value: 'user', label: 'User (A–Z)' },
  { value: '-user', label: 'User (Z–A)' },
]

function emptyFilters() {
  return {
    approval_code: null,
    approval_code_label: '',
    rig: null,
    rig_label: '',
    active: '',
    ordering: 'approval_code',
  }
}

function emptyForm() {
  return {
    approval_code: null,
    approval_code_label: '',
    approver_user: null,
    approver_user_label: '',
    approver_level: '1',
    approver_active: 'Y',
    details: [],
  }
}

function emptyNewRow() {
  return {
    rig: null,
    rig_label: '',
    dept: null,
    dept_label: '',
    receive_mail: null,
    approve_yn: null,
    open_for_revision_yn: null,
    create_yn: null,
  }
}

// A single Y/NULL flag checkbox — matches MasterCrudPage's flag-id
// convention (blank/NULL is "off", only an explicit 'Y' is "on"), since
// these four columns use exactly that legacy convention.
function FlagCheckbox({ value, onChange, disabled }) {
  return (
    <input
      type="checkbox"
      checked={value === 'Y'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked ? 'Y' : null)}
      className="h-4 w-4 rounded border-input accent-[#1a3f7a] disabled:opacity-50"
    />
  )
}

export default function ApproverMappingPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(emptyFilters())
  const [showFilters, setShowFilters] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState(emptyForm())
  const [snapshot, setSnapshot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [addingRow, setAddingRow] = useState(false)
  const [newRow, setNewRow] = useState(emptyNewRow())

  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)
  const skipNextLoadRef = useRef(true)

  const activeFilterCount = [filters.approval_code, filters.rig, filters.active].filter(Boolean).length

  function buildFilterParams(searchQuery) {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filters.approval_code) params.set('approval_code', filters.approval_code)
    if (filters.rig) params.set('details__rig', filters.rig)
    if (filters.active) params.set('active', filters.active)
    if (filters.ordering) params.set('ordering', filters.ordering)
    return params
  }

  function loadPage(pageNum, searchQuery, { append } = {}) {
    const thisRequest = ++requestIdRef.current
    const params = buildFilterParams(searchQuery)
    params.set('page', String(pageNum))
    if (append) setLoadingMore(true)
    else setLoading(true)
    apiFetch(`${API}?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        const results = Array.isArray(data) ? data : data.results || []
        setRows((prev) => (append ? [...prev, ...results] : results))
        setTotalCount(Array.isArray(data) ? results.length : (data.count ?? results.length))
        setHasMore(!Array.isArray(data) && Boolean(data.next))
        setPage(pageNum)
      })
      .finally(() => {
        if (thisRequest !== requestIdRef.current) return
        setLoading(false)
        setLoadingMore(false)
      })
  }

  function loadMore() {
    if (loadingMore || !hasMore) return
    loadPage(page + 1, query, { append: true })
  }

  function handleListScroll(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMore()
  }

  useEffect(() => {
    loadPage(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Only the filters effect below (declared after this one) clears the
    // flag — same convention as Drilling Information, so the mount effect
    // above doesn't trigger a redundant reload from either this effect or
    // the filters one firing on their own initial mount.
    if (skipNextLoadRef.current) return
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0
      loadPage(1, query)
    }, 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Filter/sort changes reload immediately — discrete picks, not keystrokes,
  // same convention as Drilling Information's own filters effect.
  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }
    if (listRef.current) listRef.current.scrollTop = 0
    loadPage(1, query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setForm(emptyForm())
    setSnapshot(null)
    setAddingRow(false)
    setNewRow(emptyNewRow())
  }

  function selectRow(row) {
    setCreating(false)
    setSelectedId(row.approver_mapping_id)
    const loaded = {
      approval_code: row.approval_code,
      approval_code_label: row.approval_code_name,
      approver_user: row.approver_user,
      approver_user_label: row.approver_user_name ? `${row.approver_user_name} (${row.approver_login_id})` : '',
      approver_level: String(row.approver_level),
      approver_active: row.approver_active === 'Y' ? 'Y' : 'N',
      details: (row.details || []).map((d) => ({
        approver_mapping_dtl_id: d.approver_mapping_dtl_id,
        rig: d.rig,
        rig_label: d.rig_name,
        dept: d.dept,
        dept_label: d.dept_name,
        receive_mail: d.receive_mail,
        approve_yn: d.approve_yn,
        open_for_revision_yn: d.open_for_revision_yn,
        create_yn: d.create_yn,
      })),
    }
    setForm(loaded)
    setSnapshot(JSON.stringify(loaded))
    setAddingRow(false)
    setNewRow(emptyNewRow())
  }

  function updateDetailFlag(index, field, value) {
    setForm((f) => {
      const details = [...f.details]
      details[index] = { ...details[index], [field]: value }
      return { ...f, details }
    })
  }

  function removeDetailRow(index) {
    setForm((f) => ({ ...f, details: f.details.filter((_, i) => i !== index) }))
  }

  function addDetailRow() {
    if (!newRow.rig) {
      toast.error('Rig is required for a new row')
      return
    }
    setForm((f) => ({ ...f, details: [...f.details, newRow] }))
    setNewRow(emptyNewRow())
    setAddingRow(false)
  }

  function buildPayload() {
    if (!form.approval_code) return { error: 'Approval Code is required' }
    if (!form.approver_user) return { error: 'User is required' }
    if (!form.approver_level) return { error: 'Level is required' }
    if (form.details.length === 0) return { error: 'At least one Rig scope row is required' }

    return {
      payload: {
        approval_code: form.approval_code,
        approver_user: form.approver_user,
        approver_level: Number(form.approver_level),
        approver_active: form.approver_active,
        details: form.details.map((d) => ({
          ...(d.approver_mapping_dtl_id ? { approver_mapping_dtl_id: d.approver_mapping_dtl_id } : {}),
          rig: d.rig,
          dept: d.dept || null,
          receive_mail: d.receive_mail,
          approve_yn: d.approve_yn,
          open_for_revision_yn: d.open_for_revision_yn,
          create_yn: d.create_yn,
        })),
      },
    }
  }

  async function save() {
    const { payload, error } = buildPayload()
    if (error) {
      toast.error(error)
      return
    }
    setSaving(true)
    const isCreate = creating
    const res = await apiFetch(isCreate ? API : `${API}${selectedId}/`, {
      method: isCreate ? 'POST' : 'PATCH',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(isCreate ? 'Approver mapping created' : 'Approver mapping saved')
      const data = await res.json()
      loadPage(1, query)
      selectRow(data)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.detail || data.error || 'Failed to save')
    }
  }

  async function remove() {
    if (!selectedId) return
    const res = await apiFetch(`${API}${selectedId}/`, { method: 'DELETE' })
    setConfirmingDelete(false)
    if (res.status === 204) {
      toast.success('Approver mapping deleted')
      setSelectedId(null)
      setForm(emptyForm())
      setSnapshot(null)
      loadPage(1, query)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete')
    }
  }

  const showForm = creating || selectedId != null
  const disabled = !creating && !canEdit
  const isDirty = creating ? !buildPayload().error : snapshot !== null && JSON.stringify(form) !== snapshot


  const hasChanges = creating
    ? JSON.stringify(form) !== JSON.stringify(emptyForm())
    : snapshot !== null && isDirty
  const { dialog: leaveDialog, confirmLeave } = useUnsavedChanges(hasChanges, {
    onSave: isDirty && !saving ? save : undefined,
  })
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-1 gap-5 overflow-hidden">
        <div className="flex w-[320px] shrink-0 flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between p-3 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Approver Mapping
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                {totalCount}
              </span>
            </div>
            {canAdd && (
              <Button size="sm" onClick={() => confirmLeave(startCreate)}>
                + New
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2 px-3 pb-3">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex h-8 items-center gap-1.5 self-start rounded-lg border border-input px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            {showFilters && (
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Approval Code</span>
                  <RemoteCombobox
                    field={APPROVAL_CODE_FIELD}
                    value={filters.approval_code}
                    onChange={(id) => setFilters((f) => ({ ...f, approval_code: id }))}
                    labelValue={filters.approval_code_label}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Rig</span>
                  <RemoteCombobox
                    field={RIG_FIELD}
                    value={filters.rig}
                    onChange={(id) => setFilters((f) => ({ ...f, rig: id }))}
                    labelValue={filters.rig_label}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[{ value: '', label: 'All' }, ...ACTIVE_OPTIONS].map((o) => (
                      <button
                        key={o.value || 'all'}
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, active: o.value }))}
                        className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                          filters.active === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Sort by</span>
                  <select
                    value={filters.ordering}
                    onChange={(e) => setFilters((f) => ({ ...f, ordering: e.target.value }))}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...emptyFilters(), ordering: f.ordering }))}
                    className="self-start text-xs font-medium text-[#2563eb] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto border-t border-border">
            {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
            {!loading && rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No records found.</p>}
            {rows.map((r) => (
              <button
                key={r.approver_mapping_id}
                type="button"
                onClick={() => confirmLeave(() => selectRow(r))}
                className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                  selectedId === r.approver_mapping_id ? 'bg-accent' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{r.approval_code_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.approver_user_name} ({r.approver_login_id}) — L{r.approver_level}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r.approver_active === 'Y' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r.approver_active === 'Y' ? 'Active' : 'Inactive'}
                </span>
              </button>
            ))}
            {loadingMore && <p className="p-3 text-center text-xs text-muted-foreground">Loading more…</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-5">
          {!showForm && <p className="text-sm text-muted-foreground">Select a record, or create a new one.</p>}
          {showForm && (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {creating ? 'New Approver Mapping' : `${form.approval_code_label} — L${form.approver_level}`}
                </p>
                {!creating && canDelete && (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
                    <IconTrash className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Approval Code</Label>
                  <RemoteCombobox
                    field={APPROVAL_CODE_FIELD}
                    value={form.approval_code}
                    onChange={(id) => setForm((f) => ({ ...f, approval_code: id }))}
                    labelValue={form.approval_code_label}
                    disabled={disabled}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>User</Label>
                  <RemoteCombobox
                    field={USER_FIELD}
                    value={form.approver_user}
                    onChange={(id) => setForm((f) => ({ ...f, approver_user: id }))}
                    labelValue={form.approver_user_label}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Level</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.approver_level}
                    onChange={(e) => setForm((f) => ({ ...f, approver_level: e.target.value }))}
                    disabled={disabled}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Active</Label>
                  <TilePicker
                    options={ACTIVE_OPTIONS}
                    value={form.approver_active}
                    onChange={(v) => setForm((f) => ({ ...f, approver_active: v }))}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label>Rig / Department Scope</Label>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => setAddingRow((v) => !v)}
                      className="flex items-center gap-1 rounded-lg border border-input px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <IconPlus className="h-3.5 w-3.5" /> Add row
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2 text-left">Rig</th>
                        <th className="px-2 py-2 text-left">Dept</th>
                        <th className="px-2 py-2 text-center">Mail</th>
                        <th className="px-2 py-2 text-center">Approve</th>
                        <th className="px-2 py-2 text-center">Revise</th>
                        <th className="px-2 py-2 text-center">Create</th>
                        {!disabled && <th className="px-2 py-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {form.details.length === 0 && !addingRow && (
                        <tr>
                          <td colSpan={7} className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No rows yet.
                          </td>
                        </tr>
                      )}
                      {form.details.map((d, i) => (
                        <tr key={d.approver_mapping_dtl_id ?? `new-${i}`} className="border-b border-border/60 last:border-b-0">
                          <td className="px-2 py-1.5 font-medium text-foreground">{d.rig_label || d.rig}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{d.dept_label || '—'}</td>
                          <td className="px-2 py-1.5 text-center">
                            <FlagCheckbox value={d.receive_mail} onChange={(v) => updateDetailFlag(i, 'receive_mail', v)} disabled={disabled} />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <FlagCheckbox value={d.approve_yn} onChange={(v) => updateDetailFlag(i, 'approve_yn', v)} disabled={disabled} />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <FlagCheckbox
                              value={d.open_for_revision_yn}
                              onChange={(v) => updateDetailFlag(i, 'open_for_revision_yn', v)}
                              disabled={disabled}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <FlagCheckbox value={d.create_yn} onChange={(v) => updateDetailFlag(i, 'create_yn', v)} disabled={disabled} />
                          </td>
                          {!disabled && (
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeDetailRow(i)}
                                className="text-muted-foreground transition-colors hover:text-destructive"
                              >
                                <IconTrash className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {addingRow && (
                        <tr className="border-t border-dashed border-border bg-muted/20">
                          <td className="px-2 py-2">
                            <RemoteCombobox
                              field={RIG_FIELD}
                              value={newRow.rig}
                              onChange={(id) => setNewRow((r) => ({ ...r, rig: id }))}
                              labelValue={newRow.rig_label}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <RemoteCombobox
                              field={DEPT_FIELD}
                              value={newRow.dept}
                              onChange={(id) => setNewRow((r) => ({ ...r, dept: id }))}
                              labelValue={newRow.dept_label}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FlagCheckbox value={newRow.receive_mail} onChange={(v) => setNewRow((r) => ({ ...r, receive_mail: v }))} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FlagCheckbox value={newRow.approve_yn} onChange={(v) => setNewRow((r) => ({ ...r, approve_yn: v }))} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FlagCheckbox
                              value={newRow.open_for_revision_yn}
                              onChange={(v) => setNewRow((r) => ({ ...r, open_for_revision_yn: v }))}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FlagCheckbox value={newRow.create_yn} onChange={(v) => setNewRow((r) => ({ ...r, create_yn: v }))} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Button size="sm" onClick={addDetailRow}>
                              Insert
                            </Button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {(creating ? canAdd : canEdit) && (
                <div>
                  <Button onClick={save} disabled={saving || !isDirty} variant={isDirty ? 'default' : 'secondary'}>
                    {saving ? 'Saving…' : creating ? 'Create' : isDirty ? 'Save changes' : 'Saved'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this mapping?</DialogTitle>
            <DialogDescription>This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {leaveDialog}
    </div>
  )
}
