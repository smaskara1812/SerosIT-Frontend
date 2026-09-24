import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconSearch, IconAlertCircle } from '@/components/icons'
import { Download } from 'lucide-react'

const MENU_KEY = 'qhse.activity_monitor'

const ACTIVITY_FIELD = {
  type: 'select-remote',
  remote: '/api/qhse/activities/?active=Y',
  optionLabel: 'activity_name',
  optionValue: 'activity_id',
  labelField: 'activity_name',
  // Not an actual "derived field" in our form — this is here purely so
  // RemoteCombobox's own field-trimming (?fields=activity_id,activity_name
  // by default) also includes activity_location, which our onChange below
  // reads straight off `raw` itself to decide whether Rig is required.
  derives: { activity_location: 'activity_location' },
}
const RIG_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/rigs/',
  optionLabel: 'rig_name',
  optionValue: 'rig_id',
  labelField: 'rig_name',
}

const RIG_REQUIRED_LOCATIONS = new Set(['V', 'R'])

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(v) {
  if (!v) return ''
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  const a = new Date(fromIso)
  const b = new Date(toIso)
  return Math.round((a - b) / 86400000)
}

// Positive gap (scheduled_dt - completion_dt) means it closed before it was
// due — "early"; negative means it closed after — "late". A bare signed
// number reads as an error at a glance ("-17"?), so spell out which side
// of zero it's on instead of showing the raw value.
function fmtGap(gap) {
  if (gap == null) return ''
  if (gap === 0) return 'On time'
  return gap > 0 ? `${gap} day${gap === 1 ? '' : 's'} early` : `${-gap} day${gap === -1 ? '' : 's'} late`
}

function emptyAddForm() {
  return {
    activity: null,
    activity_label: '',
    activity_location: null,
    rig: null,
    rig_label: '',
    scheduled_dt: '',
    planning_remark: '',
  }
}

