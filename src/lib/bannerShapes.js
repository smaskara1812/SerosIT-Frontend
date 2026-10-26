// The built-in shapes for Banner Events. Each shape is drawn from a few numbers (position, size, turn, colour, see-through,
// and one or two shape settings), never from uploaded artwork. The same drawing code draws the banner and the little
// pictures in the editor's shape library.

export const MAX_LAYERS = 120

// w and h are the starting size on the 1200 x 360 canvas; n and p are the shape's own settings where it has them.
export const CATEGORIES = [
  { key: 'basic', label: 'Basic' },
  { key: 'nature', label: 'Nature' },
  { key: 'work', label: 'Industry' },
  { key: 'festive', label: 'Festive and national' },
  { key: 'pictures', label: 'Pictures' },
]
export const SHAPES = [
  // An uploaded picture: not drawn from this list (the Pictures library adds it) but it needs an entry for its name and starting size.
  { key: 'picture', cat: 'pictures-layer', label: 'Picture', w: 240, h: 160 },
  { key: 'rect', cat: 'basic', label: 'Rectangle', w: 160, h: 90, p: 0.15 },
  { key: 'circle', cat: 'basic', label: 'Circle', w: 100, h: 100 },
  { key: 'ring', cat: 'basic', label: 'Ring', w: 110, h: 110, p: 0.25 },
  { key: 'triangle', cat: 'basic', label: 'Triangle', w: 100, h: 90 },
  { key: 'diamond', cat: 'basic', label: 'Diamond', w: 90, h: 110 },
  { key: 'star', cat: 'basic', label: 'Star', w: 100, h: 100, n: 5, p: 0.45 },
  { key: 'sparkle', cat: 'basic', label: 'Sparkle', w: 70, h: 70 },
  { key: 'heart', cat: 'basic', label: 'Heart', w: 90, h: 80 },
  { key: 'wave', cat: 'basic', label: 'Wave', w: 260, h: 40, n: 4, p: 0.2 },
  { key: 'line', cat: 'basic', label: 'Line', w: 240, h: 6 },
  { key: 'drop', cat: 'nature', label: 'Drop', w: 60, h: 80 },
  { key: 'leaf', cat: 'nature', label: 'Leaf', w: 90, h: 70 },
  { key: 'tree', cat: 'nature', label: 'Pine tree', w: 90, h: 120 },
  { key: 'broadtree', cat: 'nature', label: 'Leafy tree', w: 100, h: 120 },
  { key: 'cloud', cat: 'nature', label: 'Cloud', w: 150, h: 80 },
  { key: 'sun', cat: 'nature', label: 'Sun', w: 110, h: 110 },
  { key: 'moon', cat: 'nature', label: 'Moon', w: 80, h: 90 },
  { key: 'snowflake', cat: 'nature', label: 'Snowflake', w: 90, h: 90 },
  { key: 'rig', cat: 'work', label: 'Oil rig', w: 120, h: 200 },
  { key: 'ship', cat: 'work', label: 'Ship', w: 220, h: 110 },
  { key: 'helicopter', cat: 'work', label: 'Helicopter', w: 200, h: 100 },
  { key: 'hardhat', cat: 'work', label: 'Hard hat', w: 130, h: 100 },
  { key: 'drillbit', cat: 'work', label: 'Drill bit', w: 80, h: 110 },
  { key: 'wrench', cat: 'work', label: 'Wrench', w: 180, h: 70 },
  { key: 'gear', cat: 'work', label: 'Gear', w: 100, h: 100 },
  { key: 'cone', cat: 'work', label: 'Safety cone', w: 90, h: 110 },
  { key: 'arthat', cat: 'work', label: 'Green hard hat (picture)', w: 150, h: 150 },
  { key: 'artcone', cat: 'work', label: 'Cone (picture)', w: 120, h: 120 },
  { key: 'artgear', cat: 'work', label: 'Gear (picture)', w: 120, h: 120 },
  { key: 'artclipboard', cat: 'work', label: 'Checklist (picture)', w: 120, h: 120 },
  { key: 'artgoggles', cat: 'work', label: 'Goggles (picture)', w: 130, h: 130 },
  { key: 'artwoman', cat: 'festive', label: 'Line art portrait with lotus (picture)', w: 220, h: 220 },
  { key: 'artlotus', cat: 'festive', label: 'Lotus (picture)', w: 150, h: 150 },
  { key: 'artdraft', cat: 'work', label: 'Engineering drafting scene (picture)', w: 232, h: 170 },
  { key: 'artcircuit', cat: 'work', label: 'Circuit board line art (picture)', w: 320, h: 220 },
  { key: 'artplant', cat: 'nature', label: 'Growing plant (picture)', w: 444, h: 342 },
  { key: 'artearth', cat: 'nature', label: 'Earth with seedling (picture)', w: 260, h: 240 },
  { key: 'artlabour', cat: 'work', label: 'Workers\' tribute (picture)', w: 300, h: 240 },
  { key: 'artsite', cat: 'work', label: 'Building site line art (picture)', w: 300, h: 220 },
  { key: 'artskyline', cat: 'work', label: 'Building site silhouette (picture)', w: 560, h: 300 },
  { key: 'artcharkha', cat: 'festive', label: 'Charkha (picture)', w: 372, h: 250 },
  { key: 'artdiwali', cat: 'festive', label: 'Royal diya (picture)', w: 340, h: 260 },
  { key: 'artgulalyellow', cat: 'festive', label: 'Gulal plate: yellow (picture)', w: 143, h: 103 },
  { key: 'artgulalteal', cat: 'festive', label: 'Gulal plate: teal (picture)', w: 128, h: 103 },
  { key: 'artgulalpurple', cat: 'festive', label: 'Gulal plate: purple (picture)', w: 122, h: 100 },
  { key: 'artgulalpink', cat: 'festive', label: 'Gulal plate: pink (picture)', w: 133, h: 110 },
  { key: 'artgulalgreen', cat: 'festive', label: 'Gulal plate: green (picture)', w: 150, h: 120 },
  { key: 'artgulalred', cat: 'festive', label: 'Gulal plate: orange-red (picture)', w: 134, h: 116 },
  { key: 'shield', cat: 'work', label: 'Shield', w: 90, h: 100 },
  { key: 'hardhatridge', cat: 'work', label: 'Hat ridge', w: 130, h: 100 },
  { key: 'hardhatshade', cat: 'work', label: 'Hat shading', w: 130, h: 100 },
  { key: 'conebands', cat: 'work', label: 'Cone stripes', w: 90, h: 110 },
  { key: 'coneshade', cat: 'work', label: 'Cone shading', w: 90, h: 110 },
  { key: 'diya', cat: 'festive', label: 'Diya', w: 100, h: 56 },
  { key: 'flame', cat: 'festive', label: 'Flame', w: 36, h: 64 },
  { key: 'kite', cat: 'festive', label: 'Kite', w: 70, h: 120 },
  { key: 'balloon', cat: 'festive', label: 'Balloon', w: 60, h: 100 },
  { key: 'flag', cat: 'festive', label: 'Flag', w: 110, h: 90 },
  { key: 'jet', cat: 'work', label: 'Jet', w: 70, h: 70 },
  { key: 'swoosh', cat: 'basic', label: 'Swoosh', w: 220, h: 100, p: 0.05 },
  { key: 'book', cat: 'festive', label: 'Book', w: 70, h: 90 },
  { key: 'spectacles', cat: 'festive', label: 'Spectacles', w: 360, h: 130, p: 0.035 },
  { key: 'chakra', cat: 'festive', label: 'Ashoka Chakra', w: 130, h: 130 },
  { key: 'indiagate', cat: 'festive', label: 'India Gate', w: 130, h: 170 },
  { key: 'redfort', cat: 'festive', label: 'Red Fort', w: 300, h: 110 },
  { key: 'tajmahal', cat: 'festive', label: 'Taj Mahal', w: 300, h: 166 },
  { key: 'qutub', cat: 'festive', label: 'Qutub Minar', w: 60, h: 280 },
  { key: 'ribbon', cat: 'festive', label: 'Fluttering band', w: 160, h: 100 },
  { key: 'bow', cat: 'festive', label: 'Bow and arrow', w: 300, h: 200 },
  { key: 'modak', cat: 'festive', label: 'Modak', w: 96, h: 90 },
  { key: 'splash', cat: 'festive', label: 'Colour splash', w: 120, h: 120 },
  { key: 'burst', cat: 'festive', label: 'Gulal cloud', w: 160, h: 160 },
  { key: 'temple', cat: 'festive', label: 'Temple', w: 140, h: 200 },
  { key: 'bauble', cat: 'festive', label: 'Bauble', w: 50, h: 60 },
  { key: 'holly', cat: 'nature', label: 'Holly leaf', w: 50, h: 90 },
  { key: 'bananaleaf', cat: 'nature', label: 'Plantain leaf', w: 260, h: 70 },
  { key: 'mosque', cat: 'festive', label: 'Mosque', w: 300, h: 180 },
  { key: 'lantern', cat: 'festive', label: 'Lantern', w: 46, h: 78 },
  { key: 'flower', cat: 'nature', label: 'Marigold', w: 60, h: 60 },
  { key: 'bird', cat: 'nature', label: 'Bird', w: 70, h: 40 },
  { key: 'hand', cat: 'work', label: 'Hand', w: 60, h: 90 },
]
export const shapeInfo = (key) => SHAPES.find((s) => s.key === key) || SHAPES[0]

