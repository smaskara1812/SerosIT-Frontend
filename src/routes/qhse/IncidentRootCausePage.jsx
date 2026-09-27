import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { formatApiError } from '@/lib/errors'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { IconTrash } from '@/components/icons'

const MENU_KEY = 'qhse.incident_root_cause'

const INCIDENT_FIELD = {
  type: 'search-remote',
  remote: '/api/qhse/incidents/',
  optionLabel: 'rig_incident_no',
  optionValue: 'incident_id',
  labelField: 'rig_incident_no',
  derives: { rig_name: 'rig_name', incident_date: 'incident_date' },
}
// scope=root: legacy's Incident_Cause_Category flag ('I' Immediate / 'R'
// Root / 'B' Both) — same lookup as Incident Details' own Immediate Cause
// pickers, scoped here to R/B only (see MstIncidentCauseViewSet.get_queryset).
const ROOT_CAUSE_FIELD = {
  type: 'search-remote',
  remote: '/api/masters/incident-causes/?scope=root',
  optionLabel: 'incident_cause_desc',
  optionValue: 'incident_cause_id',
  labelField: 'incident_cause_desc',
}
const ROOT_SUBCAUSE_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/incident-subcauses/',
  optionLabel: 'incident_subcause',
  optionValue: 'incident_subcause_id',
  labelField: 'incident_subcause',
  filterOptionField: 'incident_cause',
}

const EMPTY_FORM = {
  incident: '',
  incident_label: '',
  rig_name: '',
  incident_date: '',
  root_cause: '',
  root_cause_label: '',
  root_subcause: '',
  root_subcause_label: '',
  root_subcause_others: '',
}

