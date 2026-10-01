import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { formatApiError } from '@/lib/errors'
import { joinNaiveDt, splitNaiveDt } from '@/lib/naiveDateTime'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox, TilePicker } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MENU_KEY = 'qhse.hse_drill_record'

const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const EMPLOYEE_FIELD = { type: 'search-remote', remote: '/api/masters/employees/', optionLabel: 'display_name', optionValue: 'emp_id', labelField: 'emp_name' }

function emptyForm() {
  return {
    rig: null, rig_name: '',
    drill_record_no: '',
    drill_date: '', drill_time: '',
    drill_location: '',
    hse_drill_1: null, hse_drill_1_name: '',
    hse_drill_2: null, hse_drill_2_name: '',
    head_count: '',
    control_room_on_shore: 'N',
    initiated_by_fs_emp_1: null, initiated_by_fs_emp_1_name: '',
    initiated_by_fs_emp_2: null, initiated_by_fs_emp_2_name: '',
    initial_response_time: '',
    no_of_participants: '',
    fire_team_1_size: '', fire_team_1_duration: '',
    fire_team_2_size: '', fire_team_2_duration: '',
    stretcher_team_size: '',
    maintenance_team_size: '',
    snr_team_size: '', snr_team_duration: '',
    drill_muster: '',
    abandon_muster_offshore: '',
    total_time_of_drill: '',
    revision_value: '0',
    approved_by_oim_fs_emp: null, approved_by_oim_fs_emp_name: '',
    approved_by_companyman: '',
  }
}

function recordToForm(data) {
  const evt = splitNaiveDt(data.drill_dt)
  return {
    rig: data.rig, rig_name: data.rig_name,
    drill_record_no: data.drill_record_no,
    drill_date: evt.date, drill_time: evt.time,
    drill_location: data.drill_location || '',
    hse_drill_1: data.hse_drill_1, hse_drill_1_name: data.hse_drill_1_name,
    hse_drill_2: data.hse_drill_2, hse_drill_2_name: data.hse_drill_2_name || '',
    head_count: data.head_count ?? '',
    control_room_on_shore: data.control_room_on_shore || 'N',
    initiated_by_fs_emp_1: data.initiated_by_fs_emp_1, initiated_by_fs_emp_1_name: data.initiated_by_fs_emp_1_name,
    initiated_by_fs_emp_2: data.initiated_by_fs_emp_2, initiated_by_fs_emp_2_name: data.initiated_by_fs_emp_2_name || '',
    initial_response_time: data.initial_response_time ?? '',
    no_of_participants: data.no_of_participants ?? '',
    fire_team_1_size: data.fire_team_1_size ?? '', fire_team_1_duration: data.fire_team_1_duration ?? '',
    fire_team_2_size: data.fire_team_2_size ?? '', fire_team_2_duration: data.fire_team_2_duration ?? '',
    stretcher_team_size: data.stretcher_team_size ?? '',
    maintenance_team_size: data.maintenance_team_size ?? '',
    snr_team_size: data.snr_team_size ?? '', snr_team_duration: data.snr_team_duration ?? '',
    drill_muster: data.drill_muster ?? '',
    abandon_muster_offshore: data.abandon_muster_offshore ?? '',
    total_time_of_drill: data.total_time_of_drill ?? '',
    revision_value: data.revision_value ?? '0',
    approved_by_oim_fs_emp: data.approved_by_oim_fs_emp, approved_by_oim_fs_emp_name: data.approved_by_oim_fs_emp_name,
    approved_by_companyman: data.approved_by_companyman || '',
  }
}

function SectionCard({ title, hint, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
      {hint && <p className="mt-1 mb-4 text-xs text-muted-foreground">{hint}</p>}
      <div className={`grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 ${hint ? '' : 'mt-5'}`}>{children}</div>
    </div>
  )
}

