import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconSearch } from '@/components/icons'
import { Pencil } from 'lucide-react'

const MENU_KEY = 'qhse.cert_to_rank_mapping'
const API = '/api/qhse/cert-to-rank-mapping/'
const TITLE = 'Training Certificate to Rank Mapping'

export default function CertToRankMappingListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canExport = can(user, MENU_KEY, 'export')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [exporting, setExporting] = useState(false)

  usePageSubtitle(rows.length ? `${rows.length} certificates mapped` : null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      apiFetch(`${API}?${new URLSearchParams(query ? { search: query } : {})}`)
        .then((r) => r.json())
        .then((data) => !cancelled && setRows(Array.isArray(data) ? data : []))
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await apiFetch(`${API}export/?${new URLSearchParams(query ? { search: query } : {})}`)
      if (!res.ok) return toast.error("Couldn't export the list. Please try again.")
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `${TITLE}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Certificate name…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
          </div>
        </label>
        {canExport && (
          <Button size="lg" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        )}
        {canAdd && (
          <Button size="lg" onClick={() => navigate('/qhse/cert-to-rank-mapping/new')}>
            + Map a Certificate
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {['Certificate', 'Ranks', 'Active Ranks'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">No certificates have ranks mapped yet.</td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={r.cert_id} className={`border-b border-border/60 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                <td className="px-3 py-2.5 font-medium">{r.cert_name}</td>
                <td className="px-3 py-2.5">{r.rank_count}</td>
                <td className="px-3 py-2.5">{r.active_count}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center justify-end">
                    {(canEdit || canAdd) && (
                      <button
                        type="button"
                        title="Open"
                        onClick={() => navigate(`/qhse/cert-to-rank-mapping/${r.cert_id}/edit`)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
