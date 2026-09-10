import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RemoteCombobox, TilePicker } from '@/routes/masters/MasterCrudPage'
import { DrillingMiniMap, DrillingWellsMap } from './DrillingMap'
import { IconSearch, IconTrash } from '@/components/icons'
import { Download, Map as MapIcon, List as ListIcon } from 'lucide-react'

const MENU_KEY = 'drilling.drilling_information'
const API = '/api/drilling/drilling-information/'

const PROJECT_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/project-contracts/?status=active',
  optionLabel: 'display_name',
  optionValue: 'prj_contract_id',
  labelField: 'contract_no',
}

// Filtering the list shouldn't hide wells drilled under a now-closed
// project, so this omits the Project field's own ?status=active.
const PROJECT_FILTER_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/project-contracts/',
  optionLabel: 'display_name',
  optionValue: 'prj_contract_id',
  labelField: 'contract_no',
}

// "Hardcoded IDS" per the legacy note — Mst_Drilling_Rate rows 6/7/8 are
// the only three valid Rig Move Rate Types, not a general drilling-rate
// picker, so these are fixed rather than fetched.
const RIG_MOVE_RATE_OPTIONS = [
  { value: '6', label: 'ILM' },
  { value: '7', label: 'IPM - Lateral' },
  { value: '8', label: 'IPM - Adjacent' },
]

// A blank leading option is deliberate, not decorative: legacy never
// actually wrote a hemisphere for Latitude on any historical row (see the
// model docstring), so an old record's Zone must display as genuinely
// unset rather than silently rendering "North" while the real value is
// empty — that mismatch is exactly the bug being fixed here.
const LAT_HEMISPHERE_OPTIONS = [
  { value: '', label: '— Not set —' },
  { value: 'N', label: 'North' },
  { value: 'S', label: 'South' },
]
const LON_HEMISPHERE_OPTIONS = [
  { value: '', label: '— Not set —' },
  { value: 'E', label: 'East' },
  { value: 'W', label: 'West' },
]

// Legacy packs a coordinate as `DD°MM'SS.ss"[hemisphere]` into one column
// (e.g. `08°36'00.00"N`). Longitude always carries its hemisphere letter in
// the real data; Latitude never actually did (a legacy gap) — this app
// writes both correctly going forward while keeping the same string shape.
const COORD_RE = /^(\d{1,3})°(\d{1,2})'(\d{1,2})\.(\d{1,2})"([NSEW]?)$/

function composeCoord({ deg, min, sec, frac, hemisphere }) {
  if (deg === '' || deg == null || min === '' || min == null || sec === '' || sec == null) return null
  const d = String(deg).padStart(2, '0')
  const m = String(min).padStart(2, '0')
  const s = String(sec).padStart(2, '0')
  const f = String(frac || 0).padStart(2, '0')
  return `${d}°${m}'${s}.${f}"${hemisphere || ''}`
}

function parseCoord(value) {
  const match = value ? COORD_RE.exec(value) : null
  if (!match) return { deg: '', min: '', sec: '', frac: '', hemisphere: '' }
  const [, deg, min, sec, frac, hemisphere] = match
  return { deg, min, sec, frac, hemisphere }
}

function emptyForm() {
  return {
    contract: null,
    contractLabel: '',
    rig: null,
    // New entries default to North/East — a real, visible choice the user
    // can change, not a value that silently fails to save (that was the
    // actual legacy bug, not the default itself).
    lat: { deg: '', min: '', sec: '', frac: '', hemisphere: 'N' },
    lon: { deg: '', min: '', sec: '', frac: '', hemisphere: 'E' },
    location: '',
    total_water_depth: '',
    first_anchor_down_date: '',
    first_anchor_down_time: '',
    distance_covered_kms_knots: '',
    drilling_rate: '',
  }
}

function emptyFilters() {
  return { contract: null, contractLabel: '', drilling_rate: '', date_from: '', date_to: '' }
}

