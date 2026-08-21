import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'
import { IconChevronLeft, IconChevronRight, IconChevronDown } from '@/components/icons'

const COLLAPSE_KEY = 'serosit.secondary_sidebar_collapsed'
const SECTIONS_KEY = 'serosit.secondary_sidebar_sections'

function readCollapsedSections() {
  try {
    return JSON.parse(localStorage.getItem(SECTIONS_KEY)) || {}
  } catch {
    return {}
  }
}

function SectionGroup({ section, items }) {
  // Keyed by label so each group (HR, QHSE, Mapping, ...) remembers its own
  // expand state independently and survives a reload — previously this was
  // plain component state, reset to expanded every mount.
  const [expanded, setExpanded] = useState(() => !readCollapsedSections()[section.label])
  const hasLabel = Boolean(section.label)

  if (items.length === 0) return null

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev
      const collapsedSections = readCollapsedSections()
      if (next) delete collapsedSections[section.label]
      else collapsedSections[section.label] = true
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(collapsedSections))
      return next
    })
  }

  return (
    <div className="mb-1">
      {hasLabel && (
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-black/[0.03]"
        >
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--ss-text)' }}
          >
            {section.label}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'var(--ss-act-bg)', color: 'var(--ss-text-act)' }}
            >
              {items.length}
            </span>
            <IconChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
              style={{ color: 'var(--ss-text)' }}
            />
          </span>
        </button>
      )}
      {expanded && (
        <nav className="space-y-0.5 px-1">
          {items.map(({ key, label, path, icon: Icon }) => (
            <NavLink
              key={key}
              to={path}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                  hasLabel && 'ml-1',
                  isActive ? 'font-semibold' : 'hover:bg-black/[0.03]',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--ss-act-bg)' : 'transparent',
                color: isActive ? 'var(--ss-text-act)' : 'var(--ss-text)',
              })}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

export default function SecondarySidebar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1'
  )
  const activeItem = navTree.find(
    (item) =>
      item.sections &&
      (pathname === item.path ||
        item.sections.some((s) => s.items.some((i) => pathname.startsWith(i.path))))
  )

  if (!activeItem) return null

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <aside
      className="relative flex h-screen shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out"
      style={{
        width: collapsed ? '28px' : '220px',
        backgroundColor: 'var(--ss-bg)',
        borderColor: 'var(--ss-border)',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand section menu' : 'Collapse section menu'}
        className="absolute -right-3 top-14 flex h-6 w-6 items-center justify-center rounded-full border shadow-md transition-colors"
        style={{
          backgroundColor: 'var(--ss-bg)',
          borderColor: 'var(--ss-border)',
          color: 'var(--ss-text)',
        }}
      >
        {collapsed ? (
          <IconChevronRight className="h-3.5 w-3.5" />
        ) : (
          <IconChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {!collapsed && (
        <>
          <div className="flex h-16 items-center px-4">
            <span
              className="text-[13px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--ss-text)' }}
            >
              {activeItem.label}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {activeItem.sections.map((section, i) => {
              const items = section.items.filter((it) => !it.menuKey || can(user, it.menuKey))
              return <SectionGroup key={section.label || i} section={section} items={items} />
            })}
          </div>
        </>
      )}
    </aside>
  )
}
