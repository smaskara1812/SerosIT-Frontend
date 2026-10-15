import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { MonthYearSelect } from '@/components/PeriodSelects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { localDateStr } from '@/lib/naiveDateTime'
import RigLoading from '@/components/RigLoading'

const FIELD_LABELS = { cost_centre: 'Cost Centre', rig: 'Rig', report_no: 'Report No.', report_month: 'Period' }

const MENU_KEY = 'qhse.mis_hse_return'

const COST_CENTRE_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/cost-centres/',
  optionLabel: 'cost_centre_name',
  optionValue: 'cost_centre_id',
  labelField: 'cost_centre_name',
  derives: { rig: 'rig', rig_name: 'rig_name' },
}

const TABS = [
  { key: 'manhours', label: 'Manhours' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'cards', label: 'Haz ID and Prompt Cards' },
  { key: 'activities', label: 'HSE Inspections/Drills/Audits' },
  { key: 'environment', label: 'Environment Reporting' },
]

function emptyHeaderForm() {
  return { cost_centre: null, cost_centre_name: '', rig: null, rig_name: '', report_no: '', report_month: '' }
}

function NumInput({ value, onChange, disabled, step, wide, invalid, title }) {
  return (
    <Input
      type="number"
      step={step || '1'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      disabled={disabled}
      title={invalid ? title : undefined}
      aria-invalid={invalid || undefined}
      className={`h-9 text-right ${wide ? 'w-28' : 'w-24'} ${invalid ? 'border-destructive ring-2 ring-destructive/40' : ''}`}
    />
  )
}

function manhoursPayload(rows) {
  return rows.map((r) => ({
    hse_manhours_party_id: r.hse_manhours_party_id,
    no_of_personnel: r.no_of_personnel,
    hours_worked: r.hours_worked,
  }))
}
function meetingsPayload(rows) {
  return rows.map((r) => ({
    hse_meeting_id: r.hse_meeting_id,
    total_meetings: r.total_meetings,
    total_seros_employees: r.total_seros_employees,
    total_contractors: r.total_contractors,
  }))
}
function activitiesPayload(rows) {
  return rows.map((r) => ({
    hse_activity_id: r.hse_activity_id,
    total_activities: r.total_activities,
    seros_emp_count: r.seros_emp_count,
    contractor_count: r.contractor_count,
  }))
}
function environmentPayload(rows) {
  return rows.map((r) => ({ hse_consumable_id: r.hse_consumable_id, total_quantity: r.total_quantity, remarks: r.remarks }))
}

// Browser checks for the MIS Monthly HSE Return tab grids, mirroring
// core/mis_hse_return.py so a bad box is outlined at once. The server still
// checks everything. A row you start must be complete; a row left entirely
// blank is ignored. Each checker returns { rowId: { field: message } }.
const INT_MAX = 2147483647
const blank = (v) => v === null || v === undefined || String(v).trim() === ''
const text = (v) => String(v).trim()

function whole(v, label, errs, field) {
  if (blank(v)) {
    errs[field] = `Enter ${label}.`
    return null
  }
  const t = text(v)
  if (!/^\d+(\.0*)?$/.test(t)) {
    errs[field] = `${label} must be a whole number, 0 or more.`
    return null
  }
  const n = Number(t)
  if (n > INT_MAX) {
    errs[field] = `${label} is too large.`
    return null
  }
  return n
}

function amount(v, label, errs, field, max) {
  if (blank(v)) {
    errs[field] = `Enter ${label}.`
    return null
  }
  const t = text(v)
  if (!/^\d+(\.\d*)?$/.test(t)) {
    errs[field] = `${label} must be a number, 0 or more.`
    return null
  }
  if (/\.\d*[1-9]\d*$/.test(t) && t.split('.')[1].replace(/0+$/, '').length > 2) {
    errs[field] = `${label} can have at most 2 decimal places.`
    return null
  }
  if (Number(t) > max) {
    errs[field] = `${label} is too large.`
    return null
  }
  return Number(t)
}

const allBlank = (row, keys) => keys.every((k) => blank(row[k]))
const put = (out, id, errs) => {
  if (Object.keys(errs).length) out[id] = errs
}

function checkLti(v) {
  const e = {}
  whole(v, 'LTI Free Days', e, 'lti_free_days')
  return e
}

function checkManhours(rows) {
  const out = {}
  for (const r of rows) {
    const e = {}
    if (!blank(r.no_of_personnel)) whole(r.no_of_personnel, 'No. of Personnel', e, 'no_of_personnel')
    amount(r.hours_worked, 'Hours Worked', e, 'hours_worked', 99.99)
    put(out, r.hse_manhours_party_id, e)
  }
  return out
}

function checkMeetings(rows) {
  const out = {}
  for (const r of rows) {
    if (allBlank(r, ['total_meetings', 'total_seros_employees', 'total_contractors'])) continue
    const e = {}
    const meetings = whole(r.total_meetings, 'Total Meetings', e, 'total_meetings')
    const staff = whole(r.total_seros_employees, 'Total SEROS Employees', e, 'total_seros_employees')
    const contractors = whole(r.total_contractors, 'Total Contractors', e, 'total_contractors')
    if (!Object.keys(e).length) {
      if (meetings === 0 && (staff || contractors)) {
        if (staff) e.total_seros_employees = 'Total SEROS Employees must be 0 when there are no meetings.'
        if (contractors) e.total_contractors = 'Total Contractors must be 0 when there are no meetings.'
      } else if (meetings && !(staff || contractors)) {
        e.total_seros_employees = e.total_contractors = 'Enter the employees or contractors who attended (at least one is above 0).'
      }
    }
    put(out, r.hse_meeting_id, e)
  }
  return out
}

function checkActivities(rows) {
  const out = {}
  for (const r of rows) {
    if (allBlank(r, ['total_activities', 'seros_emp_count', 'contractor_count'])) continue
    const e = {}
    whole(r.total_activities, 'Total Activities', e, 'total_activities')
    whole(r.seros_emp_count, 'SEROS Employees', e, 'seros_emp_count')
    whole(r.contractor_count, 'Contractors', e, 'contractor_count')
    put(out, r.hse_activity_id, e)
  }
  return out
}

function checkEnvironment(rows) {
  const out = {}
  for (const r of rows) {
    const remarks = (r.remarks || '').trim()
    if (blank(r.total_quantity) && !remarks) continue
    const e = {}
    amount(r.total_quantity, 'Total Quantity', e, 'total_quantity', 99999999.99)
    put(out, r.hse_consumable_id, e)
  }
  return out
}

// "Toolbox Talk: Enter Total Meetings." lines for the banner/toast.
function gridMessage(errors, nameOf) {
  return Object.entries(errors)
    .flatMap(([id, e]) => [...new Set(Object.values(e))].map((m) => `${nameOf(id)}: ${m}`))
    .join('\n')
}

export default function MisHseReturnPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canEdit = can(user, MENU_KEY, 'edit')

  const [form, setForm] = useState(emptyHeaderForm)
  const [hdrId, setHdrId] = useState(null)
  const [error, setError] = useState('')
  const bannerRef = useRef(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const clearErr = (k) => setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev))
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchRows, setSearchRows] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [activeTab, setActiveTab] = useState('manhours')
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [manhoursRows, setManhoursRows] = useState([])
  const [meetingRows, setMeetingRows] = useState([])
  const [activityRows, setActivityRows] = useState([])
  const [environmentRows, setEnvironmentRows] = useState([])
  const [ltiFreeDays, setLtiFreeDays] = useState(null)
  const [savingTab, setSavingTab] = useState('')

  // Snapshots of whatever was last loaded/saved, per tab — the Save
  // button on a tab only lights up once its own live state has actually
  // diverged from this, so a user can see at a glance which tabs (if any)
  // have unsaved edits instead of every Save button always being equally
  // clickable regardless of whether anything changed.
  const [snapshots, setSnapshots] = useState({})

  // Boxes outlined after a refused save, per tab. Each entry remembers the tab's
  // values at that moment, so the outline goes away as soon as anything is edited.
  const [gridErrors, setGridErrors] = useState({})
  const bad = (section, now, rowId, field) => {
    const g = gridErrors[section]
    return g && g.at === now ? g.errors[rowId]?.[field] : undefined
  }

  const nowStr = {
    manhours: JSON.stringify(manhoursPayload(manhoursRows)),
    incidents: JSON.stringify(ltiFreeDays),
    meetings: JSON.stringify(meetingsPayload(meetingRows)),
    activities: JSON.stringify(activitiesPayload(activityRows)),
    environment: JSON.stringify(environmentPayload(environmentRows)),
  }

  const loaded = Boolean(hdrId)
  const writable = canEdit && loaded

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function loadDetail(id) {
    setLoadingDetail(true)
    return apiFetch(`/api/qhse/mis-hse-return/${id}/`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data)
        setManhoursRows(data.manhours)
        setMeetingRows(data.meetings)
        setActivityRows(data.activities)
        setEnvironmentRows(data.environment)
        setLtiFreeDays(data.lti_free_days)
        setSnapshots({
          manhours: JSON.stringify(manhoursPayload(data.manhours)),
          meetings: JSON.stringify(meetingsPayload(data.meetings)),
          activities: JSON.stringify(activitiesPayload(data.activities)),
          environment: JSON.stringify(environmentPayload(data.environment)),
          incidents: JSON.stringify(data.lti_free_days),
        })
      })
      .finally(() => setLoadingDetail(false))
  }

  function loadHeader(row) {
    setHdrId(row.monthly_hse_returns_hdr_id)
    setForm({
      cost_centre: row.cost_centre,
      cost_centre_name: row.cost_centre_name,
      rig: row.rig,
      rig_name: row.rig_name,
      report_no: row.report_no,
      report_month: row.report_month?.slice(0, 7) || '',
    })
    setActiveTab('manhours')
    loadDetail(row.monthly_hse_returns_hdr_id)
  }

  function handleClear() {
    setHdrId(null)
    setForm(emptyHeaderForm())
    setDetail(null)
    setError('')
    setSearchQuery('')
  }

  async function runSearch(page, query) {
    const params = new URLSearchParams()
    if (query.trim()) params.set('search', query.trim())
    params.set('page', String(page))
    const res = await apiFetch(`/api/qhse/mis-hse-return/?${params.toString()}`)
    const data = await res.json()
    setSearchPage(page)
    setSearchHasMore(Boolean(data.has_more))
    setSearchRows((prev) => (page === 1 ? data.rows || [] : [...prev, ...(data.rows || [])]))
  }

  async function loadMoreSearch() {
    setLoadingMore(true)
    await runSearch(searchPage + 1, searchQuery).finally(() => setLoadingMore(false))
  }

  // The results list is always visible (not hidden behind a Search
  // click) — it loads the moment this page is in "nothing loaded yet"
  // state, so it's immediately obvious that picking an existing return
  // is an option, not just adding a new one. Debounced re-run as the
  // query changes.
  useEffect(() => {
    if (loaded) return
    let cancelled = false
    const timer = setTimeout(
      () => {
        if (cancelled) return
        setSearching(true)
        runSearch(1, searchQuery).finally(() => !cancelled && setSearching(false))
      },
      searchQuery ? 300 : 0
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [loaded, searchQuery])

  async function handleAdd() {
    setError('')
    setFieldErrors({})
    const stop = (key, msg, inline = 'This is required.') => {
      setFieldErrors({ [key]: inline })
      showFormError(msg, { setError, bannerRef })
      scrollToFirstFieldError()
    }
    if (!form.cost_centre) return stop('cost_centre', 'Please choose a Cost Centre.')
    if (!form.report_no.trim()) return stop('report_no', 'Please enter the Report No.')
    // A native month picker can report an empty or partial value if its
    // month/year segments weren't both fully typed when Add was clicked —
    // catch that here with a clear message instead of sending a half-built
    // value to the server, where it'd fail parsing with a vaguer error.
    if (!/^\d{4}-\d{2}$/.test(form.report_month || '')) {
      stop('report_month', 'Please choose both the Month and the Year for the Period.')
      return
    }
    if (form.report_month >= localDateStr().slice(0, 7)) {
      stop('report_month', 'Period must be earlier than the current month.', 'Choose an earlier month.')
      return
    }
    setAdding(true)
    try {
      const res = await apiFetch('/api/qhse/mis-hse-return/', {
        method: 'POST',
        body: JSON.stringify({
          cost_centre: form.cost_centre,
          report_no: form.report_no.trim(),
          report_month: `${form.report_month}-01`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
        scrollToFirstFieldError()
        return
      }
      toast.success('Record Saved')
      loadHeader(data)
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete() {
    if (!hdrId) return
    if (!window.confirm('Are you sure you want to Delete this Record')) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/mis-hse-return/${hdrId}/`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        toast.error('Failed to delete')
        return
      }
      toast.success('Record Deleted')
      handleClear()
    } finally {
      setDeleting(false)
    }
  }

  // Stops a save the browser can already see is wrong: outlines the boxes and says why.
  function blocked(section, errors, nameOf, at) {
    if (!Object.keys(errors).length) return false
    setGridErrors((g) => ({ ...g, [section]: { at, errors } }))
    toast.error(gridMessage(errors, nameOf), { style: { whiteSpace: 'pre-line' } })
    return true
  }

  async function saveSection(section, path, body, nextSnapshot) {
    setSavingTab(section)
    try {
      const res = await apiFetch(`/api/qhse/mis-hse-return/${hdrId}/${path}/`, { method: 'PUT', body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) {
        if (data.row_errors) setGridErrors((g) => ({ ...g, [section]: { at: nextSnapshot, errors: data.row_errors } }))
        toast.error(data.detail && data.row_errors ? data.detail : formatApiError(data), { style: { whiteSpace: 'pre-line' } })
        return
      }
      toast.success('Saved')
      setSnapshots((s) => ({ ...s, [section]: nextSnapshot }))
    } finally {
      setSavingTab('')
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-foreground">MIS Monthly HSE Return</h1>
        <div className="flex gap-2">
          {loaded && canDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          )}
          <Button variant="outline" onClick={handleClear}>
            {loaded ? 'Close' : 'Reset'}
          </Button>
        </div>
      </div>

      {error && <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>}

      {!loaded && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Open an existing return</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Every return already on file is listed below — click a row to open it. Search narrows the list by Report
              No., Rig, or Cost Centre.
            </p>
            <Input
              placeholder="Search by Report No., Rig, or Cost Centre…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div
              className="mt-3 max-h-64 overflow-auto rounded-lg border border-border"
              onScroll={(e) => {
                if (loadingMore || !searchHasMore) return
                const el = e.currentTarget
                // 48px lookahead so the next page starts fetching just
                // before the last row scrolls into view, not after.
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
                  loadMoreSearch()
                }
              }}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2 text-left">Rig / Cost Centre</th>
                    <th className="px-3 py-2 text-left">Report No</th>
                    <th className="px-3 py-2 text-left">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {searchRows.map((row) => (
                    <tr
                      key={row.monthly_hse_returns_hdr_id}
                      className="cursor-pointer border-t border-border hover:bg-muted/50"
                      onClick={() => loadHeader(row)}
                    >
                      <td className="px-3 py-2">{row.rig_name || row.cost_centre_name}</td>
                      <td className="px-3 py-2">{row.report_no}</td>
                      <td className="px-3 py-2">{row.report_month?.slice(0, 7)}</td>
                    </tr>
                  ))}
                  {searching && searchRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!searching && searchRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                        {searchQuery ? 'No returns match that search.' : 'No returns exist yet — add the first one below.'}
                      </td>
                    </tr>
                  )}
                  {loadingMore && (
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-center text-xs text-muted-foreground">
                        Loading more…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Add a new return</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Not on file above? Fill in the Cost Centre, Report No. and Period below, then click Add to create it.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>
                  Cost Centre<span className="text-destructive"> *</span>
                </Label>
                <FieldFrame error={fieldErrors.cost_centre}>
                  <RemoteCombobox
                    field={COST_CENTRE_FIELD}
                    value={form.cost_centre}
                    labelValue={form.cost_centre_name}
                    onChange={(v, raw) => {
                      clearErr('cost_centre')
                      set({
                        cost_centre: v,
                        cost_centre_name: raw?.cost_centre_name || '',
                        rig: raw?.rig || null,
                        rig_name: raw?.rig_name || '',
                      })
                    }}
                  />
                </FieldFrame>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rig</Label>
                <Input value={form.rig_name} readOnly disabled className="bg-muted" placeholder="Derived from Cost Centre" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Report No<span className="text-destructive"> *</span>
                </Label>
                <FieldFrame error={fieldErrors.report_no}>
                  <Input
                    value={form.report_no}
                    maxLength={20}
                    onChange={(e) => {
                      clearErr('report_no')
                      set({ report_no: e.target.value })
                    }}
                  />
                </FieldFrame>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Period<span className="text-destructive"> *</span>
                </Label>
                <FieldFrame error={fieldErrors.report_month}>
                  <MonthYearSelect
                    value={form.report_month}
                    onChange={(v) => {
                      clearErr('report_month')
                      set({ report_month: v })
                    }}
                  />
                </FieldFrame>
              </div>
            </div>
            {canAdd && (
              <div className="mt-4">
                <Button onClick={handleAdd} disabled={adding}>
                  {adding ? 'Adding…' : 'Add'}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {loaded && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>Cost Centre</Label>
                <Input value={form.cost_centre_name} readOnly disabled className="bg-muted" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rig</Label>
                <Input value={form.rig_name} readOnly disabled className="bg-muted" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Report No</Label>
                <Input value={form.report_no} readOnly disabled className="bg-muted" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Period</Label>
                <MonthYearSelect value={form.report_month} disabled onChange={() => {}} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loadingDetail || !detail ? (
            <p className="py-16 text-center text-sm text-muted-foreground"><RigLoading /></p>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5">
              {activeTab === 'manhours' && (
                <Section
                  title="Manhours"
                  writable={writable}
                  saving={savingTab === 'manhours'}
                  dirty={JSON.stringify(manhoursPayload(manhoursRows)) !== snapshots.manhours}
                  onSave={() => {
                    const payload = manhoursPayload(manhoursRows)
                    if (blocked('manhours', checkManhours(manhoursRows), (id) => manhoursRows.find((r) => String(r.hse_manhours_party_id) === id)?.party_name, JSON.stringify(payload))) return
                    saveSection('manhours', 'manhours', { rows: payload }, JSON.stringify(payload))
                  }}
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Party Type</th>
                        <th className="px-3 py-2 text-left">Party Name</th>
                        <th className="px-3 py-2 text-right">No. Of Personnel</th>
                        <th className="px-3 py-2 text-right">Hours Worked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manhoursRows.map((row, i) => (
                        <tr key={row.hse_manhours_party_id} className="border-t border-border">
                          <td className="px-3 py-2">{row.party_type === 'SEROS' ? 'SEROS' : 'TP'}</td>
                          <td className="px-3 py-2">{row.party_name}</td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.no_of_personnel}
                              invalid={Boolean(bad('manhours', nowStr.manhours, row.hse_manhours_party_id, 'no_of_personnel'))}
                              title={bad('manhours', nowStr.manhours, row.hse_manhours_party_id, 'no_of_personnel')}
                              disabled={!writable}
                              onChange={(v) =>
                                setManhoursRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, no_of_personnel: v } : r)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              step="0.01"
                              value={row.hours_worked}
                              invalid={Boolean(bad('manhours', nowStr.manhours, row.hse_manhours_party_id, 'hours_worked'))}
                              title={bad('manhours', nowStr.manhours, row.hse_manhours_party_id, 'hours_worked')}
                              disabled={!writable}
                              onChange={(v) =>
                                setManhoursRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, hours_worked: v } : r)))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {activeTab === 'incidents' && (
                <Section
                  title="Incidents"
                  writable={writable}
                  saving={savingTab === 'incidents'}
                  dirty={JSON.stringify(ltiFreeDays) !== snapshots.incidents}
                  onSave={() => {
                    if (blocked('incidents', Object.keys(checkLti(ltiFreeDays)).length ? { _: checkLti(ltiFreeDays) } : {}, () => 'Incidents', JSON.stringify(ltiFreeDays))) return
                    saveSection('incidents', 'incidents', { lti_free_days: ltiFreeDays }, JSON.stringify(ltiFreeDays))
                  }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <Label>LTI free days</Label>
                    <NumInput value={ltiFreeDays} disabled={!writable} onChange={setLtiFreeDays} wide invalid={Boolean(bad('incidents', nowStr.incidents, '_', 'lti_free_days'))} title={bad('incidents', nowStr.incidents, '_', 'lti_free_days')} />
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Incident Type</th>
                        <th className="px-3 py-2 text-right">SEROS Total Incidents</th>
                        <th className="px-3 py-2 text-right">Contractor Total Incidents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.incidents.map((row) => (
                        <tr key={row.incident_type_id} className="border-t border-border">
                          <td className="px-3 py-2">{row.incident_type}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.seros_total_incidents}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.contractor_total_incidents}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {activeTab === 'meetings' && (
                <Section
                  title="Meetings"
                  writable={writable}
                  saving={savingTab === 'meetings'}
                  dirty={JSON.stringify(meetingsPayload(meetingRows)) !== snapshots.meetings}
                  onSave={() => {
                    const payload = meetingsPayload(meetingRows)
                    if (blocked('meetings', checkMeetings(meetingRows), (id) => meetingRows.find((r) => String(r.hse_meeting_id) === id)?.meeting_type, JSON.stringify(payload))) return
                    saveSection('meetings', 'meetings', { rows: payload }, JSON.stringify(payload))
                  }}
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Meeting Type</th>
                        <th className="px-3 py-2 text-right">Total Meetings</th>
                        <th className="px-3 py-2 text-right">Total SEROS Employees</th>
                        <th className="px-3 py-2 text-right">Total Contractors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetingRows.map((row, i) => (
                        <tr key={row.hse_meeting_id} className="border-t border-border">
                          <td className="px-3 py-2">{row.meeting_type}</td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.total_meetings}
                              invalid={Boolean(bad('meetings', nowStr.meetings, row.hse_meeting_id, 'total_meetings'))}
                              title={bad('meetings', nowStr.meetings, row.hse_meeting_id, 'total_meetings')}
                              disabled={!writable}
                              onChange={(v) => setMeetingRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_meetings: v } : r)))}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.total_seros_employees}
                              invalid={Boolean(bad('meetings', nowStr.meetings, row.hse_meeting_id, 'total_seros_employees'))}
                              title={bad('meetings', nowStr.meetings, row.hse_meeting_id, 'total_seros_employees')}
                              disabled={!writable}
                              onChange={(v) =>
                                setMeetingRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_seros_employees: v } : r)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.total_contractors}
                              invalid={Boolean(bad('meetings', nowStr.meetings, row.hse_meeting_id, 'total_contractors'))}
                              title={bad('meetings', nowStr.meetings, row.hse_meeting_id, 'total_contractors')}
                              disabled={!writable}
                              onChange={(v) =>
                                setMeetingRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_contractors: v } : r)))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {activeTab === 'cards' && (
                <Section title="Haz ID and Prompt Cards" writable={false}>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Card Type</th>
                        <th className="px-3 py-2 text-right">SEROS Open Cards</th>
                        <th className="px-3 py-2 text-right">SEROS Closed Cards</th>
                        <th className="px-3 py-2 text-right">Others Open Cards</th>
                        <th className="px-3 py-2 text-right">Others Closed Cards</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2">Hazard ID Card</td>
                        <td className="px-3 py-2 text-right tabular-nums">{detail.cards.seros_open_cards}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{detail.cards.seros_closed_cards}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{detail.cards.others_open_cards}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{detail.cards.others_closed_cards}</td>
                      </tr>
                    </tbody>
                  </table>
                </Section>
              )}

              {activeTab === 'activities' && (
                <Section
                  title="HSE Inspections/Drills/Audits"
                  writable={writable}
                  saving={savingTab === 'activities'}
                  dirty={JSON.stringify(activitiesPayload(activityRows)) !== snapshots.activities}
                  onSave={() => {
                    const payload = activitiesPayload(activityRows)
                    if (blocked('activities', checkActivities(activityRows), (id) => activityRows.find((r) => String(r.hse_activity_id) === id)?.activity_name, JSON.stringify(payload))) return
                    saveSection('activities', 'activities', { rows: payload }, JSON.stringify(payload))
                  }}
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">HSE Activity</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Total Activities</th>
                        <th className="px-3 py-2 text-right">SEROS Emp Count</th>
                        <th className="px-3 py-2 text-right">Contractor Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityRows.map((row, i) => (
                        <tr key={row.hse_activity_id} className="border-t border-border">
                          <td className="px-3 py-2">{row.activity_name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.activity_type_display}</td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.total_activities}
                              invalid={Boolean(bad('activities', nowStr.activities, row.hse_activity_id, 'total_activities'))}
                              title={bad('activities', nowStr.activities, row.hse_activity_id, 'total_activities')}
                              disabled={!writable}
                              onChange={(v) =>
                                setActivityRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_activities: v } : r)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.seros_emp_count}
                              invalid={Boolean(bad('activities', nowStr.activities, row.hse_activity_id, 'seros_emp_count'))}
                              title={bad('activities', nowStr.activities, row.hse_activity_id, 'seros_emp_count')}
                              disabled={!writable}
                              onChange={(v) =>
                                setActivityRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, seros_emp_count: v } : r)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.contractor_count}
                              invalid={Boolean(bad('activities', nowStr.activities, row.hse_activity_id, 'contractor_count'))}
                              title={bad('activities', nowStr.activities, row.hse_activity_id, 'contractor_count')}
                              disabled={!writable}
                              onChange={(v) =>
                                setActivityRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, contractor_count: v } : r)))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {activeTab === 'environment' && (
                <Section
                  title="Environment Reporting"
                  writable={writable}
                  saving={savingTab === 'environment'}
                  dirty={JSON.stringify(environmentPayload(environmentRows)) !== snapshots.environment}
                  onSave={() => {
                    const payload = environmentPayload(environmentRows)
                    if (blocked('environment', checkEnvironment(environmentRows), (id) => environmentRows.find((r) => String(r.hse_consumable_id) === id)?.consumable_name, JSON.stringify(payload))) return
                    saveSection('environment', 'environment', { rows: payload }, JSON.stringify(payload))
                  }}
                >
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-card">
                        <tr className="bg-muted/50">
                          <th className="px-3 py-2 text-left">HSE Consumable Name</th>
                          <th className="px-3 py-2 text-left">Unit</th>
                          <th className="px-3 py-2 text-right">Total Quantity</th>
                          <th className="px-3 py-2 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {environmentRows.map((row, i) => (
                          <tr key={row.hse_consumable_id} className="border-t border-border">
                            <td className="px-3 py-2">{row.consumable_name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.unit}</td>
                            <td className="px-3 py-2 text-right">
                              <NumInput
                                step="0.01"
                                value={row.total_quantity}
                                invalid={Boolean(bad('environment', nowStr.environment, row.hse_consumable_id, 'total_quantity'))}
                                title={bad('environment', nowStr.environment, row.hse_consumable_id, 'total_quantity')}
                                disabled={!writable}
                                onChange={(v) =>
                                  setEnvironmentRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_quantity: v } : r)))
                                }
                                wide
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={row.remarks || ''}
                                maxLength={200}
                                disabled={!writable}
                                onChange={(e) =>
                                  setEnvironmentRows((rows) =>
                                    rows.map((r, idx) => (idx === i ? { ...r, remarks: e.target.value } : r))
                                  )
                                }
                                className="h-9 w-full"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, children, writable, saving, dirty, onSave }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
        {writable && onSave && (
          <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </Button>
        )}
      </div>
      {children}
    </div>
  )
}