function Field({ label, required, children, wide, error, hint }) {
  return (
    <div className={`flex flex-col gap-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className={error ? 'rounded-lg ring-2 ring-destructive/70' : ''}>{children}</div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

// Maps an API payload field name to the form state key(s) it should
// highlight — most line up 1:1, but drill_dt is split into two inputs
// on this form (Drill Date + Drill Time) so both light up together.
const API_FIELD_TARGETS = {
  drill_dt: ['drill_date', 'drill_time'],
}

function buildFieldErrors(data) {
  const out = {}
  if (!data || typeof data !== 'object') return out
  for (const [key, val] of Object.entries(data)) {
    const msg = Array.isArray(val) ? val[0] : val
    if (typeof msg !== 'string') continue
    for (const target of API_FIELD_TARGETS[key] || [key]) {
      out[target] = msg
    }
  }
  return out
}

function PlainSelect({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label || o.name}
        </option>
      ))}
    </select>
  )
}

function MmSsInput({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1.5">
      <Input type="number" step="0.01" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)} disabled={disabled} className="h-10 w-28 text-right" />
      <span className="text-xs whitespace-nowrap text-muted-foreground">MI.SS</span>
    </div>
  )
}

export default function HseDrillRecordFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, MENU_KEY, isEdit ? 'edit' : 'add')

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify(emptyForm())))
  const [drillOptions, setDrillOptions] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
    setFieldErrors((e) => {
      const keys = Object.keys(patch).filter((k) => k in e)
      if (!keys.length) return e
      const next = { ...e }
      for (const k of keys) delete next[k]
      return next
    })
  }

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    setNotFound(false)
    apiFetch(`/api/qhse/hse-drill-record/${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        const record = recordToForm(data)
        setForm(record)
        setSnapshot(JSON.stringify(record))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!form.rig) {
        if (!cancelled) setDrillOptions([])
        return
      }
      const res = await apiFetch(`/api/qhse/hse-drill-record/rig-context/?rig=${form.rig}`)
      const data = await res.json()
      if (!cancelled) setDrillOptions(Array.isArray(data) ? data : [])
    }
    run()
    return () => {
      cancelled = true
    }
  }, [form.rig])

  function buildPayload() {
    return {
      rig: form.rig,
      drill_dt: joinNaiveDt(form.drill_date, form.drill_time),
      drill_location: form.drill_location,
      hse_drill_1: form.hse_drill_1,
      hse_drill_2: form.hse_drill_2 || null,
      head_count: form.head_count || null,
      control_room_on_shore: form.control_room_on_shore,
      initiated_by_fs_emp_1: form.initiated_by_fs_emp_1,
      initiated_by_fs_emp_2: form.initiated_by_fs_emp_2 || null,
      initial_response_time: form.initial_response_time || null,
      no_of_participants: form.no_of_participants || null,
      fire_team_1_size: form.fire_team_1_size || null,
      fire_team_1_duration: form.fire_team_1_duration || null,
      fire_team_2_size: form.fire_team_2_size || null,
      fire_team_2_duration: form.fire_team_2_duration || null,
      stretcher_team_size: form.stretcher_team_size || null,
      maintenance_team_size: form.maintenance_team_size || null,
      snr_team_size: form.snr_team_size || null,
      snr_team_duration: form.snr_team_duration || null,
      drill_muster: form.drill_muster || null,
      abandon_muster_offshore: form.abandon_muster_offshore || null,
      total_time_of_drill: form.total_time_of_drill || null,
      revision_value: form.revision_value || 0,
      approved_by_oim_fs_emp: form.approved_by_oim_fs_emp,
      approved_by_companyman: form.approved_by_companyman || null,
    }
  }

  async function handleSave() {
    setError('')
    setFieldErrors({})
    setSaving(true)
    try {
      const url = isEdit ? `/api/qhse/hse-drill-record/${id}/` : '/api/qhse/hse-drill-record/'
      const res = await apiFetch(url, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(buildPayload()) })
      const data = await res.json()
      if (!res.ok) {
        setError(formatApiError(data))
        setFieldErrors(buildFieldErrors(data))
        toast.error('Failed to save')
        return
      }
      allowNextNavigation()
      if (isEdit) {
        toast.success('Changes saved')
        const record = recordToForm(data)
        setForm(record)
        setSnapshot(JSON.stringify(record))
      } else {
        toast.success(`Drill Record No. ${data.drill_record_no} created`)
        navigate(`/qhse/hse-drill-record/${data.drill_record_hdr_id}/edit`, { replace: true })
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = snapshot !== null && JSON.stringify(form) !== snapshot
  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: canWrite && !saving && !loading ? handleSave : undefined,
  })

  if (notFound) return <Navigate to="/qhse/hse-drill-record" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const drill2Options = drillOptions.filter((d) => String(d.id) !== String(form.hse_drill_1))
  const heading = isEdit ? (form.drill_record_no ? `Drill Record ${form.drill_record_no}` : 'Edit Drill Record') : 'New HSE Drill / Exercise'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        <div className="flex items-center gap-2">
          {isEdit && !loading && (
            <Button variant="outline" onClick={() => navigate(`/qhse/hse-drill-record/${id}/details`)}>
              Drill Details →
            </Button>
          )}
          {canWrite && !loading && (
            <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add'}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!canWrite && !loading && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You have view-only access to HSE Drills / Exercises.
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <SectionCard title="Drill">
            <Field label="Rig" required error={fieldErrors.rig}>
              <RemoteCombobox
                field={RIG_FIELD}
                value={form.rig}
                labelValue={form.rig_name}
                onChange={(v, raw) =>
                  set({ rig: v, rig_name: raw?.rig_name || '', hse_drill_1: null, hse_drill_1_name: '', hse_drill_2: null, hse_drill_2_name: '' })
                }
                disabled={!canWrite || isEdit}
              />
            </Field>
            <Field label="Report No.">
              <Input value={form.drill_record_no} readOnly disabled className="bg-muted" placeholder="Generated after Add" />
            </Field>
            <Field label="Drill Date" required error={fieldErrors.drill_date}>
              <Input type="date" value={form.drill_date} onChange={(e) => set({ drill_date: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field label="Drill Time" required error={fieldErrors.drill_time}>
              <Input type="time" value={form.drill_time} onChange={(e) => set({ drill_time: e.target.value })} disabled={!canWrite} />
            </Field>

            <Field label="Drill Location" required error={fieldErrors.drill_location}>
              <Input value={form.drill_location} maxLength={20} onChange={(e) => set({ drill_location: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field label="Type of Drill/Training - 1" required error={fieldErrors.hse_drill_1}>
              <PlainSelect
                value={form.hse_drill_1}
                onChange={(v) => {
                  const d = drillOptions.find((o) => String(o.id) === String(v))
                  set({ hse_drill_1: v, hse_drill_1_name: d?.name || '' })
                }}
                options={drillOptions}
                placeholder={form.rig ? 'Select…' : 'Select a rig first'}
                disabled={!canWrite || !form.rig}
              />
            </Field>
            <Field label="Type of Drill/Training - 2" error={fieldErrors.hse_drill_2}>
              <PlainSelect
                value={form.hse_drill_2}
                onChange={(v) => {
                  const d = drillOptions.find((o) => String(o.id) === String(v))
                  set({ hse_drill_2: v, hse_drill_2_name: d?.name || '' })
                }}
                options={drill2Options}
                placeholder={form.hse_drill_1 ? 'Select…' : 'Select Type - 1 first'}
                disabled={!canWrite || !form.hse_drill_1}
              />
            </Field>
            <Field label="Head Count" required error={fieldErrors.head_count}>
              <Input type="number" value={form.head_count} onChange={(e) => set({ head_count: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>

            <Field label="Control Room on shore" required error={fieldErrors.control_room_on_shore}>
              <TilePicker options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]} value={form.control_room_on_shore} onChange={(v) => set({ control_room_on_shore: v })} disabled={!canWrite} />
            </Field>
            <Field label="Initiated By - 1" required error={fieldErrors.initiated_by_fs_emp_1}>
              <RemoteCombobox field={EMPLOYEE_FIELD} value={form.initiated_by_fs_emp_1} labelValue={form.initiated_by_fs_emp_1_name} onChange={(v, raw) => set({ initiated_by_fs_emp_1: v, initiated_by_fs_emp_1_name: raw?.display_name || '' })} disabled={!canWrite} />
            </Field>
            <Field label="Initiated By - 2" error={fieldErrors.initiated_by_fs_emp_2}>
              <RemoteCombobox field={EMPLOYEE_FIELD} value={form.initiated_by_fs_emp_2} labelValue={form.initiated_by_fs_emp_2_name} onChange={(v, raw) => set({ initiated_by_fs_emp_2: v, initiated_by_fs_emp_2_name: raw?.display_name || '' })} disabled={!canWrite} />
            </Field>
            <Field
              label="Initial Response Time"
              required
              error={fieldErrors.initial_response_time}
              hint="Minutes.Seconds — e.g. 2.30 means 2 min 30 sec, not 2.3 minutes."
            >
              <MmSsInput value={form.initial_response_time} onChange={(v) => set({ initial_response_time: v })} disabled={!canWrite} />
            </Field>

            <Field label="No. of Participants" required error={fieldErrors.no_of_participants}>
              <Input type="number" value={form.no_of_participants} onChange={(e) => set({ no_of_participants: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>
          </SectionCard>

          <SectionCard
            title="Team Size & Duration"
            hint="Durations are Minutes.Seconds (MI.SS), e.g. 8.00 = 8 min 0 sec. The part after the dot is seconds, 00–59, so the highest you can enter is 99.59."
          >
            <Field label="Fire Team #1 Size">
              <Input type="number" value={form.fire_team_1_size} onChange={(e) => set({ fire_team_1_size: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>
            <Field label="Fire Team #1 Duration" error={fieldErrors.fire_team_1_duration}>
              <MmSsInput value={form.fire_team_1_duration} onChange={(v) => set({ fire_team_1_duration: v })} disabled={!canWrite} />
            </Field>
            <Field label="Fire Team #2 Size">
              <Input type="number" value={form.fire_team_2_size} onChange={(e) => set({ fire_team_2_size: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>
            <Field label="Fire Team #2 Duration" error={fieldErrors.fire_team_2_duration}>
              <MmSsInput value={form.fire_team_2_duration} onChange={(v) => set({ fire_team_2_duration: v })} disabled={!canWrite} />
            </Field>

            <Field label="Stretcher Team Size">
              <Input type="number" value={form.stretcher_team_size} onChange={(e) => set({ stretcher_team_size: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>
            <Field label="Maintenance Team Size">
              <Input type="number" value={form.maintenance_team_size} onChange={(e) => set({ maintenance_team_size: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>
            <Field label="S&R Team Size">
              <Input type="number" value={form.snr_team_size} onChange={(e) => set({ snr_team_size: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>
            <Field label="S&R Team Duration" error={fieldErrors.snr_team_duration}>
              <MmSsInput value={form.snr_team_duration} onChange={(v) => set({ snr_team_duration: v })} disabled={!canWrite} />
            </Field>

            <Field label="Drill Muster - Duration" required error={fieldErrors.drill_muster}>
              <MmSsInput value={form.drill_muster} onChange={(v) => set({ drill_muster: v })} disabled={!canWrite} />
            </Field>
            <Field label="Abandon Muster (Offshore) - Duration" error={fieldErrors.abandon_muster_offshore}>
              <MmSsInput value={form.abandon_muster_offshore} onChange={(v) => set({ abandon_muster_offshore: v })} disabled={!canWrite} />
            </Field>
            <Field label="Total Time of Drill" required error={fieldErrors.total_time_of_drill}>
              <MmSsInput value={form.total_time_of_drill} onChange={(v) => set({ total_time_of_drill: v })} disabled={!canWrite} />
            </Field>
            <Field label="Format Revision No." required error={fieldErrors.revision_value}>
              <Input type="number" value={form.revision_value} onChange={(e) => set({ revision_value: e.target.value })} disabled={!canWrite} className="text-right" />
            </Field>
          </SectionCard>

          <SectionCard title="Approval">
            <Field label="PIC / OIM" required wide error={fieldErrors.approved_by_oim_fs_emp}>
              <RemoteCombobox field={EMPLOYEE_FIELD} value={form.approved_by_oim_fs_emp} labelValue={form.approved_by_oim_fs_emp_name} onChange={(v, raw) => set({ approved_by_oim_fs_emp: v, approved_by_oim_fs_emp_name: raw?.display_name || '' })} disabled={!canWrite} />
            </Field>
            <Field label="Company Man" wide error={fieldErrors.approved_by_companyman}>
              <Input value={form.approved_by_companyman} maxLength={20} onChange={(e) => set({ approved_by_companyman: e.target.value })} disabled={!canWrite} />
            </Field>
          </SectionCard>
        </>
      )}

      {canWrite && !loading && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add'}
          </Button>
        </div>
      )}

      {leaveDialog}
    </div>
  )
}
