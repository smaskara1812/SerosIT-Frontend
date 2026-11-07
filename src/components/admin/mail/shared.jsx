import { useState } from 'react'
import { Mail, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EMAIL, split } from '@/lib/mailControls'

// Small pieces shared by the three cards of Admin > Mail Controls (the mail redirect, the daily summary, and who hears about failures).

const TONES = {
  navy: { chip: 'bg-[var(--seros-navy-600)] text-white', head: 'from-[var(--seros-navy-50)]' },
  teal: { chip: 'bg-[var(--seros-teal-500)] text-white', head: 'from-[var(--seros-teal-50)]' },
  ocean: { chip: 'bg-[var(--seros-ocean-500)] text-white', head: 'from-[var(--seros-ocean-100)]/60' },
  amber: { chip: 'bg-amber-500 text-white', head: 'from-amber-50' },
}

// A white panel with a tinted header (icon chip, title, one line of what it is for) and an optional footer for the save bar.
export function Card({ id, icon: Icon, title, subtitle, tone = 'navy', badge, footer, children, className = '' }) {
  const t = TONES[tone]
  return (
    <section id={id} className={`scroll-mt-4 overflow-hidden rounded-xl border border-[var(--edge)] bg-card shadow-[var(--elev-1)] ${className}`}>
      <header className={`flex items-center gap-3 border-b border-[var(--edge)]/70 bg-gradient-to-r ${t.head} to-card px-4 py-3`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ${t.chip}`}><Icon className="h-[18px] w-[18px]" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge}
      </header>
      <div className="p-4">{children}</div>
      {footer}
    </section>
  )
}

// The bar at the foot of a card that has unsaved changes.
export function SaveBar({ onDiscard, onSave, saveLabel = 'Save changes', disabled, busy, note = 'You have unsaved changes' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--edge)]/70 bg-[var(--seros-navy-50)] px-4 py-2">
      <p className="text-sm font-medium text-[var(--seros-navy-700)]">{note}</p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard}><RotateCcw /> Discard</Button>
        <Button type="button" size="sm" disabled={disabled || busy} onClick={onSave}>{busy ? 'Saving…' : saveLabel}</Button>
      </div>
    </div>
  )
}

// The on/off switch. `tone` is the colour it takes when on: brand (teal) or amber (a safety net is in force).
export function BigSwitch({ on, onChange, label, tone = 'brand' }) {
  const onClass = tone === 'amber' ? 'border-amber-500 bg-amber-500' : 'border-[var(--seros-teal-500)] bg-[var(--seros-teal-500)]'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${on ? onClass : 'border-border bg-muted'}`}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 text-[9px] font-bold tracking-wider ${on ? 'left-2 text-white' : 'right-2 text-muted-foreground'}`}>{on ? 'ON' : 'OFF'}</span>
      <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all ${on ? 'left-[calc(100%-1.5rem)]' : 'left-0.5'}`} />
    </button>
  )
}

// A list of e-mail addresses: the chips, and a box to add more (Enter, comma or paste). `onChange` gets the new list.
export function Addresses({ list, onChange, label, empty }) {
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState('')

  function add(text = draft) {
    const parts = split(text)
    if (!parts.length) return
    const wrong = parts.find((p) => !EMAIL.test(p))
    if (wrong) { setBad(`'${wrong}' is not a valid e-mail address.`); return }
    onChange([...new Set([...list, ...parts])])
    setDraft('')
    setBad('')
  }

  return (
    <div>
      {list.length === 0 ? (
        <p className="mb-3 rounded-lg border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-2">
          {list.map((a) => (
            <li key={a} className="flex items-center gap-1.5 rounded-full border border-[var(--seros-navy-200)] bg-[var(--seros-navy-50)] py-1 pl-3 pr-1.5 text-sm">
              <Mail className="h-3.5 w-3.5 text-[var(--seros-navy-500)]" />
              <span className="font-mono text-[13px]">{a}</span>
              <button type="button" aria-label={`Remove ${a}`} onClick={() => onChange(list.filter((x) => x !== a))} className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-red-100 hover:text-red-700"><X className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setBad('') }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          onPaste={(e) => { const t = e.clipboardData.getData('text'); if (split(t).length > 1) { e.preventDefault(); add(t) } }}
          placeholder="name@company.com, then press Enter"
          aria-label={label}
          className="h-9"
        />
        <Button type="button" variant="outline" className="h-9" disabled={!draft.trim()} onClick={() => add()}><Plus /> Add</Button>
      </div>
      {bad && <p className="mt-2 text-sm text-destructive">{bad}</p>}
      {!bad && draft.trim() && <p className="mt-2 text-xs text-amber-700">Press Add (or Enter) to include it in the list.</p>}
    </div>
  )
}

export function Choice({ checked, onChange, children, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors has-[:checked]:border-[var(--seros-navy-500)] has-[:checked]:bg-[var(--seros-navy-50)]">
      <input type="radio" checked={checked} onChange={onChange} className="mt-1 accent-[var(--seros-navy-600)]" />
      <span>
        <span className="font-medium">{children}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

export function SectionLabel({ children }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--seros-navy-500)]">{children}</h3>
}