// The settings each shape offers in the editor, in plain words.
export const SHAPE_SETTINGS = {
  spectacles: [{ key: 'p', label: 'Frame thickness', min: 0.015, max: 0.08, step: 0.005, lo: 'Fine', hi: 'Bold' }],
  swoosh: [{ key: 'p', label: 'Thickness', min: 0.02, max: 0.2, step: 0.005, lo: 'Thin', hi: 'Thick' }],
  rect: [{ key: 'p', label: 'Rounded corners', min: 0, max: 1, step: 0.05, lo: 'Square', hi: 'Round' }],
  ring: [{ key: 'p', label: 'Thickness', min: 0.08, max: 0.9, step: 0.02, lo: 'Thin', hi: 'Thick' }],
  star: [
    { key: 'n', label: 'Points', min: 3, max: 12, step: 1, lo: '3', hi: '12' },
    { key: 'p', label: 'Pointiness', min: 0.2, max: 0.9, step: 0.02, lo: 'Sharp', hi: 'Soft' },
  ],
  wave: [
    { key: 'n', label: 'How many waves', min: 1, max: 12, step: 1, lo: 'Few', hi: 'Many' },
    { key: 'p', label: 'Thickness', min: 0.05, max: 0.5, step: 0.01, lo: 'Thin', hi: 'Thick' },
  ],
}

