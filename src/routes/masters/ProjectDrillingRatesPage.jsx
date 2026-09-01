import { useEffect, useMemo, useState } from 'react'
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
import { RemoteCombobox } from './MasterCrudPage'
import { IconChevronLeft, IconTrash } from '@/components/icons'
import { Download } from 'lucide-react'

const MENU_KEY = 'masters.project_drilling_rates'
const API = '/api/masters/project-drilling-rates/'

const PROJECT_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/project-contracts/',
  optionLabel: 'display_name',
  optionValue: 'prj_contract_id',
  labelField: 'contract_no',
}

/** A combobox over a plain in-memory list (rigs already loaded with the
 * project, rate types, currencies) — same Combobox primitives as every
 * other picker in the app, just without a remote fetch. */
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

/** Currency/Rate-Type row editor — shared by the insert row and an
 * in-place row edit, since both need the same three controls. */
function RateFields({ rateTypeOptions, currencies, rateTypeId, onRateTypeChange, currencyId, onCurrencyChange, rate, onRateChange, disabled }) {
  // Memoized so the items array reference is stable across unrelated parent
  // re-renders (e.g. typing in another field) — the combobox otherwise
  // treats a fresh array as a brand new option set and can drop an
  // in-flight selection before onValueChange has a chance to commit it.
  const rateTypeItems = useMemo(
    () => rateTypeOptions.map((t) => ({ value: String(t.drilling_rate_id), label: t.rate_code })),
    [rateTypeOptions]
  )
  const currencyItems = useMemo(
    () => currencies.map((c) => ({ value: String(c.currency_id), label: c.currency_abrv })),
    [currencies]
  )

  return (
    <>
      <td className="px-3 py-2">
        {onRateTypeChange ? (
          <StaticCombobox
            items={rateTypeItems}
            value={rateTypeId}
            onChange={(v) => onRateTypeChange(v)}
            disabled={disabled}
            placeholder="Rate type…"
          />
        ) : (
          <span className="font-medium text-foreground">
            {rateTypeOptions.find((t) => String(t.drilling_rate_id) === String(rateTypeId))?.rate_code}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <StaticCombobox
          items={currencyItems}
          value={currencyId}
          onChange={onCurrencyChange}
          disabled={disabled}
          placeholder="Currency…"
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => onRateChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-28"
        />
      </td>
    </>
  )
}

function RateRow({ row, rateTypes, usedIds, currencies, canEdit, canDelete, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [rateTypeId, setRateTypeId] = useState(row.drilling_rate)
  const [currencyId, setCurrencyId] = useState(row.currency)
  const [rate, setRate] = useState(row.rate ?? '')
  const [saving, setSaving] = useState(false)

  // Editing an existing row can keep its own current type as an option even
  // though it's "already used" — only other rows' types need excluding.
  const rateTypeOptions = rateTypes.filter(
    (t) => t.drilling_rate_id === row.drilling_rate || !usedIds.includes(t.drilling_rate_id)
  )

  async function save() {
    setSaving(true)
    const ok = await onSave(row.prj_drilling_rate_id, {
      drilling_rate: rateTypeId,
      currency: currencyId || null,
      rate: rate === '' ? null : rate,
    })
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (editing) {
    return (
      <tr className="border-t border-border bg-[#eef3fb]/40">
        <RateFields
          rateTypeOptions={rateTypes}
          currencies={currencies}
          rateTypeId={rateTypeId}
          onRateTypeChange={(v) => setRateTypeId(Number(v))}
          currencyId={currencyId}
          onCurrencyChange={(v) => setCurrencyId(Number(v))}
          rate={rate}
          onRateChange={setRate}
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
      <td className="px-3 py-2 font-medium text-foreground">{row.rate_code}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.currency_abrv || '—'}</td>
      <td className="px-3 py-2 font-mono text-muted-foreground">
        {row.rate != null ? Number(row.rate).toFixed(2) : '—'}
      </td>
      <td className="px-3 py-2 text-right">
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-[#2563eb] hover:underline"
          >
            Edit
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(row.prj_drilling_rate_id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete rate"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

function InsertRow({ remainingTypes, currencies, onInsert }) {
  const [rateTypeId, setRateTypeId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)

  if (!remainingTypes.length) {
    return (
      <tr className="border-t border-border">
        <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">
          All rate types have been added for this rig.
        </td>
      </tr>
    )
  }

  async function insert() {
    if (!rateTypeId) {
      toast.error('Select a rate type')
      return
    }
    setSaving(true)
    const ok = await onInsert({
      drilling_rate: Number(rateTypeId),
      currency: currencyId ? Number(currencyId) : null,
      rate: rate === '' ? null : rate,
    })
    setSaving(false)
    if (ok) {
      setRateTypeId('')
      setCurrencyId('')
      setRate('')
    }
  }

  return (
    <tr className="border-t border-border">
      <RateFields
        rateTypeOptions={remainingTypes}
        currencies={currencies}
        rateTypeId={rateTypeId}
        onRateTypeChange={setRateTypeId}
        currencyId={currencyId}
        onCurrencyChange={setCurrencyId}
        rate={rate}
        onRateChange={setRate}
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

export default function ProjectDrillingRatesPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canExport = can(user, MENU_KEY, 'export')

  const [rateTypes, setRateTypes] = useState([])
  const [currencies, setCurrencies] = useState([])

  const [projectId, setProjectId] = useState(null)
  const [projectLabel, setProjectLabel] = useState('')
  const [projectDetail, setProjectDetail] = useState(null)
  const [rigOptions, setRigOptions] = useState([])
  const [rigId, setRigId] = useState('')

  const [rates, setRates] = useState(null)
  const [loadingRates, setLoadingRates] = useState(false)

  const rigItems = useMemo(
    () => rigOptions.map((o) => ({ value: String(o.value), label: o.label })),
    [rigOptions]
  )

  useEffect(() => {
    apiFetch('/api/masters/drilling-rate-types/?page_size=200')
      .then((r) => r.json())
      .then((data) => setRateTypes(Array.isArray(data) ? data : data.results || []))
    apiFetch('/api/masters/currencies/?page_size=200')
      .then((r) => r.json())
      .then((data) => setCurrencies(Array.isArray(data) ? data : data.results || []))
  }, [])

  function onProjectChange(id) {
    setProjectId(id)
    setRigId('')
    setRates(null)
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

  function loadRates(pid, rid) {
    setLoadingRates(true)
    apiFetch(`${API}?contract=${pid}&rig=${rid}&page_size=100`)
      .then((r) => r.json())
      .then((data) => setRates(Array.isArray(data) ? data : data.results || []))
      .finally(() => setLoadingRates(false))
  }

  function onRigChange(value) {
    const id = value ? Number(value) : null
    setRigId(id)
    if (projectId && id) loadRates(projectId, id)
    else setRates(null)
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
    a.download = 'project-drilling-rates.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function saveRow(id, body) {
    const res = await apiFetch(`${API}${id}/`, { method: 'PATCH', body: JSON.stringify(body) })
    if (res.ok) {
      toast.success('Rate saved')
      loadRates(projectId, rigId)
      return true
    }
    toast.error('Failed to save')
    return false
  }

  async function deleteRow(id) {
    const res = await apiFetch(`${API}${id}/`, { method: 'DELETE' })
    if (res.status === 204) {
      toast.success('Rate deleted')
      loadRates(projectId, rigId)
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
      toast.success('Rate added')
      loadRates(projectId, rigId)
      return true
    }
    const data = await res.json().catch(() => ({}))
    toast.error(data.detail || 'Failed to add rate')
    return false
  }

  const usedIds = (rates || []).map((r) => r.drilling_rate)
  const remainingTypes = rateTypes.filter((t) => !usedIds.includes(t.drilling_rate_id))

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
            <RemoteCombobox
              field={PROJECT_FIELD}
              value={projectId}
              onChange={onProjectChange}
              labelValue={projectLabel}
            />
          </div>

          {projectDetail && (
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Location</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  {projectDetail.location_name}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Operator</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  {projectDetail.operator_name}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  {projectDetail.prj_start_dt}
                </p>
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
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Drilling Rates
              </p>
              {loadingRates && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loadingRates && rates && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Rate</th>
                        <th className="px-3 py-2 font-medium">Currency</th>
                        <th className="px-3 py-2 font-medium">Rate</th>
                        <th className="px-3 py-2"></th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((r) => (
                        <RateRow
                          key={r.prj_drilling_rate_id}
                          row={r}
                          rateTypes={rateTypes}
                          usedIds={usedIds}
                          currencies={currencies}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onSave={saveRow}
                          onDelete={deleteRow}
                        />
                      ))}
                      {canAdd && (
                        <InsertRow remainingTypes={remainingTypes} currencies={currencies} onInsert={insertRow} />
                      )}
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
