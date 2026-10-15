// Switches for the playful touches. Set any of these to false to turn that touch off everywhere.
// The rest of the app needs no change: each one checks its switch before it plays.
export const EASTER_EGGS = {
  approvalStamp: true, // APPROVED / REJECTED stamp thumping onto the screen after a Drilling Report is approved or rejected
  approvalStampChance: 0.2, // how often the stamp shows when it is on: 0.2 is one approval or rejection in five; 1 is every time
  logoGusher: true, // five quick clicks on the Seros logo
  konami: true, // the Konami code on the home page (the offshore scene in the banner)
  loginQuips: true, // a rig-floor line under the "Invalid username or password" message
  rigLoadingLines: true, // rig-floor wording instead of plain "Loading…"
}
