import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError } from '@/lib/errors'
import { FieldErrorScope, FieldFrame } from '@/components/FieldFrame'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { IconTrash } from '@/components/icons'
import RigLoading from '@/components/RigLoading'

const MENU_KEY = 'qhse.incident_actions'

const INCIDENT_FIELD = {
  type: 'search-remote',
  remote: '/api/qhse/incidents/',
  optionLabel: 'rig_incident_no',
  optionValue: 'incident_id',
  labelField: 'rig_incident_no',
  derives: {
    rig_name: 'rig_name',
    incident_date: 'incident_date',
    well_no: 'well_no',
    incident_type_name: 'incident_type_name',
  },
}

const STATUS_LABEL = { OP: 'Open', CL: 'Closed', IN: 'In Process' }
const STATUS_BADGE = {
  OP: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  CL: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  IN: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
}

const EMPTY_FORM = {
  incident: '',
  incident_label: '',
  rig_name: '',
  incident_date: '',
  well_no: '',
  incident_type_name: '',
  action_recommended: '',
  action_taken: '',
  action_party: '',
  target_date: '',
  completion_dt: '',
  action_status: 'OP',
}

const REQUIRED = 'This field is required.'
const FIELD_LABELS = {
  incident: 'Incident', action_recommended: 'Recommended Action', action_party: 'Action Party', target_date: 'Target Date',
  completion_dt: 'Actual Closure Date', action_status: 'Status', deleted_remarks: 'Reason for delete',
}

