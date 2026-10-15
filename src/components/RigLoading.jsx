import { useState } from 'react'
import { pickLoadingLine, pickMoreLine } from '@/lib/rigLines'
import { EASTER_EGGS } from '@/config/easterEggs'

// Drop-in for the word "Loading…": a rig-floor line chosen once when the wait begins, so it does not flicker
// while it stays on screen. Pass `more` for the foot-of-a-long-list moment.
export default function RigLoading({ more = false }) {
  const [line] = useState(() => (!EASTER_EGGS.rigLoadingLines ? (more ? 'Loading more…' : 'Loading…') : more ? pickMoreLine() : pickLoadingLine()))
  return <>{line}</>
}
