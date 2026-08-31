import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { mastersSchemas } from '@/config/mastersSchemas'
import AccessDenied from '@/components/AccessDenied'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  IconSearch,
  IconTrash,
  IconChevronLeft,
  IconCheck,
  IconAlertCircle,
} from '@/components/icons'

// For masters with no explicit active flag, "active" is implicit: a blank
// end date means ongoing, a past end date means it's over. today() is
// computed once per render rather than per row.
export function isDateActive(toValue) {
  if (!toValue) return true
  const today = new Date().toISOString().slice(0, 10)
  return toValue >= today
}

export function emptyForm(schema) {
  const form = {}
  for (const f of schema.fields) form[f.name] = f.type === 'active-select' ? 'Y' : (f.default ?? '')
  return form
}

// A lookup this small is cheap to preload in full and filter instantly in
// the browser — no debounce lag. Above it, the same combobox switches to
// server-side search instead, so a table that grows past this line degrades
// gracefully (still correct, just a network round-trip per keystroke)
// rather than silently truncating a preloaded option list at some fixed
// page size.
const INSTANT_LIST_THRESHOLD = 200

// One combobox for every FK/lookup field, small or huge. `type: 'select-remote'`
// probes the endpoint once on mount and picks local-instant vs. server-search
// based on the real row count the backend reports; `type: 'search-remote'`
// skips the probe and goes straight to server-search for lookups already
// known to be large (e.g. the ~28k-row employee roster). Either way,
// `labelField` (a sibling display column already carried in the record,
// e.g. `rig_name` alongside a `rig` id) is the fallback that always shows the
// current selection's label even when it isn't in whatever page/search
// results happen to be loaded.
export function RemoteCombobox({ field, value, onChange, disabled, filterValue, filterValues, labelValue }) {
  const forceSearch = field.type === 'search-remote'
  const [options, setOptions] = useState([])
  const [mode, setMode] = useState(forceSearch ? 'search' : 'probing')
  const [query, setQuery] = useState('')
  // Server-search results are paginated (page_size=20) — hasMore/loadingMore
  // back the "load next page on scroll" behavior below so a long list (e.g.
  // ~700 Locations) never just gets cut off after the first page.
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageRef = useRef(1)
  const sep = field.remote.includes('?') ? '&' : '?'

  useEffect(() => {
    if (forceSearch) return
    let cancelled = false
    apiFetch(`${field.remote}${sep}page_size=${INSTANT_LIST_THRESHOLD}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data)) {
          // Endpoint isn't paginated — whatever it returns is the full set.
          setOptions(data)
          setMode('local')
        } else {
          const results = data.results || []
          setOptions(results)
          setMode(data.count > results.length ? 'search' : 'local')
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.remote])

  // Some search-remote fields (e.g. Location, scoped to a picked Country)
  // narrow the server-side search itself rather than filtering a
  // client-side option list — the lookup is too large to preload. Most
  // fields narrow on a single picked value; a few (e.g. Model, narrowed by
  // whichever of Manufacturer/Type/Subtype are already picked) narrow on
  // several at once via `filterValues`.
  let remoteFilterParam =
    field.remoteFilterParam && filterValue ? `&${field.remoteFilterParam}=${filterValue}` : ''
  if (filterValues) {
    for (const [param, val] of Object.entries(filterValues)) {
      if (val) remoteFilterParam += `&${param}=${val}`
    }
  }

  useEffect(() => {
    if (mode !== 'search') return
    const timer = setTimeout(() => {
      apiFetch(`${field.remote}${sep}search=${encodeURIComponent(query)}&page_size=20&page=1${remoteFilterParam}`)
        .then((r) => r.json())
        .then((data) => {
          pageRef.current = 1
          if (Array.isArray(data)) {
            setOptions(data)
            setHasMore(false)
          } else {
            setOptions(data.results || [])
            setHasMore(Boolean(data.next))
          }
        })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.remote, query, mode, remoteFilterParam])

  function loadMore() {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    apiFetch(
      `${field.remote}${sep}search=${encodeURIComponent(query)}&page_size=20&page=${nextPage}${remoteFilterParam}`
    )
      .then((r) => r.json())
      .then((data) => {
        const results = Array.isArray(data) ? [] : data.results || []
        setOptions((prev) => [...prev, ...results])
        setHasMore(Array.isArray(data) ? false : Boolean(data.next))
        pageRef.current = nextPage
      })
      .finally(() => setLoadingMore(false))
  }

  // The "select a category first" cascade (e.g. Rank filtered by Fs
  // Category) only makes sense once everything's already loaded locally —
  // a lookup large enough to need server search is in practice never one of
  // these small, cascade-filtered sets.
  const needsFilter = mode === 'local' && Boolean(field.filterOptionField)
  const filtered =
    needsFilter && filterValue
      ? options.filter((o) => String(o[field.filterOptionField]) === String(filterValue))
      : needsFilter
        ? []
        : options

  // Always surface the currently-selected option even if it falls outside
  // the active filter — legacy rows can have a rank whose own category has
  // since drifted from the row's stored category, and the value should
  // still display rather than silently blank out.
  const selectedOutsideFilter =
    value && !filtered.some((o) => String(o[field.optionValue]) === String(value))
      ? options.find((o) => String(o[field.optionValue]) === String(value))
      : null
  const shown = selectedOutsideFilter ? [...filtered, selectedOutsideFilter] : filtered

  const items = useMemo(
    () => shown.map((o) => ({ value: String(o[field.optionValue]), label: o[field.optionLabel], raw: o })),
    [shown, field.optionValue, field.optionLabel]
  )
  // Some cascades (e.g. Rig Subtype under Rig Type) have only one valid
  // option once the parent is picked — auto-fill it instead of making the
  // user pick the sole choice themselves.
  useEffect(() => {
    if (!needsFilter || !field.autoSelectSingleMatch || !filterValue) return
    if (filtered.length !== 1) return
    const only = String(filtered[0][field.optionValue])
    if (String(value ?? '') !== only) onChange(only)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValue, filtered.length, field.autoSelectSingleMatch])

  const selectedItem =
    value != null
      ? (items.find((i) => i.value === String(value)) ??
        (labelValue ? { value: String(value), label: labelValue } : null))
      : null
  const comboItems =
    selectedItem && !items.some((i) => i.value === selectedItem.value) ? [selectedItem, ...items] : items
  const blocked = needsFilter && !filterValue && !value

  return (
    <Combobox
      items={comboItems}
      value={selectedItem}
      onValueChange={(item) => onChange(item ? item.value : null, item?.raw)}
      onInputValueChange={mode === 'search' ? setQuery : undefined}
      disabled={disabled || blocked}
    >
      <ComboboxInput
        placeholder={
          blocked
            ? field.filterPlaceholder || 'Select above first…'
            : mode === 'search'
              ? 'Type to search…'
              : 'Search…'
        }
        showClear
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>{mode === 'search' && !query ? 'Type to search…' : 'No results'}</ComboboxEmpty>
        <ComboboxList
          onScroll={
            mode === 'search'
              ? (e) => {
                  const el = e.currentTarget
                  if (el.scrollHeight - el.scrollTop - el.clientHeight < 64) loadMore()
                }
              : undefined
          }
        >
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        {mode === 'search' && loadingMore && (
          <div className="py-1.5 text-center text-xs text-muted-foreground">Loading more…</div>
        )}
      </ComboboxContent>
    </Combobox>
  )
}

function FileUploadField({ field, value, onChange, disabled, form }) {
  const [uploading, setUploading] = useState(false)
  const [freshUrl, setFreshUrl] = useState(null)
  const inputRef = useRef(null)
  const urlFieldValue = field.urlField ? form[field.urlField] : null
  const previewUrl = freshUrl || urlFieldValue

  async function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const keyValue = field.uploadKeyField ? form[field.uploadKeyField] : null
    if (field.uploadKeyField && !keyValue) {
      toast.error(`Select a ${field.uploadKeyLabel || 'value'} first`)
      e.target.value = ''
      return
    }
    setUploading(true)
    const body = new FormData()
    body.append('file', file)
    if (keyValue) body.append(field.uploadKeyParam || 'user_id', keyValue)
    try {
      const res = await apiFetch(field.uploadUrl, { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onChange(data.path)
      setFreshUrl(data.url)
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : value ? 'Replace file' : 'Choose file'}
        </Button>
        {value ? (
          previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm text-primary underline underline-offset-2"
            >
              {value.split('/').pop()}
            </a>
          ) : (
            <span className="truncate text-sm text-muted-foreground">{value.split('/').pop()}</span>
          )
        ) : (
          <span className="text-sm text-muted-foreground">No file chosen</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={field.accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled || uploading}
      />
    </div>
  )
}

// A small fixed set of options (≤4) reads and picks faster as a row of
// tiles than as a dropdown you have to open first — one click instead of
// two, and every choice is visible at a glance.
export function TilePicker({ options, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {selected && <IconCheck className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Safari renders a native <input type="date" value=""> with today's date
// visibly filled in rather than a blank/placeholder state (Chrome shows a
// muted "dd/mm/yyyy") — indistinguishable from an actually-set date, which
// is exactly the confusion these "blank means still active" fields need to
// avoid. Side-step the browser inconsistency entirely: show plain text
// until the user explicitly opts to set a date, then mount the real input.
export function NullableDateField({ value, onChange, disabled }) {
  const [editing, setEditing] = useState(Boolean(value))

  useEffect(() => {
    if (value) setEditing(true)
  }, [value])

  if (!editing) {
    return (
      <div className="flex h-8 items-center gap-2">
        <span className="text-sm text-muted-foreground">No end date</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            Set a date
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1"
      />
      {!disabled && (
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setEditing(false)
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// A number field that debounce-checks the server for a duplicate as the
// user types, surfacing an amber banner with a one-click suggestion instead
// of letting them find out on save (or worse, silently collide with
// whatever the DB does on a duplicate).
function UniqueCodeField({ value, onChange, disabled, checkUnique, excludeId }) {
  const [status, setStatus] = useState('idle') // idle | checking | taken | available
  const [suggestion, setSuggestion] = useState(null)

  useEffect(() => {
    if (value === '' || value == null) {
      setStatus('idle')
      return
    }
    setStatus('checking')
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ [checkUnique.param]: value })
      if (excludeId) params.set('exclude', excludeId)
      apiFetch(`${checkUnique.url}?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setStatus(data.taken ? 'taken' : 'available')
          setSuggestion(data.suggestion ?? null)
        })
        .catch(() => setStatus('idle'))
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, checkUnique.url, checkUnique.param, excludeId])

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {status === 'taken' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Code {value} is already in use.
            {suggestion != null && (
              <>
                {' '}
                Try{' '}
                <button
                  type="button"
                  onClick={() => onChange(String(suggestion))}
                  className="font-semibold underline underline-offset-2"
                >
                  {suggestion}
                </button>{' '}
                instead.
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

export function FormField({ field, value, onChange, disabled, filterValue, form, recordId }) {
  if (field.type === 'active-select') {
    // Some legacy rows have '' rather than 'Y'/'N' in this column — treat
    // anything but an explicit 'N' as Active.
    return (
      <TilePicker
        options={[
          { value: 'Y', label: 'Active' },
          { value: 'N', label: 'Inactive' },
        ]}
        value={value === 'N' ? 'N' : 'Y'}
        onChange={onChange}
        disabled={disabled}
      />
    )
  }
  if (field.type === 'select-remote' || field.type === 'search-remote') {
    // Most filtered fields narrow on one picked value (`filterField` +
    // `filterValue`, passed in by the caller). A few narrow on several at
    // once (e.g. Model, by whichever of Manufacturer/Type/Subtype are
    // already picked) — those declare `filterFields` on the schema and get
    // read straight from `form` here instead of threading each value
    // through every caller.
    const filterValues = field.filterFields
      ? Object.fromEntries(field.filterFields.map((ff) => [ff.param, form?.[ff.field]]))
      : undefined
    return (
      <RemoteCombobox
        field={field}
        value={value}
        onChange={onChange}
        disabled={disabled}
        filterValue={filterValue}
        filterValues={filterValues}
        labelValue={field.labelField ? form[field.labelField] : undefined}
      />
    )
  }
  if (field.type === 'select') {
    return (
      <TilePicker options={field.options} value={value || null} onChange={onChange} disabled={disabled} />
    )
  }
  if (field.type === 'file') {
    return <FileUploadField field={field} value={value} onChange={onChange} disabled={disabled} form={form} />
  }
  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        disabled={disabled}
      />
    )
  }
  // A single-line text field long enough to regularly overflow a normal
  // Input gets a wrapping textarea instead, so the value is visible at a
  // glance instead of scrolling inside a one-line box.
  if (field.wide) {
    return (
      <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        disabled={disabled}
      />
    )
  }
  if (field.type === 'date' && field.hint) {
    return <NullableDateField value={value} onChange={onChange} disabled={disabled} />
  }
  if (field.type === 'number' && field.checkUnique) {
    return (
      <UniqueCodeField
        value={value}
        onChange={onChange}
        disabled={disabled}
        checkUnique={field.checkUnique}
        excludeId={recordId}
      />
    )
  }
  return (
    <Input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
      step={field.type === 'number' ? 'any' : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  )
}

export default function MasterCrudPage() {
  const { slug } = useParams()
  const schema = mastersSchemas[slug]
  const { user } = useAuth()
  const canAdd = can(user, schema?.menuKey, 'add')
  const canEdit = can(user, schema?.menuKey, 'edit')
  const canDelete = can(user, schema?.menuKey, 'delete')

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(() => emptyForm(schema))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteInfo, setDeleteInfo] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  // Lists are server-paginated (50/page) and server-searched — large
  // masters (imported legacy data already puts some in the hundreds) never
  // ship the whole table to the browser up front.
  function loadPage(pageNum, searchQuery, { append } = {}) {
    const thisRequest = ++requestIdRef.current
    const params = new URLSearchParams({ page: String(pageNum) })
    if (searchQuery) params.set('search', searchQuery)
    if (append) setLoadingMore(true)
    else setLoading(true)
    return apiFetch(`${schema.apiBase}?${params}`)
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

  useEffect(() => {
    // A pending debounced search from the master we're leaving can otherwise
    // fire after navigation and — since it still closes over that master's
    // schema/apiBase, and the requestIdRef guard only rejects responses
    // older than the latest *started* request — win the race and load the
    // wrong master's rows into the new page.
    clearTimeout(searchTimerRef.current)
    setSelectedId(null)
    setCreating(false)
    setQuery('')
    if (listRef.current) listRef.current.scrollTop = 0
    loadPage(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Debounced server-side search — resets to page 1 on every new query.
  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0
      loadPage(1, query)
    }, 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handleListScroll(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMore()
  }

  const selected = rows.find((r) => r[schema.idField] === selectedId)
  const canWrite = creating ? canAdd : canEdit

  useEffect(() => {
    if (!selected) return
    const loaded = {}
    for (const f of schema.fields) {
      loaded[f.name] = selected[f.name]
      // Shadow fields (a resolved display label / media URL alongside an id
      // or path) aren't part of the schema's own field list but ride along
      // in the API response — carry them into form state too so a
      // search-remote combobox or file preview doesn't need a refetch.
      if (f.labelField) loaded[f.labelField] = selected[f.labelField]
      if (f.urlField) loaded[f.urlField] = selected[f.urlField]
    }
    setForm(loaded)
    setSnapshot(JSON.stringify(loaded))
    setError('')
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = creating
    ? schema.fields.filter((f) => f.required).every((f) => String(form[f.name] ?? '').trim())
    : snapshot !== null && JSON.stringify(form) !== snapshot

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setForm(emptyForm(schema))
    setSnapshot(null)
    setError('')
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const isEdit = Boolean(selected)
      const url = isEdit ? `${schema.apiBase}${selected[schema.idField]}/` : schema.apiBase
      // An untouched optional date/number field starts out as '' (see
      // emptyForm) — DRF rejects an empty string for those types, so it has
      // to go over the wire as null instead.
      const payload = { ...form }
      for (const f of schema.fields) {
        if ((f.type === 'date' || f.type === 'number') && payload[f.name] === '') {
          payload[f.name] = null
        }
      }
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data))
      // Merge into the already-loaded rows rather than refetching the list —
      // a full reload would drop back to page 1 and could leave a
      // just-created row invisible if it doesn't happen to sort onto it.
      if (!isEdit) {
        setRows((prev) => [data, ...prev])
        setTotalCount((c) => c + 1)
        setCreating(false)
        setSelectedId(data[schema.idField])
      } else {
        setRows((prev) => prev.map((r) => (r[schema.idField] === data[schema.idField] ? data : r)))
        setSnapshot(JSON.stringify(form))
      }
      toast.success(isEdit ? 'Changes saved' : `${data[schema.nameField]} created`)
    } catch (e) {
      setError(e.message)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteClick() {
    if (!selected) return
    const res = await apiFetch(`${schema.apiBase}${selected[schema.idField]}/check-delete/`)
    const data = await res.json()
    setDeleteInfo(data)
  }

  async function confirmDelete() {
    const res = await apiFetch(`${schema.apiBase}${selected[schema.idField]}/`, { method: 'DELETE' })
    setDeleteInfo(null)
    if (res.status === 204) {
      toast.success('Deleted')
      setRows((prev) => prev.filter((r) => r[schema.idField] !== selectedId))
      setTotalCount((c) => Math.max(0, c - 1))
      setSelectedId(null)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete')
    }
  }

  if (!schema) {
    return <p className="text-sm text-muted-foreground">Unknown master.</p>
  }

  if (!can(user, schema.menuKey, 'view')) {
    return <AccessDenied />
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {schema.hubPath !== null && (
        <Link
          to={schema.hubPath ?? '/masters'}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconChevronLeft className="h-4 w-4" />
          {schema.hubLabel ?? 'All Masters'}
        </Link>
      )}
      <div className="flex flex-1 gap-5 overflow-hidden">
      <div className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between p-3 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {schema.title}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
              {totalCount}
            </span>
            {canAdd && (
              <Button size="sm" onClick={startCreate}>
                + New
              </Button>
            )}
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="flex-1 overflow-y-auto border-t border-border"
        >
          {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No records found.</p>
          )}
          {rows.map((r) => (
            <button
              key={r[schema.idField]}
              type="button"
              onClick={() => {
                setCreating(false)
                setSelectedId(r[schema.idField])
              }}
              className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                selectedId === r[schema.idField] ? 'bg-accent' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {r[schema.nameField]}
                </p>
                {schema.listSecondary && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {schema.listSecondary(r)}
                  </p>
                )}
              </div>
              {schema.activeField && (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    r[schema.activeField] === 'Y' ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
              )}
              {schema.dateActiveField && (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isDateActive(r[schema.dateActiveField]) ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </button>
          ))}
          {loadingMore && (
            <p className="p-3 text-center text-xs text-muted-foreground">Loading more…</p>
          )}
        </div>
      </div>

      <div className="flex-1 rounded-2xl border border-border bg-card">
        {!creating && !selected && (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            Select a record, or create a new one.
          </div>
        )}

        {(creating || selected) && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-base font-semibold text-foreground">
                {creating ? `New ${schema.title.replace(/s$/, '')}` : selected[schema.nameField]}
              </h2>
              {selected && canDelete && (
                <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                  <IconTrash className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {!canWrite && (
                <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  You have view-only access to this master.
                </p>
              )}
              <div className="grid max-w-2xl grid-cols-2 gap-4">
                {schema.fields.map((f) => (
                  <div
                    key={f.name}
                    className={`flex flex-col gap-1.5 ${f.type === 'textarea' || f.wide ? 'col-span-2' : ''}`}
                  >
                    <Label>{f.label}</Label>
                    <FormField
                      field={f}
                      value={form[f.name]}
                      onChange={(v, raw) => {
                        const next = { ...form, [f.name]: v }
                        // Changing a field that other select-remote fields
                        // filter on (e.g. Category) invalidates whatever
                        // they'd already picked from the old option set.
                        for (const other of schema.fields) {
                          if (
                            other.filterField === f.name ||
                            other.filterFields?.some((ff) => ff.field === f.name)
                          )
                            next[other.name] = null
                        }
                        // Some fields (e.g. Rig Type from a picked Rig
                        // Subtype) are derived from the selected option
                        // itself rather than chosen independently.
                        if (f.derives && raw) {
                          for (const [targetField, sourceKey] of Object.entries(f.derives)) {
                            next[targetField] = raw[sourceKey]
                          }
                        }
                        setForm(next)
                      }}
                      disabled={!canWrite || f.readOnly}
                      filterValue={f.filterField ? form[f.filterField] : undefined}
                      form={form}
                      recordId={selected ? selected[schema.idField] : null}
                    />
                    {/* NullableDateField already says "No end date" / "Set a
                        date" itself, so the hint would just repeat that. */}
                    {f.hint && f.type !== 'date' && (
                      <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                    )}
                  </div>
                ))}
              </div>

              {schema.formNote && (
                <div className="mt-4 flex max-w-2xl items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{schema.formNote}</span>
                </div>
              )}

              {canWrite && (
                <Button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  variant={isDirty ? 'default' : 'secondary'}
                  className="mt-5"
                >
                  {saving
                    ? 'Saving…'
                    : creating
                      ? 'Create'
                      : isDirty
                        ? 'Save changes'
                        : 'Saved'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      <Dialog open={Boolean(deleteInfo)} onOpenChange={(open) => !open && setDeleteInfo(null)}>
        <DialogContent>
          {deleteInfo?.can_delete ? (
            <DialogHeader>
              <DialogTitle>Delete this record?</DialogTitle>
              <DialogDescription>This can't be undone.</DialogDescription>
            </DialogHeader>
          ) : (
            <DialogHeader>
              <DialogTitle>Can't delete this</DialogTitle>
              <DialogDescription render={<ul className="space-y-1" />}>
                {deleteInfo?.references.map((r) => (
                  <li key={r.label}>
                    Referenced by {r.count} {r.label}
                  </li>
                ))}
              </DialogDescription>
            </DialogHeader>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteInfo(null)}>
              {deleteInfo?.can_delete ? 'Cancel' : 'Close'}
            </Button>
            {deleteInfo?.can_delete && (
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
