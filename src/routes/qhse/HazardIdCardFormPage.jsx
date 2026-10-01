import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { formatApiError } from '@/lib/errors'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { joinNaiveDt, splitNaiveDt } from '@/lib/naiveDateTime'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox, TilePicker } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MENU_KEY = 'qhse.hazard_id_card'

const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const WORK_LOCATION_FIELD = { type: 'select-remote', remote: '/api/masters/work-locations/', optionLabel: 'work_location', optionValue: 'work_location_id', labelField: 'work_location' }
const HAZARD_TYPE_FIELD = { type: 'select-remote', remote: '/api/masters/hazard-types/?active=Y', optionLabel: 'haz_type_name', optionValue: 'haz_type_id', labelField: 'haz_type_name' }
const EMPLOYEE_FIELD = { type: 'search-remote', remote: '/api/masters/employees/', optionLabel: 'display_name', optionValue: 'emp_id', labelField: 'emp_name' }

const STATUS_OPTIONS = [
  { value: 'O', label: 'Open' },
  { value: 'C', label: 'Closed' },
]

function emptyForm() {
  return {
    rig: null, rig_label: '',
    contract_label: '',
    event_date: '', event_time: '',
    reported_by_party: '',
    reported_by_fs_emp: null, reported_by_fs_emp_label: '',
    reported_by_name: '',
    work_location: null, work_location_label: '',
    haz_type: null, haz_type_label: '',
    timeout_for_safety: 'N',
    hazard_desc: '',
    action_taken: '',
    resp_dept: null, resp_dept_label: '',
    resp_rank: null, resp_rank_label: '',
    close_out_date: '', close_out_time: '',
    haz_id_card_status: 'O',
  }
}

