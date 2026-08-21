import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'

export default function MastersHub() {
  const { user } = useAuth()
  const masters = navTree.find((item) => item.key === 'masters')

  const sections = masters.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((i) => can(user, i.menuKey)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col gap-8">
      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You don't have access to any masters yet.
        </p>
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