// Browser checks, mirroring IncidentActionSerializer: the Target Date and the Actual Closure Date can't be
// before the incident's own date.
function checkForm(form) {
  const e = {}
  if (!form.incident) e.incident = REQUIRED
  if (!form.action_recommended.trim()) e.action_recommended = REQUIRED
  if (!form.action_party.trim()) e.action_party = REQUIRED
  const incidentDay = (form.incident_date || '').slice(0, 10)
  if (incidentDay && form.target_date && form.target_date < incidentDay) e.target_date = 'Target Date must be on or after the Incident Date.'
  if (incidentDay && form.completion_dt && form.completion_dt < incidentDay) e.completion_dt = 'Actual Closure Date must be on or after the Incident Date.'
  return e
}

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtDate(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export default function IncidentActionsPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [form, setForm] = useState(EMPTY_FORM)
  // ?incident=<id> (for example from the Compliance Radar) opens with that incident already chosen.
  const [linkParams] = useSearchParams()
  const [editingId, setEditingId] = useState(null)
  const [rows, setRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteRemarks, setDeleteRemarks] = useState('')
  const [deleting, setDeleting] = useState(false)
  // Boxes outlined after a refused save. The outline goes away as soon as anything in the form is edited.
  const [fieldErrState, setFieldErrState] = useState({ at: null, errors: {} })
  const fieldErrors = fieldErrState.at === JSON.stringify([form, deleteRemarks]) ? fieldErrState.errors : {}
  function showErrors(data) {
    setFieldErrState({ at: JSON.stringify([form, deleteRemarks]), errors: buildFieldErrors(data, FIELD_LABELS) })
    toast.error(formatApiError(data, FIELD_LABELS))
    requestAnimationFrame(scrollToFirstFieldError)
  }

  usePageSubtitle(form.incident_label ? `Incident ${form.incident_label}` : null)

  function set(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function loadRows(incidentId) {
    if (!incidentId) {
      setRows([])
      return
    }
    setLoadingRows(true)
    apiFetch(`/api/qhse/incident-actions/?incident=${incidentId}`)
      .then((r) => r.json())
      .then((data) => setRows(data.results || []))
      .finally(() => setLoadingRows(false))
  }

  useEffect(() => {
    const id = linkParams.get('incident')
    if (!id || !/^\d+$/.test(id)) return
    let cancelled = false
    apiFetch(`/api/qhse/incidents/${id}/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        if (cancelled || !raw) return
        set({
          incident: raw.incident_id,
          incident_label: raw.rig_incident_no || '',
          rig_name: raw.rig_name || '',
          incident_date: raw.incident_date || '',
          well_no: raw.well_no || '',
          incident_type_name: raw.incident_type_name || '',
        })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadRows(form.incident)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.incident])

  function clearRow() {
    setEditingId(null)
    set({
      action_recommended: '',
      action_taken: '',
      action_party: '',
      target_date: '',
      completion_dt: '',
      action_status: 'OP',
    })
  }

  function selectRow(row) {
    if (row.action_status === 'CL') return // legacy hides Select/Delete once Closed
    setEditingId(row.incident_action_id)
    set({
      action_recommended: row.action_recommended || '',
      action_taken: row.action_taken || '',
      action_party: row.action_party || '',
      target_date: row.target_date || '',
      completion_dt: row.completion_dt || '',
      action_status: row.action_status || 'OP',
    })
  }

  async function save() {
    const found = checkForm(form)
    if (Object.keys(found).length) {
      showErrors(found)
      return
    }
    setSaving(true)
    try {
      const isEdit = Boolean(editingId)
      const payload = {
        incident: form.incident,
        action_recommended: form.action_recommended,
        action_taken: form.action_taken || null,
        action_party: form.action_party,
        target_date: form.target_date || null,
        ...(isEdit ? { completion_dt: form.completion_dt || null, action_status: form.action_status } : {}),
      }
      const res = await apiFetch(
        isEdit ? `/api/qhse/incident-actions/${editingId}/` : '/api/qhse/incident-actions/',
        { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
      )
      if (!res.ok) {
        showErrors((await res.json().catch(() => null)) || {})
        return
      }
      toast.success(isEdit ? 'Action updated' : 'Action added')
      clearRow()
      loadRows(form.incident)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (deleteRemarks.trim().length < 10) {
      showErrors({ deleted_remarks: 'Enter a reason for deleting this record (at least 10 characters).' })
      return
    }
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/incident-actions/${deleteTarget.incident_action_id}/`, {
        method: 'DELETE',
        body: JSON.stringify({ deleted_remarks: deleteRemarks.trim() }),
      })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.incident_action_id !== deleteTarget.incident_action_id))
        toast.success('Action deleted')
        if (editingId === deleteTarget.incident_action_id) clearRow()
        setDeleteTarget(null)
        setDeleteRemarks('')
      } else {
        showErrors((await res.json().catch(() => null)) || {})
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const incidentDay = (form.incident_date || '').slice(0, 10) || undefined

  return (
    <FieldErrorScope errors={fieldErrors} className="flex h-full flex-col gap-3">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label>* Incident</Label>
            <FieldFrame name="incident">
            <RemoteCombobox
              field={INCIDENT_FIELD}
              value={form.incident}
              labelValue={form.incident_label}
              onChange={(v, raw) =>
                set({
                  incident: v,
                  incident_label: raw?.rig_incident_no || '',
                  rig_name: raw?.rig_name || '',
                  incident_date: raw?.incident_date || '',
                  well_no: raw?.well_no || '',
                  incident_type_name: raw?.incident_type_name || '',
                })
              }
              disabled={!canAdd && !canEdit}
            />
            </FieldFrame>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rig/Unit</Label>
            <Input value={form.rig_name} disabled className="bg-muted/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Well No.</Label>
            <Input value={form.well_no} disabled className="bg-muted/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Incident Date/Time</Label>
            <Input value={fmtDateTime(form.incident_date)} disabled className="bg-muted/40" />
          </div>
        </div>
        <div className="mb-4">
          <Label>Nature of Incident</Label>
          <Input value={form.incident_type_name} disabled className="mt-1.5 bg-muted/40" />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>* Recommended Action (500 chars)</Label>
            <FieldFrame name="action_recommended">
              <Textarea
                value={form.action_recommended}
                onChange={(e) => set({ action_recommended: e.target.value })}
                maxLength={500}
                rows={4}
              />
            </FieldFrame>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Action Planned/Taken (250 chars)</Label>
            <Textarea
              value={form.action_taken}
              onChange={(e) => set({ action_taken: e.target.value })}
              maxLength={250}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>* Action Party (100 chars)</Label>
              <FieldFrame name="action_party">
                <Input value={form.action_party} onChange={(e) => set({ action_party: e.target.value })} maxLength={100} />
              </FieldFrame>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Target Date</Label>
              <FieldFrame name="target_date">
                <Input type="date" min={incidentDay} value={form.target_date} onChange={(e) => set({ target_date: e.target.value })} />
              </FieldFrame>
            </div>
            {editingId && (
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>Actual Closure Date</Label>
                  <FieldFrame name="completion_dt">
                    <Input
                      type="date"
                      min={incidentDay}
                      value={form.completion_dt}
                      onChange={(e) => set({ completion_dt: e.target.value, action_status: e.target.value ? 'CL' : form.action_status })}
                    />
                  </FieldFrame>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>Status</Label>
                  <select
                    value={form.action_status}
                    onChange={(e) => set({ action_status: e.target.value })}
                    disabled={Boolean(form.completion_dt)}
                    className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-60"
                  >
                    <option value="OP">Open</option>
                    <option value="IN">In Process</option>
                    <option value="CL">Closed</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!editingId && canAdd && (
            <Button onClick={save} disabled={saving || !form.incident}>
              {saving ? 'Adding…' : '+ Add'}
            </Button>
          )}
          {editingId && canEdit && (
            <Button onClick={save} disabled={saving}>
              {saving ? 'Updating…' : 'Update'}
            </Button>
          )}
          <Button variant="secondary" onClick={clearRow} disabled={saving}>
            Clear
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Recommended Action</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Action Taken</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Party</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Target</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Closure</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Status</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {!form.incident && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                  Select an incident above to see its recorded actions.
                </td>
              </tr>
            )}
            {form.incident && loadingRows && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground"><RigLoading /></td>
              </tr>
            )}
            {form.incident && !loadingRows && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No actions recorded for this incident yet.</td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const closed = r.action_status === 'CL'
              return (
                <tr
                  key={r.incident_action_id}
                  onClick={() => selectRow(r)}
                  className={`border-b border-border/60 ${closed ? '' : 'cursor-pointer hover:bg-accent/40'} ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                >
                  <td className="max-w-[260px] truncate px-3 py-2.5" title={r.action_recommended}>{r.action_recommended}</td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-muted-foreground" title={r.action_taken}>{r.action_taken || '—'}</td>
                  <td className="px-3 py-2.5">{r.action_party}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.target_date) || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.completion_dt) || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[r.action_status] || ''}`}>
                      {STATUS_LABEL[r.action_status] || r.action_status}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    {canDelete && !closed && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(r)
                          }}
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteRemarks('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this action?</DialogTitle>
            <DialogDescription>This can't be undone. Please give a reason (at least 10 characters).</DialogDescription>
          </DialogHeader>
          <FieldFrame name="deleted_remarks">
            <Textarea
              value={deleteRemarks}
              onChange={(e) => setDeleteRemarks(e.target.value)}
              placeholder="Reason for deleting this record…"
              rows={3}
            />
          </FieldFrame>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FieldErrorScope>
  )
}