const UNIT = {
  flame: 'M0,-0.5 C0.18,-0.28 0.3,-0.12 0.3,0.12 C0.3,0.36 0.16,0.5 0,0.5 C-0.16,0.5 -0.3,0.36 -0.3,0.12 C-0.3,-0.1 -0.1,-0.22 0,-0.5 Z',
  jet: 'M0,-0.5 L0.05,-0.3 L0.07,-0.12 L0.5,0.3 L0.5,0.38 L0.09,0.26 L0.08,0.38 L0.2,0.5 L0,0.46 L-0.2,0.5 L-0.08,0.38 L-0.09,0.26 L-0.5,0.38 L-0.5,0.3 L-0.07,-0.12 L-0.05,-0.3 Z',
  book: 'M-0.38,-0.5 H0.42 V0.46 H-0.38 Z M-0.34,0.46 H0.4 V0.5 H-0.34 Z M-0.3,-0.5 H-0.27 V0.46 H-0.3 Z M0.2,-0.18 A0.13,0.13 0 1,1 -0.06,-0.18 A0.13,0.13 0 1,1 0.2,-0.18 Z M-0.15,0.05 H0.29 V0.08 H-0.15 Z M-0.1,0.13 H0.24 V0.16 H-0.1 Z M-0.1,0.21 H0.24 V0.24 H-0.1 Z',
  bird: 'M-0.5,0.05 C-0.3,-0.3 -0.1,-0.25 0,0 C0.1,-0.25 0.3,-0.3 0.5,0.05 C0.3,-0.1 0.12,-0.08 0,0.14 C-0.12,-0.08 -0.3,-0.1 -0.5,0.05 Z',
  ribbon: 'M-0.5,-0.3 C-0.25,-0.5 -0.25,-0.1 0,-0.3 C0.25,-0.5 0.25,-0.1 0.5,-0.3 V0.2 C0.25,0.4 0.25,0 0,0.2 C-0.25,0.4 -0.25,0 -0.5,0.2 Z',
  tree: 'M0,-0.5 L0.18,-0.24 H0.09 L0.26,-0.04 H0.14 L0.34,0.2 H0.06 V0.5 H-0.06 V0.2 H-0.34 L-0.14,-0.04 H-0.26 L-0.09,-0.24 H-0.18 Z',
  broadtree: 'M-0.37,-0.12 A0.2,0.2 0 1,1 0.03,-0.12 A0.2,0.2 0 1,1 -0.37,-0.12 Z M-0.03,-0.12 A0.2,0.2 0 1,1 0.37,-0.12 A0.2,0.2 0 1,1 -0.03,-0.12 Z M-0.22,-0.28 A0.22,0.22 0 1,1 0.22,-0.28 A0.22,0.22 0 1,1 -0.22,-0.28 Z M-0.2,0 A0.2,0.2 0 1,1 0.2,0 A0.2,0.2 0 1,1 -0.2,0 Z M-0.05,-0.02 H0.05 L0.07,0.5 H-0.07 Z',
  cloud: 'M-0.5,0.3 A0.2,0.2 0 0,1 -0.36,-0.06 A0.26,0.26 0 0,1 0.12,-0.2 A0.22,0.22 0 0,1 0.4,0.1 A0.2,0.2 0 0,1 0.32,0.3 Z',
  helicopter: 'M-0.2,-0.1 C-0.2,-0.28 0.1,-0.3 0.2,-0.12 C0.25,0 0.2,0.12 0.05,0.15 H-0.15 C-0.22,0.12 -0.2,0 -0.2,-0.1 Z M-0.2,-0.12 L-0.5,-0.18 L-0.5,-0.08 L-0.2,0 Z M-0.5,-0.18 L-0.46,-0.32 L-0.4,-0.32 L-0.42,-0.15 Z M-0.38,-0.36 H0.38 V-0.33 H-0.38 Z M-0.02,-0.34 H0.02 V-0.26 H-0.02 Z M-0.18,0.24 H0.2 V0.27 H-0.18 Z M-0.1,0.15 H-0.07 V0.24 H-0.1 Z M0.07,0.15 H0.1 V0.24 H0.07 Z',
  hardhat: 'M-0.42,0.12 C-0.42,-0.28 -0.22,-0.47 0.02,-0.47 C0.27,-0.47 0.43,-0.28 0.43,0.12 Z M-0.5,0.1 C-0.5,0.06 -0.46,0.05 -0.4,0.05 H0.4 C0.47,0.05 0.51,0.1 0.5,0.17 L0.46,0.29 Q0.42,0.37 0.3,0.37 H-0.3 Q-0.42,0.37 -0.46,0.29 Z',
  hardhatridge: 'M-0.12,0.06 C-0.19,-0.2 -0.1,-0.39 0.0,-0.46 L0.1,-0.45 C0.04,-0.36 0.0,-0.2 0.0,0.06 Z',
  hardhatshade: 'M0.2,-0.4 C0.36,-0.3 0.43,-0.12 0.43,0.12 L0.12,0.12 C0.24,-0.06 0.26,-0.26 0.2,-0.4 Z',
  drillbit: 'M-0.13,-0.5 H0.13 V-0.15 H-0.13 Z M-0.3,-0.15 H0.3 L0.34,0.15 H-0.34 Z M-0.1,0.3 A0.18,0.18 0 1,0 -0.46,0.3 A0.18,0.18 0 1,0 -0.1,0.3 Z M0.18,0.34 A0.18,0.18 0 1,0 -0.18,0.34 A0.18,0.18 0 1,0 0.18,0.34 Z M0.46,0.3 A0.18,0.18 0 1,0 0.1,0.3 A0.18,0.18 0 1,0 0.46,0.3 Z',
  wrench: 'M-0.3,-0.22 A0.22,0.22 0 1,0 -0.3,0.22 A0.22,0.22 0 1,0 -0.3,-0.22 Z M-0.52,-0.07 H-0.3 V0.07 H-0.52 Z M-0.08,-0.1 H0.42 A0.1,0.1 0 0,1 0.42,0.1 H-0.08 Z',
  shield: 'M0,-0.5 L0.4,-0.36 V0.02 C0.4,0.28 0.2,0.42 0,0.5 C-0.2,0.42 -0.4,0.28 -0.4,0.02 V-0.36 Z',
  cone: 'M-0.17,-0.46 Q-0.17,-0.5 -0.12,-0.5 H0.12 Q0.17,-0.5 0.17,-0.46 L0.36,0.32 H-0.36 Z M-0.5,0.3 H0.5 V0.42 Q0.5,0.5 0.42,0.5 H-0.42 Q-0.5,0.5 -0.5,0.42 Z',
  conebands: 'M-0.2187,-0.26 H0.2187 L0.2577,-0.1 H-0.2577 Z M-0.2918,0.04 H0.2918 L0.3308,0.2 H-0.3308 Z',
  coneshade: 'M-0.17,-0.46 H-0.07 L-0.17,0.32 H-0.36 Z',
  kite: 'M0,-0.5 L0.3,-0.1 L0,0.3 L-0.3,-0.1 Z M-0.01,0.3 C-0.2,0.38 0.2,0.42 0,0.5 L0.01,0.5 C0.22,0.42 -0.18,0.38 0.01,0.3 Z',
  balloon: 'M0,-0.5 C0.35,-0.5 0.38,0 0.1,0.28 L0.06,0.32 H-0.06 L-0.1,0.28 C-0.38,0 -0.35,-0.5 0,-0.5 Z M-0.06,0.32 L0,0.4 L0.06,0.32 Z M-0.005,0.4 C-0.08,0.44 0.08,0.47 -0.005,0.5 H0.005 C0.09,0.47 -0.07,0.44 0.005,0.4 Z',
  flag: 'M-0.46,-0.5 H-0.42 V0.5 H-0.46 Z M-0.42,-0.48 C-0.2,-0.58 0,-0.38 0.5,-0.48 V0.04 C0,0.14 -0.2,-0.06 -0.42,0.04 Z',
  circle: 'M-0.5,0 A0.5,0.5 0 1,0 0.5,0 A0.5,0.5 0 1,0 -0.5,0 Z',
  triangle: 'M0,-0.5 L0.5,0.5 L-0.5,0.5 Z',
  diamond: 'M0,-0.5 L0.5,0 L0,0.5 L-0.5,0 Z',
  sparkle: 'M0,-0.5 Q0,0 0.5,0 Q0,0 0,0.5 Q0,0 -0.5,0 Q0,0 0,-0.5 Z',
  heart: 'M0,0.45 C-0.55,0.05 -0.5,-0.45 -0.2,-0.45 C-0.08,-0.45 0,-0.38 0,-0.3 C0,-0.38 0.08,-0.45 0.2,-0.45 C0.5,-0.45 0.55,0.05 0,0.45 Z',
  moon: 'M0.17,-0.47 A0.5,0.5 0 1,0 0.17,0.47 C-0.32,0.36 -0.32,-0.36 0.17,-0.47 Z',
  drop: 'M0,-0.5 C0.3,-0.1 0.4,0.1 0.4,0.2 A0.4,0.3 0 0,1 -0.4,0.2 C-0.4,0.1 -0.3,-0.1 0,-0.5 Z',
  leaf: 'M-0.5,0.5 C-0.5,-0.2 0,-0.5 0.5,-0.5 C0.5,0.2 0,0.5 -0.5,0.5 Z',
  rig: 'M-0.07,-0.5 L0.07,-0.5 L0.13,0.12 L-0.13,0.12 Z M-0.14,-0.5 H0.14 V-0.46 H-0.14 Z M-0.5,0.12 H0.5 V0.2 H-0.5 Z M-0.42,0.2 H-0.34 V0.5 H-0.42 Z M0.34,0.2 H0.42 V0.5 H0.34 Z M-0.04,0.2 H0.04 V0.5 H-0.04 Z M0.13,-0.15 L0.4,0.12 L0.36,0.12 L0.13,-0.1 Z',
  ship: 'M-0.5,0.08 H0.5 L0.38,0.4 H-0.4 Z M-0.42,-0.14 H-0.08 V0.08 H-0.42 Z M-0.36,-0.3 H-0.14 V-0.14 H-0.36 Z M0.08,-0.4 H0.11 V0.08 H0.08 Z M0.11,-0.4 L0.42,-0.08 L0.4,-0.05 L0.11,-0.36 Z',
}

// Round spectacles with a bridge and two arms that both sweep the same way (to the right) and curl at the end, drawn as
// lines (a frame thickness, not a fill).
function spectaclesSpec(l) {
  const w = l.w
  const h = l.h
  const r = Math.min(h, w * 0.26) / 2
  const gap = r * 0.4
  const cl = -(r + gap / 2)
  const cr = r + gap / 2
  const hr = Math.max(4, r * 0.3)
  const lens = (cx) => `M${cx - r},0 A${r},${r} 0 1,0 ${cx + r},0 A${r},${r} 0 1,0 ${cx - r},0 Z`
  // the left arm rises from the left lens and curls over the right lens; the right arm leaves the right lens and curls at the edge
  const lx0 = cl - r * 0.96
  const ly0 = -r * 0.2
  const lx1 = cr + r * 0.15
  const ly1 = -r * 0.98
  const rx0 = cr + r * 0.96
  const ry0 = -r * 0.2
  const rx1 = w / 2 - hr
  const ry1 = -r * 0.5
  const d = `${lens(cl)} ${lens(cr)} M${cl + r},0 Q0,${-r * 0.4} ${cr - r},0 M${lx0},${ly0} L${lx1},${ly1} A${hr},${hr} 0 0,1 ${lx1},${ly1 + hr * 2} M${rx0},${ry0} L${rx1},${ry1} A${hr},${hr} 0 0,1 ${rx1},${ry1 + hr * 2}`
  return { stroke: Math.max(2, h * (l.p ?? 0.035)), d }
}