export default function ActivityMonitorPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canExport = can(user, MENU_KEY, 'export')

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [activityFilter, setActivityFilter] = useState(null)
  const [activityFilterLabel, setActivityFilterLabel] = useState('')
  const [rigFilter, setRigFilter] = useState(null)
  const [rigFilterLabel, setRigFilterLabel] = useState('')
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [addForm, setAddForm] = useState(emptyAddForm)
  const [addTouchedDate, setAddTouchedDate] = useState(false)
  const [suggest, setSuggest] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)

  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} records` : null)

  function buildParams(searchQuery, pageNum) {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (activityFilter) params.set('activity', activityFilter)
    if (rigFilter) params.set('rig', rigFilter)
    params.set('page', String(pageNum))
    return params
  }

  function loadPage(pageNum, searchQuery, append) {
    const thisRequest = ++requestIdRef.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    apiFetch(`/api/qhse/activity-monitor/?${buildParams(searchQuery, pageNum)}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        setRows((prev) => (append ? [...prev, ...data.rows] : data.rows))
        setTotalCount(data.count)
        setHasMore(data.has_more)
        setPage(pageNum)
      })
      .finally(() => {
        if (thisRequest !== requestIdRef.current) return
        setLoading(false)
        setLoadingMore(false)
      })
  }

  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0
      loadPage(1, query, false)
    }, 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, activityFilter, rigFilter])

  function handleListScroll(e) {
    const el = e.currentTarget
    if (loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadPage(page + 1, query, true)
  }

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setDetail(null)
    setAddForm(emptyAddForm())
    setAddTouchedDate(false)
    setSuggest(null)
    setError('')
  }

  function selectRow(id) {
    setCreating(false)
    setSelectedId(id)
    setError('')
    setLoadingDetail(true)
    apiFetch(`/api/qhse/activity-monitor/${id}/`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data)
        setEditForm({
          scheduled_dt: data.scheduled_dt || '',
          planning_remark: data.planning_remark || '',
          completion_dt: data.completion_dt || '',
          completion_remark: data.completion_remark || '',
          next_schedule_required: 'Y',
          next_scheduled_dt: data.suggested_next_dt || '',
          next_planning_remark: '',
        })
      })
      .finally(() => setLoadingDetail(false))
  }

  // Re-fetch the suggested date / blocked state whenever Activity or Rig
  // changes in Add mode — mirrors legacy's postback-on-lookup-selection.
  useEffect(() => {
    if (!creating || !addForm.activity) {
      setSuggest(null)
      return
    }
    const rigNeeded = RIG_REQUIRED_LOCATIONS.has(addForm.activity_location)
    if (rigNeeded && !addForm.rig) {
      setSuggest(null)
      return
    }
    setSuggestLoading(true)
    const params = new URLSearchParams({ activity: addForm.activity })
    if (addForm.rig) params.set('rig', addForm.rig)
    const thisRequest = ++requestIdRef.current
    apiFetch(`/api/qhse/activity-monitor/suggest/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        setSuggest(data)
        if (!addTouchedDate) setAddForm((f) => ({ ...f, scheduled_dt: data.suggested_dt || '' }))
      })
      .finally(() => {
        if (thisRequest === requestIdRef.current) setSuggestLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating, addForm.activity, addForm.rig, addForm.activity_location])

  async function handleAdd() {
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch('/api/qhse/activity-monitor/', {
        method: 'POST',
        body: JSON.stringify({
          activity: addForm.activity,
          rig: addForm.rig,
          scheduled_dt: addForm.scheduled_dt,
          planning_remark: addForm.planning_remark,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        toast.error('Failed to save')
        return
      }
      toast.success(`${data.activity_name} scheduled`)
      setCreating(false)
      selectRow(data.activity_monitor_id)
      // A fresh row is always open — only reload the list if it would
      // actually belong in the current filter (avoids showing an open row
      // inside a "Completed"-filtered list).
      if (statusFilter !== 'completed') loadPage(1, query, false)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedId || !editForm) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        scheduled_dt: editForm.scheduled_dt,
        planning_remark: editForm.planning_remark,
        completion_dt: editForm.completion_dt || null,
        completion_remark: editForm.completion_remark,
      }
      if (editForm.completion_dt) {
        payload.next_schedule_required = editForm.next_schedule_required
        if (editForm.next_schedule_required === 'Y') {
          payload.next_scheduled_dt = editForm.next_scheduled_dt
          payload.next_planning_remark = editForm.next_planning_remark
        }
      }
      const res = await apiFetch(`/api/qhse/activity-monitor/${selectedId}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        toast.error('Failed to save')
        return
      }
      setDetail(data)
      if (data.next_row) toast.success('Completed — next schedule created')
      else toast.success('Changes saved')
      // Re-fetch rather than patching `rows` in place — completing a
      // record (or the spawned next-schedule row) can change whether it
      // still belongs in the current status filter (e.g. a completed row
      // dropping out of "Open"), which a plain map()/prepend can't express.
      loadPage(1, query, false)
      setEditForm({
        scheduled_dt: data.scheduled_dt || '',
        planning_remark: data.planning_remark || '',
        completion_dt: data.completion_dt || '',
        completion_remark: data.completion_remark || '',
        next_schedule_required: 'Y',
        next_scheduled_dt: data.suggested_next_dt || '',
        next_planning_remark: '',
      })
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function exportExcel() {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (activityFilter) params.set('activity', activityFilter)
    if (rigFilter) params.set('rig', rigFilter)
    const res = await apiFetch(`/api/qhse/activity-monitor/export/?${params}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-monitor-${todayIso()}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const rigNeededForAdd = RIG_REQUIRED_LOCATIONS.has(addForm.activity_location)
  const addBlocked = suggest?.blocked
  const canSubmitAdd =
    canAdd &&
    addForm.activity &&
    (!rigNeededForAdd || addForm.rig) &&
    addForm.scheduled_dt &&
    !addBlocked &&
    !suggestLoading

  const scheduleChanged = detail && editForm && editForm.scheduled_dt !== detail.scheduled_dt
  const completingNow = editForm && editForm.completion_dt && !detail?.completion_dt
  const liveGap = editForm ? daysBetween(editForm.scheduled_dt, editForm.completion_dt) : null
  const showOriginalDate =
    detail?.original_scheduled_dt && detail.original_scheduled_dt !== detail.scheduled_dt

  const canSubmitUpdate =
    canEdit &&
    editForm &&
    !detail?.is_completed &&
    editForm.scheduled_dt &&
    (!scheduleChanged || editForm.planning_remark) &&
    (!editForm.completion_dt || editForm.completion_remark) &&
    (!completingNow ||
      (editForm.next_schedule_required === 'N' ||
        (editForm.next_schedule_required === 'Y' &&
          editForm.next_scheduled_dt &&
          editForm.next_scheduled_dt > editForm.scheduled_dt)))

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-1 gap-5 overflow-hidden">
        <div className="flex w-[320px] shrink-0 flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between p-3 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Activity Monitor
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                {totalCount}
              </span>
              {canExport && (
                <button
                  type="button"
                  title="Export Excel (current filter)"
                  onClick={exportExcel}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              {canAdd && (
                <Button size="sm" onClick={startCreate}>
                  + New
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 px-3 pb-3">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="all">All</option>
            </select>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Filter by Activity
              </p>
              <RemoteCombobox
                field={ACTIVITY_FIELD}
                value={activityFilter}
                labelValue={activityFilterLabel}
                onChange={(v, raw) => {
                  setActivityFilter(v)
                  setActivityFilterLabel(raw?.activity_name || '')
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filter by Rig</p>
              <RemoteCombobox
                field={RIG_FIELD}
                value={rigFilter}
                labelValue={rigFilterLabel}
                onChange={(v, raw) => {
                  setRigFilter(v)
                  setRigFilterLabel(raw?.rig_name || '')
                }}
              />
            </div>
          </div>
          <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto border-t border-border">
            {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
            {!loading && rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No records found.</p>}
            {rows.map((r) => (
              <button
                key={r.activity_monitor_id}
                type="button"
                onClick={() => selectRow(r.activity_monitor_id)}
                className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                  selectedId === r.activity_monitor_id ? 'bg-accent' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{r.activity_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {(r.rig_name || 'Office/Port') + ' · ' + fmtDate(r.scheduled_dt)}
                  </p>
                </div>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.is_completed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  title={r.is_completed ? 'Completed' : 'Open'}
                />
              </button>
            ))}
            {loadingMore && <p className="p-3 text-center text-xs text-muted-foreground">Loading more…</p>}
          </div>
        </div>

        <div className="flex-1 rounded-2xl border border-border bg-card">
          {!creating && !selectedId && (
            <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
              Pick a record from the list to view or edit it, or use + New to schedule one.
            </div>
          )}

          {creating && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="text-base font-semibold text-foreground">New Activity Monitor</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {error && (
                  <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                )}
                <div className="grid max-w-xl grid-cols-2 gap-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>
                      Activity<span className="text-destructive"> *</span>
                    </Label>
                    <RemoteCombobox
                      field={ACTIVITY_FIELD}
                      value={addForm.activity}
                      labelValue={addForm.activity_label}
                      onChange={(v, raw) =>
                        setAddForm((f) => ({
                          ...f,
                          activity: v,
                          activity_label: raw?.activity_name || '',
                          activity_location: raw?.activity_location ?? null,
                          rig: null,
                          rig_label: '',
                          scheduled_dt: '',
                        }))
                      }
                    />
                  </div>
                  {rigNeededForAdd && (
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <Label>
                        Rig<span className="text-destructive"> *</span>
                      </Label>
                      <RemoteCombobox
                        field={RIG_FIELD}
                        value={addForm.rig}
                        labelValue={addForm.rig_label}
                        onChange={(v, raw) =>
                          setAddForm((f) => ({ ...f, rig: v, rig_label: raw?.rig_name || '' }))
                        }
                      />
                    </div>
                  )}
                  {suggest?.blocked && (
                    <div className="col-span-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] leading-relaxed text-destructive">
                      <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{suggest.blocked_message}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Schedule Date<span className="text-destructive"> *</span>
                    </Label>
                    <Input
                      type="date"
                      value={addForm.scheduled_dt || ''}
                      onChange={(e) => {
                        setAddTouchedDate(true)
                        setAddForm((f) => ({ ...f, scheduled_dt: e.target.value }))
                      }}
                      disabled={addBlocked}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Planning Remark</Label>
                    <Input
                      value={addForm.planning_remark}
                      onChange={(e) => setAddForm((f) => ({ ...f, planning_remark: e.target.value }))}
                      disabled={addBlocked}
                    />
                  </div>
                </div>
                <Button onClick={handleAdd} disabled={saving || !canSubmitAdd} className="mt-5">
                  {saving ? 'Saving…' : 'Add'}
                </Button>
              </div>
            </div>
          )}

          {!creating && selectedId && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="text-base font-semibold text-foreground">
                  {detail ? detail.activity_name : 'Loading…'}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingDetail && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loadingDetail && detail && editForm && (
                  <>
                    {error && (
                      <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                    )}
                    {detail.is_completed && (
                      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Activity already completed. Data can not be altered.</span>
                      </div>
                    )}
                    <div className="grid max-w-xl grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label>Activity</Label>
                        <Input value={detail.activity_name} disabled />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Rig</Label>
                        <Input value={detail.rig_name || '—'} disabled />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>
                          Schedule Date<span className="text-destructive"> *</span>
                        </Label>
                        <Input
                          type="date"
                          value={editForm.scheduled_dt}
                          onChange={(e) => setEditForm((f) => ({ ...f, scheduled_dt: e.target.value }))}
                          disabled={detail.is_completed || !canEdit}
                        />
                      </div>
                      {showOriginalDate && (
                        <div className="flex flex-col gap-1.5">
                          <Label>Original Date</Label>
                          <Input value={fmtDate(detail.original_scheduled_dt)} disabled />
                        </div>
                      )}
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <Label>
                          Planning Remark
                          {scheduleChanged && <span className="text-destructive"> *</span>}
                        </Label>
                        <Input
                          value={editForm.planning_remark}
                          onChange={(e) => setEditForm((f) => ({ ...f, planning_remark: e.target.value }))}
                          disabled={detail.is_completed || !canEdit}
                        />
                      </div>
                    </div>

                    {!detail.is_completed && (
                      <>
                        <div className="mt-6 mb-3 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          Grouping &amp; Validity
                        </div>
                        <div className="grid max-w-xl grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <Label>Completion Date</Label>
                            <Input
                              type="date"
                              value={editForm.completion_dt}
                              max={todayIso()}
                              onChange={(e) => setEditForm((f) => ({ ...f, completion_dt: e.target.value }))}
                              disabled={!canEdit}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label>Completion Gap</Label>
                            <Input value={fmtGap(liveGap)} disabled />
                          </div>
                          <div className="col-span-2 flex flex-col gap-1.5">
                            <Label>
                              Completion Remark
                              {editForm.completion_dt && <span className="text-destructive"> *</span>}
                            </Label>
                            <Input
                              value={editForm.completion_remark}
                              onChange={(e) => setEditForm((f) => ({ ...f, completion_remark: e.target.value }))}
                              disabled={!canEdit}
                            />
                          </div>
                        </div>

                        <div className="mt-6 mb-3 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          Next Schedule
                        </div>
                        <p className="mb-3 max-w-xl text-[11px] text-muted-foreground">
                          Only takes effect when Completion Date above is filled in on this save.
                        </p>
                        <div className="grid max-w-xl grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <Label>
                              Next Schedule Required{completingNow && <span className="text-destructive"> *</span>}
                            </Label>
                            <select
                              value={editForm.next_schedule_required}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, next_schedule_required: e.target.value }))
                              }
                              disabled={!canEdit}
                              className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:border-ring"
                            >
                              <option value="Y">Yes</option>
                              <option value="N">No</option>
                            </select>
                          </div>
                          {editForm.next_schedule_required === 'Y' && (
                            <div className="flex flex-col gap-1.5">
                              <Label>
                                Next Schedule Date{completingNow && <span className="text-destructive"> *</span>}
                              </Label>
                              <Input
                                type="date"
                                value={editForm.next_scheduled_dt}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, next_scheduled_dt: e.target.value }))
                                }
                                disabled={!canEdit}
                              />
                            </div>
                          )}
                          {editForm.next_schedule_required === 'Y' && (
                            <div className="col-span-2 flex flex-col gap-1.5">
                              <Label>Next Planning Remark</Label>
                              <Input
                                value={editForm.next_planning_remark}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, next_planning_remark: e.target.value }))
                                }
                                disabled={!canEdit}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {!detail.is_completed && canEdit && (
                      <Button onClick={handleUpdate} disabled={saving || !canSubmitUpdate} className="mt-5">
                        {saving ? 'Saving…' : 'Update'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
