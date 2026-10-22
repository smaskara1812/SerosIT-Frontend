import { useEffect, useRef, useState } from 'react'
import HistoryButton from '@/components/audit/HistoryButton'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldErrorScope, FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox, TilePicker } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'
import { IMAGE_ACCEPT } from '@/lib/mediaTypes'
import RigLoading from '@/components/RigLoading'

const FIELD_LABELS = {
  rig: 'Rig', rig_incident_no: 'Rig Incident No.', unit_name: 'Unit', incident_party: 'Incident Belongs To',
  incident_date: 'Incident Date and Time', incident_time: 'Incident Time', incident_reported_dt: 'Incident Reported Date and Time',
  incident_reported_time: 'Incident Reported Time', well_no: 'Well No.',
  country: 'Country', operator: 'Operator', drilling_superintendent: 'Drilling Superintendent', safety_officer: 'Safety Officer',
  incident_type: 'Nature of Accident/Incident', incident_severity: 'Incident Severity (Actual)',
  incident_severity_potential: 'Incident Severity (Potential)', person_injured: 'Person Injured', third_party: 'Belongs To',
  contractor: 'TP Contractor Name', fs_emp: 'Employee', emp_name: 'Name of Person', rank: 'Designation (Rank)',
  rank_name: 'Designation', total_rig_exp_months: 'Total Rig Experience (months)',
  part_of_body_1: 'Part of Body Injured 1', part_of_body_2: 'Part of Body Injured 2',
  part_of_body_3: 'Part of Body Injured 3', part_of_body_4: 'Part of Body Injured 4',
  incident_descr: 'Description', immediate_incident_cause: 'Immediate Cause', immediate_incident_cause_2: 'Immediate Cause 2',
  immediate_cause_descr: 'Immediate Cause Description', rig_operation: 'Rig Operation', work_location: 'Work Location',
  contact_expo_type: 'Contact / Exposure Type', corrective_action: 'Corrective Action', preventive_action: 'Preventive Action',
  npt_hrs_loss: 'Loss in Hours: NPT', manhours_loss: 'Manhours', financial_loss_currency: 'Currency',
  financial_loss_amt: 'Financial Loss Amount', reported_by: 'Reported By', rptd_by_rank: "Reporter's Rank", comments: 'Comments',
}

// The date and time inputs are separate on screen but one field on the server.
const FORM_TO_API = { incident_time: 'incident_date', incident_reported_time: 'incident_reported_dt' }

const MENU_KEY = 'qhse.incident_details'

// Both "Belongs To" dropdowns (top-level Incident Belongs To, and the
// Injury section's own Belongs To) share this exact option set — verified
// against legacy ddlIncident_Party / ddlThird_Party's own list items.
const BELONGS_TO_OPTIONS = [
  { value: '0', label: 'TP Contractors' },
  { value: '1', label: 'Operator Contractors' },
  { value: '2', label: 'Operator' },
  { value: '10', label: 'OGDSL' },
  { value: '30', label: 'EOSL' },
  { value: '308', label: 'StarBit' },
  { value: '309', label: 'OGD-EHES JVPL' },
  { value: '316', label: 'Seros' },
]
const CONTRACTOR_REQUIRED_VALUES = new Set(['0', '1'])

const SEVERITY_OPTIONS = [
  { value: 'L', label: 'Low' },
  { value: 'M', label: 'Medium' },
  { value: 'H', label: 'High' },
]

