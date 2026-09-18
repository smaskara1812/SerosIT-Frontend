import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RemoteCombobox, TilePicker } from '@/routes/masters/MasterCrudPage'
import { formatApiError } from '@/lib/errors'
import { IconChevronLeft, IconTrash, IconPlus } from '@/components/icons'
import { Download, Check, X, ShieldCheck } from 'lucide-react'
import AccessDenied from '@/components/AccessDenied'

const MENU_KEY = 'drilling.drilling_report'
const API = '/api/drilling/drilling-report/'

const RIG_FIELD = { type: 'select-remote', remote: '/api/drilling/my-rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const OPS_FIELD = { type: 'select-remote', remote: '/api/masters/drilling-operations/', optionLabel: 'drilling_ops_name', optionValue: 'drilling_ops_id', labelField: 'drilling_ops_name' }
const SECTION_FIELD = { type: 'select-remote', remote: '/api/masters/drilling-sections/', optionLabel: 'drilling_section_name', optionValue: 'drilling_section_id', labelField: 'drilling_section_name' }

const SHIFT_OPTIONS = [
  { value: 'M', label: 'Morning' },
  { value: 'E', label: 'Evening' },
]

function emptyWellInfo() {
  return { location: '', contract: null, contract_no: '', drilling_completion_dt: null, suggested_date: null }
}

function emptyForm() {
  return {
    rig: null, rig_label: '', drilling_dtl_dt: '',
    pob_operator: '', pob_essar: '', pob_essar_serv: '', pob_others: '',
    wind_speed: '', current_k: '', at_press_mbar: '',
    vdl: '', avdl: '', tot_vdl: '', kg: '', kg_margin: '', draft: '',
    consumption_diesel: '', consumption_water: '', received_diesel: '', received_water: '', generated_water: '',
    remark: '', downtime_reason: '',
    ops: [],
  }
}

function emptyNewOp() {
  return {
    time_from: '', time_to: '', work_shift: 'M',
    drilling_ops: null, drilling_ops_label: '',
    drilling_section: null, drilling_section_label: '',
    depth_from: '', depth_to: '', operation_desc: '',
    prj_drilling_rate: null, prj_drilling_rate_label: '',
  }
}

// Combines the day's own date with a bare hh:mm into a full ISO timestamp —
// a shift that runs past midnight (legacy's own Evening shift table does
// this, e.g. 23:00-00:00) rolls into the next calendar day.
function toIso(dateStr, timeStr, rollIfBefore) {
  if (!dateStr || !timeStr) return null
  const base = new Date(`${dateStr}T${timeStr}:00`)
  if (rollIfBefore && timeStr <= rollIfBefore) base.setDate(base.getDate() + 1)
  return base.toISOString()
}

// Native <input type="time"> renders 12h-with-AM/PM or 24h purely based on
// the browser/OS locale, with no way for the page to force one — on a
// 12-hour locale there's no way to type "14:30" at all, and the legacy
// system this is replacing was always 24-hour military time. Two explicit
// Hour/Minute dropdowns compose the same "HH:MM" string the rest of the
// form already expects (toIso, row display via .slice(11,16)), so entry is
// unambiguous 24-hour time for every user regardless of locale.
function from24h(value) {
  if (!value) return { hour: '', minute: '' }
  const [hh, mm] = value.split(':')
  return { hour: hh, minute: mm }
}

function to24h(hour, minute) {
  if (hour === '' || minute === '') return ''
  return `${hour}:${minute}`
}

function TimeField24h({ value, onChange, disabled }) {
  // Local state, not re-derived from `value` every render — while only
  // the hour has been picked (minute still blank), to24h() has nothing
  // valid to return yet, so the composed "HH:MM" stays '' until both parts
  // are set. Deriving hour/minute straight from that '' each render would
  // silently forget the hour the moment minute is picked next. Only the
  // component's own mount (i.e. a fresh row) resets this, via the
  // initializer below.
  const [local, setLocal] = useState(() => from24h(value))
  const { hour, minute } = local

  function update(patch) {
    const next = { hour, minute, ...patch }
    setLocal(next)
    onChange(to24h(next.hour, next.minute))
  }

  const selectClass =
    'h-9 rounded-lg border border-input bg-transparent px-1 text-sm text-foreground outline-none focus:border-ring disabled:opacity-50'

  return (
    <div className="flex items-center gap-1">
      <select value={hour} onChange={(e) => update({ hour: e.target.value })} disabled={disabled} className={selectClass}>
        <option value="">--</option>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select value={minute} onChange={(e) => update({ minute: e.target.value })} disabled={disabled} className={selectClass}>
        <option value="">--</option>
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  )
}

function statusInfo(row) {
  if (!row) return { label: 'Draft', className: 'bg-muted text-muted-foreground' }
  if (row.cr_status === 'F') {
    if (row.l1_approval_status === 'A') return { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-600' }
    if (row.l1_approval_status === 'R') return { label: 'Rejected', className: 'bg-red-500/15 text-red-600' }
    return { label: 'Pending approval', className: 'bg-blue-500/15 text-blue-600' }
  }
  if (row.cr_status === 'N') return { label: 'Sent for revision', className: 'bg-orange-500/15 text-orange-600' }
  return { label: 'Draft', className: 'bg-muted text-muted-foreground' }
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value != null && value !== '' ? value : '—'}</span>
    </div>
  )
}

