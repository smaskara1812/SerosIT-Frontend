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
          className="mt-2 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors first:mt-0 hover:opacity-80"
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--ss-grp-text)' }}
          >
            {section.label}
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--ss-grp-text)' }}>
            <span className="text-[10px] font-semibold">{items.length}</span>
            <IconChevronDown
              className={`h-3 w-3 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
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
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition-colors',
                  isActive ? 'font-semibold shadow-sm' : 'font-medium hover:bg-[var(--ss-hover-bg)]',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--ss-act-bg)' : 'transparent',
                color: isActive ? 'var(--ss-text-act)' : 'var(--ss-text)',
              })}
            >
              {Icon && <Icon className="h-[13.5px] w-[13.5px] shrink-0" />}
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

  const HeaderIcon = activeItem.icon

  return (
    <aside
      className="relative flex h-screen shrink-0 flex-col shadow-[inset_-1px_0_0_rgba(20,30,60,0.06)] transition-[width] duration-200 ease-in-out"
      style={{
        width: collapsed ? '28px' : '220px',
        backgroundImage: 'linear-gradient(180deg, var(--ss-bg-top) 0%, var(--ss-bg) 45%, var(--ss-bg-bottom) 100%)',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand section menu' : 'Collapse section menu'}
        className="absolute -right-3.5 top-14 flex h-7 w-7 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(23,53,110,0.18)] ring-1 ring-black/[0.04] transition-all duration-150 hover:scale-105 hover:shadow-[0_3px_10px_rgba(23,53,110,0.24)]"
        style={{
          backgroundColor: '#ffffff',
          color: 'var(--ss-text-act)',
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
          <div className="flex h-16 items-center gap-2 px-4">
            {HeaderIcon && (
              <span
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--ss-act-bg)', color: 'var(--ss-text-act)' }}
              >
                <HeaderIcon className="h-3.5 w-3.5" />
              </span>
            )}
            <span
              className="text-[13px] font-extrabold tracking-wide"
              style={{ color: 'var(--ss-text-act)' }}
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
