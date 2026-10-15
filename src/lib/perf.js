// Guard rails for the playful effects, so they never make an older or busy machine worse.
// `lowPowerDevice` is a cheap guess from what the browser reports (few cores, little memory, or the user asked
// for less data); the effects also watch their own frame times while they run (see `makeFrameGuard`).

export function lowPowerDevice() {
  try {
    const cores = navigator.hardwareConcurrency || 8
    const memory = navigator.deviceMemory || 8
    return cores <= 4 || memory <= 4 || navigator.connection?.saveData === true
  } catch {
    return false
  }
}

// Canvas pixels cost fill-rate on slow GPUs: never draw at more than 1.5x, whatever the screen's ratio.
export const canvasScale = () => Math.min(window.devicePixelRatio || 1, lowPowerDevice() ? 1 : 1.5)

// Call `guard(now)` once per frame. It reports how the effect should behave:
//   'full'  the machine keeps up
//   'thin'  frames are slow: spawn fewer particles
//   'stop'  frames are very slow: wind the effect down now
export function makeFrameGuard() {
  let last = 0
  let slow = 0
  let frames = 0
  return (now) => {
    if (last) {
      const dt = now - last
      frames += 1
      if (frames > 5) slow = slow * 0.9 + dt * 0.1 // smoothed frame time, ignoring the first few frames
    }
    last = now
    if (frames < 12) return 'full'
    return slow > 70 ? 'stop' : slow > 34 ? 'thin' : 'full'
  }
}
