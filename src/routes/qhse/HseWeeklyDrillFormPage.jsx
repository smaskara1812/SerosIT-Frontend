import { useEffect, useState, useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldErrorScope, FieldFrame } from '@/components/FieldFrame'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { YearSelect } from '@/components/PeriodSelects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconTrash } from '@/components/icons'
import { Pencil } from 'lucide-react'

const FIELD_LABELS = { rig: 'Rig', year: 'Year', drill_week: 'Week' }

const MENU_KEY = 'qhse.hse_weekly_drill'
const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function Field({ label, name, required, children, hint, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame name={name}>{children}</FieldFrame>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function PlainSelect({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || '')}
      disabled={disabled}
      className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const EMPTY_ROW = { drill: '', conducted: '', last: '', remarks: '' }

function DrillsPanel({ hdrId, canAdd, canEdit, canDelete, onCountChange }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState([])
  const [row, setRow] = useState(EMPTY_ROW)
  const [lastLocked, setLastLocked] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function loadAll() {
    apiFetch(`/api/qhse/hse-weekly-drill-details/?hdr=${hdrId}&page_size=500`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.results || []
        setRows(list)
        onCountChange?.(list.length)
      })
      .finally(() => setLoading(false))
    apiFetch(`/api/qhse/hse-weekly-drill/${hdrId}/drills/`)
      .then((r) => r.json())
      .then((d) => setOptions(Array.isArray(d) ? d : []))
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hdrId])

  function reset() {
    setRow(EMPTY_ROW)
    setLastLocked(false)
    setEditingId(null)
  }

  // Legacy's onchange on Conducted Date: first time this rig records the
  // drill → user types Last Conducted Date; otherwise it's filled and locked.
  async function refreshLast(drill, conducted) {
    if (!drill || !conducted) return
    const res = await apiFetch(`/api/qhse/hse-weekly-drill/${hdrId}/last-conducted/?drill=${drill}&date=${conducted}`)
    if (!res.ok) return
    const d = await res.json()
    setLastLocked(!d.first_time)
    setRow((r) => ({ ...r, last: d.first_time ? '' : d.last_conducted_dt }))
  }

  function startEdit(r) {
    setEditingId(r.hse_weekly_drill_dtl_id)
    setRow({ drill: String(r.hse_drill), conducted: r.drill_conducted_dt, last: r.drill_last_conducted_dt || '', remarks: r.remarks || '' })
    setLastLocked(true)
  }

  async function save() {
    if (!row.drill) return toast.error('Drill must be selected')
    if (!row.conducted) return toast.error('Drill Conducted Date is required')
    if (!editingId && !row.last) return toast.error('Last Drill Conducted Date is required')
    setSaving(true)
    try {
      const isEdit = Boolean(editingId)
      const payload = isEdit
        ? { drill_conducted_dt: row.conducted, remarks: row.remarks.trim() || null }
        : {
            hdr: hdrId,
            hse_drill: row.drill,
            drill_conducted_dt: row.conducted,
            drill_last_conducted_dt: row.last || null,
            remarks: row.remarks.trim() || null,
          }
      const res = await apiFetch(
        isEdit ? `/api/qhse/hse-weekly-drill-details/${editingId}/` : '/api/qhse/hse-weekly-drill-details/',
        { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
      )
      if (!res.ok) {
        toast.error(formatApiError(await res.json().catch(() => null)))
        return
      }
      toast.success(isEdit ? 'Drill updated' : 'Drill added')
      reset()
      loadAll()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/hse-weekly-drill-details/${deleteTarget.hse_weekly_drill_dtl_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        toast.success('Drill deleted')
        if (editingId === deleteTarget.hse_weekly_drill_dtl_id) reset()
        setDeleteTarget(null)
        loadAll()
      } else {
        toast.error(formatApiError(await res.json().catch(() => null)))
      }
    } finally {
      setDeleting(false)
    }
  }

  const showForm = editingId ? canEdit : canAdd
  const isEditing = Boolean(editingId)

  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <h2 className="mb-1 text-xs font-bold tracking-widest text-muted-foreground uppercase">Drills conducted this week</h2>
      <p className="mb-4 text-xs text-muted-foreground">Add each drill carried out in this week and the date it was conducted.</p>

      {showForm && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="HSE Drill" required className="lg:col-span-2">
              {isEditing ? (
                <Input value={rows.find((r) => r.hse_weekly_drill_dtl_id === editingId)?.hse_drill_name || ''} disabled className="bg-muted" />
              ) : (
                <PlainSelect
                  value={row.drill}
                  onChange={(v) => {
                    setRow((r) => ({ ...r, drill: v, last: '' }))
                    setLastLocked(false)
                    refreshLast(v, row.conducted)
                  }}
                  options={options}
                  placeholder={options.length ? 'Select a drill…' : 'No drills left to add'}
                />
              )}
            </Field>
            <Field label="Drill Conducted Date" required>
              <Input
                type="date"
                value={row.conducted}
                onChange={(e) => {
                  setRow((r) => ({ ...r, conducted: e.target.value }))
                  if (!isEditing) refreshLast(row.drill, e.target.value)
                }}
              />
            </Field>
            <Field
              label="Last Drill Conducted Date"
              required
              hint={isEditing || lastLocked ? undefined : row.drill && row.conducted ? 'First entry for this drill on this rig — enter it yourself.' : undefined}
            >
              <Input
                type="date"
                value={row.last}
                onChange={(e) => setRow((r) => ({ ...r, last: e.target.value }))}
                disabled={isEditing || lastLocked || !row.drill || !row.conducted}
                className={isEditing || lastLocked ? 'bg-muted' : ''}
              />
            </Field>
          </div>
          <Field label="Remarks (150 chars)">
            <Textarea value={row.remarks} onChange={(e) => setRow((r) => ({ ...r, remarks: e.target.value }))} maxLength={150} rows={2} />
          </Field>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Update' : '+ Insert'}
            </Button>
            {isEditing && (
              <Button size="sm" variant="secondary" onClick={reset} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['HSE Drill', 'Drill Conducted', 'Last Conducted', 'Remarks'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
              ))}
              <th className="w-20 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-5 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-5 text-center text-sm text-muted-foreground">No drills added yet.</td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={r.hse_weekly_drill_dtl_id} className={`border-t border-border/60 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                <td className="px-3 py-2 font-medium">{r.hse_drill_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.drill_conducted_dt)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.drill_last_conducted_dt)}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.remarks || '—'}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <button type="button" title="Edit" onClick={() => startEdit(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" title="Delete" onClick={() => setDeleteTarget(r)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.hse_drill_name}?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
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

export default function HseWeeklyDrillFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState({ rig: null, rig_name: '', year: '', week: '' })
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const clearErr = (k) => setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev))
  const bannerRef = useRef(null)

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`/api/qhse/hse-weekly-drill/${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((d) => setForm({ rig: d.rig, rig_name: d.rig_name, year: String(d.year), week: String(d.drill_week) }))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // Legacy: once Rig + a full 4-digit Year are in, Week fills itself in
  // (the rig's last week that year + 1) — still editable afterwards.
  useEffect(() => {
    if (isEdit || !form.rig || !/^\d{4}$/.test(form.year)) return
    let cancelled = false
    apiFetch(`/api/qhse/hse-weekly-drill/next-week/?rig=${form.rig}&year=${form.year}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.week) setForm((f) => ({ ...f, week: String(d.week) }))
      })
    return () => {
      cancelled = true
    }
  }, [form.rig, form.year, isEdit])

  async function handleAdd() {
    setError('')
    setFieldErrors({})
    const stop = (key, msg) => {
      setFieldErrors({ [key]: 'This is required.' })
      showFormError(msg, { setError, bannerRef })
      scrollToFirstFieldError()
    }
    if (!form.rig) return stop('rig', 'Please choose a Rig.')
    if (!/^\d{4}$/.test(form.year)) return stop('year', 'Please choose a Year.')
    if (!form.week) return stop('drill_week', 'Please enter the Week number.')
    setSaving(true)
    try {
      const res = await apiFetch('/api/qhse/hse-weekly-drill/', {
        method: 'POST',
        body: JSON.stringify({ rig: form.rig, year: Number(form.year), drill_week: Number(form.week) }),
      })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
        scrollToFirstFieldError()
        return
      }
      toast.success('Weekly drill record added — now add the drills conducted')
      navigate(`/qhse/hse-weekly-drill/${data.hse_weekly_drill_hdr_id}/edit`, { replace: true })
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <Navigate to="/qhse/hse-weekly-drill" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />
  if (!isEdit && !can(user, MENU_KEY, 'add')) return <AccessDenied />

  return (
    <FieldErrorScope errors={fieldErrors} className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">
          {isEdit ? (form.rig_name ? `${form.rig_name} — ${form.year} Week ${form.week}` : 'HSE Weekly Drill') : 'New HSE Weekly Drill'}
        </h1>
        {!isEdit && (
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </Button>
        )}
      </div>

      {error && <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3">
              <Field name="rig" label="Rig" required>
                {isEdit ? (
                  <Input value={form.rig_name} disabled className="bg-muted" />
                ) : (
                  <RemoteCombobox
                    field={RIG_FIELD}
                    value={form.rig}
                    labelValue={form.rig_name}
                    onChange={(v, raw) => {
                      clearErr('rig')
                      setForm((f) => ({ ...f, rig: v, rig_name: raw?.rig_name || '', week: '' }))
                    }}
                  />
                )}
              </Field>
              <Field name="year" label="Year" required>
                <YearSelect value={form.year} disabled={isEdit} onChange={(v) => {
                  clearErr('year')
                  setForm((f) => ({ ...f, year: v, week: '' }))
                }} />
              </Field>
              <Field name="drill_week" label="Week" required hint={isEdit ? undefined : 'Fills in after Rig and Year — you can change it.'}>
                <Input
                  type="number"
                  min={1}
                  max={53}
                  value={form.week}
                  disabled={isEdit}
                  className={isEdit ? 'bg-muted' : ''}
                  onChange={(e) => {
                    clearErr('drill_week')
                    setForm((f) => ({ ...f, week: e.target.value }))
                  }}
                />
              </Field>
            </div>
          </div>

          {isEdit && (
            <DrillsPanel
              hdrId={id}
              canAdd={can(user, MENU_KEY, 'add')}
              canEdit={can(user, MENU_KEY, 'edit')}
              canDelete={can(user, MENU_KEY, 'delete')}
            />
          )}
        </>
      )}
    </FieldErrorScope>
  )
}
