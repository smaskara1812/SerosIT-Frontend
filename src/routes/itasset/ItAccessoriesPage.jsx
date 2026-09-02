import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { usePageSubtitle } from '@/context/TopbarContext'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
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
import { IconSearch, IconChevronDown, IconTrash } from '@/components/icons'
import { Pencil } from 'lucide-react'

const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' },
]

export default function ItAccessoriesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, 'masters.it_accessories', 'add')
  const canEdit = can(user, 'masters.it_accessories', 'edit')
  const canDelete = can(user, 'masters.it_accessories', 'delete')

  const [active, setActive] = useState('')
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleteInfo, setDeleteInfo] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams()
      if (active) params.set('active', active)
      if (search) params.set('search', search)
      if (ordering) params.set('ordering', ordering)
      params.set('page', page)
      params.set('page_size', pageSize)
      apiFetch(`/api/masters/it-accessories/?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          setRows(data.results || [])
          setCount(data.count || 0)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [active, search, ordering, page, pageSize])

  function resetPageAnd(setter) {
    return (v) => {
      setter(v)
      setPage(1)
    }
  }

  function toggleSort() {
    setOrdering((prev) => (prev === '-name' ? 'name' : '-name'))
    setPage(1)
  }

  async function handleDeleteClick(row) {
    setDeleteTarget(row)
    const res = await apiFetch(`/api/masters/it-accessories/${row.it_accessory_id}/check-delete/`)
    setDeleteInfo(await res.json())
  }

  async function confirmDelete() {
    const res = await apiFetch(`/api/masters/it-accessories/${deleteTarget.it_accessory_id}/`, {
      method: 'DELETE',
    })
    setDeleteInfo(null)
    if (res.status === 204) {
      toast.success('Deleted')
      setRows((prev) => prev.filter((r) => r.it_accessory_id !== deleteTarget.it_accessory_id))
      setCount((c) => Math.max(0, c - 1))
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete')
    }
    setDeleteTarget(null)
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)
  const sortDesc = ordering === '-name'
  const sortActive = ordering === 'name' || sortDesc

  usePageSubtitle(`${count.toLocaleString()} accessories`)

  if (!can(user, 'masters.it_accessories', 'view')) return <AccessDenied />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Accessory name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-9 pl-8"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Active</span>
            <select
              value={active}
              onChange={(e) => resetPageAnd(setActive)(e.target.value)}
              className="h-9 w-[120px] truncate rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
            >
              {ACTIVE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {canAdd && (
            <Button size="lg" className="ml-auto" onClick={() => navigate('/it-asset/it-accessories/new')}>
              + New Accessory
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-[110px]" />
              <col className="w-[92px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  #
                </th>
                <th
                  onClick={toggleSort}
                  className={`cursor-pointer px-3 py-2.5 text-left text-[11px] font-bold tracking-wide uppercase select-none ${sortActive ? 'text-[#1a3f7a]' : 'text-muted-foreground'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    Name
                    <IconChevronDown
                      className={`h-3 w-3 transition-transform ${sortActive ? 'opacity-100' : 'opacity-30'} ${sortActive && !sortDesc ? 'rotate-180' : ''}`}
                    />
                  </span>
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Active
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const srNo = (page - 1) * pageSize + idx + 1
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                return (
                  <tr key={r.it_accessory_id} className={`${zebra} border-b border-border/60 hover:bg-accent`}>
                    <td className="truncate px-3 py-2.5 text-xs text-muted-foreground">{srNo}</td>
                    <td className="truncate px-3 py-2.5 font-medium">{r.it_accessory_name}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          r.it_accessory_active === 'N'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        {r.it_accessory_active === 'N' ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => navigate(`/it-asset/it-accessories/${r.it_accessory_id}/edit`)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleDeleteClick(r)}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No accessories match the current filters.
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
