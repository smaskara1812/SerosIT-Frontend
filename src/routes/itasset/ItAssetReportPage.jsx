import { useEffect, useRef, useState } from 'react'
import { apiFetch, asList } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { IconSearch, IconClipboard, IconChevronDown, IconX } from '@/components/icons'

const ACTIVE_OPTIONS = [
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' },
]

const REPORT_OPTIONS = [
  { value: 'asset_report', label: 'Asset Report' },
  { value: 'asset_tech_dtls', label: 'Asset Tech Dtls' },
]

const HOLDER_COMPANY_FIELD = {
  type: 'search-remote',
  remote: '/api/masters/companies/',
  optionLabel: 'company_name',
  optionValue: 'company_id',
}
const LOCATION_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/company-locations/',
  optionLabel: 'company_loc_name',
  optionValue: 'company_loc_id',
}

// Both of legacy's "Select report" variants read off the same row shape
// (see ItAssetReportSerializer) — only the visible columns differ.
const REPORT_COLUMNS = {
  asset_report: [
    { key: 'it_asset_type_name', label: 'Asset Type' },
    { key: 'it_asset_sr_no', label: 'Serial No.' },
    { key: 'it_asset_tag', label: 'Asset Tag' },
    { key: 'it_asset_sap_code', label: 'SAP Code' },
    { key: 'it_asset_mfg_name', label: 'Make' },
    { key: 'it_asset_model_name', label: 'Model' },
    { key: 'holder_name', label: 'Employee / Holder' },
    { key: 'location_name', label: 'Location' },
    { key: 'holder_remark', label: 'Holder Remark' },
    { key: 'own_company_abrv', label: 'Owned By' },
    { key: 'holding_company_abrv', label: 'Holding Company' },
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'it_asset_pur_dt', label: 'Purchase Date' },
    { key: 'it_asset_warranty_upto', label: 'Warranty Date' },
  ],
  asset_tech_dtls: [
    { key: 'it_asset_type_name', label: 'Asset Type' },
    { key: 'it_asset_sr_no', label: 'Serial No.' },
    { key: 'it_asset_tag', label: 'Asset Tag' },
    { key: 'it_asset_mfg_name', label: 'Make' },
    { key: 'it_asset_model_name', label: 'Model' },
    { key: 'it_asset_subtype_name', label: 'Subtype' },
    { key: 'it_asset_ram', label: 'RAM (GB)' },
    { key: 'it_asset_hdd', label: 'HDD/SSD (GB)' },
    { key: 'it_asset_particulars', label: 'Specifications' },
    { key: 'it_asset_product_no', label: 'Product No.' },
    { key: 'it_asset_mac_addr', label: 'MAC Address' },
  ],
}

function FilterLabel({ children }) {
  return (
    <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</span>
  )
}