// The 24-spoke wheel of the national flag.
function chakraPath() {
  let d = 'M-0.5,0 A0.5,0.5 0 1,0 0.5,0 A0.5,0.5 0 1,0 -0.5,0 Z M-0.44,0 A0.44,0.44 0 1,1 0.44,0 A0.44,0.44 0 1,1 -0.44,0 Z M0.06,0 A0.06,0.06 0 1,0 -0.06,0 A0.06,0.06 0 1,0 0.06,0 Z'
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12
    const c = Math.cos(a)
    const s = Math.sin(a)
    const pt = (r, off) => `${(r * c - off * s).toFixed(4)},${(r * s + off * c).toFixed(4)}`
    d += ` M${pt(0.07, -0.006)} L${pt(0.435, -0.014)} L${pt(0.435, 0.014)} L${pt(0.07, 0.006)} Z`
  }
  return d
}

// The great landmarks are drawn from photographs of the real buildings, as solid silhouettes. Each is a set of pieces in a
// 1 x 1 box with holes cut for the arches (even-odd fill), so no two filled pieces ever overlap.

const arch = (cx, hw, y0, y1) => `M${(cx - hw).toFixed(3)},${y0} V${y1} A${hw},${hw} 0 0,1 ${(cx + hw).toFixed(3)},${y1} V${y0} Z` // a round-headed opening
const pointed = (cx, hw, y0, yTop, rise) => `M${(cx - hw).toFixed(3)},${y0} V${(yTop + rise).toFixed(3)} Q${(cx - hw).toFixed(3)},${(yTop + rise * 0.35).toFixed(3)} ${cx.toFixed(3)},${yTop} Q${(cx + hw).toFixed(3)},${(yTop + rise * 0.35).toFixed(3)} ${(cx + hw).toFixed(3)},${(yTop + rise).toFixed(3)} V${y0} Z` // a pointed Mughal arch
const rect = (x0, y0, x1, y1) => `M${x0},${y0} H${x1} V${y1} H${x0} Z`

// India Gate: a shallow dome on a stepped crown, the INDIA panel and two medallions, a projecting cornice, two great piers with
// a tall arch between them (and a fine groove round it), pilasters and panels, on a plinth.
function indiaGatePath() {
  let d = 'M-0.1,-0.44 A0.1,0.035 0 0,1 0.1,-0.44 Z'
  d += ` ${rect(-0.19, -0.44, 0.19, -0.4)} ${rect(-0.26, -0.4, 0.26, -0.33)} ${rect(-0.34, -0.33, 0.34, -0.25)} ${rect(-0.45, -0.25, 0.45, -0.18)}`
  d += ` ${rect(-0.5, -0.18, 0.5, -0.14)} ${rect(-0.46, -0.14, 0.46, -0.12)}`
  d += ` ${rect(-0.46, -0.12, 0.46, 0.45)} ${rect(-0.5, 0.45, 0.5, 0.5)}`
  d += ` ${rect(-0.12, -0.37, 0.12, -0.35)} M-0.16,-0.3 A0.022,0.022 0 1,1 -0.116,-0.3 A0.022,0.022 0 1,1 -0.16,-0.3 Z M0.116,-0.3 A0.022,0.022 0 1,1 0.16,-0.3 A0.022,0.022 0 1,1 0.116,-0.3 Z`
  d += ` ${arch(0, 0.15, 0.45, 0.1)} M-0.19,0.45 V0.1 A0.19,0.19 0 0,1 0.19,0.1 V0.45 H0.175 V0.1 A0.175,0.175 0 0,0 -0.175,0.1 V0.45 Z`
  for (const sgn of [-1, 1]) {
    const x0 = sgn < 0 ? -0.455 : 0.285
    d += ` ${rect(x0 + 0.04, 0.1, x0 + 0.13, 0.36)} ${rect(x0 + 0.04, -0.03, x0 + 0.13, 0.05)}`
    d += ` M${sgn * 0.37 - 0.022},-0.1 A0.022,0.022 0 1,1 ${sgn * 0.37 + 0.022},-0.1 A0.022,0.022 0 1,1 ${sgn * 0.37 - 0.022},-0.1 Z`
    d += ` ${rect(sgn < 0 ? -0.262 : 0.25, -0.1, sgn < 0 ? -0.25 : 0.262, 0.43)}`
  }
  return d
}

// The Taj Mahal: a wide platform, the main hall with its pointed portal and flanking windows, the great onion dome on its drum with
// a finial, two small domes, two lower wings with arches, two tall minarets at the ends and two shorter ones behind the wings.
function tajPath() {
  let d = rect(-0.5, 0.38, 0.5, 0.5)
  d += ` ${rect(-0.22, -0.04, 0.22, 0.38)} ${pointed(0, 0.075, 0.38, -0.02, 0.1)}`
  for (const cx of [-0.15, 0.15]) d += ` ${pointed(cx, 0.03, 0.2, 0.0, 0.05)}`
  d += ' M-0.11,-0.11 C-0.125,-0.25 -0.07,-0.34 0,-0.39 C0.07,-0.34 0.125,-0.25 0.11,-0.11 Z'
  d += ` ${rect(-0.085, -0.11, 0.085, -0.04)} ${rect(-0.006, -0.5, 0.006, -0.39)}`
  for (const sgn of [-1, 1]) {
    const x = (v) => sgn * v
    const lo = Math.min(x(0.22), x(0.365))
    const hi = Math.max(x(0.22), x(0.365))
    d += ` ${rect(lo, 0.13, hi, 0.38)}`
    for (const cx of [0.255, 0.33]) d += ` ${pointed(x(cx), 0.026, 0.38, 0.2, 0.05)}`
    // small domes on the corners of the main hall
    d += ` M${x(0.115)},-0.04 A0.04,0.05 0 0,${sgn < 0 ? 0 : 1} ${x(0.195)},-0.04 Z`
    // outer minaret (tall) and inner minaret (short, behind the wing), in lengths between their balconies so nothing overlaps
    const minaret = (cx, top, bottom, hw) => {
      let m = ''
      let y = top
      const stops = [0.3, 0.62, 0.9].map((f) => top + (bottom - top) * f)
      for (const sy of stops) {
        m += ` ${rect(cx - hw, y, cx + hw, sy - 0.006)}`
        m += ` ${rect(cx - hw * 1.7, sy - 0.006, cx + hw * 1.7, sy + 0.006)}`
        y = sy + 0.006
      }
      m += ` ${rect(cx - hw, y, cx + hw, bottom)}`
      m += ` M${cx - hw * 1.5},${top} A${hw * 1.5},${hw * 2.2} 0 0,1 ${cx + hw * 1.5},${top} Z ${rect(cx - 0.004, top - 0.05, cx + 0.004, top - 0.022)}`
      return m
    }
    d += minaret(x(0.47), -0.26, 0.38, 0.018)
    d += minaret(x(0.292), 0.0, 0.13, 0.013)
  }
  return d
}

