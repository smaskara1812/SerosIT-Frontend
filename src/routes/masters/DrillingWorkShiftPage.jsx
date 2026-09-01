import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { RemoteCombobox, TilePicker } from './MasterCrudPage'
import { IconChevronLeft, IconTrash } from '@/components/icons'
import { Download } from 'lucide-react'

const MENU_KEY = 'masters.drilling_work_shift'
const API = '/api/masters/drilling-work-shifts/'

// Legacy bound this dropdown to eos.Prc_Mst_Project_Contract with
// @Record_Status='Get_All_Active_Project_Contract' — only contracts still
// running (no end date) are valid targets for a new work shift.
const PROJECT_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/project-contracts/?status=active',
  optionLabel: 'display_name',
  optionValue: 'prj_contract_id',
  labelField: 'contract_no',
}

const SHIFT_OPTIONS = [
  { value: 'M', label: 'Morning' },
  { value: 'E', label: 'Evening' },
]
const ACTIVE_OPTIONS = [
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' },
]

/** A combobox over a plain in-memory list (rigs already loaded with the
 * project) — same Combobox primitives as every other picker in the app,
 * just without a remote fetch. */
function StaticCombobox({ items, value, onChange, disabled, placeholder }) {
  const selectedItem = value != null ? (items.find((i) => i.value === String(value)) ?? null) : null
  return (
    <Combobox
      items={items}
      value={selectedItem}
      onValueChange={(item) => onChange(item ? item.value : null)}
      disabled={disabled}
    >
      <ComboboxInput placeholder={placeholder || 'Select…'} showClear className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No results</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

/** Shift/Start/End/Days/Active editor — shared by the insert row and an
 * in-place row edit. */
function ShiftFields({
  shiftOptions,
  shift,
  onShiftChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  days,
  onDaysChange,
  active,
  onActiveChange,
  disabled,
}) {
  return (
    <>
      <td className="px-3 py-2">
        {onShiftChange ? (
          <StaticCombobox items={shiftOptions} value={shift} onChange={onShiftChange} disabled={disabled} placeholder="Shift…" />
        ) : (
          <span className="font-medium text-foreground">
            {SHIFT_OPTIONS.find((s) => s.value === shift)?.label}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <Input type="time" value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} disabled={disabled} className="h-8" />
      </td>
      <td className="px-3 py-2">
        <Input type="time" value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} disabled={disabled} className="h-8" />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min="1"
          value={days}
          onChange={(e) => onDaysChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-16"
        />
      </td>
      <td className="px-3 py-2">
        <TilePicker options={ACTIVE_OPTIONS} value={active} onChange={onActiveChange} disabled={disabled} />
      </td>
    </>
  )
}

function ShiftRow({ row, usedShifts, canEdit, canDelete, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [shift, setShift] = useState(row.work_shift)
  const [startTime, setStartTime] = useState(row.work_shift_start_time?.slice(0, 5) || '')
  const [endTime, setEndTime] = useState(row.work_shift_end_time?.slice(0, 5) || '')
  const [days, setDays] = useState(row.work_shift_days)
  const [active, setActive] = useState(row.work_shift_active)
  const [saving, setSaving] = useState(false)

  // Editing an existing row can keep its own current shift as an option
  // even though it's "already used" — only the other row's shift needs excluding.
  const shiftOptions = SHIFT_OPTIONS.filter((s) => s.value === row.work_shift || !usedShifts.includes(s.value))

  async function save() {
    if (!startTime || !endTime || !days) {
      toast.error('Start time, end time and shift days are required')
      return
    }
    setSaving(true)
    const ok = await onSave(row.drilling_work_shift_id, {
      work_shift: shift,
      work_shift_start_time: startTime,
      work_shift_end_time: endTime,
      work_shift_days: days,
      work_shift_active: active,
    })
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (editing) {
    return (
      <tr className="border-t border-border bg-[#eef3fb]/40">
        <ShiftFields
          shiftOptions={shiftOptions}
          shift={shift}
          onShiftChange={setShift}
          startTime={startTime}
          onStartTimeChange={setStartTime}
          endTime={endTime}
          onEndTimeChange={setEndTime}
          days={days}
          onDaysChange={setDays}
          active={active}
          onActiveChange={setActive}
          disabled={saving}
        />
        <td colSpan={2} className="px-3 py-2 text-right">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="ml-2">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-medium text-foreground">
        {SHIFT_OPTIONS.find((s) => s.value === row.work_shift)?.label}
      </td>
      <td className="px-3 py-2 font-mono text-muted-foreground">{row.work_shift_start_time?.slice(0, 5)}</td>
      <td className="px-3 py-2 font-mono text-muted-foreground">{row.work_shift_end_time?.slice(0, 5)}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.work_shift_days}</td>
      <td className="px-3 py-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${row.work_shift_active === 'Y' ? 'bg-emerald-500' : 'bg-gray-300'} inline-block`}
        />
      </td>
      <td className="px-3 py-2 text-right">
        {canEdit && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-[#2563eb] hover:underline">
            Edit
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(row.drilling_work_shift_id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete shift"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

function InsertRow({ remainingShifts, onInsert }) {
  const [shift, setShift] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [days, setDays] = useState('1')
  const [active, setActive] = useState('Y')
  const [saving, setSaving] = useState(false)

  if (!remainingShifts.length) {
    return (
      <tr className="border-t border-border">
        <td colSpan={7} className="px-3 py-4 text-center text-sm text-muted-foreground">
          Both shifts have been added for this rig.
        </td>
      </tr>
    )
  }

  async function insert() {
    if (!shift || !startTime || !endTime || !days) {
      toast.error('Shift, start time, end time and shift days are required')
      return
    }
    setSaving(true)
    const ok = await onInsert({
      work_shift: shift,
      work_shift_start_time: startTime,
      work_shift_end_time: endTime,
      work_shift_days: days,
      work_shift_active: active,
    })
    setSaving(false)
    if (ok) {
      setShift('')
      setStartTime('')
      setEndTime('')
      setDays('1')
      setActive('Y')
    }
  }

  return (
    <tr className="border-t border-border">
      <ShiftFields
        shiftOptions={remainingShifts}
        shift={shift}
        onShiftChange={setShift}
        startTime={startTime}
        onStartTimeChange={setStartTime}
        endTime={endTime}
        onEndTimeChange={setEndTime}
        days={days}
        onDaysChange={setDays}
        active={active}
        onActiveChange={setActive}
        disabled={saving}
      />
      <td colSpan={2} className="px-3 py-2 text-right">
        <Button size="sm" onClick={insert} disabled={saving}>
          {saving ? 'Inserting…' : 'Insert'}
        </Button>
      </td>
    </tr>
  )
}

export default function DrillingWorkShiftPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canExport = can(user, MENU_KEY, 'export')

  const [projectId, setProjectId] = useState(null)
  const [projectLabel, setProjectLabel] = useState('')
  const [projectDetail, setProjectDetail] = useState(null)
  const [rigOptions, setRigOptions] = useState([])
  const [rigId, setRigId] = useState('')

  const [shifts, setShifts] = useState(null)
  const [loadingShifts, setLoadingShifts] = useState(false)

  const rigItems = useMemo(() => rigOptions.map((o) => ({ value: String(o.value), label: o.label })), [rigOptions])

  function onProjectChange(id) {
    setProjectId(id)
    setRigId('')
    setShifts(null)
    setProjectDetail(null)
    setRigOptions([])
    if (!id) return
    apiFetch(`/api/masters/project-contracts/${id}/`)
      .then((r) => r.json())
      .then((data) => {
        setProjectDetail(data)
        const seen = new Set()
        const opts = []
        for (const l of data.lines || []) {
          if (seen.has(l.rig)) continue
          seen.add(l.rig)
          opts.push({ value: l.rig, label: l.rig_name })
        }
        setRigOptions(opts)
      })
  }

  function loadShifts(pid, rid) {
    setLoadingShifts(true)
    apiFetch(`${API}?contract=${pid}&rig=${rid}&page_size=10`)
      .then((r) => r.json())
      .then((data) => setShifts(Array.isArray(data) ? data : data.results || []))
      .finally(() => setLoadingShifts(false))
  }

  function onRigChange(value) {
    const id = value ? Number(value) : null
    setRigId(id)
    if (projectId && id) loadShifts(projectId, id)
    else setShifts(null)
  }

  async function exportCsv() {
    const params = new URLSearchParams()
    if (projectId) params.set('contract', projectId)
    if (rigId) params.set('rig', rigId)
    const res = await apiFetch(`${API}export/?${params.toString()}`)
    if (!res.ok) {
      toast.error('Failed to export')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drilling-work-shifts.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function saveRow(id, body) {
    const res = await apiFetch(`${API}${id}/`, { method: 'PATCH', body: JSON.stringify(body) })
    if (res.ok) {
      toast.success('Shift saved')
      loadShifts(projectId, rigId)
      return true
    }
    toast.error('Failed to save')
    return false
  }

  async function deleteRow(id) {
    const res = await apiFetch(`${API}${id}/`, { method: 'DELETE' })
    if (res.status === 204) {
      toast.success('Shift deleted')
      loadShifts(projectId, rigId)
    } else {
      toast.error('Failed to delete')
    }
  }

  async function insertRow(body) {
    const res = await apiFetch(API, {
      method: 'POST',
      body: JSON.stringify({ ...body, contract: projectId, rig: rigId }),
    })
    if (res.ok) {
      toast.success('Shift added')
      loadShifts(projectId, rigId)
      return true
    }
    const data = await res.json().catch(() => ({}))
    toast.error(data.detail || 'Failed to add shift')
    return false
  }

  const usedShifts = (shifts || []).map((s) => s.work_shift)
  const remainingShifts = SHIFT_OPTIONS.filter((s) => !usedShifts.includes(s.value))

  return (
    <div className="flex h-full flex-col gap-3">
      <Link
        to="/masters"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        All Masters
      </Link>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-5">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Select Project &amp; Rig
            </p>
            {canExport && (
              <button
                type="button"
                title="Export CSV"
                onClick={exportCsv}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <Label>Project</Label>
            <RemoteCombobox field={PROJECT_FIELD} value={projectId} onChange={onProjectChange} labelValue={projectLabel} />
          </div>

          {projectDetail && (
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Location</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">{projectDetail.location_name}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Operator</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">{projectDetail.operator_name}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">{projectDetail.prj_start_dt}</p>
              </div>
            </div>
          )}

          {projectId && (
            <div className="mb-2 flex flex-col gap-1.5">
              <Label>Rig</Label>
              <StaticCombobox
                items={rigItems}
                value={rigId}
                onChange={onRigChange}
                disabled={!rigOptions.length}
                placeholder={rigOptions.length ? 'Select a rig…' : 'No rigs on this contract'}
              />
            </div>
          )}

          {Boolean(rigId) && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Work Shifts</p>
              {loadingShifts && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loadingShifts && shifts && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Shift</th>
                        <th className="px-3 py-2 font-medium">Start Time</th>
                        <th className="px-3 py-2 font-medium">End Time</th>
                        <th className="px-3 py-2 font-medium">Shift Day</th>
                        <th className="px-3 py-2 font-medium">Active</th>
                        <th className="px-3 py-2"></th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((s) => (
                        <ShiftRow
                          key={s.drilling_work_shift_id}
                          row={s}
                          usedShifts={usedShifts}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onSave={saveRow}
                          onDelete={deleteRow}
                        />
                      ))}
                      {canAdd && <InsertRow remainingShifts={remainingShifts} onInsert={insertRow} />}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
