import { pickGreetingQuip } from '@/lib/rigLines'

const DEFAULT_SUB = 'Here is what needs you today, and a quick way to everything else.'

// The home greeting: time of day sets the base; Monday, Friday and the weekend get their own line (crews rotate
// and work through the week, so nothing here treats a day as "the end of the week"); and about one visit in five
// swaps the sub-line for a rig-floor quip. Chosen once per visit so it does not change while the page is open.
export function pickGreeting(firstName, now = new Date(), random = Math.random) {
  const n = firstName ? `, ${firstName}` : ''
  const h = now.getHours()
  const day = now.getDay() // 0 Sunday … 6 Saturday

  if (h < 6) return { title: `Early start${n}`, sub: 'Coffee first, reports second.' }
  if (h >= 22) return { title: `Night shift${n}?`, sub: 'The rigs never sleep. You should, eventually.' }

  if (day === 1) return { title: `New week${n}`, sub: 'Clean page in the log.' }
  if (day === 5) return { title: `Friday${n}`, sub: 'The rigs don’t count days, but we’re glad you’re here.' }
  if (day === 0 || day === 6) return { title: `Weekend watch${n}`, sub: 'The rigs keep going, thanks for keeping an eye on them.' }

  const title = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}${n}`
  return { title, sub: random() < 0.2 ? pickGreetingQuip() : DEFAULT_SUB }
}
