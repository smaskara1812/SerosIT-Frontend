import { Fragment, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconSearch, IconChevronDown } from '@/components/icons'

export default function EmailLog() {
  const [facets, setFacets] = useState({ users: [], triggers: [] })
  const [filters, setFilters] = useState({ status: '', trigger: '', q: '' })
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/api/admin/email-log/facets/')
      .then((r) => r.json())
      .then(setFacets)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v)
    apiFetch(`/api/admin/email-log/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setRows(data.results || [])
        setPages(data.pages || 1)
        setTotal(data.total || 0)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filters, page])

  function updateFilter(key, value) {
    setPage(1)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="h-9 w-56 pl-8"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="success">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filters.trigger}
          onChange={(e) => updateFilter('trigger', e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">All triggers</option>
          {facets.triggers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{total} emails</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-8"></th>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Sent By</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Trigger</th>
              <th className="px-4 py-2.5 font-medium">Subject</th>
              <th className="px-4 py-2.5 font-medium">Recipients</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No emails found.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const expanded = expandedId === r.email_log_id
              return (
                <Fragment key={r.email_log_id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : r.email_log_id)}
                    className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-accent/50"
                  >
                    <td className="px-2 text-center">
                      <IconChevronDown
                        className={`mx-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.sent_dt}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.sent_by}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          r.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {r.success ? 'Sent' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.trigger || '—'}</td>
                    <td className="px-4 py-2.5 text-foreground">{r.subject}</td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground" title={r.recipients}>
                      {r.recipients}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-border/60 bg-muted/30">
                      <td></td>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex flex-col gap-2 text-xs">
                          <div>
                            <span className="font-medium text-foreground">Recipients: </span>
                            <span className="text-muted-foreground">{r.recipients}</span>
                          </div>
                          {!r.success && r.error && (
                            <div>
                              <span className="font-medium text-foreground">Error: </span>
                              <span className="text-red-600">{r.error}</span>
                            </div>
                          )}
                          <div>
                            <span className="mb-1 block font-medium text-foreground">Body</span>
                            <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-2.5 text-muted-foreground">
                              {r.body}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border p-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