function formToRecord(data) {
  const evt = splitNaiveDt(data.event_dt)
  const co = splitNaiveDt(data.close_out_dt)
  return {
    rig: data.rig, rig_label: data.rig_name,
    contract_label: data.contract_label,
    event_date: evt.date, event_time: evt.time,
    reported_by_party: data.reported_by_party || '',
    reported_by_fs_emp: data.reported_by_fs_emp, reported_by_fs_emp_label: data.reported_by_fs_emp_name,
    reported_by_name: data.reported_by_name || '',
    work_location: data.work_location, work_location_label: data.work_location_name,
    haz_type: data.haz_type, haz_type_label: data.haz_type_name,
    timeout_for_safety: data.timeout_for_safety || 'N',
    hazard_desc: data.hazard_desc || '',
    action_taken: data.action_taken || '',
    resp_dept: data.resp_dept, resp_dept_label: data.resp_dept_name,
    resp_rank: data.resp_rank, resp_rank_label: data.resp_rank_name,
    close_out_date: co.date, close_out_time: co.time,
    haz_id_card_status: data.haz_id_card_status || 'O',
  }
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({ label, required, children, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}

function PlainSelect({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

export default function HazardIdCardFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, MENU_KEY, isEdit ? 'edit' : 'add')

  const [meta, setMeta] = useState({ reported_by_party_options: [] })
  const [form, setForm] = useState(emptyForm)
  const [cardNo, setCardNo] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify(emptyForm())))

  // Cascaded off the picked Rig — Project Contract (display-only) and the
  // Responsible Dept options eligible for that rig's category.
  const [vesselDepts, setVesselDepts] = useState([])
  const [ranks, setRanks] = useState([])
  // The SAVED status, not the live draft — otherwise picking "Closed" in
  // the Status tile would instantly lock every field (including Close Out
  // Date and the Status tile itself) before the user can ever save that
  // transition, making Open -> Closed impossible through the UI.
  const [savedStatus, setSavedStatus] = useState(null)
  const closedLocked = isEdit && savedStatus === 'C'

  // Set right before loading an existing record's rig into state, so the
  // rig-context effect below (which normally previews the *current*
  // contract for whatever rig is picked) knows this particular firing is
  // the initial load, not the user picking a rig — and leaves the card's
  // already-stored Project No. alone instead of overwriting it with
  // "whatever contract this rig happens to be on today" before the user
  // has touched anything.
  const skipContractOverwriteRef = useRef(false)

  useEffect(() => {
    apiFetch('/api/qhse/hazard-id-card/meta/')
      .then((r) => r.json())
      .then(setMeta)
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    setNotFound(false)
    apiFetch(`/api/qhse/hazard-id-card/${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        const record = formToRecord(data)
        skipContractOverwriteRef.current = true
        setForm(record)
        setCardNo(data.haz_id_card_no)
        setSnapshot(JSON.stringify(record))
        setSavedStatus(data.haz_id_card_status)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // Rig -> Project Contract (display) + eligible Responsible Dept list.
  // (vesselDepts/ranks are reset directly in the Rig/Dept onChange handlers
  // below, not here, so this effect never needs to setState on its guard's
  // false branch.)
  useEffect(() => {
    if (!form.rig) return
    let cancelled = false
    const skipOverwrite = skipContractOverwriteRef.current
    skipContractOverwriteRef.current = false
    apiFetch(`/api/qhse/hazard-id-card/rig-context/?rig=${form.rig}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        // Vessel depts always refresh (harmless — they're just dropdown
        // options for whichever rig is now picked). Project No. only
        // updates when this is a genuine rig change, not the initial load
        // of an existing record's own rig — see skipContractOverwriteRef.
        if (!skipOverwrite) {
          setForm((f) => ({ ...f, contract_label: data.contract?.label || 'No active contract for this rig' }))
        }
        setVesselDepts(data.vessel_depts || [])
      })
    return () => {
      cancelled = true
    }
  }, [form.rig])

  // Rig + Responsible Dept -> eligible Responsible Rank list.
  useEffect(() => {
    if (!form.rig || !form.resp_dept) return
    let cancelled = false
    apiFetch(`/api/qhse/hazard-id-card/ranks/?rig=${form.rig}&vessel_dept=${form.resp_dept}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRanks(data)
      })
    return () => {
      cancelled = true
    }
  }, [form.rig, form.resp_dept])

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function buildPayload() {
    const isEosil = form.reported_by_party === 'EOSIL'
    return {
      rig: form.rig,
      event_dt: joinNaiveDt(form.event_date, form.event_time),
      reported_by_party: form.reported_by_party || null,
      reported_by_fs_emp: isEosil ? form.reported_by_fs_emp : null,
      reported_by_name: isEosil ? null : form.reported_by_name || null,
      work_location: form.work_location,
      haz_type: form.haz_type,
      timeout_for_safety: form.timeout_for_safety,
      hazard_desc: form.hazard_desc,
      action_taken: form.action_taken || null,
      resp_dept: form.resp_dept,
      resp_rank: form.resp_rank,
      close_out_dt: joinNaiveDt(form.close_out_date, form.close_out_time),
      haz_id_card_status: form.haz_id_card_status,
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const url = isEdit ? `/api/qhse/hazard-id-card/${id}/` : '/api/qhse/hazard-id-card/'
      const res = await apiFetch(url, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(buildPayload()) })
      const data = await res.json()
      if (!res.ok) {
        setError(formatApiError(data))
        toast.error('Failed to save')
        return
      }
      allowNextNavigation()
      if (isEdit) {
        toast.success('Changes saved')
        setForm(formToRecord(data))
        setSnapshot(JSON.stringify(formToRecord(data)))
        setCardNo(data.haz_id_card_no)
        setSavedStatus(data.haz_id_card_status)
      } else {
        toast.success(`Haz ID Card No. ${data.haz_id_card_no} has been generated`)
        navigate(`/qhse/hazard-id-card/${data.haz_card_id}/edit`, { replace: true })
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
    onSave: canWrite && !saving && !loading && !closedLocked ? handleSave : undefined,
  })

  if (notFound) return <Navigate to="/qhse/hazard-id-card" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const isEosil = form.reported_by_party === 'EOSIL'
  const heading = isEdit ? (cardNo ? `Haz ID Card No. ${cardNo}` : 'Edit Hazard ID Card') : 'New Hazard ID Card'
  const writable = canWrite && !closedLocked

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {writable && !loading && (
          <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        )}
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {closedLocked && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          This card is Closed and can no longer be edited.
        </p>
      )}
      {!canWrite && !loading && !closedLocked && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You have view-only access to Hazard ID Card.
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <SectionCard title="Card">
            <Field label="Rig" required>
              <RemoteCombobox
                field={RIG_FIELD}
                value={form.rig}
                labelValue={form.rig_label}
                onChange={(v, raw) => {
                  set({ rig: v, rig_label: raw?.rig_name || '', resp_dept: null, resp_dept_label: '', resp_rank: null, resp_rank_label: '' })
                  if (!v) {
                    setVesselDepts([])
                    setRanks([])
                  }
                }}
                disabled={!writable}
              />
            </Field>
            <Field label="Project No.">
              <Input value={form.contract_label} readOnly disabled className="bg-muted" />
            </Field>
            <Field label="Event Date" required>
              <Input type="date" value={form.event_date} onChange={(e) => set({ event_date: e.target.value })} disabled={!writable} />
            </Field>
            <Field label="Event Time" required>
              <Input type="time" value={form.event_time} onChange={(e) => set({ event_time: e.target.value })} disabled={!writable} />
            </Field>
          </SectionCard>

          <SectionCard title="Reported By">
            <Field label="Reported By Party" required>
              <PlainSelect
                value={form.reported_by_party || null}
                onChange={(v) => set({ reported_by_party: v || '', reported_by_fs_emp: null, reported_by_fs_emp_label: '', reported_by_name: '' })}
                options={meta.reported_by_party_options.map((p) => ({ id: p, name: p }))}
                disabled={!writable}
              />
            </Field>
            {isEosil ? (
              <Field label="Reported By" required>
                <RemoteCombobox
                  field={EMPLOYEE_FIELD}
                  value={form.reported_by_fs_emp}
                  labelValue={form.reported_by_fs_emp_label}
                  onChange={(v, raw) => set({ reported_by_fs_emp: v, reported_by_fs_emp_label: raw?.display_name || '' })}
                  disabled={!writable}
                />
              </Field>
            ) : (
              <Field label="Reported By" required>
                <Input value={form.reported_by_name} maxLength={30} onChange={(e) => set({ reported_by_name: e.target.value })} disabled={!writable} />
              </Field>
            )}
          </SectionCard>

          <SectionCard title="Hazard">
            <Field label="Location of Hazard" required>
              <RemoteCombobox field={WORK_LOCATION_FIELD} value={form.work_location} labelValue={form.work_location_label} onChange={(v, raw) => set({ work_location: v, work_location_label: raw?.work_location || '' })} disabled={!writable} />
            </Field>
            <Field label="Type of Hazard" required>
              <RemoteCombobox field={HAZARD_TYPE_FIELD} value={form.haz_type} labelValue={form.haz_type_label} onChange={(v, raw) => set({ haz_type: v, haz_type_label: raw?.haz_type_name || '' })} disabled={!writable} />
            </Field>
            <Field label="Timeout For Safety">
              <TilePicker
                options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
                value={form.timeout_for_safety}
                onChange={(v) => set({ timeout_for_safety: v })}
                disabled={!writable}
              />
            </Field>
            <Field label="Hazard Description (200 chars)" required wide>
              <Textarea rows={3} maxLength={200} value={form.hazard_desc} onChange={(e) => set({ hazard_desc: e.target.value })} disabled={!writable} />
            </Field>
            <Field label="Action Taken (200 chars)" wide>
              <Textarea rows={3} maxLength={200} value={form.action_taken} onChange={(e) => set({ action_taken: e.target.value })} disabled={!writable} />
            </Field>
          </SectionCard>

          <SectionCard title="Responsibility & Status">
            <Field label="Responsible Dept" required>
              <PlainSelect
                value={form.resp_dept}
                onChange={(v) => {
                  const dept = vesselDepts.find((d) => String(d.id) === String(v))
                  set({ resp_dept: v, resp_dept_label: dept?.name || '', resp_rank: null, resp_rank_label: '' })
                  if (!v) setRanks([])
                }}
                options={vesselDepts}
                placeholder={form.rig ? 'Select…' : 'Select a rig first'}
                disabled={!writable || !form.rig}
              />
            </Field>
            <Field label="Responsible Position" required>
              <PlainSelect
                value={form.resp_rank}
                onChange={(v) => {
                  const rank = ranks.find((r) => String(r.id) === String(v))
                  set({ resp_rank: v, resp_rank_label: rank?.name || '' })
                }}
                options={ranks}
                placeholder={form.resp_dept ? 'Select…' : 'Select a Responsible Dept first'}
                disabled={!writable || !form.resp_dept}
              />
            </Field>
            <Field label="Close Out Date">
              <Input type="date" value={form.close_out_date} onChange={(e) => set({ close_out_date: e.target.value })} disabled={!writable} />
            </Field>
            <Field label="Close Out Time">
              <Input type="time" value={form.close_out_time} onChange={(e) => set({ close_out_time: e.target.value })} disabled={!writable} />
            </Field>
            <Field label="Status" required>
              <TilePicker options={STATUS_OPTIONS} value={form.haz_id_card_status} onChange={(v) => set({ haz_id_card_status: v })} disabled={!writable} />
            </Field>
          </SectionCard>

          {writable && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
              </Button>
            </div>
          )}
        </>
      )}
      {leaveDialog}
    </div>
  )
}