// The Red Fort's Lahore Gate: two octagonal towers each topped with a domed pavilion, a balcony of small marble domes between
// two slender minarets, an arcade, the great gate arch, and a wall base.
function redFortPath() {
  let d = rect(-0.5, 0.31, 0.5, 0.5)
  for (const sgn of [-1, 1]) {
    const x = (v) => sgn * v
    const lo = (a, b) => Math.min(x(a), x(b))
    const hi = (a, b) => Math.max(x(a), x(b))
    d += ` ${rect(lo(0.5, 0.25), -0.16, hi(0.5, 0.25), 0.31)}`
    d += ` ${rect(lo(0.45, 0.3), -0.31, hi(0.45, 0.3), -0.16)}`
    d += ` M${x(0.47)},-0.31 C${x(0.47)},-0.42 ${x(0.42)},-0.47 ${x(0.375)},-0.49 C${x(0.33)},-0.47 ${x(0.28)},-0.42 ${x(0.28)},-0.31 Z`
    d += ` ${rect(x(0.378) - 0.004, -0.5, x(0.378) + 0.004, -0.485)}`
    for (const cx of [0.415, 0.36, 0.305]) d += ` ${arch(x(cx), 0.016, -0.17, -0.25)}`
    for (const cx of [0.44, 0.375, 0.31]) d += ` ${arch(x(cx), 0.02, 0.31, 0.14)}`
    d += ` ${rect(lo(0.46, 0.44), -0.02, hi(0.46, 0.44), 0.05)} ${rect(lo(0.34, 0.32), -0.02, hi(0.34, 0.32), 0.05)}`
    // a slender minaret beside the gate
    const mx = sgn < 0 ? -0.17 : 0.145
    d += ` ${rect(mx - 0.015, -0.4, mx + 0.015, -0.09)} M${mx - 0.024},-0.4 A0.024,0.045 0 0,1 ${mx + 0.024},-0.4 Z ${rect(mx - 0.004, -0.5, mx + 0.004, -0.44)}`
  }
  d += ` ${rect(-0.25, -0.09, 0.25, 0.31)} ${rect(-0.15, -0.12, 0.15, -0.09)}`
  for (let i = -3; i <= 3; i++) d += ` M${(i * 0.04 - 0.017).toFixed(3)},-0.12 A0.017,0.03 0 0,1 ${(i * 0.04 + 0.017).toFixed(3)},-0.12 Z`
  for (let i = -3; i <= 3; i++) d += ` ${arch(i * 0.05, 0.018, 0.03, -0.03)}`
  d += ` ${arch(0, 0.07, 0.31, 0.12)}`
  return d
}

// The Qutub Minar: five fluted tiers, each narrower than the one below, each ending in a projecting balcony on brackets, and a
// small domed cap. The two wide tiers have a scalloped edge from the flutes.
function qutubPath() {
  const tiers = [
    { y0: 0.5, y1: 0.2, w0: 0.3, w1: 0.25, teeth: 9 },
    { y0: 0.16, y1: -0.08, w0: 0.245, w1: 0.205, teeth: 7 },
    { y0: -0.12, y1: -0.28, w0: 0.19, w1: 0.165, teeth: 0 },
    { y0: -0.312, y1: -0.41, w0: 0.155, w1: 0.135, teeth: 0 },
    { y0: -0.436, y1: -0.47, w0: 0.115, w1: 0.1, teeth: 0 },
  ]
  const balconies = [[0.2, 0.16, 0.25, 0.5], [-0.08, -0.12, 0.205, 0.42], [-0.28, -0.312, 0.165, 0.36], [-0.41, -0.436, 0.135, 0.31]]
  let d = ''
  for (const t of tiers) {
    const left = []
    const right = []
    const n = t.teeth || 1
    for (let i = 0; i <= n; i++) {
      const f = i / n
      const y = t.y0 + (t.y1 - t.y0) * f
      const w = t.w0 + (t.w1 - t.w0) * f
      const bump = t.teeth && i % 2 === 1 ? 0.012 : 0
      left.push(`${(-w - bump).toFixed(3)},${y.toFixed(3)}`)
      right.push(`${(w + bump).toFixed(3)},${y.toFixed(3)}`)
    }
    d += ` M${left.join(' L')} L${right.reverse().join(' L')} Z`
  }
  for (const [yb, ys, wt, wb] of balconies) d += ` M${-wt},${yb} L${-wb * 0.88},${ys + 0.012} V${ys} H${wb} V${ys + 0.012} L${wt},${yb} Z`
  d += ' M-0.1,-0.47 A0.1,0.03 0 0,1 0.1,-0.47 Z'
  return d
}

// A mosque: a great dome with a finial and two lower domes on a wide prayer hall with a pointed doorway and arched windows,
// and two pencil-thin minarets with balconies and pointed caps, on a platform.
function mosquePath() {
  let d = rect(-0.5, 0.36, 0.5, 0.5)
  d += ` ${rect(-0.36, 0.1, 0.36, 0.36)} ${pointed(0, 0.08, 0.36, 0.14, 0.08)}`
  for (const cx of [-0.3, -0.22, 0.22, 0.3]) d += ` ${arch(cx, 0.025, 0.3, 0.22)}`
  d += ' M-0.22,0.1 A0.22,0.22 0 0,1 0.22,0.1 Z M-0.005,-0.2 H0.005 V-0.12 H-0.005 Z'
  d += ' M-0.36,0.1 A0.09,0.09 0 0,1 -0.2,0.1 Z M0.2,0.1 A0.09,0.09 0 0,1 0.36,0.1 Z'
  for (const sgn of [-1, 1]) {
    const cx = sgn * 0.44
    const stops = [-0.18, 0.0, 0.18]
    let y = -0.34
    for (const sy of stops) {
      d += ` ${rect(cx - 0.015, y, cx + 0.015, sy - 0.006)} ${rect(cx - 0.032, sy - 0.006, cx + 0.032, sy + 0.006)}`
      y = sy + 0.006
    }
    d += ` ${rect(cx - 0.015, y, cx + 0.015, 0.36)} M${cx - 0.026},-0.34 L${cx},-0.48 L${cx + 0.026},-0.34 Z`
  }
  return d
}

// A hanging festival lantern (fanous): a ring to hang it from, a domed cap, a tapering body with two pointed windows, a base and a tassel.
function lanternPath() {
  let d = rect(-0.015, -0.5, 0.015, -0.4)
  d += ' M-0.16,-0.28 C-0.16,-0.4 -0.08,-0.42 0,-0.42 C0.08,-0.42 0.16,-0.4 0.16,-0.28 Z'
  d += ' M-0.2,-0.28 H0.2 L0.26,0.2 H-0.26 Z'
  d += ` ${pointed(-0.1, 0.06, 0.12, -0.2, 0.09)} ${pointed(0.1, 0.06, 0.12, -0.2, 0.09)}`
  d += ' M-0.26,0.2 H0.26 L0.2,0.3 H-0.2 Z'
  d += ` ${rect(-0.015, 0.3, 0.015, 0.5)}`
  return d
}

