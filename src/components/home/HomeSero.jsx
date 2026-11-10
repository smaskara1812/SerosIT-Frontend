import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EASTER_EGGS } from '@/config/easterEggs'
import { useIdle } from '@/lib/useIdle'
import Sero from '@/components/sero/Sero'

// Sero in the home banner: the one deckhand who is always on the rig. He stands in the lower-right corner of the banner, on its bottom
// edge, and never covers anything: the greeting, the search box and the notice card are marked `data-sero-avoid` (see HomeHero), and if
// the corner is taken he stands just left of whatever is in the way, or is not shown at all when there is no room (a narrow window).
// He is hidden while one of the banner's hidden scenes plays (`hidden`). With EASTER_EGGS.seroTricks off he only stands and breathes.
//
// What he does (all of it only while he is on screen and the tab is visible):
//   poke        a click rotates wink, nod, tip, jump (played once the clicking pauses); five quick clicks make him celebrate and nothing else
//   eyes        his gaze follows the cursor when it is near him (his head leads: eyes first)
//   search      he looks toward the search box while it is used, and shrugs when what was typed matches no page
//   whisper     when the idle hint changes he glances at the greeting
//   nap         after a long idle he dozes off; any movement wakes him
//   hours       a wave in the morning (once per visit), drowsy late at night
//   phrase      "sero" in the search: he walks across the banner, waves, tips his hat and walks back
const SIZES = [128, 92] // his width: the full size, or a smaller one when there is only a low gap (under a tall notice card)
const ratio = 340 / 300
const GAP = 14
const POKES = ['wink', 'nod', 'tip', 'jump']
const POKE_PAUSE_MS = 520 // how long the clicking must stop before a single poke gets its reaction
const MORNING_KEY = 'serosit.sero_morning'
const GREET_KEY = 'serosit.sero_greet' // set by the login page after every successful sign-in; used up by the first wave below
const between = (h, from, to) => (from <= to ? h >= from && h < to : h >= from || h < to)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Where he can stand: right = how far from the banner's right edge, size = how wide, or not at all.
function findSpot(section, place) {
  const s = section.getBoundingClientRect()
  if (place) {
    // an administrator put him somewhere on purpose: no stepping aside, only keep him inside the banner. x: 0 left edge to 100 right edge; y: 0 top to 100 standing on the bottom edge.
    const size = s.width < 420 ? SIZES[1] : SIZES[0]
    const h = Math.round(size * ratio)
    if (s.width < size + 16 || s.height < h + 12) return { right: 40, bottom: 0, size, visible: false }
    const left = 8 + (s.width - size - 16) * (place.x / 100)
    const bottom = 6 + (s.height - h - 12) * ((100 - place.y) / 100)
    return { right: Math.round(s.width - left - size), bottom: Math.round(bottom), size, visible: true }
  }
  const rects = [...section.querySelectorAll('[data-sero-avoid]')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0)
  for (const size of SIZES) {
    const top = s.bottom - Math.round(size * ratio) - 6
    const blocks = rects.filter((r) => r.bottom > top && r.top < s.bottom)
    const fits = (right) => {
      const l = s.right - right - size
      return l >= s.left + 8 && blocks.every((b) => l + size <= b.left - GAP || l >= b.right + GAP)
    }
    if (fits(40)) return { right: 40, bottom: 0, size, visible: true }
    const l = s.right - 40 - size
    const hit = blocks.filter((b) => !(l + size <= b.left - GAP || l >= b.right + GAP))
    const right = Math.round(s.right - (Math.min(...hit.map((b) => b.left)) - GAP))
    if (fits(right)) return { right, bottom: 0, size, visible: true }
  }
  return { right: 40, bottom: 0, size: SIZES[0], visible: false }
}

