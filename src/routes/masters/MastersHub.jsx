import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'
import { Input } from '@/components/ui/input'
import { IconSearch } from '@/components/icons'

export default function MastersHub() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const masters = navTree.find((item) => item.key === 'masters')

  const allSections = masters.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((i) => can(user, i.menuKey)),
    }))
    .filter((section) => section.items.length > 0)

  // Search across every group at once rather than one at a time — a
  // section stays visible as long as at least one of its own masters (or,
  // failing that, its own group label) matches, so "rig" surfaces Rigs,
  // Rig Site Mapping, and Rig Crew Exceptions together regardless of which
  // group each lives in.
  const q = query.trim().toLowerCase()
  const sections = q
    ? allSections
        .map((section) => ({
          ...section,
          items: section.label.toLowerCase().includes(q)
            ? section.items
            : section.items.filter((i) => i.label.toLowerCase().includes(q)),
        }))
        .filter((section) => section.items.length > 0)
    : allSections

  return (
    <div className="flex flex-col gap-6">
      <label
        className={`relative block rounded-2xl border bg-card shadow-sm transition-colors ${
          query ? 'border-[#1a3f7a]' : 'border-border'
        }`}
      >
        <IconSearch
          className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
            query ? 'text-[#1a3f7a]' : 'text-muted-foreground'
          }`}
        />
        <Input
          placeholder="Search masters — try “rig”, “vendor”, “mapping”…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 border-0 bg-transparent pl-12 pr-4 text-base shadow-none focus-visible:ring-0"
        />
      </label>
      {allSections.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You don't have access to any masters yet.
        </p>
      )}
      {allSections.length > 0 && sections.length === 0 && (
        <p className="text-sm text-muted-foreground">No masters match "{query}".</p>
      )}
      {sections.map((section) => (
        <div key={section.label}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">{section.label}</h2>
            <span className="text-xs text-muted-foreground">{section.items.length} masters</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.items.map(({ key, label, path, icon: Icon }) => (
              <Link
                key={key}
                to={path}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[#1a3f7a]/40 hover:bg-accent"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: '#eef3fb', color: '#1a3f7a' }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