// A splash of paint: an uneven blob with pointed streaks thrown outwards and a few flying drops.
function splashPath() {
  const pts = []
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI * 2) / 24
    const r = 0.25 + 0.035 * Math.sin(a * 3 + 1) + 0.02 * Math.sin(a * 5)
    pts.push(`${(r * Math.cos(a)).toFixed(3)},${(r * Math.sin(a)).toFixed(3)}`)
  }
  let d = `M${pts.join(' L')} Z`
  const streaks = [[0.2, 0.5, 0.09], [0.9, 0.44, 0.07], [1.6, 0.5, 0.085], [2.3, 0.4, 0.07], [3.0, 0.49, 0.09], [3.8, 0.43, 0.075], [4.5, 0.5, 0.085], [5.3, 0.42, 0.07]]
  for (const [a, tip, w] of streaks) {
    const p = (r, da) => `${(r * Math.cos(a + da)).toFixed(3)},${(r * Math.sin(a + da)).toFixed(3)}`
    d += ` M${p(0.2, -w)} L${p(tip, 0)} L${p(0.2, w)} Z`
    const dr = Math.min(0.5, tip + 0.03)
    const cx = (dr * Math.cos(a + 0.28)) * 0.98
    const cy = (dr * Math.sin(a + 0.28)) * 0.98
    d += ` M${(cx + 0.028).toFixed(3)},${cy.toFixed(3)} A0.028,0.028 0 1,1 ${(cx - 0.028).toFixed(3)},${cy.toFixed(3)} A0.028,0.028 0 1,1 ${(cx + 0.028).toFixed(3)},${cy.toFixed(3)} Z`
  }
  return d
}

// A puff of coloured powder (gulal): a heart of powder with soft round lobes billowing out of it.
function burstPath() {
  const lobes = [[0, 0.3, 0.19], [0.55, 0.32, 0.15], [1.1, 0.28, 0.2], [1.7, 0.33, 0.14], [2.25, 0.3, 0.18], [2.85, 0.32, 0.16], [3.4, 0.29, 0.2], [4.0, 0.33, 0.14], [4.6, 0.3, 0.19], [5.2, 0.32, 0.16]]
  let d = 'M0.3,0 A0.3,0.3 0 1,1 -0.3,0 A0.3,0.3 0 1,1 0.3,0 Z'
  for (const [a, dist, r] of lobes) {
    const cx = dist * Math.cos(a)
    const cy = dist * Math.sin(a)
    d += ` M${(cx + r).toFixed(3)},${cy.toFixed(3)} A${r},${r} 0 1,1 ${(cx - r).toFixed(3)},${cy.toFixed(3)} A${r},${r} 0 1,1 ${(cx + r).toFixed(3)},${cy.toFixed(3)} Z`
  }
  return d
}

// A temple: a platform, a porch with a stepped roof and doorway, a tall curved tower (shikhara) with ribs, a crowning disc and
// pot, and a smaller tower on each side.
function templePath() {
  let d = rect(-0.5, 0.4, 0.5, 0.5)
  d += ` ${rect(-0.5, 0.2, 0.5, 0.4)} ${arch(0, 0.07, 0.4, 0.28)} ${rect(-0.45, 0.14, 0.45, 0.2)} ${rect(-0.38, 0.09, 0.38, 0.14)} ${rect(-0.3, 0.05, 0.3, 0.09)}`
  d += ' M-0.24,0.05 C-0.24,-0.2 -0.14,-0.36 0,-0.42 C0.14,-0.36 0.24,-0.2 0.24,0.05 Z'
  for (const y of [-0.31, -0.2, -0.09, 0.0]) {
    const hw = 0.24 * Math.sqrt((y + 0.42) / 0.47) - 0.012
    d += ` M${-hw.toFixed(3)},${y} H${hw.toFixed(3)} V${y + 0.012} H${-hw.toFixed(3)} Z`
  }
  d += ' M-0.06,-0.425 A0.06,0.02 0 1,1 0.06,-0.425 A0.06,0.02 0 1,1 -0.06,-0.425 Z M-0.016,-0.445 H0.016 V-0.5 H-0.016 Z'
  for (const sgn of [-1, 1]) {
    const x = (v) => (sgn * v).toFixed(3)
    d += ` M${x(0.46)},0.05 C${x(0.46)},-0.08 ${x(0.4)},-0.16 ${x(0.36)},-0.2 C${x(0.32)},-0.16 ${x(0.26)},-0.08 ${x(0.26)},0.05 Z`
  }
  return d
}

// A holly leaf: pointed, with spiky edges.
function hollyPath() {
  const right = []
  const left = []
  for (let k = 0; k < 5; k++) {
    const y = -0.4 + k * 0.17
    right.push(`${0.3},${y.toFixed(3)}`, `${0.16},${(y + 0.085).toFixed(3)}`)
    left.push(`${-0.3},${y.toFixed(3)}`, `${-0.16},${(y + 0.085).toFixed(3)}`)
  }
  return `M0,-0.5 L${right.join(' L')} L0,0.5 L${left.reverse().join(' L')} Z`
}

// A Christmas bauble: a hanging ring, a cap, a round body with a band across it.
function baublePath() {
  let d = 'M-0.4,0.12 A0.4,0.4 0 1,0 0.4,0.12 A0.4,0.4 0 1,0 -0.4,0.12 Z'
  d += ` ${rect(-0.09, -0.36, 0.09, -0.3)} M-0.05,-0.36 A0.05,0.07 0 1,1 0.05,-0.36 L0.035,-0.36 A0.035,0.05 0 1,0 -0.035,-0.36 Z`
  d += ` ${rect(-0.38, 0.06, 0.38, 0.1)}`
  return d
}

// A flower head: a ring of round petals round a centre (a marigold).
function flowerPath() {
  let d = 'M0.17,0 A0.17,0.17 0 1,1 -0.17,0 A0.17,0.17 0 1,1 0.17,0 Z'
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5
    const cx = 0.33 * Math.cos(a)
    const cy = 0.33 * Math.sin(a)
    d += ` M${(cx + 0.14).toFixed(4)},${cy.toFixed(4)} A0.14,0.14 0 1,1 ${(cx - 0.14).toFixed(4)},${cy.toFixed(4)} A0.14,0.14 0 1,1 ${(cx + 0.14).toFixed(4)},${cy.toFixed(4)} Z`
  }
  return d
}

// A modak, the sweet Ganesh loves, as it is painted: a bell-bodied dumpling that is wide and round at the base, with the flanks
// drawn in concavely up to a pointed tip, and curved pleats running from the tip to the base.
function modakPath() {
  let d = 'M0,-0.5 C0.03,-0.4 0.06,-0.3 0.1,-0.2 C0.2,0 0.5,0.05 0.5,0.26 C0.5,0.4 0.42,0.46 0.3,0.46 H-0.3 C-0.42,0.46 -0.5,0.4 -0.5,0.26 C-0.5,0.05 -0.2,0 -0.1,-0.2 C-0.06,-0.3 -0.03,-0.4 0,-0.5 Z'
  for (const bx of [-0.3, -0.15, 0, 0.15, 0.3]) {
    const cx = bx * 1.25
    d += ` M${(bx * 0.05).toFixed(3)},-0.28 Q${cx.toFixed(3)},0.08 ${bx},0.42 L${(bx + 0.02).toFixed(3)},0.42 Q${(cx + 0.02).toFixed(3)},0.08 ${(bx * 0.05 + 0.014).toFixed(3)},-0.28 Z`
  }
  return d
}

// A long plantain leaf with its midrib, for the sweets to sit on.
function bananaLeafPath() {
  return 'M-0.5,0.05 C-0.3,-0.2 0.2,-0.28 0.5,-0.05 C0.25,0.28 -0.25,0.3 -0.5,0.05 Z M-0.46,0.045 Q0,-0.05 0.46,-0.045 L0.46,-0.03 Q0,-0.035 -0.46,0.06 Z'
}

