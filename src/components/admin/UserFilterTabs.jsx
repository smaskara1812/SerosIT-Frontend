const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'extra', label: null }, // label supplied by caller
]

export default function UserFilterTabs({ filter, onChange, counts, extraLabel }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-3 pt-0">
      {TABS.map((tab) => {
        const label = tab.key === 'extra' ? extraLabel : tab.label
        const count = tab.key === 'extra' ? counts.extra : counts[tab.key]
        const isActive = filter === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
              isActive
                ? 'border-[#1a3f7a] bg-[#1a3f7a] text-white'
                : 'border-border bg-background text-foreground hover:bg-muted'
            }`}
          >
            <span>{label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
