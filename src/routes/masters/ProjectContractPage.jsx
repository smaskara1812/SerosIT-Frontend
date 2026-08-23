import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { RemoteCombobox, NullableDateField, isDateActive } from './MasterCrudPage'
import { IconSearch, IconChevronLeft, IconPlus, IconTrash } from '@/components/icons'

const MENU_KEY = 'masters.project_contract'
const API = '/api/masters/project-contracts/'
const LINES_API = '/api/masters/project-contract-lines/'

const LOCATION_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/locations/',
  optionLabel: 'location_name',
  optionValue: 'location_id',
  labelField: 'location_name',
}
const OPERATOR_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/operators/',
  optionLabel: 'operator_name',
  optionValue: 'operator_id',
  labelField: 'operator_name',
}
const RIG_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/rigs/',
  optionLabel: 'rig_name',
  optionValue: 'rig_id',
}

function emptyHeader() {
  return {
    location: null,
    location_name: '',
    operator: null,
    operator_name: '',
    prj_contract_no: '',
    prj_short_name: '',
    prj_start_dt: '',
    prj_end_dt: null,
  }
}

/** One rig-assignment row: Rig and Active From are fixed once created —
 * only Active To is ever edited in place, matching the legacy page's own
 * UX (add a new row instead of re-picking the rig for an existing one). */