function StaticCombobox({ items, value, onChange, disabled, placeholder }) {
  const selectedItem = value != null ? (items.find((i) => i.value === String(value)) ?? null) : null
  return (
    <Combobox items={items} value={selectedItem} onValueChange={(item) => onChange(item ? item.value : null)} disabled={disabled}>
      <ComboboxInput placeholder={placeholder || 'Select…'} showClear className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No results</ComboboxEmpty>
        <ComboboxList>{(item) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value != null && value !== '' ? value : '—'}</span>
    </div>
  )
}

function CoordFields({ label, coord, onChange, hemisphereOptions, disabled }) {
  function set(field, val) {
    onChange({ ...coord, [field]: val })
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Degree</span>
          <Input type="number" min="0" value={coord.deg} onChange={(e) => set('deg', e.target.value)} disabled={disabled} className="h-9 w-16" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Minutes</span>
          <Input type="number" min="0" max="59" value={coord.min} onChange={(e) => set('min', e.target.value)} disabled={disabled} className="h-9 w-16" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Seconds</span>
          <Input type="number" min="0" max="59" value={coord.sec} onChange={(e) => set('sec', e.target.value)} disabled={disabled} className="h-9 w-16" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Milliseconds</span>
          <Input type="number" min="0" max="99" value={coord.frac} onChange={(e) => set('frac', e.target.value)} disabled={disabled} className="h-9 w-20" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Zone</span>
          <select
            value={coord.hemisphere}
            onChange={(e) => set('hemisphere', e.target.value)}
            disabled={disabled}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:border-ring"
          >
            {hemisphereOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default function DrillingInformationPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canExport = can(user, MENU_KEY, 'export')

  // Same convention as the generic masters list: server-paginated
  // (50/page, same DRF pagination every master uses) and server-searched,
  // with a stale-response guard and infinite scroll — not something to
  // reinvent per custom page, and not something a one-shot page_size=1000
  // fetch should replace either (this table will keep growing).
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(emptyFilters())
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [creating, setCreating] = useState(false)
  const [showExtraDetails, setShowExtraDetails] = useState(false)

  const [form, setForm] = useState(emptyForm())
  const [snapshot, setSnapshot] = useState(null)
  const [rigOptions, setRigOptions] = useState([])
  const [loadingRigs, setLoadingRigs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // The map plots every currently-filtered well at once, which is a
  // fundamentally different need than the list's own page-at-a-time
  // loading — kept as a separate fetch/state rather than repurposing the
  // list's paginated `rows` for it.
  const [mapRows, setMapRows] = useState([])
  const [loadingMap, setLoadingMap] = useState(false)

  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  const rigItems = useMemo(() => rigOptions.map((o) => ({ value: String(o.rig_id), label: o.rig_name })), [rigOptions])
  const activeFilterCount = [filters.contract, filters.drilling_rate, filters.date_from, filters.date_to].filter(Boolean).length

  function buildFilterParams(searchQuery) {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filters.contract) params.set('contract', filters.contract)
    if (filters.drilling_rate) params.set('drilling_rate', filters.drilling_rate)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    return params
  }

  function loadPage(pageNum, searchQuery, { append } = {}) {
    const thisRequest = ++requestIdRef.current
    const params = buildFilterParams(searchQuery)
    params.set('page', String(pageNum))
    if (append) setLoadingMore(true)
    else setLoading(true)
    apiFetch(`${API}?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return // stale response, a newer search/page superseded it
        const results = Array.isArray(data) ? data : data.results || []
        setRows((prev) => (append ? [...prev, ...results] : results))
        setTotalCount(Array.isArray(data) ? results.length : (data.count ?? results.length))
        setHasMore(!Array.isArray(data) && Boolean(data.next))
        setPage(pageNum)
      })
      .finally(() => {
        if (thisRequest !== requestIdRef.current) return
        setLoading(false)
        setLoadingMore(false)
      })
  }

  function loadMore() {
    if (loadingMore || !hasMore) return
    loadPage(page + 1, query, { append: true })
  }

  function handleListScroll(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMore()
  }

  function loadMapRows() {
    setLoadingMap(true)
    const params = buildFilterParams(query)
    params.set('page_size', '1000')
    apiFetch(`${API}?${params}`)
      .then((r) => r.json())
      .then((data) => setMapRows(Array.isArray(data) ? data : data.results || []))
      .finally(() => setLoadingMap(false))
  }

  function toggleViewMode() {
    setViewMode((v) => {
      const next = v === 'list' ? 'map' : 'list'
      if (next === 'map') loadMapRows()
      return next
    })
  }

  // Mount fetch, run exactly once. React fires the [query] and [filters]
  // effects below at least once on mount too regardless of their own deps
  // "changing" — without this flag both would independently fire their own
  // redundant loadPage right alongside this one (same duplicate-request bug
  // fixed in MasterCrudPage.jsx earlier this session). Only the
  // last-declared consumer (the filters effect) actually clears it, so a
  // later, real change to either query or filters still behaves normally.
  const skipNextLoadRef = useRef(true)

  useEffect(() => {
    loadPage(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced server-side search — resets to page 1 on every new query.
  useEffect(() => {
    if (skipNextLoadRef.current) return
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0
      loadPage(1, query)
      if (viewMode === 'map') loadMapRows()
    }, 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Filter changes reload immediately (no debounce needed — these are
  // discrete picks, not keystrokes).
  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }
    if (listRef.current) listRef.current.scrollTop = 0
    loadPage(1, query)
    if (viewMode === 'map') loadMapRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  // The rig-options endpoint only returns rigs *currently* active on the
  // project (per the legacy note's own filter) — right for picking a rig on
  // a *new* record, but an existing record's project or rig assignment can
  // have ended since it was created, which would otherwise make that
  // record's own rig silently disappear from the list while editing it
  // (shows "No rigs mapped to you on this project" even though one clearly
  // is, per the list). mustInclude keeps that record's rig selectable
  // regardless of whether it's still "active" today.
  function loadRigOptions(projectId, mustInclude) {
    setRigOptions(mustInclude ? [mustInclude] : [])
    if (!projectId) return
    setLoadingRigs(true)
    apiFetch(`/api/drilling/rig-options/?project=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mustInclude) {
          setRigOptions(data)
          return
        }
        const merged = data.some((o) => o.rig_id === mustInclude.rig_id) ? data : [mustInclude, ...data]
        setRigOptions(merged)
      })
      .finally(() => setLoadingRigs(false))
  }

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setSelectedRecord(null)
    setForm(emptyForm())
    setSnapshot(null)
    setRigOptions([])
    setViewMode('list')
  }

  function selectRow(row) {
    setCreating(false)
    setSelectedId(row.drilling_hdr_id)
    // The list/retrieve response already carries every column (consumption,
    // hours, completion...) even though this form only edits a subset —
    // kept as-is for the read-only "Consumption & Completion" section
    // below, rather than a second fetch for the same data.
    setSelectedRecord(row)
    const loaded = {
      contract: row.contract,
      contractLabel: row.contract_no,
      rig: row.rig,
      lat: parseCoord(row.latitude),
      lon: parseCoord(row.longitude),
      location: row.location || '',
      total_water_depth: row.total_water_depth ?? '',
      first_anchor_down_date: row.first_anchor_down_dt ? row.first_anchor_down_dt.slice(0, 10) : '',
      first_anchor_down_time: row.first_anchor_down_dt ? row.first_anchor_down_dt.slice(11, 16) : '',
      distance_covered_kms_knots: row.distance_covered_kms_knots ?? '',
      drilling_rate: row.drilling_rate ? String(row.drilling_rate) : '',
    }
    setForm(loaded)
    setSnapshot(JSON.stringify(loaded))
    const currentRig = row.rig ? { rig_id: row.rig, rig_name: row.rig_name } : null
    loadRigOptions(row.contract, currentRig)
    setViewMode('list')
  }

  function onProjectChange(id) {
    setForm((f) => ({ ...f, contract: id, rig: null }))
    loadRigOptions(id)
  }

  function buildPayload() {
    const latitude = composeCoord(form.lat)
    const longitude = composeCoord(form.lon)
    if (!form.rig) return { error: 'Rig is required' }
    if (!latitude) return { error: 'Latitude is incomplete' }
    if (!longitude) return { error: 'Longitude is incomplete' }
    if (!form.location.trim()) return { error: 'Location is required' }
    if (!form.first_anchor_down_date || !form.first_anchor_down_time) {
      return { error: 'First Anchor Down date and time are required' }
    }
    if (!form.distance_covered_kms_knots) return { error: 'Nautical Miles / Kilometres Covered is required' }
    if (Number(form.distance_covered_kms_knots) > 9999.99) {
      return { error: 'Nautical Miles / Kilometres Covered cannot exceed 9999.99' }
    }
    if (!form.drilling_rate) return { error: 'Rig move rate type is required' }

    return {
      payload: {
        contract: form.contract || null,
        rig: form.rig,
        latitude,
        longitude,
        location: form.location.trim(),
        total_water_depth: form.total_water_depth === '' ? null : form.total_water_depth,
        first_anchor_down_dt: `${form.first_anchor_down_date}T${form.first_anchor_down_time}:00`,
        distance_covered_kms_knots: form.distance_covered_kms_knots,
        drilling_rate: Number(form.drilling_rate),
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
    const isCreate = creating
    const res = await apiFetch(isCreate ? API : `${API}${selectedId}/`, {
      method: isCreate ? 'POST' : 'PATCH',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(isCreate ? 'Drilling record created' : 'Drilling record saved')
      const data = await res.json()
      loadPage(1, query)
      if (viewMode === 'map') loadMapRows()
      // Re-derive form/snapshot/rig-options from the saved record itself
      // (not just the id) so the Save button correctly goes back to
      // "nothing to save" instead of staying dirty after a real save.
      selectRow(data)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.detail || data.error || 'Failed to save')
    }
  }

  async function remove() {
    if (!selectedId) return
    const res = await apiFetch(`${API}${selectedId}/`, { method: 'DELETE' })
    setConfirmingDelete(false)
    if (res.status === 204) {
      toast.success('Drilling record deleted')
      setSelectedId(null)
      setSelectedRecord(null)
      setForm(emptyForm())
      setSnapshot(null)
      loadPage(1, query)
      if (viewMode === 'map') loadMapRows()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete')
    }
  }

  async function exportCsv() {
    const params = buildFilterParams(query)
    const res = await apiFetch(`${API}export/?${params.toString()}`)
    if (!res.ok) {
      toast.error('Failed to export')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drilling-information.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const showForm = creating || selectedId != null
  const disabled = !creating && !canEdit
  const selectedLat = form.lat ? composeAndDecode(form.lat, { N: 1, S: -1 }) : null
  const selectedLon = form.lon ? composeAndDecode(form.lon, { E: 1, W: -1 }) : null
  // Same convention as the generic masters page: creating is "dirty" once
  // every required field is filled (nothing to compare against yet);
  // editing compares the live form against the snapshot taken when the
  // record was loaded.
  const isDirty = creating ? !buildPayload().error : snapshot !== null && JSON.stringify(form) !== snapshot

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-1 gap-5 overflow-hidden">
        <div className="flex w-[320px] shrink-0 flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between p-3 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Drilling Information
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                {totalCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title={viewMode === 'list' ? 'Show map' : 'Show list'}
                onClick={toggleViewMode}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {viewMode === 'list' ? <MapIcon className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
              </button>
              {canExport && (
                <button
                  type="button"
                  title="Export CSV (current search/filters)"
                  onClick={exportCsv}
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
              <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex h-8 items-center gap-1.5 self-start rounded-lg border border-input px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            {showFilters && (
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Project</span>
                  <RemoteCombobox
                    field={PROJECT_FILTER_FIELD}
                    value={filters.contract}
                    onChange={(id) => setFilters((f) => ({ ...f, contract: id }))}
                    labelValue={filters.contractLabel}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Rig Move Rate Type</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, drilling_rate: '' }))}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                        !filters.drilling_rate ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      All
                    </button>
                    {RIG_MOVE_RATE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, drilling_rate: o.value }))}
                        className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                          filters.drilling_rate === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Anchor Down From</span>
                    <Input type="date" value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} className="h-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Anchor Down To</span>
                    <Input type="date" value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} className="h-8" />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters(emptyFilters())}
                    className="self-start text-xs font-medium text-[#2563eb] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          {viewMode === 'list' && (
            <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto border-t border-border">
              {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
              {!loading && rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No records found.</p>}
              {rows.map((r) => (
                <button
                  key={r.drilling_hdr_id}
                  type="button"
                  onClick={() => selectRow(r)}
                  className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                    selectedId === r.drilling_hdr_id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{r.location}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.rig_name}</p>
                  </div>
                </button>
              ))}
              {loadingMore && <p className="p-3 text-center text-xs text-muted-foreground">Loading more…</p>}
            </div>
          )}
        </div>

        {viewMode === 'map' ? (
          loadingMap ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">Loading map…</p>
            </div>
          ) : (
            <DrillingWellsMap rows={mapRows} onSelect={selectRow} />
          )
        ) : (
          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-5">
            {!showForm && (
              <p className="text-sm text-muted-foreground">Select a record, or create a new one.</p>
            )}
            {showForm && (
              <div className="mx-auto flex max-w-2xl flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {creating ? 'New Drilling Record' : form.location}
                  </p>
                  {!creating && canDelete && (
                    <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Project</Label>
                  <RemoteCombobox
                    field={PROJECT_FIELD}
                    value={form.contract}
                    onChange={onProjectChange}
                    labelValue={form.contractLabel}
                    disabled={disabled}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Rig</Label>
                  <StaticCombobox
                    items={rigItems}
                    value={form.rig}
                    onChange={(v) => setForm((f) => ({ ...f, rig: v ? Number(v) : null }))}
                    disabled={disabled || !form.contract || loadingRigs}
                    placeholder={
                      !form.contract
                        ? 'Pick a project first'
                        : loadingRigs
                          ? 'Loading rigs…'
                          : rigItems.length
                            ? 'Select a rig…'
                            : 'No rigs mapped to you on this project'
                    }
                  />
                </div>

                <CoordFields
                  label="Latitude"
                  coord={form.lat}
                  onChange={(lat) => setForm((f) => ({ ...f, lat }))}
                  hemisphereOptions={LAT_HEMISPHERE_OPTIONS}
                  disabled={disabled}
                />
                <CoordFields
                  label="Longitude"
                  coord={form.lon}
                  onChange={(lon) => setForm((f) => ({ ...f, lon }))}
                  hemisphereOptions={LON_HEMISPHERE_OPTIONS}
                  disabled={disabled}
                />

                <DrillingMiniMap lat={selectedLat} lon={selectedLon} />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} disabled={disabled} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Total Water Depth (Mtr)</Label>
                    <Input
                      type="number"
                      value={form.total_water_depth}
                      onChange={(e) => setForm((f) => ({ ...f, total_water_depth: e.target.value }))}
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>First Anchor Down Date/Time</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={form.first_anchor_down_date}
                        onChange={(e) => setForm((f) => ({ ...f, first_anchor_down_date: e.target.value }))}
                        disabled={disabled}
                      />
                      <Input
                        type="time"
                        value={form.first_anchor_down_time}
                        onChange={(e) => setForm((f) => ({ ...f, first_anchor_down_time: e.target.value }))}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Nautical Miles / Kilometres Covered (9999.99 max)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      max="9999.99"
                      value={form.distance_covered_kms_knots}
                      onChange={(e) => setForm((f) => ({ ...f, distance_covered_kms_knots: e.target.value }))}
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Rig Move Rate Type</Label>
                  <TilePicker
                    options={RIG_MOVE_RATE_OPTIONS}
                    value={form.drilling_rate}
                    onChange={(v) => setForm((f) => ({ ...f, drilling_rate: v }))}
                    disabled={disabled}
                  />
                </div>

                {/* Consumption/hours/completion — real columns this record
                    already has (from the legacy import or a later save),
                    but not something this form collects. View-only until a
                    dedicated later-stage form exists to actually capture
                    and compute them (e.g. Operating Efficiency %). */}
                {!creating && selectedRecord && (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => setShowExtraDetails((v) => !v)}
                      className="flex items-center gap-1.5 self-start rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {showExtraDetails ? 'Hide' : 'Show'} consumption &amp; completion details
                    </button>
                    {showExtraDetails && (
                      <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-3">
                        <p className="mb-3 text-[11px] text-muted-foreground">
                          View only — captured by a later-stage form that doesn't exist yet.
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                          <ReadOnlyField label="Total Depth" value={selectedRecord.total_depth} />
                          <ReadOnlyField label="Diesel Consumed (M3)" value={selectedRecord.tot_consumption_diesel} />
                          <ReadOnlyField label="Water Consumed (M3)" value={selectedRecord.tot_consumption_water} />
                          <ReadOnlyField label="Diesel Received (M3)" value={selectedRecord.tot_received_diesel} />
                          <ReadOnlyField label="Water Received (M3)" value={selectedRecord.tot_received_water} />
                          <ReadOnlyField label="Water Generated (M3)" value={selectedRecord.tot_generated_water} />
                          <ReadOnlyField label="Operating Hours" value={selectedRecord.tot_operating_hrs} />
                          <ReadOnlyField label="Standby Hours" value={selectedRecord.tot_standby_hrs} />
                          <ReadOnlyField label="Repair Service Hours" value={selectedRecord.tot_repair_service_hrs} />
                          <ReadOnlyField label="Repair Rate Hours" value={selectedRecord.tot_repair_rate_hrs} />
                          <ReadOnlyField label="Zero Rate Hours" value={selectedRecord.tot_zero_rate_hrs} />
                          <ReadOnlyField label="Total Days" value={selectedRecord.total_days} />
                          <ReadOnlyField
                            label="Drilling Completion"
                            value={
                              selectedRecord.drilling_completion_dt
                                ? selectedRecord.drilling_completion_dt.slice(0, 16).replace('T', ' ')
                                : null
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(creating ? canAdd : canEdit) && (
                  <div>
                    <Button onClick={save} disabled={saving || !isDirty} variant={isDirty ? 'default' : 'secondary'}>
                      {saving ? 'Saving…' : creating ? 'Create' : isDirty ? 'Save changes' : 'Saved'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this record?</DialogTitle>
            <DialogDescription>This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mirrors drilling_serializers.py's _coord_to_decimal — used only to drive
// the live mini-map preview while a coordinate is being typed, before it's
// ever saved (so there's no server round trip to preview a pin).
function composeAndDecode(coord, signs) {
  const { deg, min, sec, frac, hemisphere } = coord
  if (deg === '' || deg == null || min === '' || min == null || sec === '' || sec == null) return null
  const decimal = Number(deg) + Number(min) / 60 + Number(`${sec}.${frac || 0}`) / 3600
  const sign = hemisphere && signs[hemisphere] ? signs[hemisphere] : 1
  return decimal * sign
}
