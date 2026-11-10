import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { createGame } from '@/lib/seroRunGame'

// Sero's Run, over the page it was opened from. Import this with lazy(): the game's code is fetched only when someone presses Play, and everything it does ends when it
// closes (the game removes its own key and touch listeners). Esc closes it, P pauses, Space or Up jumps, Down ducks; on a phone, tap the top to jump and hold the bottom to duck.
export default function SeroRunOverlay({ onClose }) {
  const box = useRef(null)
  const canvas = useRef(null)
  const closeRef = useRef(onClose)
  const [best, setBest] = useState(0)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    const before = document.activeElement
    box.current?.focus({ preventScroll: true }) // so Space plays the game and does not press the button behind it
    const game = createGame(canvas.current, { onBest: setBest, onEscape: () => closeRef.current?.() })
    const lock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      game.destroy()
      document.body.style.overflow = lock
      if (before && typeof before.focus === 'function') before.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#050b1c]/85 p-4 backdrop-blur-sm">
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Sero's Run, a small game" className="w-full max-w-[860px] rounded-2xl border border-[#22386b] bg-[#0b1733] p-4 text-[#eef3ff] shadow-2xl outline-none sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">Sero&rsquo;s <span className="text-[#f58220]">Run</span></h2>
          <div className="flex items-center gap-4">
            <span className="text-sm tabular-nums text-[#9fb4dd]">Best <b className="font-semibold text-[#eef3ff]">{best} m</b> drilled</span>
            <button type="button" onClick={onClose} aria-label="Close the game" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2c4690] bg-[#16295a] text-[#eef3ff] transition-colors hover:bg-[#1f3a78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ec4a6]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative aspect-[800/260] touch-manipulation overflow-hidden rounded-xl border border-[#22386b] bg-[#14214a]">
          <canvas ref={canvas} role="img" aria-label="Sero running along a lease road. Press space or tap to start." className="block h-full w-full cursor-pointer" />
        </div>
        <p className="mt-3 text-[13px] text-[#9fb4dd]">
          <kbd className="rounded border border-[#2c4690] bg-[#16295a] px-1.5 py-0.5 text-[11px] font-semibold text-[#eef3ff]">Space</kbd> or <kbd className="rounded border border-[#2c4690] bg-[#16295a] px-1.5 py-0.5 text-[11px] font-semibold text-[#eef3ff]">&uarr;</kbd> jump
          &nbsp;&middot;&nbsp; hold <kbd className="rounded border border-[#2c4690] bg-[#16295a] px-1.5 py-0.5 text-[11px] font-semibold text-[#eef3ff]">&darr;</kbd> to duck
          &nbsp;&middot;&nbsp; <kbd className="rounded border border-[#2c4690] bg-[#16295a] px-1.5 py-0.5 text-[11px] font-semibold text-[#eef3ff]">P</kbd> pause
          &nbsp;&middot;&nbsp; <kbd className="rounded border border-[#2c4690] bg-[#16295a] px-1.5 py-0.5 text-[11px] font-semibold text-[#eef3ff]">Esc</kbd> close
          <span className="block pt-1 text-[#7d93c4]">On a phone: tap the top to jump, hold the bottom to duck. Your best lasts until you close the app.</span>
        </p>
      </div>
    </div>
  )
}
