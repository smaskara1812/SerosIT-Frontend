import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { IconSearch, IconChevronDown, IconDeviceLaptop, IconPencil, IconTrash } from '@/components/icons'

const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' },
]

const HOLDER_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'C', label: 'Common' },
  { value: 'I', label: 'Individual' },
  { value: 'V', label: 'Vessel' },
  { value: 'L', label: 'Location' },
]

const HOLDER_TYPE_LABEL = { C: 'Common', I: 'Individual', V: 'Vessel', L: 'Location' }

const SORT_COLUMNS = [
  { key: 'sr_no', label: 'Sr. No.' },
  { key: 'model', label: 'Model' },
  { key: 'asset_tag', label: 'Asset Tag' },
  { key: 'mfg', label: 'Manufacturer' },
]

function SelectField({ label, value, onChange, options, width = 'w-[120px]' }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
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

function DetailField({ label, value, wide }) {
  return (
    <div className={wide ? 'col-span-full' : ''}>
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {value && String(value).trim() ? value : '—'}
      </div>
    </div>
  )
}

function SortHeader({ col, ordering, onClick }) {
  const active = ordering === col.key || ordering === `-${col.key}`
  const desc = ordering === `-${col.key}`
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer px-3 py-2.5 text-left text-[11px] font-bold tracking-wide uppercase select-none ${active ? 'text-[#1a3f7a]' : 'text-muted-foreground'}`}
    >
      <span className="inline-flex items-center gap-1">
        {col.label}
        <IconChevronDown
          className={`h-3 w-3 transition-transform ${active ? 'opacity-100' : 'opacity-30'} ${active && !desc ? 'rotate-180' : ''}`}
        />
      </span>
    </th>
  )
}

export default function ItAssetsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, 'it_asset.it_assets', 'add')
  const canEdit = can(user, 'it_asset.it_assets', 'edit')
  const canDelete = can(user, 'it_asset.it_assets', 'delete')

  const [filters, setFilters] = useState({
    active: '',
    holder_type: '',
    it_asset_type: '',
    it_asset_subtype: '',
    it_asset_mfg: '',
    own_company: '',
  })
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('-pur_dt')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openRow, setOpenRow] = useState(null)
  const [deleteInfo, setDeleteInfo] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [meta, setMeta] = useState({ types: [], subtypes: [], mfgs: [], companies: [] })

  useEffect(() => {
    Promise.all([
      apiFetch('/api/masters/it-asset-types/?page_size=100').then((r) => r.json()),
      apiFetch('/api/masters/it-asset-subtypes/?page_size=100').then((r) => r.json()),
      apiFetch('/api/masters/it-asset-mfgs/?page_size=100').then((r) => r.json()),
      apiFetch('/api/masters/companies/?page_size=1000').then((r) => r.json()),
    ]).then(([types, subtypes, mfgs, companies]) => {
      setMeta({
        types: types.results || types,
        subtypes: subtypes.results || subtypes,
        mfgs: mfgs.results || mfgs,
        companies: companies.results || companies,
      })
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      if (search) params.set('search', search)
      params.set('ordering', ordering)
      params.set('page', page)
      params.set('page_size', pageSize)
      apiFetch(`/api/it-asset/it-assets/?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          setRows(data.results || [])
          setCount(data.count || 0)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [filters, search, ordering, page, pageSize])

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const typeOptions = [
    { value: '', label: 'All' },
    ...meta.types.map((t) => ({ value: String(t.it_asset_type_id), label: t.it_asset_type_name })),
  ]
  const subtypeOptions = [
    { value: '', label: 'All' },
    ...meta.subtypes.map((t) => ({ value: String(t.it_asset_subtype_id), label: t.it_asset_subtype_name })),
  ]
  const mfgOptions = [
    { value: '', label: 'All' },
    ...meta.mfgs.map((t) => ({ value: String(t.it_asset_mfg_id), label: t.it_asset_mfg_name })),
  ]
  const companyOptions = [
    { value: '', label: 'All' },
    ...meta.companies.map((c) => ({ value: String(c.company_id), label: c.company_name })),
  ]

  function toggleSort(key) {
    setOrdering((prev) => (prev === `-${key}` ? key : `-${key}`))
    setPage(1)
  }

  async function handleDeleteClick(row) {
    setDeleteTarget(row)
    const res = await apiFetch(`/api/it-asset/it-assets/${row.it_asset_id}/check-delete/`)
    setDeleteInfo(await res.json())
  }

  async function confirmDelete() {
    const res = await apiFetch(`/api/it-asset/it-assets/${deleteTarget.it_asset_id}/`, { method: 'DELETE' })
    setDeleteInfo(null)
    if (res.status === 204) {
      toast.success('Deleted')
      setRows((prev) => prev.filter((r) => r.it_asset_id !== deleteTarget.it_asset_id))
      setCount((c) => Math.max(0, c - 1))
      setOpenRow(null)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete')
    }
    setDeleteTarget(null)
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: '#eef3fb', color: '#1a3f7a' }}
          >
            <IconDeviceLaptop className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">IT Assets</h1>
            <p className="text-xs text-muted-foreground">{count.toLocaleString()} assets</p>
          </div>
        </div>
        {canAdd && (
          <Button size="sm" onClick={() => navigate('/it-asset/it-assets/new')}>
            + New IT Asset
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Sr. No., asset tag, SAP code…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-9 pl-8"
            />
          </div>
        </label>
        <SelectField
          label="Active"
          value={filters.active}
          onChange={(v) => setFilter('active', v)}
          options={ACTIVE_OPTIONS}
          width="w-[100px]"
        />
        <SelectField
          label="Holder Type"
          value={filters.holder_type}
          onChange={(v) => setFilter('holder_type', v)}
          options={HOLDER_TYPE_OPTIONS}
          width="w-[130px]"
        />
        <SelectField
          label="Type"
          value={filters.it_asset_type}
          onChange={(v) => setFilter('it_asset_type', v)}
          options={typeOptions}
          width="w-[130px]"
        />
        <SelectField
          label="Subtype"
          value={filters.it_asset_subtype}
          onChange={(v) => setFilter('it_asset_subtype', v)}
          options={subtypeOptions}
          width="w-[140px]"
        />
        <SelectField
          label="Manufacturer"
          value={filters.it_asset_mfg}
          onChange={(v) => setFilter('it_asset_mfg', v)}
          options={mfgOptions}
          width="w-[140px]"
        />
        <SelectField
          label="Own Company"
          value={filters.own_company}
          onChange={(v) => setFilter('own_company', v)}
          options={companyOptions}
          width="w-[170px]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-[150px]" />
              <col className="w-[180px]" />
              <col />
              <col />
              <col className="w-[100px]" />
              <col className="w-[92px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  #
                </th>
                <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('sr_no')} />
                <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('model')} />
                <SortHeader col={SORT_COLUMNS[2]} ordering={ordering} onClick={() => toggleSort('asset_tag')} />
                <SortHeader col={SORT_COLUMNS[3]} ordering={ordering} onClick={() => toggleSort('mfg')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Active
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const open = openRow === r.it_asset_id
                const srNo = (page - 1) * pageSize + idx + 1
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                return (
                  <Fragment key={r.it_asset_id}>
                    <tr
                      className={`${zebra} cursor-pointer border-b border-border/60 hover:bg-accent`}
                      onClick={() => setOpenRow(open ? null : r.it_asset_id)}
                    >
                      <td className="truncate px-3 py-2.5 text-xs text-muted-foreground">{srNo}</td>
                      <td className="truncate px-3 py-2.5 font-medium">{r.it_asset_sr_no}</td>
                      <td className="truncate px-3 py-2.5" title={r.it_asset_model_name}>
                        {r.it_asset_model_name || '—'}
                      </td>
                      <td className="truncate px-3 py-2.5" title={r.it_asset_tag}>
                        {r.it_asset_tag || '—'}
                      </td>
                      <td className="truncate px-3 py-2.5" title={r.it_asset_mfg_name}>
                        {r.it_asset_mfg_name || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            r.it_asset_active === 'N'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          {r.it_asset_active === 'N' ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/it-asset/it-assets/${r.it_asset_id}/edit`)
                              }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <IconPencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(r)
                              }}
                              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <IconChevronDown
                            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className={`${zebra} border-b border-border/60`}>
                        <td colSpan={7} className="px-5 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/it-asset/it-assets/${r.it_asset_id}/edit`)}
                              >
                                <IconPencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(r)}>
                                <IconTrash className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <DetailField label="Type" value={r.it_asset_type_name} />
                            <DetailField label="Subtype" value={r.it_asset_subtype_name} />
                            <DetailField label="Own Company" value={r.own_company_name} />
                            <DetailField label="Current Company" value={r.cur_company_name} />
                            <DetailField label="SAP Code" value={r.it_asset_sap_code} />
                            <DetailField label="RAM (GB)" value={r.it_asset_ram} />
                            <DetailField label="HDD/SSD (GB)" value={r.it_asset_hdd} />
                            <DetailField label="MAC Address" value={r.it_asset_mac_addr} />
                            <DetailField label="Product No" value={r.it_asset_product_no} />
                            <DetailField label="PO No." value={r.po_no} />
                            <DetailField label="PO Date" value={r.po_dt} />
                            <DetailField label="Invoice No." value={r.invoice_no} />
                            <DetailField label="Vendor" value={r.vendor_name} />
                            <DetailField label="Purchase Date" value={r.it_asset_pur_dt} />
                            <DetailField label="Warranty Date" value={r.it_asset_warranty_upto} />
                            <DetailField label="AMC Date" value={r.it_asset_amc_dt} />
                            <DetailField label="Holder Type" value={HOLDER_TYPE_LABEL[r.it_asset_holder_type]} />
                            <DetailField label="Allocated" value={r.it_asset_allocated === 'Y' ? 'Yes' : 'No'} />
                            <DetailField label="Specifications" value={r.it_asset_particulars} wide />
                            <DetailField label="Remarks" value={r.remarks} wide />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No IT assets match the current filters.
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
