import { useEffect, useRef, useState } from 'react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const selectClass =
  'h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

// Newest first, so the year people usually want is at the top. A value
// outside the range (old record) is kept in the list rather than vanishing.
function yearOptions(minYear, maxYear, current) {
  const years = []
  for (let y = maxYear; y >= minYear; y--) years.push(y)
  const c = Number(current)
  if (c && !years.includes(c)) years.push(c)
  return years.sort((a, b) => b - a)
}

const DEFAULT_MIN = 1990
const defaultMax = () => new Date().getFullYear() + 1

// Single year dropdown. value/onChange use a plain "YYYY" string ('' = none).
export function YearSelect({ value, onChange, disabled, minYear = DEFAULT_MIN, maxYear = defaultMax(), className = '' }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${selectClass} w-full ${className}`}
    >
      <option value="">Year</option>
      {yearOptions(minYear, maxYear, value).map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}

// Month + Year dropdown pair. value/onChange use "YYYY-MM" — the same
// string a native <input type="month"> produced — and onChange only ever
// fires a complete value, or '' while one half is still unpicked.
export function MonthYearSelect({ value, onChange, disabled, minYear = DEFAULT_MIN, maxYear = defaultMax() }) {
  const [partial, setPartial] = useState({ m: '', y: '' })
  const selfEmittedEmpty = useRef(false)
  const [vy = '', vm = ''] = value ? value.split('-') : []
  const year = vy || partial.y
  const month = vm || partial.m

  // A reset from the parent (value -> '') clears a half-picked selection too.
  useEffect(() => {
    if (value) return
    if (selfEmittedEmpty.current) selfEmittedEmpty.current = false
    else setPartial({ m: '', y: '' })
  }, [value])

  function update(m, y) {
    setPartial({ m, y })
    const next = m && y ? `${y}-${m}` : ''
    if (!next && value) selfEmittedEmpty.current = true
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select value={month} onChange={(e) => update(e.target.value, year)} disabled={disabled} className={`${selectClass} min-w-[7.5rem] flex-1`}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, '0')}>
            {name}
          </option>
        ))}
      </select>
      <select value={year} onChange={(e) => update(month, e.target.value)} disabled={disabled} className={`${selectClass} w-24`}>
        <option value="">Year</option>
        {yearOptions(minYear, maxYear, year).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
