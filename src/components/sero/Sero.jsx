import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import seroSvg from './sero.svg?raw'
import { createSero } from './seroController'
import { lowPowerDevice } from '@/lib/perf'

// Sero, the Seros mascot. The drawing is sero.svg (the stylesheet with every pose lives inside it); sero.js only adds and removes
// classes. What he IS doing now is set with the props (`state`, `expression`, `flip`); things that HAPPEN to him are played through
// the ref: play('wave'), sequence([...]), bubble('Hmm…'), look(x, y), stop(). Import this file with lazy() so the 48 KB drawing is
// fetched only where he appears. Decoration only: it carries no information.
const Sero = forwardRef(function Sero({ state = null, expression = null, flip = false, size = 160, className = '', label = 'Sero, the Seros mascot' }, ref) {
  const host = useRef(null)
  const ctl = useRef(null)

  useEffect(() => {
    // The drawing is put in by hand, not with dangerouslySetInnerHTML: React may replace that markup on a re-render, and the controller would
    // be left holding an svg that is no longer on the page.
    const box = host.current
    if (!box) return undefined
    box.innerHTML = seroSvg
    const svg = box.querySelector('svg.sero')
    if (!svg) return undefined
    svg.removeAttribute('role') // the host carries the role and label
    svg.setAttribute('aria-hidden', 'true')
    ctl.current = createSero(svg, { quiet: lowPowerDevice() })
    return () => {
      ctl.current?.destroy()
      ctl.current = null
      box.innerHTML = ''
    }
  }, [])
  useEffect(() => { ctl.current?.state(state) }, [state])
  useEffect(() => { ctl.current?.expression(expression) }, [expression])
  useEffect(() => { ctl.current?.flip(flip) }, [flip])

  useImperativeHandle(ref, () => ({
    play: (name, opts) => (ctl.current ? ctl.current.play(name, opts) : Promise.resolve(name)),
    sequence: (steps) => (ctl.current ? ctl.current.sequence(steps) : Promise.resolve()),
    bubble: (content, opts) => ctl.current?.bubble(content, opts),
    stop: () => ctl.current?.stop(),
    state: (name) => ctl.current?.state(name),
    // Where he looks: dx, dy in -1..1. His eyes go first and furthest, the face slides across the visor, the hat and the head follow a little
    // (the same parts his own look-left / look-right use, so it reads as a turn of the head). look(null) gives it all back to his own idle.
    look: (dx, dy) => {
      const root = host.current
      if (!root) return
      const part = (sel) => root.querySelector(sel)
      const g = part('.sero-gaze')
      const f = part('.sero-face')
      const h = part('.sero-hat')
      const sh = part('.sero-head-shape')
      const all = [g, f, h, sh]
      if (dx == null) {
        all.forEach((el) => { if (el) { el.style.animation = ''; el.style.transform = '' } })
        return
      }
      const x = Math.max(-1, Math.min(1, dx))
      const y = Math.max(-1, Math.min(1, dy))
      all.forEach((el) => { if (el) el.style.animation = 'none' })
      if (g) g.style.transform = `translate(${(x * 5).toFixed(2)}px, ${(y * 3.5).toFixed(2)}px)`
      if (f) f.style.transform = `translate(${(x * 13).toFixed(2)}px, ${(y * 4).toFixed(2)}px) scaleX(${(1 - Math.abs(x) * 0.1).toFixed(3)})`
      if (h) h.style.transform = `translate(${(x * 7).toFixed(2)}px, ${(y * 2).toFixed(2)}px)`
      if (sh) sh.style.transform = `scaleX(${(1 - Math.abs(x) * 0.04).toFixed(3)})`
    },
    get status() { return ctl.current?.status },
  }), [])

  return <span ref={host} className={className} style={{ display: 'inline-block', width: size, lineHeight: 0 }} role="img" aria-label={label} />
})

export default Sero
