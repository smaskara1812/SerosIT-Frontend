// "Cost Centres" -> "Cost Centre", "FS Categories" -> "FS Category". Leaves a
// title alone when it isn't a plain plural ("Business", "Parts Of Body",
// "Status", "Vendor").
export function singularize(title) {
  if (!title) return title
  if (/ies$/i.test(title)) return title.replace(/ies$/i, 'y')
  if (/(ss|us|is)$/i.test(title)) return title
  if (/s$/i.test(title)) return title.replace(/s$/i, '')
  return title
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-04-25" -> "25 Apr 2026". Parsed by hand rather than through Date so a
// plain calendar day never shifts with the viewer's timezone.
export function formatDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  if (!m) return iso || ''
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}