function SelectField({ label, value, onChange, options, width = 'w-full' }) {
  return (
    <label className="flex flex-col gap-1">
      <FilterLabel>{label}</FilterLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 truncate rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 ${width}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function RemoteField({ label, field, value, onChange }) {
  return (
    <label className="flex flex-col gap-1">
      <FilterLabel>{label}</FilterLabel>
      <RemoteCombobox field={field} value={value} onChange={(v) => onChange(v)} />
    </label>
  )
}

// A checkbox-list picker for "give me any of these" filters — either off a
// small preloaded `options` array (Asset Type, Manufacturer) or a `remote`
// endpoint searched as you type (Model, Vendor — too large to preload).
// Selections are tracked as {value,label} pairs rather than bare ids so a
// pick made from one search result page still displays correctly as a chip
// even after the dropdown's results move on to a different page.
function MultiSelectField({ label, options, remote, optionValue, optionLabel, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [remoteOptions, setRemoteOptions] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!remote || !open) return
    const timer = setTimeout(() => {
      const sep = remote.includes('?') ? '&' : '?'
      apiFetch(`${remote}${sep}search=${encodeURIComponent(query)}&page_size=20`)
        .then((r) => r.json())
        .then((data) => setRemoteOptions(asList(data)))
    }, 250)
    return () => clearTimeout(timer)
  }, [remote, query, open])

  const list = remote ? remoteOptions : options

  function toggle(opt) {
    const value = String(opt[optionValue])
    const lbl = opt[optionLabel]
    const exists = selected.some((s) => s.value === value)
    onChange(exists ? selected.filter((s) => s.value !== value) : [...selected, { value, label: lbl }])
  }

  return (
    <div className="relative flex flex-col gap-1" ref={ref}>
      <FilterLabel>{label}</FilterLabel>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-left text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
      >
        <span className={selected.length ? 'truncate text-foreground' : 'text-muted-foreground'}>
          {selected.length === 0 ? 'All' : selected.length === 1 ? selected[0].label : `${selected.length} selected`}
        </span>
        <IconChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-[260px] rounded-lg border border-border bg-popover p-2 shadow-lg">
          {remote && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="mb-2 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
            />
          )}
          <div className="max-h-52 overflow-y-auto">
            {list.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {remote && !query ? 'Type to search…' : 'No results'}
              </div>
            )}
            {list.map((o) => {
              const value = String(o[optionValue])
              const checked = selected.some((s) => s.value === value)
              return (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="truncate">{o[optionLabel]}</span>
                </label>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
              {selected.map((s) => (
                <span
                  key={s.value}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
                >
                  {s.label}
                  <button
                    type="button"
                    onClick={() => onChange(selected.filter((x) => x.value !== s.value))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ItAssetReportPage() {
  const { user } = useAuth()
  const canExport = can(user, 'reports.it_assets', 'export')

  const [report, setReport] = useState('asset_report')
  const [holderCompany, setHolderCompany] = useState(null)
  const [location, setLocation] = useState(null)
  const [itAssetType, setItAssetType] = useState([])
  const [itAssetMfg, setItAssetMfg] = useState([])
  const [model, setModel] = useState([])
  const [vendor, setVendor] = useState([])
  const [purchaseDateFrom, setPurchaseDateFrom] = useState('')
  const [purchaseDateTo, setPurchaseDateTo] = useState('')
  const [active, setActive] = useState('Y')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ types: [], mfgs: [] })

  const advancedActiveCount =
    (holderCompany ? 1 : 0) +
    (location ? 1 : 0) +
    itAssetMfg.length +
    model.length +
    vendor.length +
    (purchaseDateFrom ? 1 : 0) +
    (purchaseDateTo ? 1 : 0)

  function resetFilters() {
    setHolderCompany(null)
    setLocation(null)
    setItAssetType([])
    setItAssetMfg([])
    setModel([])
    setVendor([])
    setPurchaseDateFrom('')
    setPurchaseDateTo('')
    setActive('Y')
    setSearch('')
    setPage(1)
  }

  function applyDatePreset(preset) {
    const today = new Date()
    const to = today.toISOString().slice(0, 10)
    let from
    if (preset === '30d') {
      const d = new Date(today)
      d.setDate(d.getDate() - 30)
      from = d.toISOString().slice(0, 10)
    } else if (preset === 'ytd') {
      from = `${today.getFullYear()}-01-01`
    }
    setPurchaseDateFrom(from)
    setPurchaseDateTo(to)
    setPage(1)
  }

  useEffect(() => {
    Promise.all([
      apiFetch('/api/masters/it-asset-types/?page_size=100').then((r) => r.json()),
      apiFetch('/api/masters/it-asset-mfgs/?page_size=100').then((r) => r.json()),
    ]).then(([types, mfgs]) => {
      setMeta({ types: asList(types), mfgs: asList(mfgs) })
    })
  }, [])

  function buildParams() {
    const params = new URLSearchParams()
    if (holderCompany) params.set('holder_company', holderCompany)
    if (location) params.set('location', location)
    if (itAssetType.length) params.set('it_asset_type', itAssetType.map((s) => s.value).join(','))
    if (itAssetMfg.length) params.set('it_asset_mfg', itAssetMfg.map((s) => s.value).join(','))
    if (model.length) params.set('it_asset_model', model.map((s) => s.value).join(','))
    if (vendor.length) params.set('vendor', vendor.map((s) => s.value).join(','))
    if (purchaseDateFrom) params.set('purchase_date_from', purchaseDateFrom)
    if (purchaseDateTo) params.set('purchase_date_to', purchaseDateTo)
    if (active) params.set('active', active)
    if (search) params.set('search', search)
    return params
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      const params = buildParams()
      params.set('page', page)
      params.set('page_size', pageSize)
      apiFetch(`/api/reports/it-assets/?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          setRows(data.results || [])
          setCount(data.count || 0)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    holderCompany,
    location,
    itAssetType,
    itAssetMfg,
    model,
    vendor,
    purchaseDateFrom,
    purchaseDateTo,
    active,
    search,
    page,
    pageSize,
  ])

  async function exportCsv() {
    const params = buildParams()
    const res = await apiFetch(`/api/reports/it-assets/export/?${params.toString()}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'it_assets_report.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const typeOptionsRaw = meta.types.map((t) => ({ it_asset_type_id: t.it_asset_type_id, it_asset_type_name: t.it_asset_type_name }))
  const mfgOptionsRaw = meta.mfgs.map((t) => ({ it_asset_mfg_id: t.it_asset_mfg_id, it_asset_mfg_name: t.it_asset_mfg_name }))

  const columns = REPORT_COLUMNS[report]
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  function resetPageAnd(setter) {
    return (v) => {
      setter(v)
      setPage(1)
    }
  }

  if (!can(user, 'reports.it_assets', 'view')) return <AccessDenied />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: '#eef3fb', color: '#1a3f7a' }}
          >
            <IconClipboard className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Asset Report</h1>
            <p className="text-xs text-muted-foreground">{count.toLocaleString()} assets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
          {canExport && (
            <Button size="sm" variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <FilterLabel>Search</FilterLabel>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Serial No., tag, SAP code…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-9 pl-8"
              />
            </div>
          </label>
          <MultiSelectField
            label="Asset Type"
            options={typeOptionsRaw}
            optionValue="it_asset_type_id"
            optionLabel="it_asset_type_name"
            selected={itAssetType}
            onChange={resetPageAnd(setItAssetType)}
          />
          <SelectField
            label="Active"
            value={active}
            onChange={resetPageAnd(setActive)}
            options={ACTIVE_OPTIONS}
          />
          <SelectField label="Select Report" value={report} onChange={setReport} options={REPORT_OPTIONS} />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-fit items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced Filters
          {advancedActiveCount > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
              {advancedActiveCount}
            </span>
          )}
        </button>

        {showAdvanced && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <MultiSelectField
                label="Manufacturer"
                options={mfgOptionsRaw}
                optionValue="it_asset_mfg_id"
                optionLabel="it_asset_mfg_name"
                selected={itAssetMfg}
                onChange={resetPageAnd(setItAssetMfg)}
              />
              <MultiSelectField
                label="Model"
                remote="/api/masters/it-asset-models/"
                optionValue="it_asset_model_id"
                optionLabel="it_asset_model_name"
                selected={model}
                onChange={resetPageAnd(setModel)}
              />
              <MultiSelectField
                label="Vendor"
                remote="/api/masters/vendors/"
                optionValue="vendor_id"
                optionLabel="vendor_name"
                selected={vendor}
                onChange={resetPageAnd(setVendor)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RemoteField
                label="Holder Company"
                field={HOLDER_COMPANY_FIELD}
                value={holderCompany}
                onChange={resetPageAnd(setHolderCompany)}
              />
              <RemoteField
                label="Location"
                field={LOCATION_FIELD}
                value={location}
                onChange={resetPageAnd(setLocation)}
              />
              <label className="flex flex-col gap-1">
                <FilterLabel>Purchase Date</FilterLabel>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={purchaseDateFrom}
                    onChange={(e) => {
                      setPurchaseDateFrom(e.target.value)
                      setPage(1)
                    }}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="date"
                    value={purchaseDateTo}
                    onChange={(e) => {
                      setPurchaseDateTo(e.target.value)
                      setPage(1)
                    }}
                    className="h-9"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <FilterLabel>Quick Range</FilterLabel>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-9" onClick={() => applyDatePreset('30d')}>
                    Last 30 days
                  </Button>
                  <Button size="sm" variant="outline" className="h-9" onClick={() => applyDatePreset('ytd')}>
                    YTD
                  </Button>
                </div>
              </label>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Sr.
                </th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const srNo = (page - 1) * pageSize + idx + 1
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                return (
                  <tr key={r.it_asset_id} className={`${zebra} border-b border-border/60`}>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{srNo}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-3 py-2.5">
                        {r[c.key] || r[c.key] === 0 ? r[c.key] : '—'}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No assets match the current filters.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring"
            >
              {[25, 50, 75, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            {count ? `Showing ${start}–${end} of ${count.toLocaleString()}` : ''}
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Prev
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