// Unit lives inline as a suffix adornment (kts, L, Mtr…) instead of
// crowding the label — a field's label just names the thing, the unit
// reads right where the number is.
function UnitField({ label, unit, value, onChange, disabled, step, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <InputGroup>
        <InputGroupInput type="number" step={step} value={value} onChange={onChange} disabled={disabled} />
        {unit && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  )
}

function Section({ title, action, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function KpiTile({ label, value }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
      <p className="font-mono text-lg font-bold tabular-nums text-foreground">{value ?? '0.00'}</p>
      <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
    </div>
  )
}

export default function DrillingReportFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canExport = can(user, MENU_KEY, 'export')

  const [form, setForm] = useState(emptyForm())
  const [snapshot, setSnapshot] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [wellInfo, setWellInfo] = useState(emptyWellInfo())
  const [role, setRole] = useState({ can_finalize: false, can_approve: false, can_reject: false, can_revise_self: false, can_revise_previous: false, can_edit_as_approver: false })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingReject, setConfirmingReject] = useState(false)
  const [revisingPrevious, setRevisingPrevious] = useState(false)
  const [reviseNote, setReviseNote] = useState('')
  const [addingOp, setAddingOp] = useState(false)
  const [newOp, setNewOp] = useState(emptyNewOp())
  const newRowRef = useRef(null)

  // The new row lands at the bottom of a table that can already be several
  // screens of rows long (many-row reports were the whole reason the Time
  // Log header became sticky) — without this, "Add row" gives no visual
  // sign anything happened unless the user already happens to be scrolled
  // to the very bottom.
  useEffect(() => {
    if (addingOp) newRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [addingOp])

  // Not a user choice — ILM vs non-ILM is a property of the well itself:
  // a well still actively drilling (Drilling Completion not filled on its
  // Drilling Information record) uses non-ILM rates; once that well is
  // marked complete, entries against it use ILM rates instead.
  const isActivelyDrilling = !wellInfo.drilling_completion_dt
  const rateField = {
    type: 'select-remote',
    remote: `/api/masters/project-drilling-rates/?contract=${wellInfo.contract || ''}&rig=${form.rig || ''}&ilm=${isActivelyDrilling ? '0' : '1'}`,
    optionLabel: 'rate_code',
    optionValue: 'prj_drilling_rate_id',
    labelField: 'rate_code',
  }

  function loadWellInfo(rigId, date) {
    if (!rigId) {
      setWellInfo(emptyWellInfo())
      return Promise.resolve(null)
    }
    const params = new URLSearchParams({ rig: rigId })
    if (date) params.set('date', date)
    return apiFetch(`/api/drilling/resolve-well/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setWellInfo(data)
        return data
      })
  }

  function loadRole(recordId) {
    apiFetch(`${API}${recordId}/role/`)
      .then((r) => r.json())
      .then(setRole)
  }

  function loadFromRecord(row) {
    setSelectedRecord(row)
    const loaded = {
      rig: row.rig, rig_label: row.rig_name, drilling_dtl_dt: row.drilling_dtl_dt,
      pob_operator: row.pob_operator ?? '', pob_essar: row.pob_essar ?? '', pob_essar_serv: row.pob_essar_serv ?? '', pob_others: row.pob_others ?? '',
      wind_speed: row.wind_speed ?? '', current_k: row.current_k ?? '', at_press_mbar: row.at_press_mbar ?? '',
      vdl: row.vdl ?? '', avdl: row.avdl ?? '', tot_vdl: row.tot_vdl ?? '', kg: row.kg ?? '', kg_margin: row.kg_margin ?? '', draft: row.draft ?? '',
      consumption_diesel: row.consumption_diesel ?? '', consumption_water: row.consumption_water ?? '',
      received_diesel: row.received_diesel ?? '', received_water: row.received_water ?? '', generated_water: row.generated_water ?? '',
      remark: row.remark || '', downtime_reason: row.downtime_reason || '',
      ops: (row.ops || []).map((o) => ({
        drilling_dtl_ops_id: o.drilling_dtl_ops_id,
        time_from: o.time_from, time_to: o.time_to, work_shift: o.work_shift,
        duration: o.duration,
        drilling_ops: o.drilling_ops, drilling_ops_label: o.drilling_ops_name,
        drilling_section: o.drilling_section, drilling_section_label: o.drilling_section_name,
        depth_from: o.depth_from, depth_to: o.depth_to, rop_trip_mh: o.rop_trip_mh, operation_desc: o.operation_desc,
        prj_drilling_rate: o.prj_drilling_rate, prj_drilling_rate_label: o.rate_code,
      })),
    }
    setForm(loaded)
    setSnapshot(JSON.stringify(loaded))
    loadWellInfo(row.rig, row.drilling_dtl_dt)
    loadRole(row.drilling_dtl_id)
  }

  useEffect(() => {
    if (!isEdit) return
    // Reset explicitly — this route doesn't remount on an :id-only change,
    // so a stale notFound=true or the previous record's data would
    // otherwise persist/flash before this fetch resolves.
    setLoading(true)
    setNotFound(false)
    setForm(emptyForm())
    setSnapshot(null)
    setSelectedRecord(null)
    setWellInfo(emptyWellInfo())
    apiFetch(`${API}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(loadFromRecord)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function onRigOrDateChange(patch) {
    const next = { ...form, ...patch }
    setForm(next)
    if (patch.rig !== undefined && !isEdit) {
      // A Rig was just picked for a brand-new report — resolve its
      // currently-active well instantly (no date needed yet) and seed the
      // Drilling Date to the day after that well's last daily report
      // (still editable afterward).
      loadWellInfo(next.rig, null).then((data) => {
        if (data && data.suggested_date) {
          setForm((f) => ({ ...f, drilling_dtl_dt: data.suggested_date }))
        }
      })
    } else {
      loadWellInfo(next.rig, next.drilling_dtl_dt)
    }
  }

  function removeOpRow(index) {
    setForm((f) => ({ ...f, ops: f.ops.filter((_, i) => i !== index) }))
  }

  function addOpRow() {
    if (!newOp.time_from || !newOp.time_to || !newOp.drilling_ops || !newOp.drilling_section || !newOp.prj_drilling_rate) {
      toast.error('Time From/To, Operation, Section, and Rate are required for a new row')
      return
    }
    const time_from = toIso(form.drilling_dtl_dt, newOp.time_from)
    const time_to = toIso(form.drilling_dtl_dt, newOp.time_to, newOp.time_from)
    setForm((f) => ({ ...f, ops: [...f.ops, { ...newOp, time_from, time_to }] }))
    setNewOp(emptyNewOp())
    setAddingOp(false)
  }

  function buildPayload() {
    if (!form.rig) return { error: 'Rig is required' }
    if (!form.drilling_dtl_dt) return { error: 'Drilling Date is required' }
    const required = ['pob_operator', 'pob_essar', 'wind_speed', 'current_k', 'at_press_mbar', 'vdl', 'avdl', 'tot_vdl', 'kg', 'kg_margin', 'draft', 'consumption_diesel', 'consumption_water']
    for (const f of required) {
      if (form[f] === '' || form[f] == null) return { error: `${f.replace(/_/g, ' ')} is required` }
    }
    if (!form.remark || !form.remark.trim()) return { error: 'Operations Summary is required' }
    if (form.ops.length === 0) return { error: 'At least one time-log row is required' }

    return {
      payload: {
        rig: form.rig,
        drilling_dtl_dt: form.drilling_dtl_dt,
        pob_operator: form.pob_operator, pob_essar: form.pob_essar,
        pob_essar_serv: form.pob_essar_serv === '' ? null : form.pob_essar_serv,
        pob_others: form.pob_others === '' ? null : form.pob_others,
        wind_speed: form.wind_speed, current_k: form.current_k, at_press_mbar: form.at_press_mbar,
        vdl: form.vdl, avdl: form.avdl, tot_vdl: form.tot_vdl, kg: form.kg, kg_margin: form.kg_margin, draft: form.draft,
        consumption_diesel: form.consumption_diesel, consumption_water: form.consumption_water,
        received_diesel: form.received_diesel === '' ? null : form.received_diesel,
        received_water: form.received_water === '' ? null : form.received_water,
        generated_water: form.generated_water === '' ? null : form.generated_water,
        remark: form.remark.trim(),
        downtime_reason: form.downtime_reason || null,
        ops: form.ops.map((o) => ({
          ...(o.drilling_dtl_ops_id ? { drilling_dtl_ops_id: o.drilling_dtl_ops_id } : {}),
          time_from: o.time_from, time_to: o.time_to, work_shift: o.work_shift,
          drilling_ops: o.drilling_ops, drilling_section: o.drilling_section,
          // rop_trip_mh is server-computed (round((Depth_To-Depth_From)/Duration),
          // confirmed against real historical rows) — never sent, same as duration.
          depth_from: o.depth_from, depth_to: o.depth_to,
          operation_desc: o.operation_desc, prj_drilling_rate: o.prj_drilling_rate,
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
    const res = await apiFetch(isEdit ? `${API}${id}/` : API, {
      method: isEdit ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(isEdit ? 'Drilling Report saved' : 'Drilling Report created')
      const data = await res.json()
      if (isEdit) {
        loadFromRecord(data)
      } else {
        navigate(`/drilling/drilling-report/${data.drilling_dtl_id}/edit`, { replace: true })
      }
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(formatApiError(data))
    }
  }

  async function remove() {
    const res = await apiFetch(`${API}${id}/`, { method: 'DELETE' })
    setConfirmingDelete(false)
    if (res.status === 204) {
      toast.success('Drilling Report deleted')
      navigate('/drilling/drilling-report')
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete')
    }
  }

  async function exportCsv() {
    const res = await apiFetch(`${API}${id}/export/`)
    if (!res.ok) {
      toast.error('Failed to export')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drilling-report-${form.rig_label}-${form.drilling_dtl_dt}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function runAction(path, successMsg, body) {
    const res = await apiFetch(`${API}${id}/${path}/`, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
    if (res.ok) {
      toast.success(successMsg)
      const data = await res.json()
      loadFromRecord(data)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Action failed')
    }
  }

  async function sendForRevision() {
    await runAction('revise-previous', 'Sent back to creator', { note: reviseNote.trim() })
    setRevisingPrevious(false)
    setReviseNote('')
  }

  if (notFound) return <Navigate to="/drilling/drilling-report" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  // Once finalized (Cr_Status='F') the data itself locks for everyone,
  // creator included, regardless of their own edit permission — matching
  // the legacy screen's read-only shaded fields once a record is out for
  // approval. Two ways back in: Previous-Level revise resets Cr_Status back
  // to the creator, or Revise (Self) explicitly reopens the record for the
  // approver's own direct editing (can_edit_as_approver) without touching
  // Cr_Status at all — the fields unlock specifically for them until they
  // approve/reject again.
  const locked = isEdit && selectedRecord?.cr_status === 'F' && !role.can_edit_as_approver
  const canEditFields = !isEdit ? canAdd : (canEdit && !locked) || role.can_edit_as_approver
  const disabled = !canEditFields
  const isDirty = !isEdit ? !buildPayload().error : snapshot !== null && JSON.stringify(form) !== snapshot
  const status = statusInfo(selectedRecord)
  const heading = isEdit ? (loading ? 'Loading…' : `${form.rig_label} — ${form.drilling_dtl_dt}`) : 'New Drilling Report'
  const canSave = canEditFields
  const hasApprovalActions = role.can_finalize || role.can_approve || role.can_reject || role.can_revise_self || role.can_revise_previous

  return (
    <div className="flex flex-col gap-4 pb-16">
      <Link
        to="/drilling/drilling-report"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        Drilling Report
      </Link>

      {/* Sticky action bar — status + every primary action stays reachable
          without scrolling past a long form to find Save/Finalize. */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold text-foreground">{heading}</h1>
          {isEdit && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEdit && canDelete && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
              <IconTrash className="h-4 w-4" />
            </Button>
          )}
          {isEdit && canExport && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
          )}
          {isEdit && role.can_revise_self && (
            <Button
              size="sm"
              variant="secondary"
              title="Reopens this report for your own edits — its approval status stays where it is."
              onClick={() => runAction('revise-self', 'Sent back for your own review')}
            >
              Revise (Self)
            </Button>
          )}
          {isEdit && role.can_revise_previous && (
            <Button
              size="sm"
              variant="secondary"
              title="Sends this report back to whoever created it, so they can fix it and resubmit."
              onClick={() => setRevisingPrevious(true)}
            >
              Revise (Previous Level)
            </Button>
          )}
          {(isEdit && (role.can_reject || role.can_approve || role.can_finalize)) && (
            <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
              {role.can_reject && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmingReject(true)}
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </Button>
              )}
              {role.can_approve && (
                <Button size="sm" onClick={() => runAction('approve', 'Approved')}>
                  <Check className="h-3.5 w-3.5" /> Approve
                </Button>
              )}
              {role.can_finalize && (
                <Button size="sm" onClick={() => runAction('finalize', 'Finalized')}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Finalize
                </Button>
              )}
            </div>
          )}
          {canSave && (
            <Button onClick={save} disabled={saving || !isDirty || loading} variant={isDirty ? 'default' : 'secondary'}>
              {saving ? 'Saving…' : isEdit ? (isDirty ? 'Save changes' : 'Saved') : 'Create'}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex w-full flex-col gap-4">
          {selectedRecord?.cr_status === 'N' && selectedRecord?.revision_note && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
              <p className="text-[11px] font-bold tracking-widest uppercase">Revision note</p>
              <p className="mt-1 whitespace-pre-wrap">{selectedRecord.revision_note}</p>
            </div>
          )}
          <Section title="Rig & Well Info">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Rig <span className="text-destructive">*</span></Label>
                <RemoteCombobox field={RIG_FIELD} value={form.rig} onChange={(v) => onRigOrDateChange({ rig: v })} labelValue={form.rig_label} disabled={disabled} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Drilling Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.drilling_dtl_dt} onChange={(e) => onRigOrDateChange({ drilling_dtl_dt: e.target.value })} disabled={disabled} />
              </div>
              <ReadOnlyField label="Location" value={wellInfo.location} />
              <ReadOnlyField label="Project" value={wellInfo.contract_no} />
            </div>
          </Section>

          <Section title="Personnel on Board (POB)">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <UnitField label="Operator" value={form.pob_operator} onChange={(e) => setForm((f) => ({ ...f, pob_operator: e.target.value }))} disabled={disabled} required />
              <UnitField label="Seros" value={form.pob_essar} onChange={(e) => setForm((f) => ({ ...f, pob_essar: e.target.value }))} disabled={disabled} required />
              <UnitField label="Seros Serv" value={form.pob_essar_serv} onChange={(e) => setForm((f) => ({ ...f, pob_essar_serv: e.target.value }))} disabled={disabled} />
              <UnitField label="Others" value={form.pob_others} onChange={(e) => setForm((f) => ({ ...f, pob_others: e.target.value }))} disabled={disabled} />
            </div>
          </Section>

          <Section title="Rig Conditions">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <UnitField label="Wind Speed" unit="kts" value={form.wind_speed} onChange={(e) => setForm((f) => ({ ...f, wind_speed: e.target.value }))} disabled={disabled} required />
              <UnitField label="Current K" unit="kts" step="0.1" value={form.current_k} onChange={(e) => setForm((f) => ({ ...f, current_k: e.target.value }))} disabled={disabled} required />
              <UnitField label="At Press" unit="mbar" value={form.at_press_mbar} onChange={(e) => setForm((f) => ({ ...f, at_press_mbar: e.target.value }))} disabled={disabled} required />
              <UnitField label="VDL" unit="MT" value={form.vdl} onChange={(e) => setForm((f) => ({ ...f, vdl: e.target.value }))} disabled={disabled} required />
              <UnitField label="AVDL" unit="MT" value={form.avdl} onChange={(e) => setForm((f) => ({ ...f, avdl: e.target.value }))} disabled={disabled} required />
              <UnitField label="Total VDL" unit="MT" value={form.tot_vdl} onChange={(e) => setForm((f) => ({ ...f, tot_vdl: e.target.value }))} disabled={disabled} required />
              <UnitField label="KG" unit="Mtr" step="0.01" value={form.kg} onChange={(e) => setForm((f) => ({ ...f, kg: e.target.value }))} disabled={disabled} required />
              <UnitField label="KG Margin" unit="Mtr" step="0.01" value={form.kg_margin} onChange={(e) => setForm((f) => ({ ...f, kg_margin: e.target.value }))} disabled={disabled} required />
              <UnitField label="Draft" unit="Mtr" step="0.01" value={form.draft} onChange={(e) => setForm((f) => ({ ...f, draft: e.target.value }))} disabled={disabled} required />
            </div>
          </Section>

          <Section title="Fluid & Fuel Accounting">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <UnitField label="Consumption: Diesel" unit="L" value={form.consumption_diesel} onChange={(e) => setForm((f) => ({ ...f, consumption_diesel: e.target.value }))} disabled={disabled} required />
              <UnitField label="Consumption: Water" unit="L" value={form.consumption_water} onChange={(e) => setForm((f) => ({ ...f, consumption_water: e.target.value }))} disabled={disabled} required />
              <UnitField label="Received: Diesel" unit="L" value={form.received_diesel} onChange={(e) => setForm((f) => ({ ...f, received_diesel: e.target.value }))} disabled={disabled} />
              <UnitField label="Received: Water" unit="L" value={form.received_water} onChange={(e) => setForm((f) => ({ ...f, received_water: e.target.value }))} disabled={disabled} />
              <UnitField label="Generated: Water" unit="L" value={form.generated_water} onChange={(e) => setForm((f) => ({ ...f, generated_water: e.target.value }))} disabled={disabled} />
            </div>
          </Section>

          <Section title="Daily Summary">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Operations Summary <span className="text-destructive">*</span></Label>
                <Textarea rows={5} maxLength={500} value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} disabled={disabled} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Downtime Reason {form.downtime_reason ? '' : '(auto-clears when no Repair Rate / Zero Rate rows remain)'}</Label>
                <Input value={form.downtime_reason} onChange={(e) => setForm((f) => ({ ...f, downtime_reason: e.target.value }))} disabled={disabled} />
              </div>
            </div>
          </Section>

          {isEdit && selectedRecord && (
            <Section title="Computed Hours & Meterage">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiTile label="Operating Hrs" value={selectedRecord.operating_hrs} />
                <KpiTile label="Standby Hrs" value={selectedRecord.standby_hrs} />
                <KpiTile label="Service Hrs" value={selectedRecord.repair_service_hrs} />
                <KpiTile label="Repair Rate Hrs" value={selectedRecord.repair_rate_hrs} />
                <KpiTile label="Zero Rate Hrs" value={selectedRecord.zero_rate_hrs} />
                <KpiTile label="Rig Move Hrs" value={selectedRecord.rig_move_hrs} />
                <KpiTile label="Drilling Meterage" value={selectedRecord.drilling_meterage} />
              </div>
            </Section>
          )}

          <Section
            title="Time Log"
            action={
              !disabled && (
                <button
                  type="button"
                  onClick={() => setAddingOp((v) => !v)}
                  className="flex items-center gap-1 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <IconPlus className="h-3.5 w-3.5" /> Add row
                </button>
              )
            }
          >
            {/* max-h + overflow-auto confines "many rows" to the table's own
                scrollbar instead of the header scrolling away up the page —
                sticky top-0 on the header row then keeps it pinned to the
                top of that scroll area. table-fixed + colgroup still gives
                every column its real guaranteed width. */}
            <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '9%' }} />
                  {!disabled && <col style={{ width: '5%' }} />}
                </colgroup>
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <th className="px-3 py-2.5 text-left">From</th>
                    <th className="px-3 py-2.5 text-left">To</th>
                    <th className="px-3 py-2.5 text-left">Shift</th>
                    <th className="px-3 py-2.5 text-right">Dur</th>
                    <th className="px-3 py-2.5 text-left">Operation</th>
                    <th className="px-3 py-2.5 text-left">Section</th>
                    <th className="px-3 py-2.5 text-right">Depth F</th>
                    <th className="px-3 py-2.5 text-right">Depth T</th>
                    <th className="px-3 py-2.5 text-right">ROP/Trip</th>
                    <th className="px-3 py-2.5 text-left">Remarks</th>
                    <th className="px-3 py-2.5 text-left">Rate</th>
                    {!disabled && <th className="px-3 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {form.ops.length === 0 && !addingOp && (
                    <tr><td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">No rows yet.</td></tr>
                  )}
                  {form.ops.map((o, i) => (
                    <tr key={o.drilling_dtl_ops_id ?? `new-${i}`} className={`border-b border-border/60 last:border-b-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="px-3 py-2 font-mono">{o.time_from ? o.time_from.slice(11, 16) : ''}</td>
                      <td className="px-3 py-2 font-mono">{o.time_to ? o.time_to.slice(11, 16) : ''}</td>
                      <td className="px-3 py-2">{o.work_shift === 'M' ? 'Morning' : 'Evening'}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{o.duration ?? ''}</td>
                      <td className="px-3 py-2 break-words">{o.drilling_ops_label}</td>
                      <td className="px-3 py-2 break-words">{o.drilling_section_label}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{o.depth_from}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{o.depth_to}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{o.rop_trip_mh}</td>
                      <td className="px-3 py-2 break-words whitespace-normal">{o.operation_desc}</td>
                      <td className="px-3 py-2 font-semibold">{o.prj_drilling_rate_label}</td>
                      {!disabled && (
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => removeOpRow(i)} className="text-muted-foreground transition-colors hover:text-destructive">
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {addingOp && (
                    <tr ref={newRowRef} className="border-t border-dashed border-border bg-muted/20">
                      <td className="px-2 py-2"><TimeField24h value={newOp.time_from} onChange={(v) => setNewOp((r) => ({ ...r, time_from: v }))} /></td>
                      <td className="px-2 py-2"><TimeField24h value={newOp.time_to} onChange={(v) => setNewOp((r) => ({ ...r, time_to: v }))} /></td>
                      <td className="px-2 py-2"><TilePicker options={SHIFT_OPTIONS} value={newOp.work_shift} onChange={(v) => setNewOp((r) => ({ ...r, work_shift: v }))} /></td>
                      <td className="px-2 py-2 text-right text-muted-foreground">auto</td>
                      <td className="px-2 py-2">
                        <RemoteCombobox
                          field={OPS_FIELD}
                          value={newOp.drilling_ops}
                          onChange={(v) => setNewOp((r) => ({ ...r, drilling_ops: v, prj_drilling_rate: null, prj_drilling_rate_label: '' }))}
                          labelValue={newOp.drilling_ops_label}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <RemoteCombobox field={SECTION_FIELD} value={newOp.drilling_section} onChange={(v) => setNewOp((r) => ({ ...r, drilling_section: v }))} labelValue={newOp.drilling_section_label} />
                      </td>
                      <td className="px-2 py-2"><Input type="number" step="0.01" value={newOp.depth_from} onChange={(e) => setNewOp((r) => ({ ...r, depth_from: e.target.value }))} className="h-9 w-full text-right" /></td>
                      <td className="px-2 py-2"><Input type="number" step="0.01" value={newOp.depth_to} onChange={(e) => setNewOp((r) => ({ ...r, depth_to: e.target.value }))} className="h-9 w-full text-right" /></td>
                      <td className="px-2 py-2 text-right text-muted-foreground">auto</td>
                      <td className="px-2 py-2"><Input value={newOp.operation_desc} maxLength={200} onChange={(e) => setNewOp((r) => ({ ...r, operation_desc: e.target.value }))} className="h-9 w-full" /></td>
                      <td className="px-2 py-2">
                        <RemoteCombobox
                          field={rateField}
                          value={newOp.prj_drilling_rate}
                          onChange={(v) => setNewOp((r) => ({ ...r, prj_drilling_rate: v }))}
                          labelValue={newOp.prj_drilling_rate_label}
                          disabled={!form.rig}
                        />
                      </td>
                      <td className="px-2 py-2"><Button size="sm" onClick={addOpRow}>Insert</Button></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {isEdit && !hasApprovalActions && (
            <p className="text-xs text-muted-foreground">No approval actions available to you on this record right now.</p>
          )}
        </div>
      )}

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this report?</DialogTitle>
            <DialogDescription>This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingReject} onOpenChange={setConfirmingReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this report?</DialogTitle>
            <DialogDescription>It will be sent back as rejected. This can't be undone from here.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmingReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmingReject(false); runAction('reject', 'Rejected') }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revisingPrevious} onOpenChange={(open) => { setRevisingPrevious(open); if (!open) setReviseNote('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send back to creator</DialogTitle>
            <DialogDescription>Optionally leave a short note on what needs to be fixed.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={500}
            placeholder="e.g. Please recheck the depth readings for the 14:00-18:00 row"
            value={reviseNote}
            onChange={(e) => setReviseNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setRevisingPrevious(false); setReviseNote('') }}>Cancel</Button>
            <Button onClick={sendForRevision}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
