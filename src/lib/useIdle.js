import { useEffect, useState } from 'react'

// True once the page has gone `ms` without a mouse move, key press, click, scroll or touch; false again the moment
// there is any. `ms` of 0 turns it off. The state only changes on those two transitions, never on every event.
export function useIdle(ms) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!ms) return undefined
    let timer = 0
    let isIdle = false
    const arm = () => {
      if (isIdle) {
        isIdle = false
        setIdle(false)
      }
      clearTimeout(timer)
      timer = setTimeout(() => {
        isIdle = true
        setIdle(true)
      }, ms)
    }
    const events = ['mousemove', 'keydown', 'pointerdown', 'wheel', 'touchstart']
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    arm()
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [ms])
  return idle
}
