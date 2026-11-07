// Only one banner show plays at a time: starting one ends the one before it (a second click on a button simply restarts its show).
let current = null

export function startShow(end) {
  if (current) current()
  current = end
}

export function endShow(end) {
  if (current === end) current = null
}
