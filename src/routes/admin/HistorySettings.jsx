import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { resetRevertible } from '@/lib/revertible'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconSearch } from '@/components/icons'
import RigLoading from '@/components/RigLoading'

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-[#1a3f7a]' : 'bg-muted-foreground/25'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}

const FILTERS = [
  { key: 'all', label: 'All pages' },
  { key: 'on', label: 'Switched on' },
  { key: 'off', label: 'Switched off' },
  { key: 'unsupported', label: 'Not supported yet' },
]

// Admin > History and Revert: which pages show a History button and allow an App Admin to restore an
// earlier version of a record. One setting for the whole system. Every page keeps logging every change
// whether or not it is switched on, so switching a page on later shows all of its past history.
export default function HistorySettings() {
  const [pages, setPages] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    apiFetch('/api/admin/history-settings/')
      .then(async (res) => {
        const body = await res.json()
        if (!live) return
        if (!res.ok) throw new Error(body.error || 'Could not load the settings.')
        setPages(body.pages)
      })
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [])

  async function save(keys, enabled) {
    const before = pages
    // Show the change at once; put it back if the server refuses.
    setPages((prev) => prev.map((p) => (keys.includes(p.menu_key) ? { ...p, enabled } : p)))
    setBusy(true)
    try {
      const res = await apiFetch('/api/admin/history-settings/', {
        method: 'PUT',
        body: JSON.stringify({ menu_keys: keys, enabled }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'The change was refused.')
      setPages(body.pages)
      resetRevertible()
      toast.success(keys.length === 1 ? (enabled ? 'History switched on' : 'History switched off') : `${keys.length} pages updated`)
    } catch (e) {
      setPages(before)
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const supportedPages = (pages || []).filter((p) => p.supported)
  const onCount = supportedPages.filter((p) => p.enabled).length

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = []
    for (const p of pages || []) {
      if (q && !p.label.toLowerCase().includes(q) && !p.menu_key.toLowerCase().includes(q)) continue
      if (filter === 'on' && !(p.supported && p.enabled)) continue
      if (filter === 'off' && !(p.supported && !p.enabled)) continue
      if (filter === 'unsupported' && p.supported) continue
      let g = out.find((x) => x.name === p.group)
      if (!g) {
        g = { name: p.group || 'Other', pages: [] }
        out.push(g)
      }
      g.pages.push(p)
    }
    return out
  }, [pages, query, filter])

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-base font-semibold text-foreground">History and Revert</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Choose the pages where App Admins see a History button and can restore an earlier version of a record. This is one setting for the
          whole system. Every page keeps recording every change either way, so a page you switch on later shows all of its past history.
          A switched-off page shows no History or revert button.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Find a page…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-56 pl-8" />
          </div>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f.key ? 'border-[#1a3f7a] bg-[#1a3f7a] text-white' : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {pages && (
            <span className="ml-auto text-xs text-muted-foreground">
              {onCount} of {supportedPages.length} supported pages switched on
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!pages && !error && <p className="text-sm text-muted-foreground"><RigLoading /></p>}
        {pages && groups.length === 0 && <p className="text-sm text-muted-foreground">No pages match.</p>}

        <div className="space-y-5">
          {groups.map((g) => {
            const switchable = g.pages.filter((p) => p.supported)
            const allOn = switchable.length > 0 && switchable.every((p) => p.enabled)
            return (
              <section key={g.name}>
                <div className="mb-1.5 flex items-center gap-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{g.name}</h2>
                  {switchable.length > 0 && (
                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || allOn}
                        onClick={() => save(switchable.filter((p) => !p.enabled).map((p) => p.menu_key), true)}
                      >
                        Switch all on
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || switchable.every((p) => !p.enabled)}
                        onClick={() => save(switchable.filter((p) => p.enabled).map((p) => p.menu_key), false)}
                      >
                        Switch all off
                      </Button>
                    </div>
                  )}
                </div>
                <div className="divide-y divide-border rounded-xl border border-border">
                  {g.pages.map((p) => (
                    <div key={p.menu_key} className={`flex items-center gap-3 px-4 py-2.5 ${p.supported ? '' : 'bg-muted/30'}`}>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${p.supported ? 'text-foreground' : 'text-muted-foreground'}`}>{p.label}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{p.menu_key}</p>
                      </div>
                      {p.supported ? (
                        <>
                          <span className={`text-xs ${p.enabled ? 'font-semibold text-emerald-700' : 'text-muted-foreground'}`}>
                            {p.enabled ? 'Switched on' : 'Switched off'}
                          </span>
                          <Switch checked={p.enabled} disabled={busy} label={`History and revert for ${p.label}`} onChange={(next) => save([p.menu_key], next)} />
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not supported yet</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
