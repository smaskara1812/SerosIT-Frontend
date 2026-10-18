// Switches for the playful touches. Set any of these to false to turn that touch off everywhere.
// The rest of the app needs no change: each one checks its switch before it plays.
export const EASTER_EGGS = {
  approvalStamp: true, // APPROVED / REJECTED stamp thumping onto the screen after a Drilling Report is approved or rejected
  approvalStampChance: 0.2, // how often the stamp shows when it is on: 0.2 is one approval or rejection in five; 1 is every time
  logoGusher: true, // five quick clicks on the Seros logo
  konami: true, // the Konami code on the home page (plays one of the banner scenes below)
  konamiScene: 'ship', // which banner scene the Konami code plays: 'ship' (the Seros ship passing the Wildcat) or 'crew' (the helicopter landing on the Wildcat)
  chopper: true, // the helicopter scene in the banner, started by a secret phrase typed into the home page search
  chopperPhrases: ['chopper', 'helicopter', 'helipad'], // any of these (ignoring capitals, hyphens, punctuation and extra spaces) starts it; never "crew change", which is a real page name
  loginQuips: true, // a rig-floor line under the "Invalid username or password" message
  sunset: true, // the secret phrase typed into the home page search and confirmed with Enter
  sunsetPhrases: ['golden hour', 'magic hour', 'sunset', 'sundown', 'dusk','golden'], // any of these (ignoring capitals, hyphens, punctuation and extra spaces) starts the sunset scene
  spudIn: true, // the spud-in animation, started by a secret phrase typed into the home page search
  spudPhrases: ['spud in', 'spud', 'spudding in', 'spudding', 'spud date'], // any of these (ignoring capitals, hyphens, punctuation and extra spaces) starts it
  rigLoadingLines: true, // rig-floor wording instead of plain "Loading…"

  // Clues, so people can find the hidden touches without being told. Both are quiet and easy to miss.
  searchRiddles: true, // from time to time the home search box shows a riddle instead of its usual example
  placeholderRotateMs: 90 * 60 * 1000, // the search box's words are chosen for 90-minute stretches of the clock, so they change slowly and everyone sees the same
  riddleEveryNthSlot: 3, // about one stretch in this many shows a riddle (3 is roughly one in three); the rest show the usual example
  idleHints: true, // after a few idle minutes on the home page the banner whispers a hint and the logo glows now and then
  idleHintAfterMs: 3 * 60 * 1000, // how long the home page must sit untouched before the hints begin
  idleHintLines: [
    'Psst… the Seros logo, top left, likes to be knocked on. Five times.',
    'Psst… the search box changes its words through the day. Read them closely.',
    'Psst… not every search is looking for a page.',
  ],
}

// Riddles for the home search box. Each answer is a secret phrase (typed into the search box and confirmed with
// Enter): the "sunset" answers must be in sunsetPhrases above, the "spud" answers in spudPhrases, and the "chopper" answers in chopperPhrases.
export const RIDDLES = {
  sunset: [
    'Photographers chase it, and the rig glows in it. Which hour?',
    'The sun hangs low and every derrick turns to gold. Which hour?',
    'The warmest light of the day. Two words, one hour.',
    'Between afternoon and dusk the sky turns gold. Which hour?',
    'As the sun sinks, the light looks like a medal. Which hour?',
    'The sun slips behind the ridge. What is that moment called?',
    'One word for the moment the sun drops out of sight.',
  ],
  chopper: [
    'If Seros crews do not take the boat out to the rig, what do they ride?',
    'Its blades never stop, but it lands on a pad the size of a tennis court. What is it?',
    'What brings a fresh crew to the rig, and takes the tired one home by air?',
    'A flying machine with no wings that sits on a deck above the waves. Which one?',
    'The rig has a pad for it, painted with a single letter. What is that called?',
    'Rotors on top, skids below, and the one way offshore crews commute. What is it?',
  ],
  spud: [
    'Two words mark the moment a bit first bites the ground.',
    'Every well has a first day. What do crews call starting it?',
    'Which two words begin every well’s story?',
    'The bit touches dirt for the very first time. What are we doing?',
    'Not “finish”, not “tie in”. How do you begin a well?',
    'The date in the log when drilling begins. Two words.',
    'Crews have a one-word verb for starting a well. It begins with S.',
    'First hole, first day, first cheer. What is it called?',
  ],
}