const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const COUNTRY_FIELD = { type: 'select-remote', remote: '/api/masters/countries/', optionLabel: 'country_name', optionValue: 'country_id', labelField: 'country_name' }
const OPERATOR_FIELD = { type: 'select-remote', remote: '/api/masters/operators/', optionLabel: 'operator_name', optionValue: 'operator_id', labelField: 'operator_name' }
const INCIDENT_TYPE_FIELD = { type: 'select-remote', remote: '/api/masters/incident-types/', optionLabel: 'incident_type', optionValue: 'incident_type_id', labelField: 'incident_type' }
const INCIDENT_CAUSE_FIELD = { type: 'select-remote', remote: '/api/masters/incident-causes/', optionLabel: 'incident_cause_desc', optionValue: 'incident_cause_id', labelField: 'incident_cause_desc' }
const RIG_OPERATION_FIELD = { type: 'select-remote', remote: '/api/masters/rig-operations/', optionLabel: 'rig_operation_name', optionValue: 'rig_operation_id', labelField: 'rig_operation_name' }
const WORK_LOCATION_FIELD = { type: 'select-remote', remote: '/api/masters/work-locations/', optionLabel: 'work_location', optionValue: 'work_location_id', labelField: 'work_location' }
const CONTACT_EXPO_FIELD = { type: 'select-remote', remote: '/api/masters/contact-exposure-types/', optionLabel: 'contact_expo_type_name', optionValue: 'contact_expo_type_id', labelField: 'contact_expo_type_name' }
const CONTRACTOR_FIELD = { type: 'select-remote', remote: '/api/masters/contractors/', optionLabel: 'contractor_name', optionValue: 'contractor_id', labelField: 'contractor_name' }
const EMPLOYEE_FIELD = { type: 'search-remote', remote: '/api/masters/fs-employees/?active=Y', optionLabel: 'full_name', optionValue: 'fs_emp_id', labelField: 'emp_name', derives: { rank_id: 'rank', rank_name: 'rank_name' } }
const RANK_FIELD = { type: 'select-remote', remote: '/api/masters/ranks/', optionLabel: 'rank_name', optionValue: 'rank_id', labelField: 'rptd_by_rank_name' }
const CURRENCY_FIELD = { type: 'select-remote', remote: '/api/masters/currencies/', optionLabel: 'currency_name', optionValue: 'currency_id', labelField: 'financial_loss_currency_name' }
const PART_OF_BODY_FIELD = { type: 'select-remote', remote: '/api/masters/parts-of-body/', optionLabel: 'part_of_body_name', optionValue: 'part_of_body_id' }

