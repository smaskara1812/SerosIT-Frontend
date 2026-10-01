import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { formatApiError } from '@/lib/errors'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

function NumInput({ value, onChange, disabled, step, wide }) {
  return (
    <Input
      type="number"
      step={step || '1'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      disabled={disabled}
      className={`h-9 text-right ${wide ? 'w-28' : 'w-24'}`}
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

export default function MisHseReturnPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canEdit = can(user, MENU_KEY, 'edit')

  const [form, setForm] = useState(emptyHeaderForm)
  const [hdrId, setHdrId] = useState(null)
  const [error, setError] = useState('')
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
    if (!form.cost_centre) {
      setError('Cost Centre must be selected.')
      return
    }
    if (!form.report_no.trim()) {
      setError('Report No. must be entered.')
      return
    }
    // A native month picker can report an empty or partial value if its
    // month/year segments weren't both fully typed when Add was clicked —
    // catch that here with a clear message instead of sending a half-built
    // value to the server, where it'd fail parsing with a vaguer error.
    if (!/^\d{4}-\d{2}$/.test(form.report_month || '')) {
      setError('Report Period must be a complete month and year — finish typing or re-pick it.')
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
        setError(formatApiError(data))
        toast.error('Failed to save')
        return
      }
      toast.success('Record Saved')
      loadHeader(data)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
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

  async function saveSection(section, path, body, nextSnapshot) {
    setSavingTab(section)
    try {
      const res = await apiFetch(`/api/qhse/mis-hse-return/${hdrId}/${path}/`, { method: 'PUT', body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) {
        toast.error(formatApiError(data))
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

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

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
                <RemoteCombobox
                  field={COST_CENTRE_FIELD}
                  value={form.cost_centre}
                  labelValue={form.cost_centre_name}
                  onChange={(v, raw) =>
                    set({
                      cost_centre: v,
                      cost_centre_name: raw?.cost_centre_name || '',
                      rig: raw?.rig || null,
                      rig_name: raw?.rig_name || '',
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rig</Label>
                <Input value={form.rig_name} readOnly disabled className="bg-muted" placeholder="Derived from Cost Centre" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Report No<span className="text-destructive"> *</span>
                </Label>
                <Input value={form.report_no} maxLength={20} onChange={(e) => set({ report_no: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Period (yyyy-mm)<span className="text-destructive"> *</span>
                </Label>
                <Input type="month" value={form.report_month} onChange={(e) => set({ report_month: e.target.value })} />
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
                <Input type="month" value={form.report_month} readOnly disabled className="bg-muted" />
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
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
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
                  onSave={() => saveSection('incidents', 'incidents', { lti_free_days: ltiFreeDays }, JSON.stringify(ltiFreeDays))}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <Label>LTI free days</Label>
                    <NumInput value={ltiFreeDays} disabled={!writable} onChange={setLtiFreeDays} wide />
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
                              disabled={!writable}
                              onChange={(v) => setMeetingRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_meetings: v } : r)))}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.total_seros_employees}
                              disabled={!writable}
                              onChange={(v) =>
                                setMeetingRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_seros_employees: v } : r)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.total_contractors}
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
                              disabled={!writable}
                              onChange={(v) =>
                                setActivityRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, total_activities: v } : r)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.seros_emp_count}
                              disabled={!writable}
                              onChange={(v) =>
                                setActivityRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, seros_emp_count: v } : r)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={row.contractor_count}
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