export default function HomeSero({ hidden = false, hint = null, layoutKey = 0, outfit = null, place = null }) {
  const tricks = EASTER_EGGS.seroTricks
  const wrap = useRef(null)
  const placeRef = useRef(place) // read when he is measured; a change of place measures again (the effect below)
  const placeKey = place ? `${place.x},${place.y}` : ''
  useEffect(() => { placeRef.current = place }, [place])
  const sero = useRef(null)
  const [spot, setSpot] = useState({ right: 40, bottom: 0, size: SIZES[0], visible: false })
  const [walk, setWalk] = useState({ x: 0, ms: 0 })
  const [scene, setScene] = useState(false)
  const hour = useMemo(() => new Date().getHours(), [])
  const drowsy = tricks && between(hour, EASTER_EGGS.seroSleepyFrom, EASTER_EGGS.seroSleepyUntil)

  const active = spot.visible && !hidden
  // When he goes (a banner scene starts, or there is no room) a walk in progress is over; adjusted here, not in an effect.
  const [wasActive, setWasActive] = useState(active)
  if (wasActive !== active) {
    setWasActive(active)
    if (!active) {
      setScene(false)
      setWalk({ x: 0, ms: 0 })
    }
  }
  const activeRef = useRef(false)
  const run = useRef(0) // each thing he starts takes a new number; an older one that finds it has changed stops
  const sleeping = useRef(false)
  const sceneOn = useRef(false)
  const searching = useRef({ focused: false, typing: false, noMatch: false })
  const confusedTimer = useRef(0)
  const clicks = useRef([])
  const cooldown = useRef(0)
  const pokeTimer = useRef(0)
  const pokeIdx = useRef(-1)
  const morningDone = useRef(false)
  const looking = useRef(false)

  // He is free to react when nothing else is going on with him.
  const free = () => !!sero.current && !sceneOn.current && !sleeping.current && !sero.current.status?.playing && !sero.current.status?.state
  const unlook = () => {
    if (looking.current) {
      looking.current = false
      sero.current?.look(null)
    }
  }

  // ---- where he stands ------------------------------------------------------------------------------------------------------
  useEffect(() => {
    const section = wrap.current?.parentElement
    if (!section) return undefined
    let timer = 0
    const measure = () => {
      clearTimeout(timer) // a short timeout, not requestAnimationFrame: that does not run in a tab that is not showing
      timer = setTimeout(() => {
        const next = findSpot(section, placeRef.current)
        setSpot((cur) => (cur.right === next.right && cur.bottom === next.bottom && cur.size === next.size && cur.visible === next.visible ? cur : next))
      }, 30)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(section)
    section.querySelectorAll('[data-sero-avoid]').forEach((e) => ro.observe(e))
    window.addEventListener('resize', measure)
    measure()
    // The page fades and slides in as it opens, and a transform does not wake a ResizeObserver: look again once it has settled.
    const later = [250, 700, 1500, 3000].map((ms) => setTimeout(measure, ms))
    return () => {
      later.forEach(clearTimeout)
      clearTimeout(timer)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [layoutKey, placeKey])

  useEffect(() => {
    activeRef.current = active
    if (!active) {
      // gone (a banner scene is playing, or no room): stop whatever he was doing, so he is standing quietly when he is back
      run.current += 1
      sceneOn.current = false
      clearTimeout(confusedTimer.current)
      clearTimeout(pokeTimer.current)
      looking.current = false
      sero.current?.stop()
      sero.current?.bubble(null)
      sero.current?.look(null)
      sero.current?.state(sleeping.current ? 'sleep' : null)
    }
  }, [active])
  useEffect(() => () => { run.current += 1; clearTimeout(confusedTimer.current); clearTimeout(pokeTimer.current) }, [])

  // ---- waking up ------------------------------------------------------------------------------------------------------------
  const wake = useCallback(async () => {
    if (!sleeping.current || !sero.current) return
    const id = ++run.current
    sleeping.current = false
    await sero.current.play('alert')
    if (run.current !== id) return
    sero.current.state(null)
    await sero.current.play('look-left')
    if (run.current !== id) return
    await sero.current.play('look-right')
  }, [])

  // ---- poke -----------------------------------------------------------------------------------------------------------------
  function onPoke() {
    if (!tricks || !activeRef.current || sceneOn.current || !sero.current) return
    if (sleeping.current) {
      wake()
      return
    }
    run.current += 1
    clearTimeout(confusedTimer.current)
    clearTimeout(pokeTimer.current)
    sero.current.state(null)
    unlook()
    const now = Date.now()
    clicks.current = clicks.current.filter((t) => now - t < 2000).concat(now)
    if (clicks.current.length >= 5 && now > cooldown.current) {
      // five quick clicks: only this plays (the single reactions below were held back while the clicks kept coming)
      clicks.current = []
      cooldown.current = now + 9000
      sero.current.play('celebrate')
      return
    }
    // One reaction, played once the clicking has paused: a person going for five clicks sees no movement until the fifth.
    pokeTimer.current = setTimeout(() => {
      if (!activeRef.current || sceneOn.current || sleeping.current || !sero.current) return
      if (pokeIdx.current < 0) pokeIdx.current = Math.floor(Math.random() * POKES.length) // a different one first each visit
      sero.current.play(POKES[pokeIdx.current++ % POKES.length])
    }, POKE_PAUSE_MS)
  }

  // ---- eyes that follow the cursor --------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!tricks || !active) return undefined
    let timer = 0
    let last = null
    const follow = () => {
      timer = 0
      if (!wrap.current || !last || searching.current.focused || !free()) return
      const r = wrap.current.getBoundingClientRect()
      const dx = last.clientX - (r.left + r.width / 2)
      const dy = last.clientY - (r.top + r.height * 0.35)
      if (Math.hypot(dx, dy) > 900) unlook()
      else {
        looking.current = true
        sero.current.look(dx / 120, dy / 90)
      }
    }
    const onMove = (e) => {
      last = e
      if (!timer) timer = setTimeout(follow, 40)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      clearTimeout(timer)
    }
  }, [tricks, active])

  // ---- the search box ---------------------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!tricks) return undefined
    const onSearch = (e) => {
      const s = (searching.current = e.detail)
      clearTimeout(confusedTimer.current)
      if (!activeRef.current || sceneOn.current || sleeping.current || !sero.current) return
      if (s.focused) {
        looking.current = true
        sero.current.look(-1, 0.4) // the box is to his left
      } else if (!s.noMatch) {
        unlook()
      }
      if (s.focused && s.noMatch) {
        confusedTimer.current = setTimeout(() => {
          if (!activeRef.current || sceneOn.current || sleeping.current || !searching.current.noMatch) return
          sero.current.look(null)
          sero.current.state('confused')
          confusedTimer.current = setTimeout(() => {
            sero.current?.state(null)
            if (searching.current.focused) sero.current?.look(-1, 0.4)
          }, 3500)
        }, 700)
      } else if (sero.current.status?.state === 'confused') {
        sero.current.state(null)
        if (s.focused) sero.current.look(-1, 0.4)
      }
    }
    window.addEventListener('seros:search', onSearch)
    return () => window.removeEventListener('seros:search', onSearch)
  }, [tricks])

  // ---- the idle hint: a glance at the greeting ------------------------------------------------------------------
  useEffect(() => {
    if (!tricks || !hint || !activeRef.current || !free() || searching.current.focused) return
    run.current += 1
    unlook()
    sero.current.play('look-left')
  }, [tricks, hint])

  // ---- a nap when the page has sat idle; drowsy at night ---------------------------------------------------------------------------
  const idle = useIdle(tricks ? (drowsy ? Math.round(EASTER_EGGS.seroSleepAfterMs / 2) : EASTER_EGGS.seroSleepAfterMs) : 0)
  useEffect(() => {
    if (!tricks || !sero.current) return
    if (idle && active && !sceneOn.current && !sleeping.current) {
      run.current += 1
      sleeping.current = true
      unlook()
      sero.current.bubble(null)
      sero.current.stop()
      sero.current.state('sleep')
    } else if (!idle && sleeping.current) {
      wake()
    }
  }, [tricks, idle, active, wake])

  // ---- the greeting after signing in: a wave, every time ----------------------------------------------------------------------
  useEffect(() => {
    if (!tricks || !active) return undefined
    let pending = false
    try {
      pending = sessionStorage.getItem(GREET_KEY) === '1'
    } catch {
      /* private mode: no greeting */
    }
    if (!pending) return undefined
    const t = setTimeout(() => {
      if (!activeRef.current || !free()) return
      try {
        sessionStorage.removeItem(GREET_KEY)
      } catch {
        /* ignore */
      }
      morningDone.current = true // the sign-in wave is the morning wave too
      sero.current.play('wave')
    }, 900)
    return () => clearTimeout(t)
  }, [tricks, active])

  // ---- the morning wave ---------------------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!tricks || !active || morningDone.current || !between(hour, EASTER_EGGS.seroMorningFrom, EASTER_EGGS.seroMorningUntil)) return undefined
    let seen = false
    const today = new Date().toDateString()
    try {
      seen = sessionStorage.getItem(MORNING_KEY) === today
    } catch {
      /* private mode: he waves again, harmlessly */
    }
    if (seen) {
      morningDone.current = true
      return undefined
    }
    const t = setTimeout(() => {
      if (!activeRef.current || !free()) return
      morningDone.current = true
      try {
        sessionStorage.setItem(MORNING_KEY, today)
      } catch {
        /* ignore */
      }
      sero.current.play('wave')
    }, 1400)
    return () => clearTimeout(t)
  }, [tricks, active, hour])

  // ---- the secret phrase: a walk across the banner --------------------------------------------------------------------------------
  useEffect(() => {
    if (!tricks) return undefined
    const onPhrase = async () => {
      if (!activeRef.current || sceneOn.current || !sero.current) return
      if (sleeping.current) {
        sleeping.current = false
        sero.current.state(null)
      }
      const id = ++run.current
      const live = () => run.current === id && activeRef.current
      sceneOn.current = true
      setScene(true)
      clearTimeout(confusedTimer.current)
      unlook()
      sero.current.bubble(null)
      sero.current.stop()
      const room = (wrap.current?.parentElement?.getBoundingClientRect().width || 0) - spot.right - spot.size - 24
      const dist = reducedMotion() ? 0 : Math.max(0, Math.min(240, room))
      const ms = Math.round((dist / 60) * 1000) // about the speed of his walk cycle
      if (dist) {
        sero.current.state('stroll-left')
        setWalk({ x: -dist, ms })
        await wait(ms + 150)
      }
      if (live()) {
        sero.current.state(null)
        await sero.current.play('wave')
      }
      if (live()) await sero.current.play('tip')
      if (live() && dist) {
        sero.current.state('stroll')
        setWalk({ x: 0, ms })
        await wait(ms + 150)
      }
      if (run.current === id) {
        sero.current?.state(null)
        sceneOn.current = false
        setScene(false)
      }
    }
    window.addEventListener('seros:sero', onPhrase)
    return () => window.removeEventListener('seros:sero', onPhrase)
  }, [tricks, spot.right, spot.size])

  return (
    <div
      ref={wrap}
      onClick={onPoke}
      aria-hidden={!active}
      inert={!active || scene}
      className={`absolute select-none transition-opacity duration-500 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'} z-20 ${tricks ? 'cursor-pointer' : ''}`}
      style={{ right: spot.right, bottom: spot.bottom, width: spot.size, transform: `translateX(${walk.x}px)`, transition: `opacity 500ms, transform ${walk.ms}ms linear` }}
    >
      <Sero ref={sero} outfit={outfit} size={spot.size} expression={drowsy ? 'focused' : null} className="[&>svg]:block" />
    </div>
  )
}
