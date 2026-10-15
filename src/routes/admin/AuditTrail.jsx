import { Fragment, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconSearch, IconChevronDown, IconHistory } from '@/components/icons'
import { ACTION_COLORS, ACTION_LABELS, formatDiffValue } from '@/lib/auditFormat'
import RecordHistory from '@/components/audit/RecordHistory'

// Entities whose "record" IS a user account — for these, the generic
// Record column already holds the affected user's login/name, so surface
// it again under its own "User" column instead of leaving the reader to
// infer that "Modified By" and "the user this changed" are different people.
const USER_ENTITIES = new Set(['admin.user_rights', 'admin.user_management'])

export default function AuditTrail() {
  const [facets, setFacets] = useState({ actions: [], users: [], entities: [] })
  const [filters, setFilters] = useState({ action: '', entity: '', user: '', q: '', kind: '' })
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    apiFetch('/api/admin/audit/facets/')
      .then((r) => r.json())
      .then(setFacets)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v)
    apiFetch(`/api/admin/audit/?${params}`)
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
  }, [filters, page, refresh])

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
          value={filters.action}
          onChange={(e) => updateFilter('action', e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">All actions</option>
          {facets.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filters.entity}
          onChange={(e) => updateFilter('entity', e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">All entities</option>
          {facets.entities.map((e) => (
            <option key={e.key} value={e.key}>
              {e.label}
            </option>
          ))}
        </select>
        <select
          value={filters.kind}
          onChange={(e) => updateFilter('kind', e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Changes and events</option>
          <option value="change">Data changes only</option>
          <option value="event">Exports and sign-ins only</option>
        </select>
        <select
          value={filters.user}
          onChange={(e) => updateFilter('user', e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">All users</option>
          {facets.users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{total} events</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-8"></th>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Modified By</th>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Entity</th>
              <th className="px-4 py-2.5 font-medium">Record</th>
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
                  No events found.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const hasChanges = r.changes && Object.keys(r.changes).length > 0
              const expanded = expandedId === r.id
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => hasChanges && setExpandedId(expanded ? null : r.id)}
                    className={`border-b border-border/60 last:border-b-0 ${hasChanges ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                  >
                    <td className="px-2 text-center">
                      {hasChanges && (
                        <IconChevronDown
                          className={`mx-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.ts}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.username}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {USER_ENTITIES.has(r.entity) ? r.record_label || '—' : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          ACTION_COLORS[r.action] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ACTION_LABELS[r.action] || r.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{r.entity_label || r.entity}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{r.record_label || '—'}</span>
                        {r.has_history && (
                          <button
                            type="button"
                            title="Show this record's history"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              setHistoryFor({ entity: r.entity, table: r.target_table, recordId: r.target_pk || r.record_id, title: r.record_label })
                            }}
                            className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-foreground hover:bg-accent"
                          >
                            <IconHistory className="h-3 w-3" /> History
                          </button>
                        )}
                        {r.note && <span className="text-[11px] italic">“{r.note}”</span>}
                      </div>
                    </td>
                  </tr>
                  {expanded && hasChanges && (
                    <tr className="border-b border-border/60 bg-muted/30">
                      <td></td>
                      <td colSpan={6} className="px-4 py-3">
                        <table className="w-full max-w-lg text-xs">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="pb-1 pr-4 font-medium">Field</th>
                              <th className="pb-1 pr-4 font-medium">Before</th>
                              <th className="pb-1 font-medium">After</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(r.changes).map(([field, diff]) => (
                              <tr key={field}>
                                <td className="pr-4 py-0.5 font-medium text-foreground">
                                  {field}
                                </td>
                                <td className="pr-4 py-0.5 text-muted-foreground">
                                  {formatDiffValue(diff.old)}
                                </td>
                                <td className="py-0.5 text-foreground">{formatDiffValue(diff.new)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {historyFor && (
        <RecordHistory
          open
          entity={historyFor.entity}
          table={historyFor.table}
          recordId={historyFor.recordId}
          title={historyFor.title}
          onClose={() => setHistoryFor(null)}
          onChanged={() => setRefresh((n) => n + 1)}
        />
      )}
    </div>
  )
}