function splitDt(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function joinDt(date, time) {
  if (!date) return null
  return `${date}T${time || '00:00'}:00`
}

function emptyForm() {
  return {
    rig: null, rig_label: '',
    incident_party: '',
    incident_date: '', incident_time: '',
    rig_incident_no: '', unit_name: '',
    incident_reported_dt: '', incident_reported_time: '',
    well_no: '', operator: null, operator_label: '',
    country: null, country_label: '',
    drilling_superintendent: '', safety_officer: '',
    incident_type: null, incident_type_label: '',
    incident_severity: '', incident_severity_potential: '',
    person_injured: 'N',
    third_party: '',
    contractor: null, contractor_label: '',
    emp_name: '', fs_emp: null, fs_emp_label: '',
    rank: null, rank_name: '',
    total_rig_exp_months: '',
    part_of_body_1: null, part_of_body_1_label: '',
    part_of_body_2: null, part_of_body_2_label: '',
    part_of_body_3: null, part_of_body_3_label: '',
    part_of_body_4: null, part_of_body_4_label: '',
    incident_descr: '',
    immediate_incident_cause: null, immediate_incident_cause_label: '',
    immediate_incident_cause_2: null, immediate_incident_cause_2_label: '',
    immediate_cause_descr: '',
    rig_operation: null, rig_operation_label: '',
    work_location: null, work_location_label: '',
    contact_expo_type: null, contact_expo_type_label: '',
    corrective_action: '', preventive_action: '',
    npt_hrs_loss: '', manhours_loss: '',
    financial_loss_currency: null, financial_loss_currency_label: '',
    financial_loss_amt: '',
    reported_by: '', rptd_by_rank: null, rptd_by_rank_label: '',
    comments: '',
  }
}

function formToRecord(data) {
  const dt = splitDt(data.incident_date)
  const rdt = splitDt(data.incident_reported_dt)
  return {
    rig: data.rig, rig_label: data.rig_name,
    incident_party: data.incident_party || '',
    incident_date: dt.date, incident_time: dt.time,
    rig_incident_no: data.rig_incident_no || '', unit_name: data.unit_name || '',
    incident_reported_dt: rdt.date, incident_reported_time: rdt.time,
    well_no: data.well_no || '', operator: data.operator, operator_label: data.operator_name,
    country: data.country, country_label: data.country_name,
    drilling_superintendent: data.drilling_superintendent || '', safety_officer: data.safety_officer || '',
    incident_type: data.incident_type, incident_type_label: data.incident_type_name,
    incident_severity: data.incident_severity || '', incident_severity_potential: data.incident_severity_potential || '',
    person_injured: data.person_injured || 'N',
    third_party: data.third_party || '',
    contractor: data.contractor, contractor_label: data.contractor_name,
    emp_name: data.emp_name || '', fs_emp: data.fs_emp, fs_emp_label: data.emp_name,
    rank: data.rank, rank_name: data.rank_name || '',
    total_rig_exp_months: data.total_rig_exp_months ?? '',
    part_of_body_1: data.part_of_body_1, part_of_body_1_label: data.part_of_body_1_name,
    part_of_body_2: data.part_of_body_2, part_of_body_2_label: data.part_of_body_2_name,
    part_of_body_3: data.part_of_body_3, part_of_body_3_label: data.part_of_body_3_name,
    part_of_body_4: data.part_of_body_4, part_of_body_4_label: data.part_of_body_4_name,
    incident_descr: data.incident_descr || '',
    immediate_incident_cause: data.immediate_incident_cause, immediate_incident_cause_label: data.immediate_incident_cause_name,
    immediate_incident_cause_2: data.immediate_incident_cause_2, immediate_incident_cause_2_label: data.immediate_incident_cause_2_name,
    immediate_cause_descr: data.immediate_cause_descr || '',
    rig_operation: data.rig_operation, rig_operation_label: data.rig_operation_name,
    work_location: data.work_location, work_location_label: data.work_location_name,
    contact_expo_type: data.contact_expo_type, contact_expo_type_label: data.contact_expo_type_name,
    corrective_action: data.corrective_action || '', preventive_action: data.preventive_action || '',
    npt_hrs_loss: data.npt_hrs_loss ?? '', manhours_loss: data.manhours_loss ?? '',
    financial_loss_currency: data.financial_loss_currency, financial_loss_currency_label: data.financial_loss_currency_name,
    financial_loss_amt: data.financial_loss_amt ?? '',
    reported_by: data.reported_by || '', rptd_by_rank: data.rptd_by_rank, rptd_by_rank_label: data.rptd_by_rank_name,
    comments: data.comments || '',
  }
}

function BelongsToSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">Select…</option>
      {BELONGS_TO_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({ label, name, required, children, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame name={name}>{children}</FieldFrame>
    </div>
  )
}

const REQUIRED = 'This field is required.'

// Checks the legacy rules in the browser first, so a mistake shows at once with
// no trip to the server. The server checks the same rules again (it is the one
// that counts); only "the Rig Incident No. is already used on this rig" and the
// allowed-value lists are left to it, since the pickers already limit the lists.
// `original` is the saved record when editing: a rule is only checked when the
// fields it involves are new or changed, so an old incident that already breaks
// one can still be edited for something else.
function checkForm(form, original) {
  const norm = (v) => (typeof v === 'string' ? v.trim() || null : v === '' || v === undefined ? null : v)
  const changed = (...names) => !original || names.some((n) => norm(form[n]) !== norm(original[n]))
  const errs = {}

  if (changed('rig', 'unit_name')) {
    if (!form.rig && !norm(form.unit_name)) errs.rig = 'Pick a rig or enter a unit name.'
    else if (form.rig && norm(form.unit_name)) errs.unit_name = 'Pick a rig or enter a unit name, not both.'
  }
  if (!form.incident_party) errs.incident_party = 'Select who the incident belongs to.'

  if (changed('incident_date', 'incident_time')) {
    if (!form.incident_date) errs.incident_date = 'Enter the incident date.'
    else if (!form.incident_time) errs.incident_time = 'Enter the incident time.'
    else if (new Date(joinDt(form.incident_date, form.incident_time)) > new Date()) errs.incident_date = "Incident date and time can't be in the future."
  }
  if (changed('incident_reported_dt', 'incident_reported_time', 'incident_date', 'incident_time')) {
    if (!form.incident_reported_dt) errs.incident_reported_dt = 'Enter when the incident was reported.'
    else if (!form.incident_reported_time) errs.incident_reported_time = 'Enter the time the incident was reported.'
    else if (form.incident_date && joinDt(form.incident_reported_dt, form.incident_reported_time) < joinDt(form.incident_date, form.incident_time)) {
      errs.incident_reported_dt = "Reported date and time can't be before the incident date and time."
    }
  }

  if (!form.incident_type) errs.incident_type = REQUIRED
  if (!form.incident_severity) errs.incident_severity = REQUIRED
  if (!form.incident_severity_potential) errs.incident_severity_potential = REQUIRED
  if (!norm(form.incident_descr)) errs.incident_descr = REQUIRED
  if (!form.immediate_incident_cause) errs.immediate_incident_cause = REQUIRED
  if (!form.rig_operation) errs.rig_operation = REQUIRED
  if (!form.work_location) errs.work_location = REQUIRED
  if (!form.contact_expo_type) errs.contact_expo_type = REQUIRED

  if (Number(form.financial_loss_amt) > 0 && !form.financial_loss_currency && changed('financial_loss_amt', 'financial_loss_currency')) {
    errs.financial_loss_currency = 'Select the currency for the loss amount.'
  }

  if (form.person_injured === 'Y' && CONTRACTOR_REQUIRED_VALUES.has(form.third_party) && !form.contractor && changed('person_injured', 'third_party', 'contractor')) {
    errs.contractor = 'Contractor is required when Belongs To is TP Contractors or Operator Contractors.'
  }

  const bodyParts = ['part_of_body_1', 'part_of_body_2', 'part_of_body_3', 'part_of_body_4']
  const injury = ['person_injured', 'fs_emp', 'emp_name', 'rank', 'rank_name', 'total_rig_exp_months', ...bodyParts]
  if (form.person_injured === 'Y' && changed(...injury)) {
    if (!norm(form.emp_name) && !form.fs_emp) errs.emp_name = 'Enter the name of the injured person.'
    if (!form.rank && !norm(form.rank_name)) errs.rank = "Select the injured person's designation."
    if (norm(form.total_rig_exp_months) === null) errs.total_rig_exp_months = 'Enter the total rig/field experience in months.'
    if (!bodyParts.some((n) => form[n])) errs.part_of_body_1 = 'Choose at least one part of the body that was injured.'
  }
  return errs
}

const todayString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function IncidentDetailsFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, MENU_KEY, isEdit ? 'edit' : 'add')

  const [form, setForm] = useState(emptyForm)
  const [photos, setPhotos] = useState([])
  const [incidentNo, setIncidentNo] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const bannerRef = useRef(null)
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify(emptyForm())))

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    setNotFound(false)
    apiFetch(`/api/qhse/incidents/${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        const record = formToRecord(data)
        setForm(record)
        setPhotos(data.photos || [])
        setIncidentNo(data.incident_no)
        setSnapshot(JSON.stringify(record))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function set(patch) {
    setFieldErrors((prev) => {
      const keys = Object.keys(patch).flatMap((k) => [k, FORM_TO_API[k] || k]).filter((k) => prev[k])
      return keys.length ? { ...prev, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : prev
    })
    setForm((f) => ({ ...f, ...patch }))
  }

  function buildPayload() {
    return {
      rig: form.rig,
      incident_party: form.incident_party || null,
      incident_date: joinDt(form.incident_date, form.incident_time),
      rig_incident_no: form.rig_incident_no || null,
      unit_name: form.unit_name || null,
      incident_reported_dt: joinDt(form.incident_reported_dt, form.incident_reported_time),
      well_no: form.well_no || null,
      operator: form.operator,
      country: form.country,
      drilling_superintendent: form.drilling_superintendent || null,
      safety_officer: form.safety_officer || null,
      incident_type: form.incident_type,
      incident_severity: form.incident_severity,
      incident_severity_potential: form.incident_severity_potential || null,
      person_injured: form.person_injured,
      third_party: form.person_injured === 'Y' ? form.third_party || null : null,
      contractor: form.person_injured === 'Y' && CONTRACTOR_REQUIRED_VALUES.has(form.third_party) ? form.contractor : null,
      emp_name: form.person_injured === 'Y' ? form.emp_name || null : null,
      fs_emp: form.person_injured === 'Y' ? form.fs_emp : null,
      rank: form.person_injured === 'Y' ? form.rank : null,
      rank_name: form.person_injured === 'Y' ? form.rank_name || null : null,
      total_rig_exp_months: form.person_injured === 'Y' && form.total_rig_exp_months !== '' ? Number(form.total_rig_exp_months) : null,
      part_of_body_1: form.person_injured === 'Y' ? form.part_of_body_1 : null,
      part_of_body_2: form.person_injured === 'Y' ? form.part_of_body_2 : null,
      part_of_body_3: form.person_injured === 'Y' ? form.part_of_body_3 : null,
      part_of_body_4: form.person_injured === 'Y' ? form.part_of_body_4 : null,
      incident_descr: form.incident_descr,
      immediate_incident_cause: form.immediate_incident_cause,
      immediate_incident_cause_2: form.immediate_incident_cause_2,
      immediate_cause_descr: form.immediate_cause_descr || null,
      rig_operation: form.rig_operation,
      work_location: form.work_location,
      contact_expo_type: form.contact_expo_type,
      corrective_action: form.corrective_action || null,
      preventive_action: form.preventive_action || null,
      npt_hrs_loss: form.npt_hrs_loss !== '' ? form.npt_hrs_loss : null,
      manhours_loss: form.manhours_loss !== '' ? form.manhours_loss : null,
      financial_loss_currency: form.financial_loss_currency,
      financial_loss_amt: form.financial_loss_amt !== '' ? form.financial_loss_amt : null,
      reported_by: form.reported_by || null,
      rptd_by_rank: form.rptd_by_rank,
      comments: form.comments || null,
    }
  }

  async function handleSave() {
    setError('')
    setFieldErrors({})
    const found = checkForm(form, isEdit && snapshot ? JSON.parse(snapshot) : null)
    if (Object.keys(found).length) {
      showFormError(formatApiError(found, FIELD_LABELS), { setError, bannerRef })
      setFieldErrors(buildFieldErrors(found, FIELD_LABELS))
      scrollToFirstFieldError()
      return
    }
    setSaving(true)
    try {
      const url = isEdit ? `/api/qhse/incidents/${id}/` : '/api/qhse/incidents/'
      const res = await apiFetch(url, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(buildPayload()) })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
        scrollToFirstFieldError()
        return
      }
      allowNextNavigation()
      if (isEdit) {
        toast.success('Changes saved')
        setForm(formToRecord(data))
        setSnapshot(JSON.stringify(formToRecord(data)))
      } else {
        toast.success(`Incident #${data.incident_no} created`)
        navigate(`/qhse/incident-details/${data.incident_id}/edit`, { replace: true })
      }
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file || !isEdit) return
    const body = new FormData()
    body.append('file', file)
    try {
      const res = await apiFetch(`/api/qhse/incidents/${id}/photos/`, { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Upload failed')
        return
      }
      setPhotos((prev) => [...prev, data])
      toast.success('Photo uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      e.target.value = ''
    }
  }

  async function handleDeletePhoto(photoId) {
    if (!isEdit) return
    const res = await apiFetch(`/api/qhse/incidents/${id}/photos/?photo_id=${photoId}`, { method: 'DELETE' })
    if (res.status === 204) {
      setPhotos((prev) => prev.filter((p) => p.incident_photo_id !== photoId))
      toast.success('Photo removed')
    } else {
      toast.error('Failed to remove photo')
    }
  }

  const hasChanges = snapshot !== null && JSON.stringify(form) !== snapshot
  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: canWrite && !saving && !loading ? handleSave : undefined,
  })

  if (notFound) return <Navigate to="/qhse/incident-details" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const injured = form.person_injured === 'Y'
  const contractorRequired = injured && CONTRACTOR_REQUIRED_VALUES.has(form.third_party)
  const heading = isEdit ? (incidentNo ? `Incident #${incidentNo}` : 'Edit Incident') : 'New Incident'

  return (
    <FieldErrorScope errors={fieldErrors} className="mx-auto flex max-w-4xl flex-col gap-4 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">{heading}</h1>
          {isEdit && (
            <HistoryButton menuKey={MENU_KEY} recordId={id} title={heading} onChanged={() => window.location.reload()} />
          )}
        </div>
        {canWrite && !loading && (
          <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        )}
      </div>

      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>
      )}
      {!canWrite && !loading && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You have view-only access to Incident Details.
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground"><RigLoading /></p>
      ) : (
        <>
          <SectionCard title="Incident">
            <Field name="rig_incident_no" label="Rig Incident No.">
              <Input value={form.rig_incident_no} onChange={(e) => set({ rig_incident_no: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="unit_name" label="Unit">
              <Input value={form.unit_name} onChange={(e) => set({ unit_name: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="rig" label="Rig" required>
              <RemoteCombobox field={RIG_FIELD} value={form.rig} labelValue={form.rig_label} onChange={(v, raw) => set({ rig: v, rig_label: raw?.rig_name || '' })} disabled={!canWrite} />
            </Field>
            <Field name="incident_party" label="Incident Belongs To" required>
              <BelongsToSelect value={form.incident_party} onChange={(v) => set({ incident_party: v })} disabled={!canWrite} />
            </Field>
            <Field name="incident_date" label="Incident Date" required>
              <Input type="date" max={todayString()} value={form.incident_date} onChange={(e) => { const d = e.target.value; set(d && form.incident_reported_dt && form.incident_reported_dt < d ? { incident_date: d, incident_reported_dt: '' } : { incident_date: d }) }} disabled={!canWrite} />
            </Field>
            <Field name="incident_time" label="Incident Time" required>
              <Input type="time" value={form.incident_time} onChange={(e) => set({ incident_time: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="incident_reported_dt" label="Incident Reported Date" required>
              <Input type="date" min={form.incident_date || undefined} value={form.incident_reported_dt} onChange={(e) => set({ incident_reported_dt: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="incident_reported_time" label="Incident Reported Time" required>
              <Input type="time" value={form.incident_reported_time} onChange={(e) => set({ incident_reported_time: e.target.value })} disabled={!canWrite} />
            </Field>
          </SectionCard>

          <SectionCard title="Location">
            <Field name="well_no" label="Well No.">
              <Input value={form.well_no} onChange={(e) => set({ well_no: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="country" label="Country">
              <RemoteCombobox field={COUNTRY_FIELD} value={form.country} labelValue={form.country_label} onChange={(v, raw) => set({ country: v, country_label: raw?.country_name || '' })} disabled={!canWrite} />
            </Field>
            <Field name="operator" label="Operator">
              <RemoteCombobox field={OPERATOR_FIELD} value={form.operator} labelValue={form.operator_label} onChange={(v, raw) => set({ operator: v, operator_label: raw?.operator_name || '' })} disabled={!canWrite} />
            </Field>
            <Field name="drilling_superintendent" label="Drilling Superintendent">
              <Input value={form.drilling_superintendent} onChange={(e) => set({ drilling_superintendent: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="safety_officer" label="Safety Officer">
              <Input value={form.safety_officer} onChange={(e) => set({ safety_officer: e.target.value })} disabled={!canWrite} />
            </Field>
          </SectionCard>

          <SectionCard title="Nature">
            <Field name="incident_type" label="Nature of Accident/Incident" required wide>
              <RemoteCombobox field={INCIDENT_TYPE_FIELD} value={form.incident_type} labelValue={form.incident_type_label} onChange={(v, raw) => set({ incident_type: v, incident_type_label: raw?.incident_type || '' })} disabled={!canWrite} />
            </Field>
            <Field name="incident_severity" label="Incident Severity: Actual" required>
              <TilePicker options={SEVERITY_OPTIONS} value={form.incident_severity || null} onChange={(v) => set({ incident_severity: v })} disabled={!canWrite} />
            </Field>
            <Field name="incident_severity_potential" label="Potential" required>
              <TilePicker options={SEVERITY_OPTIONS} value={form.incident_severity_potential || null} onChange={(v) => set({ incident_severity_potential: v })} disabled={!canWrite} />
            </Field>
          </SectionCard>

          <SectionCard title="Injury">
            <Field name="person_injured" label="Person Injured">
              <TilePicker
                options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
                value={form.person_injured}
                onChange={(v) => set({ person_injured: v })}
                disabled={!canWrite}
              />
            </Field>
            {injured && (
              <Field name="third_party" label="Belongs To">
                <BelongsToSelect
                  value={form.third_party}
                  onChange={(v) => set({ third_party: v, contractor: CONTRACTOR_REQUIRED_VALUES.has(v) ? form.contractor : null })}
                  disabled={!canWrite}
                />
              </Field>
            )}
            {injured && contractorRequired && (
              <Field name="contractor" label="TP Contractor Name" required>
                <RemoteCombobox field={CONTRACTOR_FIELD} value={form.contractor} labelValue={form.contractor_label} onChange={(v, raw) => set({ contractor: v, contractor_label: raw?.contractor_name || '' })} disabled={!canWrite} />
              </Field>
            )}
            {injured && (
              <>
                <Field name="fs_emp" label="Employee">
                  <RemoteCombobox
                    field={EMPLOYEE_FIELD}
                    value={form.fs_emp}
                    labelValue={form.fs_emp_label}
                    onChange={(v, raw) =>
                      set({
                        fs_emp: v,
                        fs_emp_label: raw?.full_name || '',
                        emp_name: raw?.full_name || form.emp_name,
                        rank: raw?.rank ?? form.rank,
                        rank_name: raw?.rank_name ?? form.rank_name,
                      })
                    }
                    disabled={!canWrite}
                  />
                </Field>
                <Field name="emp_name" label="Name of Person" required>
                  <Input value={form.emp_name} onChange={(e) => set({ emp_name: e.target.value })} disabled={!canWrite} />
                </Field>
                <Field name="rank" label="Designation (Rank)" required>
                  <Input value={form.rank_name} disabled />
                </Field>
                <Field name="total_rig_exp_months" label="Total Rig/Field Exp (months)" required>
                  <Input type="number" value={form.total_rig_exp_months} onChange={(e) => set({ total_rig_exp_months: e.target.value })} disabled={!canWrite} />
                </Field>
                <Field name="part_of_body_1" label="Part Of Body Injured 1" required>
                  <RemoteCombobox field={PART_OF_BODY_FIELD} value={form.part_of_body_1} labelValue={form.part_of_body_1_label} onChange={(v, raw) => set({ part_of_body_1: v, part_of_body_1_label: raw?.part_of_body_name || '' })} disabled={!canWrite} />
                </Field>
                <Field name="part_of_body_2" label="Part Of Body Injured 2">
                  <RemoteCombobox field={PART_OF_BODY_FIELD} value={form.part_of_body_2} labelValue={form.part_of_body_2_label} onChange={(v, raw) => set({ part_of_body_2: v, part_of_body_2_label: raw?.part_of_body_name || '' })} disabled={!canWrite} />
                </Field>
                <Field name="part_of_body_3" label="Part Of Body Injured 3">
                  <RemoteCombobox field={PART_OF_BODY_FIELD} value={form.part_of_body_3} labelValue={form.part_of_body_3_label} onChange={(v, raw) => set({ part_of_body_3: v, part_of_body_3_label: raw?.part_of_body_name || '' })} disabled={!canWrite} />
                </Field>
                <Field name="part_of_body_4" label="Part Of Body Injured 4">
                  <RemoteCombobox field={PART_OF_BODY_FIELD} value={form.part_of_body_4} labelValue={form.part_of_body_4_label} onChange={(v, raw) => set({ part_of_body_4: v, part_of_body_4_label: raw?.part_of_body_name || '' })} disabled={!canWrite} />
                </Field>
              </>
            )}
          </SectionCard>

          <SectionCard title="Causes">
            <Field name="incident_descr" label="Description (1000 chars)" required wide>
              <Textarea rows={3} value={form.incident_descr} onChange={(e) => set({ incident_descr: e.target.value })} maxLength={1000} disabled={!canWrite} />
            </Field>
            <Field name="immediate_incident_cause" label="Immediate Cause" required>
              <RemoteCombobox field={INCIDENT_CAUSE_FIELD} value={form.immediate_incident_cause} labelValue={form.immediate_incident_cause_label} onChange={(v, raw) => set({ immediate_incident_cause: v, immediate_incident_cause_label: raw?.incident_cause_desc || '' })} disabled={!canWrite} />
            </Field>
            <Field name="immediate_incident_cause_2" label="Immediate Cause 2">
              <RemoteCombobox field={INCIDENT_CAUSE_FIELD} value={form.immediate_incident_cause_2} labelValue={form.immediate_incident_cause_2_label} onChange={(v, raw) => set({ immediate_incident_cause_2: v, immediate_incident_cause_2_label: raw?.incident_cause_desc || '' })} disabled={!canWrite} />
            </Field>
            <Field name="immediate_cause_descr" label="Immediate Cause Description (500 chars)" wide>
              <Textarea rows={2} value={form.immediate_cause_descr} onChange={(e) => set({ immediate_cause_descr: e.target.value })} maxLength={500} disabled={!canWrite} />
            </Field>
          </SectionCard>

          <SectionCard title="Actions">
            <Field name="rig_operation" label="Rig Operation" required>
              <RemoteCombobox field={RIG_OPERATION_FIELD} value={form.rig_operation} labelValue={form.rig_operation_label} onChange={(v, raw) => set({ rig_operation: v, rig_operation_label: raw?.rig_operation_name || '' })} disabled={!canWrite} />
            </Field>
            <Field name="work_location" label="Work Location" required>
              <RemoteCombobox field={WORK_LOCATION_FIELD} value={form.work_location} labelValue={form.work_location_label} onChange={(v, raw) => set({ work_location: v, work_location_label: raw?.work_location || '' })} disabled={!canWrite} />
            </Field>
            <Field name="contact_expo_type" label="Contact / Exposure Type" required wide>
              <RemoteCombobox field={CONTACT_EXPO_FIELD} value={form.contact_expo_type} labelValue={form.contact_expo_type_label} onChange={(v, raw) => set({ contact_expo_type: v, contact_expo_type_label: raw?.contact_expo_type_name || '' })} disabled={!canWrite} />
            </Field>
            <Field name="corrective_action" label="Corrective Action (300 chars)" wide>
              <Textarea rows={2} value={form.corrective_action} onChange={(e) => set({ corrective_action: e.target.value })} maxLength={300} disabled={!canWrite} />
            </Field>
            <Field name="preventive_action" label="Preventive Action (250 chars)" wide>
              <Textarea rows={2} value={form.preventive_action} onChange={(e) => set({ preventive_action: e.target.value })} maxLength={250} disabled={!canWrite} />
            </Field>
          </SectionCard>

          <SectionCard title="Financials">
            <Field name="npt_hrs_loss" label="Loss in Hrs: NPT">
              <Input type="number" value={form.npt_hrs_loss} onChange={(e) => set({ npt_hrs_loss: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="manhours_loss" label="Manhours">
              <Input type="number" value={form.manhours_loss} onChange={(e) => set({ manhours_loss: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="financial_loss_currency" label="Currency">
              <RemoteCombobox field={CURRENCY_FIELD} value={form.financial_loss_currency} labelValue={form.financial_loss_currency_label} onChange={(v, raw) => set({ financial_loss_currency: v, financial_loss_currency_label: raw?.currency_name || '' })} disabled={!canWrite} />
            </Field>
            <Field name="financial_loss_amt" label="Financial Loss Amount">
              <Input type="number" value={form.financial_loss_amt} onChange={(e) => set({ financial_loss_amt: e.target.value })} disabled={!canWrite} />
            </Field>
          </SectionCard>

          <SectionCard title="Reporting">
            <Field name="reported_by" label="Reported By">
              <Input value={form.reported_by} onChange={(e) => set({ reported_by: e.target.value })} disabled={!canWrite} />
            </Field>
            <Field name="rptd_by_rank" label="Rank">
              <RemoteCombobox field={RANK_FIELD} value={form.rptd_by_rank} labelValue={form.rptd_by_rank_label} onChange={(v, raw) => set({ rptd_by_rank: v, rptd_by_rank_label: raw?.rank_name || '' })} disabled={!canWrite} />
            </Field>
            <Field name="comments" label="Comments (200 chars)" wide>
              <Textarea rows={2} value={form.comments} onChange={(e) => set({ comments: e.target.value })} maxLength={200} disabled={!canWrite} />
            </Field>
          </SectionCard>

          {isEdit && (
            <SectionCard title="Photos">
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                {photos.map((p) => (
                  <div key={p.incident_photo_id} className="relative">
                    <a href={p.url} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted">
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </a>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(p.incident_photo_id)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {canWrite && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input text-xs text-muted-foreground hover:bg-muted">
                    + Add
                    <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleUploadPhoto} />
                  </label>
                )}
              </div>
            </SectionCard>
          )}

          {canWrite && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
              </Button>
            </div>
          )}
        </>
      )}

      {leaveDialog}
    </FieldErrorScope>
  )
}
