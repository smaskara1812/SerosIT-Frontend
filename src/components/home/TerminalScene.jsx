import { useEffect, useState } from 'react'
import { EASTER_EGGS } from '@/config/easterEggs'

// The hidden "cheat code" scene for the home banner (typed into the home search: "cheat codes", "iddqd", "xyzzy"...). The whole banner turns
// into a Mac Terminal window and plays one of three little sessions, each in a different Terminal theme (red, yellow, blue). Each session is a
// mini crossword printed in the terminal: solve the across clues and the boxed column, read down, spells one of the secret phrases. Each also
// has a last line in the background colour, real text that only shows if you select it with the mouse (so nothing here closes on a click or a
// key), giving a hint to a different secret. Some of the crossword's letters are filled in. One session plays per trigger, and the same one
// never plays twice in a row (the app keeps a shuffled deck in this browser). It stays `terminalSeconds` (config) and counts down on its last prompt line, unless the exit button, or the red
// dot, ends it. The timings live in index.css (`.tm-*`). Decoration only.

const PROMPT = 'intern@seros ~ % '

// A crossword: `words` are the across answers, each with the index of the letter that sits in the boxed column (reading down they spell
// `down`) and the indices of the letters already filled in (`given`, never the boxed one). Returns the grid rows with their clues, as lines of
// [text, className] parts.
function crossword(words, downClue) {
  const col = Math.max(...words.map((w) => w.at))
  const width = Math.max(...words.map((w) => col - w.at + w.word.length))
  return [
    ...words.map((w, i) => {
      const start = col - w.at
      const cells = []
      for (let c = 0; c < width; c += 1) {
        if (c < start || c >= start + w.word.length) cells.push(['   ', ''])
        else if (c === col) cells.push(['[_]', 'tm-box'])
        else cells.push([w.given?.includes(c - start) ? ` ${w.word[c - start]} ` : ' _ ', w.given?.includes(c - start) ? 'tm-given' : ''])
      }
      return [...cells, [`   ${i + 1}> ${w.clue} (${w.word.length})`, 'tm-dim']]
    }),
    [[`${' '.repeat(3 * width)}   boxed column, read down: ${downClue} (${words.length})`, 'tm-dim']],
  ]
}

const SESSIONS = [
  {
    theme: 'red',
    down: 'DUSK',
    hidden: '# blades up top, skids below. what do the crew call it? (7)',
    words: [
      { word: 'DERRICK', at: 0, given: [3, 6], clue: 'tall steel tower over the hole' },
      { word: 'SPUD', at: 2, given: [0, 3], clue: 'to start drilling a well' },
      { word: 'SEA', at: 0, given: [2], clue: 'where the Wildcat works' },
      { word: 'DECK', at: 3, given: [0], clue: 'floor of an offshore platform' },
    ],
    downClue: 'the end of the day',
  },
  {
    theme: 'yellow',
    down: 'FRAC',
    hidden: '# lines down to the seabed. the job is two words and starts with an A',
    words: [
      { word: 'FLARE', at: 0, given: [2, 4], clue: 'burning gas stack on a rig' },
      { word: 'TRUCK', at: 1, given: [0, 4], clue: 'hauls the LNG on the road' },
      { word: 'PAD', at: 1, given: [0], clue: 'where a land well sits' },
      { word: 'CRANE', at: 0, given: [3], clue: 'lifts cargo off a ship' },
    ],
    downClue: 'crack the rock to free the oil',
  },
  {
    theme: 'blue',
    down: 'CONVOY',
    hidden: '# day one of a new well. it starts with S and rhymes with mud',
    words: [
      { word: 'CARGO', at: 0, given: [2, 4], clue: 'what a ship carries' },
      { word: 'BOAT', at: 1, given: [0, 3], clue: 'small vessel' },
      { word: 'ANCHOR', at: 1, given: [0, 5], clue: 'heavy hook for the seabed' },
      { word: 'VESSEL', at: 0, given: [2, 5], clue: 'a ship' },
      { word: 'OIL', at: 0, given: [2], clue: 'what the whole business is about' },
      { word: 'YARD', at: 0, given: [3], clue: 'where rigs are repaired' },
    ],
    downClue: 'trucks travelling together',
  },
]