// An open hand, fingers up.
function handPath() {
  let d = 'M-0.2,-0.02 H0.2 V0.4 Q0.2,0.5 0.1,0.5 H-0.1 Q-0.2,0.5 -0.2,0.4 Z'
  for (const [x, top] of [[-0.15, -0.3], [-0.05, -0.42], [0.05, -0.38], [0.15, -0.26]]) d += ` M${x - 0.045},-0.02 V${top + 0.045} A0.045,0.045 0 0,1 ${x + 0.045},${top + 0.045} V-0.02 Z`
  d += ' M-0.2,0.3 L-0.2,0.1 L-0.34,-0.12 A0.045,0.045 0 0,1 -0.42,-0.06 L-0.3,0.2 Z'
  return d
}

// A bow and arrow as the festival paintings show them: a thick recurved bow with curled tips and a studded grip, the string
// running from each tip to the arrow's notch, and the arrow upright with its head up and feathers at the foot.
function bowPath() {
  let d = ''
  for (const sgn of [-1, 1]) {
    const x = (v) => (sgn * v).toFixed(3)
    d += ` M${x(0.06)},-0.2 C${x(0.18)},-0.32 ${x(0.34)},-0.32 ${x(0.45)},-0.16 C${x(0.49)},-0.1 ${x(0.5)},-0.02 ${x(0.44)},0 C${x(0.4)},0.02 ${x(0.38)},-0.03 ${x(0.41)},-0.07 C${x(0.33)},-0.2 ${x(0.2)},-0.24 ${x(0.06)},-0.08 Z`
    for (const [cx, cy] of [[0.15, -0.205], [0.23, -0.245], [0.31, -0.22]]) d += ` M${x(cx + 0.013)},${cy} A0.013,0.013 0 1,1 ${x(cx - 0.013)},${cy} A0.013,0.013 0 1,1 ${x(cx + 0.013)},${cy} Z`
    d += ` M${x(0.44)},0 L${x(0.012)},0.3 L${x(0.012)},0.307 L${x(0.436)},0.005 Z`
    d += ` M${x(0.007)},0.26 L${x(0.05)},0.36 L${x(0.007)},0.32 Z M${x(0.007)},0.32 L${x(0.05)},0.42 L${x(0.007)},0.38 Z`
  }
  d += ` ${rect(-0.06, -0.22, 0.06, 0)} M0.03,-0.11 A0.03,0.03 0 1,1 -0.03,-0.11 A0.03,0.03 0 1,1 0.03,-0.11 Z`
  d += ` ${rect(-0.007, -0.4, 0.007, -0.22)} ${rect(-0.007, 0, 0.007, 0.4)} M-0.035,-0.4 L0,-0.5 L0.035,-0.4 L0.008,-0.41 L-0.008,-0.41 Z`
  return d
}

// A clay lamp (diya): a shallow bowl with a raised lip and an oil opening, with a row of studs and a fine line round its belly.
function diyaPath() {
  let d = 'M-0.5,-0.02 H0.5 C0.5,0.28 0.3,0.5 0,0.5 C-0.3,0.5 -0.5,0.28 -0.5,-0.02 Z'
  d += ` ${rect(-0.5, -0.08, 0.5, -0.02)} M-0.4,-0.05 A0.4,0.025 0 1,1 0.4,-0.05 A0.4,0.025 0 1,1 -0.4,-0.05 Z`
  for (let i = -4; i <= 4; i++) d += ` M${(i * 0.075 + 0.017).toFixed(3)},0.14 A0.017,0.017 0 1,1 ${(i * 0.075 - 0.017).toFixed(3)},0.14 A0.017,0.017 0 1,1 ${(i * 0.075 + 0.017).toFixed(3)},0.14 Z`
  d += ' M-0.3,0.25 Q0,0.31 0.3,0.25 L0.3,0.265 Q0,0.325 -0.3,0.265 Z'
  return d
}

function gearPath() {
  const teeth = 10
  const pts = []
  for (let i = 0; i < teeth * 4; i++) {
    const r = i % 4 < 2 ? 0.5 : 0.38
    const a = (i * Math.PI * 2) / (teeth * 4) - Math.PI / 2
    pts.push(`${(r * Math.cos(a)).toFixed(4)},${(r * Math.sin(a)).toFixed(4)}`)
  }
  return `M${pts.join(' L')} Z M0.14,0 A0.14,0.14 0 1,0 -0.14,0 A0.14,0.14 0 1,0 0.14,0 Z`
}
function sunPath() {
  let d = 'M0.2,0 A0.2,0.2 0 1,0 -0.2,0 A0.2,0.2 0 1,0 0.2,0 Z'
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    const c = Math.cos(a)
    const s = Math.sin(a)
    const pt = (r, off) => `${(r * c - off * s).toFixed(4)},${(r * s + off * c).toFixed(4)}`
    d += ` M${pt(0.28, -0.035)} L${pt(0.5, 0)} L${pt(0.28, 0.035)} Z`
  }
  return d
}
function snowflakePath() {
  let d = ''
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3
    const c = Math.cos(a)
    const s = Math.sin(a)
    const pt = (x, y) => `${(x * c - y * s).toFixed(4)},${(x * s + y * c).toFixed(4)}`
    d += ` M${pt(-0.5, -0.03)} L${pt(0.5, -0.03)} L${pt(0.5, 0.03)} L${pt(-0.5, 0.03)} Z`
    for (const sign of [-1, 1]) {
      d += ` M${pt(sign * 0.3, -0.02)} L${pt(sign * 0.42, -0.14)} L${pt(sign * 0.45, -0.11)} L${pt(sign * 0.33, 0.02)} Z`
      d += ` M${pt(sign * 0.3, 0.02)} L${pt(sign * 0.42, 0.14)} L${pt(sign * 0.45, 0.11)} L${pt(sign * 0.33, -0.02)} Z`
    }
  }
  return d
}

function starPath(n, p) {
  const pts = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.5 * p
    const a = -Math.PI / 2 + (i * Math.PI) / n
    pts.push(`${(r * Math.cos(a)).toFixed(4)},${(r * Math.sin(a)).toFixed(4)}`)
  }
  return `M${pts.join(' L')} Z`
}