// Every "Others" catch-all subcause is literally named "Others (...)" —
// matches core/incident_serializers.py's IncidentRootCauseSerializer.
// validate(), which is the actual enforcement; this is just the matching
// frontend hint/pre-check.
function isOthersSubcause(label) {
  return (label || '').trim().toLowerCase().startsWith('others')
}

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function IncidentRootCausePage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [rows, setRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteRemarks, setDeleteRemarks] = useState('')
  const [deleting, setDeleting] = useState(false)

  usePageSubtitle(form.incident_label ? `Incident ${form.incident_label}` : null)

  function set(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  useEffect(() => {
    if (!form.incident) {
      setRows([])
      return
    }
    setLoadingRows(true)
    apiFetch(`/api/qhse/incident-root-causes/?incident=${form.incident}`)
      .then((r) => r.json())
      .then((data) => setRows(data.results || []))
      .finally(() => setLoadingRows(false))
  }, [form.incident])

  function clearRow() {
    setEditingId(null)
    set({ root_cause: '', root_cause_label: '', root_subcause: '', root_subcause_label: '', root_subcause_others: '' })
  }

  function clearAll() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setRows([])
  }

  function selectRow(row) {
    setEditingId(row.incident_root_cause_id)
    set({
      root_cause: String(row.root_cause),
      root_cause_label: row.root_cause_name,
      root_subcause: String(row.root_subcause),
      root_subcause_label: row.root_subcause_name,
      root_subcause_others: row.root_subcause_others || '',
    })
  }

  async function save() {
    if (!form.incident) {
      toast.error('Incident must be selected')
      return
    }
    if (!form.root_cause) {
      toast.error('Root Cause must be selected')
      return
    }
    if (!form.root_subcause) {
      toast.error('Root Subcause must be selected')
      return
    }
    if (isOthersSubcause(form.root_subcause_label) && !form.root_subcause_others.trim()) {
      toast.error("Enter a description for this 'Others' subcause")
      return
    }
    setSaving(true)
    try {
      const payload = {
        incident: form.incident,
        root_cause: form.root_cause,
        root_subcause: form.root_subcause,
        root_subcause_others: form.root_subcause_others || null,
      }
      const isEdit = Boolean(editingId)
      const res = await apiFetch(
        isEdit ? `/api/qhse/incident-root-causes/${editingId}/` : '/api/qhse/incident-root-causes/',
        { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
      )
      if (!res.ok) {
        toast.error(formatApiError(await res.json().catch(() => null)))
        return
      }
      toast.success(isEdit ? 'Root cause updated' : 'Root cause added')
      clearRow()
      const listRes = await apiFetch(`/api/qhse/incident-root-causes/?incident=${form.incident}`)
      const data = await listRes.json()
      setRows(data.results || [])
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (deleteRemarks.trim().length < 10) {
      toast.error('Reason for delete must be at least 10 characters')
      return
    }
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/incident-root-causes/${deleteTarget.incident_root_cause_id}/`, {
        method: 'DELETE',
        body: JSON.stringify({ deleted_remarks: deleteRemarks.trim() }),
      })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.incident_root_cause_id !== deleteTarget.incident_root_cause_id))
        toast.success('Root cause deleted')
        if (editingId === deleteTarget.incident_root_cause_id) clearRow()
        setDeleteTarget(null)
        setDeleteRemarks('')
      } else {
        toast.error(formatApiError(await res.json().catch(() => null)))
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>* Incident</Label>
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
                })
              }
              disabled={!canAdd && !canEdit}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rig/Unit</Label>
            <Input value={form.rig_name} disabled className="bg-muted/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Incident Date/Time</Label>
            <Input value={fmtDateTime(form.incident_date)} disabled className="bg-muted/40" />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>* Root Cause</Label>
            <RemoteCombobox
              field={ROOT_CAUSE_FIELD}
              value={form.root_cause}
              labelValue={form.root_cause_label}
              onChange={(v, raw) =>
                set({ root_cause: v, root_cause_label: raw?.incident_cause_desc || '', root_subcause: '', root_subcause_label: '' })
              }
              disabled={!form.incident}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>* Root Subcause</Label>
            <RemoteCombobox
              field={ROOT_SUBCAUSE_FIELD}
              value={form.root_subcause}
              labelValue={form.root_subcause_label}
              filterValue={form.root_cause}
              onChange={(v, raw) => set({ root_subcause: v, root_subcause_label: raw?.incident_subcause || '' })}
              disabled={!form.root_cause}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{isOthersSubcause(form.root_subcause_label) ? '* Additional Details' : 'Additional Details'}</Label>
            <Input
              value={form.root_subcause_others}
              onChange={(e) => set({ root_subcause_others: e.target.value })}
              placeholder={isOthersSubcause(form.root_subcause_label) ? "Required — describe this 'Others' subcause" : 'Optional'}
              maxLength={100}
              className={
                isOthersSubcause(form.root_subcause_label) && !form.root_subcause_others.trim()
                  ? 'border-destructive/60 focus-visible:ring-destructive/40'
                  : ''
              }
            />
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
          <Button variant="outline" onClick={clearAll} disabled={saving}>
            Clear All
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Root Cause</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Root Subcause</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Additional Details</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {!form.incident && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                  Select an incident above to see its recorded root causes.
                </td>
              </tr>
            )}
            {form.incident && loadingRows && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {form.incident && !loadingRows && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">No root causes recorded for this incident yet.</td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr
                key={r.incident_root_cause_id}
                onClick={() => selectRow(r)}
                className={`cursor-pointer border-b border-border/60 hover:bg-accent/40 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
              >
                <td className="px-3 py-2.5">{r.root_cause_name}</td>
                <td className="px-3 py-2.5">{r.root_subcause_name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.root_subcause_others || '—'}</td>
                <td className="px-2 py-2.5">
                  {canDelete && (
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
            ))}
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
            <DialogTitle>Delete this root cause?</DialogTitle>
            <DialogDescription>This can't be undone. Please give a reason (at least 10 characters).</DialogDescription>
          </DialogHeader>
          <Textarea
            value={deleteRemarks}
            onChange={(e) => setDeleteRemarks(e.target.value)}
            placeholder="Reason for deleting this record…"
            rows={3}
          />
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
    </div>
  )
}