// Which session plays now: a shuffled deck kept in this browser, so all three play before any repeats and the same one never plays
// twice running.
function nextSession() {
  let deck = []
  let last = -1
  try {
    const saved = JSON.parse(localStorage.getItem('seros.term.deck') || '[]')
    if (Array.isArray(saved)) deck = saved.filter((i) => Number.isInteger(i) && i >= 0 && i < SESSIONS.length)
    last = Number(localStorage.getItem('seros.term.last') ?? -1)
  } catch {
    /* blocked storage: start a fresh deck */
  }
  if (!deck.length) {
    deck = SESSIONS.map((_, i) => i).sort(() => Math.random() - 0.5)
    if (deck[deck.length - 1] === last && deck.length > 1) deck.reverse()
  }
  const pick = deck.pop()
  try {
    localStorage.setItem('seros.term.deck', JSON.stringify(deck))
    localStorage.setItem('seros.term.last', String(pick))
  } catch {
    /* private window or blocked storage: the deck simply restarts next time */
  }
  return SESSIONS[pick] ?? SESSIONS[0]
}

const stamp = () => {
  const d = new Date(Date.now() - 55 * 60 * 1000)
  const two = (n) => String(n).padStart(2, '0')
  return `Last login: ${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())} on ttys001`
}

function Line({ parts, at, type, n, dur, children }) {
  return (
    <div className="tm-line" style={{ '--t': `${at}s` }}>
      {type ? (
        <>
          <span className="tm-prompt">{PROMPT}</span>
          <span className="tm-type" style={{ '--n': n, '--d': `${dur}s`, '--t': `${at}s` }}>{type}</span>
        </>
      ) : (
        parts.map(([text, cls], i) => <span key={i} className={cls || undefined}>{text}</span>)
      )}
      {children}
    </div>
  )
}

// The line that says when the window closes, counting down from the moment the scene started.
function Countdown() {
  const seconds = EASTER_EGGS.terminalSeconds
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const end = Date.now() + seconds * 1000
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250)
    return () => clearInterval(id)
  }, [seconds])
  return <span className="tm-dim"># this window closes in {left}s, or click exit</span>
}

// Ends the scene early: the home page listens for this (see Home.jsx).
const exit = () => window.dispatchEvent(new CustomEvent('seros:scene-end'))

export default function TerminalScene() {
  const [session] = useState(nextSession)
  const grid = crossword(session.words, session.downClue)
  const cmd = 'cat crossword.txt'
  const rows = grid.length
  return (
    <div className={`tm-window tm-${session.theme}`}>
      <div className="tm-bar">
        <button type="button" className="tm-dot tm-dot-r" onClick={exit} aria-label="Close the terminal" />
        <span className="tm-dot tm-dot-y" /><span className="tm-dot tm-dot-g" />
        <span className="tm-title" aria-hidden="true">seros — -zsh — 80×24</span>
        <button type="button" className="tm-exit" onClick={exit}>exit ✕</button>
      </div>
      <div className="tm-body" aria-hidden="true">
        <Line parts={[[stamp(), '']]} at={0.4} />
        <Line type={cmd} n={cmd.length} dur={1.2} at={1} />
        {grid.map((parts, i) => <Line key={i} parts={parts} at={2.8 + i * 0.5} />)}
        <Line parts={[]} at={2.8 + rows * 0.5 + 0.3} type={null}>
          <span className="tm-prompt">{PROMPT}</span><Countdown /> <span className="tm-cursor" />
        </Line>
        <Line parts={[[session.hidden, 'tm-hidden']]} at={2.8 + rows * 0.5 + 0.6} />
      </div>
    </div>
  )
}
