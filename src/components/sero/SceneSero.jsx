import { useEffect, useRef } from 'react'
import EggBoundary from '@/components/EggBoundary'
import Sero from './Sero'

// Sero as a small figure standing inside a picture (the 404 and access-denied pages). Placed by percentages of the picture, so he keeps his place
// and his size when it scales. `react` is the name of a one-shot to play now (e.g. 'shake'); give null when nothing is happening.
// `gaze` is [dx, dy] in -1..1 for where his eyes point. Decoration only: it takes no clicks and says nothing a reader needs.
export default function SceneSero({ left, right, bottom = 0, width, state = null, expression = null, gaze = null, react = null }) {
  const sero = useRef(null)
  useEffect(() => {
    if (gaze) sero.current?.look(gaze[0], gaze[1])
  }, [gaze])
  useEffect(() => {
    if (react) sero.current?.play(react)
  }, [react])
  return (
    <div aria-hidden="true" className="pointer-events-none absolute" style={{ left, right, bottom, width }}>
      <EggBoundary>
        <Sero ref={sero} state={state} expression={expression} size="100%" className="block [&>svg]:block" />
      </EggBoundary>
    </div>
  )
}