// How to draw a layer, in its own coordinates (centred on 0, 0). `unit` paths are drawn in a 1 x 1 box and scaled to the
// layer's width and height; `stroke` shapes are lines with a thickness; `rect` is built from the real size so its
// corners stay round.
export function shapeSpec(l) {
  const w = l.w
  const h = l.h
  switch (l.type) {
    case 'rect': {
      const r = Math.min(w, h) / 2 * (l.p ?? 0.15)
      const x = -w / 2
      const y = -h / 2
      return { d: `M${x + r},${y} H${x + w - r} A${r},${r} 0 0,1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0,1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0,1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0,1 ${x + r},${y} Z` }
    }
    case 'ring': {
      const r = 0.5 * (1 - (l.p ?? 0.25))
      return { unit: true, evenodd: true, d: `${UNIT.circle} M${-r},0 A${r},${r} 0 1,1 ${r},0 A${r},${r} 0 1,1 ${-r},0 Z` }
    }
    case 'star':
      return { unit: true, d: starPath(Math.max(3, Math.round(l.n ?? 5)), l.p ?? 0.45) }
    case 'line':
      return { stroke: Math.max(2, h), d: `M${-w / 2},0 L${w / 2},0` }
    case 'wave': {
      const n = Math.max(1, Math.round(l.n ?? 4))
      const sw = Math.max(2, (l.p ?? 0.2) * h)
      const amp = Math.max(1, h / 2 - sw / 2)
      const step = w / n
      let d = `M${-w / 2},0`
      for (let i = 0; i < n; i++) {
        const x0 = -w / 2 + i * step
        d += ` Q${(x0 + step / 4).toFixed(1)},${-amp * 2} ${(x0 + step / 2).toFixed(1)},0 T${(x0 + step).toFixed(1)},0`
      }
      return { stroke: sw, d }
    }
    case 'gear':
      return { unit: true, evenodd: true, d: gearPath() }
    case 'spectacles':
      return spectaclesSpec(l)
    case 'bow':
      return { unit: true, evenodd: true, d: bowPath() }
    case 'flame':
      return { unit: true, d: UNIT.flame }
    case 'diya':
      return { unit: true, evenodd: true, d: diyaPath() }
    case 'swoosh':
      return { stroke: Math.max(2, l.h * (l.p ?? 0.05)), d: `M${-0.5 * l.w},${0.5 * l.h} Q${0.1 * l.w},${0.5 * l.h} ${0.5 * l.w},${-0.5 * l.h}` }
    case 'book':
      return { unit: true, evenodd: true, d: UNIT.book }
    case 'chakra':
      return { unit: true, evenodd: true, d: chakraPath() }
    case 'redfort':
      return { unit: true, evenodd: true, d: redFortPath() }
    case 'tajmahal':
      return { unit: true, evenodd: true, d: tajPath() }
    case 'qutub':
      return { unit: true, evenodd: true, d: qutubPath() }
    case 'flower':
      return { unit: true, d: flowerPath() }
    case 'splash':
      return { unit: true, d: splashPath() }
    case 'burst':
      return { unit: true, d: burstPath() }
    case 'temple':
      return { unit: true, evenodd: true, d: templePath() }
    case 'holly':
      return { unit: true, d: hollyPath() }
    case 'bauble':
      return { unit: true, evenodd: true, d: baublePath() }
    case 'bananaleaf':
      return { unit: true, evenodd: true, d: bananaLeafPath() }
    case 'mosque':
      return { unit: true, evenodd: true, d: mosquePath() }
    case 'lantern':
      return { unit: true, evenodd: true, d: lanternPath() }
    case 'modak':
      return { unit: true, evenodd: true, d: modakPath() }
    case 'hand':
      return { unit: true, evenodd: true, d: handPath() }
    case 'sun':
      return { unit: true, d: sunPath() }
    case 'snowflake':
      return { unit: true, d: snowflakePath() }
    case 'indiagate':
      return { unit: true, evenodd: true, d: indiaGatePath() }
    default:
      return { unit: true, d: UNIT[l.type] || UNIT.circle }
  }
}

import { fillTokens } from '@/lib/bannerDesign'

import { BANNER_FONTS } from '@/lib/bannerFonts'

export const FONTS = { sans: "'Plus Jakarta Sans', system-ui, sans-serif", serif: "Georgia, 'Times New Roman', serif", ...Object.fromEntries(BANNER_FONTS.filter((f) => f.css).map((f) => [f.key, f.css])) }
export const MAX_TEXT = 40

// The box a text label takes up, for selecting and moving it. Measured with the real font when the browser can, else a
// close guess.
let measureCtx
export function textBox(l) {
  const size = l.size || 48
  const text = fillTokens(l.text, {}) || ' '
  let w = text.length * size * 0.6
  try {
    measureCtx ||= document.createElement('canvas').getContext('2d')
    measureCtx.font = `${l.bold === false ? 500 : 800} ${size}px ${FONTS[l.font || 'sans']}`
    w = measureCtx.measureText(text).width
  } catch {
    /* no canvas: keep the guess */
  }
  w += (l.spacing || 0) * text.length
  return { w: Math.max(10, Math.ceil(w)), h: Math.ceil(size * 1.25) }
}

export function defaultText(id, fill, nth = 0) {
  const layer = { id, type: 'text', x: 640 + (nth % 6) * 30, y: 280 - (nth % 3) * 30, w: 0, h: 0, rot: 0, fill, opacity: 1, text: 'Your words', size: 48, bold: true, font: 'sans', spacing: 0 }
  return { ...layer, ...textBox(layer) }
}

export function defaultLayer(type, id, fill, nth = 0) {
  const info = shapeInfo(type)
  const layer = { id, type, x: 640 + (nth % 6) * 36, y: 120 + (nth % 4) * 30, w: info.w, h: info.h, rot: 0, fill, opacity: 1 }
  if (info.n !== undefined) layer.n = info.n
  if (info.p !== undefined) layer.p = info.p
  return layer
}

// A picture layer for a library picture, sized to fit a 320 x 200 box without changing its proportions.
export function pictureLayer(asset, id, nth = 0) {
  const k = Math.min(320 / asset.width, 200 / asset.height, 1.6)
  const w = Math.max(16, Math.round(asset.width * k))
  const h = Math.max(16, Math.round(asset.height * k))
  return { id, type: 'picture', asset: asset.id, x: 640 + (nth % 6) * 36, y: 150 + (nth % 4) * 24, w, h, rot: 0, fill: '#ffffff', opacity: 1 }
}

export const MAX_PICTURES = 6

export const newLayerId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

// ── scatter ──────────────────────────────────────────────────────────────────────────────────────

// Where the words, search and notice sit, in canvas units, for each layout. A guide only: scatter keeps clear of these.
const KEEP_CLEAR = {
  standard: [[30, 20, 640, 340], [840, 30, 1190, 240]],
  mirrored: [[560, 20, 1170, 340], [20, 30, 370, 240]],
  centred: [[240, 20, 960, 340]],
}
const FESTIVE = ['#fde68a', '#ff9933', '#ec4899', '#38bdf8', '#a78bfa', '#4ade80']

// New shapes sprinkled at random over the banner (confetti, stars, leaves). Returns the layers; the caller adds them.
export function scatterLayers({ type, count, minW, maxW, fills, mix, rotate, vary, avoid, layout, ids }) {
  const info = shapeInfo(type)
  const clear = avoid ? KEEP_CLEAR[layout] || KEEP_CLEAR.standard : []
  const out = []
  for (let i = 0; i < count; i++) {
    const w = Math.round(minW + Math.random() * Math.max(0, maxW - minW))
    const h = Math.max(2, Math.round((w * info.h) / info.w))
    let x = 0
    let y = 0
    for (let tries = 0; tries < 40; tries++) {
      x = Math.round(20 + Math.random() * 1160)
      y = Math.round(20 + Math.random() * 320)
      if (!clear.some(([x0, y0, x1, y1]) => x > x0 - w / 2 && x < x1 + w / 2 && y > y0 - h / 2 && y < y1 + h / 2)) break
    }
    const layer = {
      id: ids[i], type, x, y, w, h,
      rot: rotate ? Math.round(Math.random() * 360 - 180) : 0,
      fill: mix ? FESTIVE[Math.floor(Math.random() * FESTIVE.length)] : fills[0],
      opacity: vary ? Math.round((0.45 + Math.random() * 0.55) * 20) / 20 : 1,
    }
    if (info.n !== undefined) layer.n = info.n
    if (info.p !== undefined) layer.p = info.p
    out.push(layer)
  }
  return out
}
