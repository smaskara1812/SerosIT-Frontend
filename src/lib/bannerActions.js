// The buttons a banner design can carry (the "Buttons" tab of Banner Events). A button either plays a show on the page or opens one of
// the app's own pages. Backend core/banner_events.py validates the same shape. To add a show: add it here, add it to ACTION_EFFECTS in
// core/banner_events.py, and give it a function in `runEffect`.

export const MAX_ACTIONS = 3

export const EFFECTS = [{ key: 'fireworks', label: 'Fireworks', hint: 'A Diwali display over the page, about eight seconds: shells from the bottom and the sides bursting into rings, hearts, stars and lotus flowers, ground fountains, a volley and a rain of gold at the end.', defaults: { colors: ['#ffc83d', '#ff6a1a', '#ff2d7a', '#ffffff'], bursts: 7 } },
  { key: 'holi', label: 'Holi colours', hint: 'A play of colour over the page, about seven seconds: gulal thrown in from the sides, pichkari streams, water balloons that burst, and splats of colour that fade.', defaults: { colors: ['#ff2d95', '#ffd600', '#00b8ff', '#6fd400', '#ff6a00', '#8e44ff'], bursts: 8 } },
  { key: 'christmas', label: 'Christmas sleigh', hint: 'A winter night, about eleven seconds: snow, twinkling stars and Santa\'s sleigh crossing the sky behind four reindeer, trailing sparkle and dropping gifts that land on the ground. A longer show adds a second, smaller pass.', defaults: { colors: ['#ffffff', '#ffd24a', '#e63946', '#2a9d8f'], bursts: 8 } },
  { key: 'newyear', label: 'Drop the ball', hint: 'About fifteen seconds: a glittering ball slides down a pole as a big number counts 5 to 1, then midnight: a flash, fireworks, confetti from both corners and balloons. After that the mouse leaves a sparkler trail. No year is written.', defaults: { colors: ['#ffd24a', '#dfe6f2', '#ffffff', '#5aa9ff'], bursts: 8 } },
  { key: 'flag', label: 'Hoist the flag', hint: 'About eight seconds: a flagpole rises, the tricolour is run up it and ripples in the wind, then a shower of petals bursts from the flag and doves fly off. The sky takes a faint wash of saffron, white and green.', defaults: { colors: ['#ff9933', '#ffffff', '#138808', '#000080'], bursts: 8 } },
  { key: 'navratri', label: 'Garba night', max: 9, hint: 'About twelve seconds: from one point of light, nine glowing lotus rings draw themselves outward, one for each night and each in its own colour, then turn against one another like a Garba circle with lights chasing round them. The mandala blooms in a flash of sparks and breathes out into rising golden embers.', defaults: { colors: ['#f97316', '#f8fafc', '#dc2626', '#2563eb', '#facc15', '#16a34a', '#94a3b8', '#7e22ce', '#0d9488'], bursts: 8 } },
  { key: 'ganesh', label: 'Welcome Bappa', hint: 'About eleven seconds, with no figure: a lotus rises out of still water and opens inside an arch of lamps that light from both ends; modaks pop onto a banana leaf; hibiscus and durva grass fall; then an aarti flame circles the lotus three times, each circle ringing a ripple of light like a temple bell, before a final burst of gold.', defaults: { colors: ['#f59e0b', '#dc2626', '#fde68a', '#f472b6'], bursts: 8 } },
  { key: 'janmashtami', label: 'Break the handi', hint: 'About eleven seconds: a midnight night with a big moon, peacock feathers and drifting flute notes. A clay pot of butter hangs on a rope while a pyramid of glowing orbs builds beneath it, tier by tier; the top orb leaps, the pot breaks, and shards, butter and petals fly while the pyramid flares.', defaults: { colors: ['#ffd166', '#fdf6e3', '#38bdf8', '#f472b6'], bursts: 8 } },
]

export const KINDS = [
  { key: 'effect', label: 'Play a show' },
  { key: 'link', label: 'Open a page' },
]

// How a button looks. Anything a saved button leaves out takes the first (quiet) choice below.
export const LOOK_DEFAULTS = { style: 'soft', size: 'medium', glow: 'gentle', shape: 'pill' }
export const STYLES = [{ key: 'soft', label: 'Soft' }, { key: 'solid', label: 'Solid' }, { key: 'outline', label: 'Outline' }]
export const SIZES = [{ key: 'small', label: 'Small' }, { key: 'medium', label: 'Medium' }, { key: 'large', label: 'Large' }]
export const GLOWS = [{ key: 'off', label: 'None' }, { key: 'gentle', label: 'Gentle' }, { key: 'lively', label: 'Lively' }]
export const SHAPES = [{ key: 'pill', label: 'Pill' }, { key: 'rounded', label: 'Rounded' }]
export const ICONS = [{ key: 'sparkles', label: 'Sparkles' }, { key: 'flame', label: 'Flame' }, { key: 'rocket', label: 'Rocket' }, { key: 'party', label: 'Party' }, { key: 'arrow', label: 'Arrow' }, { key: 'none', label: 'None' }]
export const lookOf = (a) => ({ ...LOOK_DEFAULTS, icon: a.kind === 'link' ? 'arrow' : 'sparkles', ...a })

let counter = 0
export const newActionId = () => `a${Date.now().toString(36)}${(counter += 1)}`.slice(0, 16)

export function newAction(kind = 'effect', effect = 'fireworks') {
  if (kind === 'link') return { id: newActionId(), label: 'Open a page', kind: 'link', link: '/', color: null, ...LOOK_DEFAULTS, icon: 'arrow' }
  return { id: newActionId(), label: 'Light it up', kind: 'effect', effect, ...EFFECTS.find((e) => e.key === effect).defaults, colors: [...EFFECTS.find((e) => e.key === effect).defaults.colors], color: null, ...LOOK_DEFAULTS, icon: 'sparkles' }
}

// Plays what a button does. `go` opens an in-app path. The show's code is fetched only now, so a banner with buttons costs nothing until one is used.
export async function runAction(action, go) {
  if (action.kind === 'link') return go?.(action.link)
  if (action.effect === 'ganesh') {
    const { playGanesh } = await import('@/lib/bannerGanesh')
    playGanesh({ colors: action.colors, bursts: action.bursts })
  }
  if (action.effect === 'janmashtami') {
    const { playJanmashtami } = await import('@/lib/bannerJanmashtami')
    playJanmashtami({ colors: action.colors, bursts: action.bursts })
  }
  if (action.effect === 'navratri') {
    const { playNavratri } = await import('@/lib/bannerNavratri')
    playNavratri({ colors: action.colors, bursts: action.bursts })
  }
  if (action.effect === 'flag') {
    const { playFlag } = await import('@/lib/bannerFlag')
    playFlag({ colors: action.colors, bursts: action.bursts })
  }
  if (action.effect === 'newyear') {
    const { playNewYear } = await import('@/lib/bannerNewYear')
    playNewYear({ colors: action.colors, bursts: action.bursts })
  }
  if (action.effect === 'christmas') {
    const { playChristmas } = await import('@/lib/bannerChristmas')
    playChristmas({ colors: action.colors, bursts: action.bursts })
  }
  if (action.effect === 'holi') {
    const { playHoli } = await import('@/lib/bannerHoli')
    playHoli({ colors: action.colors, bursts: action.bursts })
  }
  if (action.effect === 'fireworks') {
    const { playFireworks } = await import('@/lib/bannerFireworks')
    playFireworks({ colors: action.colors, bursts: action.bursts })
  }
  return undefined
}
