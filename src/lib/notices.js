// The four kinds of notice and how each looks on the navy banner. Shared by the banner card and the admin page's preview
// so the two can never drift apart. `loud` kinds (Important, Safety) sit a little stronger.
export const NOTICE_KINDS = {
  I: { label: 'Info', accent: '#7fe3d6', ink: '#0b7a70', loud: false },
  A: { label: 'Important', accent: '#ffc15e', ink: '#9a5b00', loud: true },
  S: { label: 'Safety', accent: '#ff8b7e', ink: '#b42318', loud: true },
  C: { label: 'Celebration', accent: '#ffa8d0', ink: '#b0266b', loud: false },
}

export const kindOf = (code) => NOTICE_KINDS[code] || NOTICE_KINDS.I

// A short fingerprint of what a notice says, used as its key so the card fades when the text changes.
export function noticeFingerprint(n) {
  let h = 5381
  const s = `${n.notice_id}|${n.title}|${n.message}|${n.link_url || ''}`
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${n.notice_id}:${(h >>> 0).toString(36)}`
}

// Naive "2026-10-18T09:30:00" -> "18 Oct, 09:30" by slicing, never through Date (see lib/naiveDateTime.js).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function shortNaive(iso) {
  if (!iso) return ''
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}, ${iso.slice(11, 16)}`
}
