// HazardCard's event_dt/close_out_dt were imported from the legacy system
// as raw wall-clock values with no UTC conversion at all — confirmed
// directly against a legacy screenshot (Haz ID Card No. 30193's stored
// value is the literal "2026-01-01 18:30", not a UTC instant). The
// backend's NaiveDateTimeField (hazard_card_serializers.py) reads and
// writes these fields as plain naive strings with no "Z"/offset suffix —
// so these two functions must NOT do any timezone conversion either, or
// the round trip reintroduces exactly the bug this replaced: treating a
// naive string as if it carried a real UTC/IST distinction shifted every
// already-correct time by the IST offset (and rolled some over to the
// next day). Deliberately no `Date` object anywhere here — its parsing
// and getHours()/getMonth() etc. depend on the *browser's own* OS
// timezone, which is exactly the ambiguity naive values must stay clear
// of.

// Naive ISO string from the API ("2026-01-01T18:30:00") -> { date, time }
// for the date/time input pair, by slicing, not parsing.
export function splitNaiveDt(iso) {
  if (!iso) return { date: '', time: '' }
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

// { date, time } from the form -> a naive ISO string, verbatim.
export function joinNaiveDt(date, time) {
  if (!date) return null
  return `${date}T${time || '00:00'}:00`
}

// A Date object -> a local YYYY-MM-DD string ("today", "30 days ago",
// etc). Never `d.toISOString().slice(0, 10)` — that reads the UTC date,
// which is the *previous* day for any local time before 05:30 IST, so
// "today" presets/defaults built that way are wrong for roughly a fifth
// of the day.
export function localDateStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
