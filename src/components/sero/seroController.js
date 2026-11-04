// Copied from sero-mascot/sero.js (named differently here: on a case-insensitive disk "sero.js" and "Sero.jsx" would be the same file).
// Sero controller. Framework-free: the only thing it does is add and remove classes on
// the <svg class="sero"> at the right moments. A React hook can wrap this without change
// (see docs/04-implementation.md).
//
//   const sero = createSero(svgElement)
//   await sero.play('wave')          // one-shot, resolves when it ends
//   sero.state('think')              // held until sero.state(null) or another state
//   sero.expression('happy')         // face only; sero.expression(null) to clear
//   sero.bubble('Hmm…')             // thought cloud; bubble({dots:true}) for thinking dots; bubble(null) hides
//   sero.flip(true)                  // face the other way
//   sero.quiet(true)                 // no motion at all (low-power devices)
//   sero.destroy()

export const SERO_ONE_SHOTS = {
  wave: 2400, tip: 1900, nod: 1200, shake: 1300, blink: 1000, wink: 700,
  'look-left': 2000, 'look-right': 2000, jump: 1100, celebrate: 2300,
  show: 2600, point: 2000, alert: 1600, peek: 5400, 'peek-corner': 6000,
}
export const SERO_STATES = ['think', 'work', 'sleep', 'sorry', 'confused', 'stroll', 'stroll-left', 'hidden', 'hidden-corner']
export const SERO_EXPRESSIONS = ['happy', 'neutral', 'surprised', 'sad', 'confused', 'focused']

// A peek ends with Sero out of frame; without this he would pop back the moment the class goes.
const ENDS_HIDDEN = { peek: 'hidden', 'peek-corner': 'hidden-corner' }
const SETTLE_MS = 60 // small margin after the CSS duration so the last keyframe is painted

export function createSero(svg, options = {}) {
  if (!svg || !svg.classList) throw new Error('createSero: pass the <svg class="sero"> element')
  const cls = svg.classList
  let running = null // { name, timer, resolve }
  let state = null
  let expression = null
  let bubbleTimer = 0
  const listeners = new Set()

  const emit = (type, detail) => listeners.forEach((fn) => fn({ type, ...detail }))

  const api = {
    // One-shots. Starting one cancels the one in flight. `then` overrides what a peek leaves behind
    // ('hidden' | 'visible'); for everything else Sero simply returns to his pose.
    play(name, { then } = {}) {
      if (!(name in SERO_ONE_SHOTS)) return Promise.reject(new Error(`Sero cannot play "${name}"`))
      api.stop()
      const c = `sero-${name}`
      cls.remove(c)
      void svg.getBoundingClientRect() // restart the CSS animation even if the same class was just removed
      cls.add(c)
      emit('start', { name })
      return new Promise((resolve) => {
        running = {
          name,
          resolve,
          timer: setTimeout(() => {
            const leave = then || ENDS_HIDDEN[name]
            if (leave && leave !== 'visible') api.state(leave)
            cls.remove(c)
            running = null
            emit('end', { name })
            resolve(name)
          }, SERO_ONE_SHOTS[name] + SETTLE_MS),
        }
      })
    },
    stop() {
      if (!running) return
      clearTimeout(running.timer)
      cls.remove(`sero-${running.name}`)
      const r = running
      running = null
      emit('end', { name: r.name, cancelled: true })
      r.resolve(r.name)
    },
    // States are exclusive: setting one clears the others. null = back to idle.
    state(name) {
      if (name && !SERO_STATES.includes(name)) throw new Error(`Sero has no state "${name}"`)
      SERO_STATES.forEach((s) => cls.remove(`sero-${s}`))
      if (name === 'stroll-left') cls.add('sero-stroll')
      if (name) cls.add(`sero-${name}`)
      state = name || null
      emit('state', { state })
      return api
    },
    expression(name) {
      if (name && !SERO_EXPRESSIONS.includes(name)) throw new Error(`Sero has no expression "${name}"`)
      SERO_EXPRESSIONS.forEach((e) => cls.remove(`sero-x-${e}`))
      if (name) cls.add(`sero-x-${name}`)
      expression = name || null
      return api
    },
    flip(on) { cls.toggle('sero-flip', !!on); return api },
    // Thought cloud. bubble('Hmm…') | bubble(['two', 'lines']) | bubble({ dots: true }) | bubble(null) to hide.
    // Options: side 'right' (default) | 'left', colours { fill, stroke, text }, scale (1 = as drawn), hold ms (auto-hide).
    bubble(content, { side = 'right', fill, stroke, text, scale, hold } = {}) {
      clearTimeout(bubbleTimer)
      if (content == null || content === false) { cls.remove('sero-bubble-on', 'sero-bubble-dots', 'sero-bubble-left'); return api }
      const dots = typeof content === 'object' && !Array.isArray(content) && content.dots
      const lines = dots ? [] : [].concat(content).map(String).slice(0, 2)
      const l1 = svg.querySelector('.sero-bubble-l1'), l2 = svg.querySelector('.sero-bubble-l2')
      if (l1) l1.textContent = lines[0] || ''
      if (l2) l2.textContent = lines[1] || ''
      const t = svg.querySelector('.sero-bubble-text')
      if (t) { t.setAttribute('y', lines.length > 1 ? '30' : '36'); t.setAttribute('font-size', lines.length > 1 ? '13' : '15') } // centre one or two lines in the cloud
      svg.style.setProperty('--bubble-fill', fill || '')
      svg.style.setProperty('--bubble-stroke', stroke || '')
      svg.style.setProperty('--bubble-text', text || '')
      svg.style.setProperty('--bubble-scale', scale ? String(scale) : '')
      cls.toggle('sero-bubble-dots', !!dots)
      cls.toggle('sero-bubble-left', side === 'left')
      if (!cls.contains('sero-bubble-on')) { cls.add('sero-bubble-on') }
      if (hold) bubbleTimer = setTimeout(() => api.bubble(null), hold)
      return api
    },
    quiet(on) { cls.toggle('sero-static', !!on); return api },
    // Play several things in order: ['wave', 'tip'] or [['think', 1500], 'nod'] (a state with a hold time).
    async sequence(steps) {
      for (const step of steps) {
        const [name, hold] = Array.isArray(step) ? step : [step, 0]
        if (name in SERO_ONE_SHOTS) await api.play(name)
        else { api.state(name === 'idle' ? null : name); if (hold) await new Promise((r) => setTimeout(r, hold)) }
      }
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    get status() { return { state, expression, playing: running ? running.name : null } },
    destroy() {
      api.stop()
      api.state(null)
      api.expression(null)
      api.bubble(null)
      listeners.clear()
    },
  }
  if (options.quiet) api.quiet(true)
  return api
}