function RigLineRow({ line, canEdit, canDelete, onUpdateDateTo, onDelete }) {
  const [dateTo, setDateTo] = useState(line.rig_active_to)
  const [saving, setSaving] = useState(false)

  async function commit(next) {
    if (next === line.rig_active_to) return
    setSaving(true)
    await onUpdateDateTo(line.prj_contract_dtl_id, next)
    setSaving(false)
  }

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-medium text-foreground">{line.rig_name}</td>
      <td className="px-3 py-2 text-muted-foreground">{line.rig_active_from}</td>
      <td className="px-3 py-2">
        <NullableDateField
          value={dateTo}
          onChange={(v) => {
            setDateTo(v)
            commit(v)
          }}
          disabled={!canEdit || saving}
        />
      </td>
      <td className="px-3 py-2 text-right">
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(line.prj_contract_dtl_id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete rig assignment"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

function AddRigLine({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [rig, setRig] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setRig(null)
    setDateFrom('')
    setDateTo(null)
    setOpen(false)
  }

  async function add() {
    if (!rig || !dateFrom) {
      toast.error('Rig and Active From are required')
      return
    }
    setSaving(true)
    const ok = await onAdd({ rig, rig_active_from: dateFrom, rig_active_to: dateTo })
    setSaving(false)
    if (ok) reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:border-[#1a3f7a]/40 hover:text-[#1a3f7a]"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Add rig assignment
      </button>
    )
  }

  return (
    <div className="mt-2 grid grid-cols-3 gap-3 rounded-lg border border-[#1a3f7a]/30 bg-[#eef3fb]/40 p-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Rig</Label>
        <RemoteCombobox field={RIG_FIELD} value={rig} onChange={setRig} disabled={saving} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Active From</Label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={saving} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Active To</Label>
        <NullableDateField value={dateTo} onChange={setDateTo} disabled={saving} />
      </div>
      <div className="col-span-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={reset} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={add} disabled={saving}>
          {saving ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </div>
  )
}

export default function ProjectContractPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const searchTimerRef = useRef(null)

  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyHeader())
  const [snapshot, setSnapshot] = useState(null)
  const [lines, setLines] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState(null)

  function loadContracts(pageNum, q) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(pageNum) })
    if (q) params.set('search', q)
    apiFetch(`${API}?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.results || [])
        setTotalCount(data.count ?? 0)
        setPages(Math.max(1, Math.ceil((data.count ?? 0) / 50)))
        setPage(pageNum)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadContracts(1, '')
  }, [])

  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => loadContracts(1, query), 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function loadDetail(id) {
    setLoadingDetail(true)
    return apiFetch(`${API}${id}/`)
      .then((r) => r.json())
      .then((data) => {
        const loaded = {
          location: data.location,
          location_name: data.location_name,
          operator: data.operator,
          operator_name: data.operator_name,
          prj_contract_no: data.prj_contract_no,
          prj_short_name: data.prj_short_name || '',
          prj_start_dt: data.prj_start_dt,
          prj_end_dt: data.prj_end_dt,
        }
        setForm(loaded)
        setSnapshot(JSON.stringify(loaded))
        setLines(data.lines || [])
      })
      .finally(() => setLoadingDetail(false))
  }

  function selectContract(id) {
    setCreating(false)
    setSelectedId(id)
    loadDetail(id)
  }

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setForm(emptyHeader())
    setSnapshot(null)
    setLines([])
  }

  const isDirty = creating
    ? Boolean(form.location && form.operator && form.prj_contract_no.trim() && form.prj_start_dt)
    : snapshot !== null && JSON.stringify(form) !== snapshot

  const canWrite = creating ? canAdd : canEdit

  async function handleSave() {
    setSaving(true)
    try {
      const isEdit = Boolean(selectedId)
      const body = {
        location: form.location,
        operator: form.operator,
        prj_contract_no: form.prj_contract_no.trim(),
        prj_short_name: form.prj_short_name.trim() || null,
        prj_start_dt: form.prj_start_dt,
        prj_end_dt: form.prj_end_dt || null,
      }
      const res = await apiFetch(isEdit ? `${API}${selectedId}/` : API, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data))
      toast.success(isEdit ? 'Contract saved' : 'Contract created')
      if (!isEdit) {
        setCreating(false)
        setSelectedId(data.prj_contract_id)
        await loadDetail(data.prj_contract_id)
      } else {
        setSnapshot(JSON.stringify(form))
      }
      loadContracts(page, query)
    } catch (e) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteClick() {
    const res = await apiFetch(`${API}${selectedId}/check-delete/`)
    const data = await res.json()
    setDeleteInfo(data)
  }

  async function confirmDelete() {
    const res = await apiFetch(`${API}${selectedId}/`, { method: 'DELETE' })
    setDeleteInfo(null)
    if (res.status === 204) {
      toast.success('Contract deleted')
      setSelectedId(null)
      loadContracts(1, query)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete')
    }
  }

  async function addLine({ rig, rig_active_from, rig_active_to }) {
    const res = await apiFetch(LINES_API, {
      method: 'POST',
      body: JSON.stringify({ contract: selectedId, rig, rig_active_from, rig_active_to }),
    })
    if (res.ok) {
      toast.success('Rig assignment added')
      await loadDetail(selectedId)
      return true
    }
    const data = await res.json().catch(() => ({}))
    toast.error(data.detail || 'Failed to add rig assignment')
    return false
  }

  async function updateLineDateTo(dtlId, rig_active_to) {
    const res = await apiFetch(`${LINES_API}${dtlId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ rig_active_to }),
    })
    if (res.ok) {
      toast.success('Updated')
      await loadDetail(selectedId)
    } else {
      toast.error('Failed to update')
    }
  }

  async function deleteLine(dtlId) {
    const res = await apiFetch(`${LINES_API}${dtlId}/`, { method: 'DELETE' })
    if (res.status === 204) {
      toast.success('Rig assignment removed')
      await loadDetail(selectedId)
    } else {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <Link
        to="/masters"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        All Masters
      </Link>
      <div className="flex flex-1 gap-5 overflow-hidden">
        <div className="flex w-[320px] shrink-0 flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between p-3 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Project Contract
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                {totalCount}
              </span>
              {canAdd && (
                <Button size="sm" onClick={startCreate}>
                  + New
                </Button>
              )}
            </div>
          </div>
          <div className="px-3 pb-3">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contract no, location, operator…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto border-t border-border">
            {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
            {!loading && rows.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No contracts found.</p>
            )}
            {rows.map((r) => (
              <button
                key={r.prj_contract_id}
                type="button"
                onClick={() => selectContract(r.prj_contract_id)}
                className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                  selectedId === r.prj_contract_id ? 'bg-accent' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {r.location_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.operator_name} · {r.prj_contract_no}
                  </p>
                </div>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isDateActive(r.prj_end_dt) ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border p-2.5">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadContracts(page - 1, query)}>
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => loadContracts(page + 1, query)}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card">
          {!creating && !selectedId && (
            <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
              Select a contract, or create a new one.
            </div>
          )}

          {(creating || selectedId) && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="text-base font-semibold text-foreground">
                  {creating ? 'New Project Contract' : form.prj_contract_no}
                </h2>
                {selectedId && canDelete && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                    <IconTrash className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="p-4">
                {loadingDetail && <p className="text-sm text-muted-foreground">Loading…</p>}

                {!loadingDetail && (
                  <>
                    <div className="grid max-w-2xl grid-cols-2 gap-4">
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <Label>Location</Label>
                        <RemoteCombobox
                          field={LOCATION_FIELD}
                          value={form.location}
                          onChange={(v) => setForm({ ...form, location: v })}
                          disabled={!canWrite}
                          labelValue={form.location_name}
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <Label>Operator</Label>
                        <RemoteCombobox
                          field={OPERATOR_FIELD}
                          value={form.operator}
                          onChange={(v) => setForm({ ...form, operator: v })}
                          disabled={!canWrite}
                          labelValue={form.operator_name}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Short Name</Label>
                        <Input
                          value={form.prj_short_name}
                          onChange={(e) => setForm({ ...form, prj_short_name: e.target.value })}
                          disabled={!canWrite}
                          maxLength={10}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Contract No.</Label>
                        <Input
                          value={form.prj_contract_no}
                          onChange={(e) => setForm({ ...form, prj_contract_no: e.target.value })}
                          disabled={!canWrite}
                          maxLength={110}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={form.prj_start_dt || ''}
                          onChange={(e) => setForm({ ...form, prj_start_dt: e.target.value })}
                          disabled={!canWrite}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Close Date</Label>
                        <NullableDateField
                          value={form.prj_end_dt}
                          onChange={(v) => setForm({ ...form, prj_end_dt: v })}
                          disabled={!canWrite}
                        />
                      </div>
                    </div>

                    {canWrite && (
                      <Button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        variant={isDirty ? 'default' : 'secondary'}
                        className="mt-5"
                      >
                        {saving ? 'Saving…' : creating ? 'Create' : isDirty ? 'Save changes' : 'Saved'}
                      </Button>
                    )}

                    {selectedId && (
                      <div className="mt-6 max-w-2xl">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Rig Assignments
                          </p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                            {lines.length}
                          </span>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                                <th className="px-3 py-2 font-medium">Rig</th>
                                <th className="px-3 py-2 font-medium">Active From</th>
                                <th className="px-3 py-2 font-medium">Active To</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-muted-foreground">
                                    No rigs added yet.
                                  </td>
                                </tr>
                              )}
                              {lines.map((l) => (
                                <RigLineRow
                                  key={l.prj_contract_dtl_id}
                                  line={l}
                                  canEdit={canEdit}
                                  canDelete={canDelete}
                                  onUpdateDateTo={updateLineDateTo}
                                  onDelete={deleteLine}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {canAdd && <AddRigLine onAdd={addLine} />}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(deleteInfo)} onOpenChange={(open) => !open && setDeleteInfo(null)}>
        <DialogContent>
          {deleteInfo?.can_delete ? (
            <DialogHeader>
              <DialogTitle>Delete this contract?</DialogTitle>
              <DialogDescription>
                This will also delete all its rig assignments. This can't be undone.
              </DialogDescription>
            </DialogHeader>
          ) : (
            <DialogHeader>
              <DialogTitle>Can't delete this</DialogTitle>
              <DialogDescription render={<ul className="space-y-1" />}>
                {deleteInfo?.references.map((r) => (
                  <li key={r.label}>
                    Referenced by {r.count} {r.label}
                  </li>
                ))}
              </DialogDescription>
            </DialogHeader>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteInfo(null)}>
              {deleteInfo?.can_delete ? 'Cancel' : 'Close'}
            </Button>
            {deleteInfo?.can_delete && (
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
