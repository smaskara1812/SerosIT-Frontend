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
  rigMove: true, // the Wildcat rig move scene in the banner (two anchor handling vessels tow the rig in and sail off, she ballasts down and pays out her own four anchors), started by a secret phrase typed into the home page search
  rigMovePhrases: ['anchors away', 'anchors', 'drop anchor', 'rig tow', 'towing the rig'], // any of these (ignoring capitals, hyphens, punctuation and extra spaces) starts it; never on a day with a custom banner. Not "rig move" or "rig moves": that is a page
  fracJob: true, // the frac job scene in the banner (the Seros frac fleet on a land pad pumping three stages while the Axom Rhino drills the next well), started by a secret phrase typed into the home page search
  fracPhrases: ['frac job', 'frac', 'fracking', 'fracturing', 'frac time'], // any of these (ignoring capitals, hyphens, punctuation and extra spaces) starts it; never on a day with a custom banner
  convoy: true, // the convoy scene in the banner (Seros's electric, LNG and bulk trucks crossing a dusty highway at sunrise), started by a secret phrase typed into the home page search
  convoyPhrases: ['convoy', 'green logistics', 'truck convoy', 'seros green logistics'], // any of these (ignoring capitals, hyphens, punctuation and extra spaces) starts it; never on a day with a custom banner
  signature: true, // a credit for whoever built the app: a night desk in the banner. Deliberately has no riddle and no hint, so nobody finds it without being told or reading this
  signaturePhrases: ['git blame'], // typed into the home page search and confirmed with Enter; never on a day with a custom banner
  terminal: true, // the banner turns into a Terminal window for `terminalSeconds` (or until its exit button is clicked) and plays a small crossword session that leaks hints to the other secrets. Deliberately not in the riddles: only an idle hint points to it
  terminalSeconds: 30, // how long the terminal stays up; it shows a countdown on its last prompt line
  terminalPhrases: ['cheat code', 'cheat codes', 'cheats', 'iddqd', 'xyzzy', 'easter egg', 'easter eggs'], // what a gamer would type; any of these (ignoring capitals, hyphens, punctuation and extra spaces) starts it; never on a day with a custom banner
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
    'Psst… ask any gamer what to type when they want the secrets.',
  ],
}

// Riddles for the home search box. Each answer is a secret phrase (typed into the search box and confirmed with
// Enter): the "sunset" answers must be in sunsetPhrases above, the "spud" answers in spudPhrases, and the "chopper" answers in chopperPhrases, the "rigmove" answers in rigMovePhrases, the "frac" answers in fracPhrases, and the "convoy" answers in convoyPhrases.
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
  rigmove: [
    'The Wildcat is on location and her tugs are leaving. Next? Two words.',
    'What is the job of getting a rig’s anchors out and set? Two words.',
    'The order given when a rig’s anchors go down. Two words.',
    'Tugs tow the Wildcat in, then leave. What does she do next?',
    // 'The Wildcat is held in place by her anchors. Two words for the job?',
    'A rig stays put at sea by lines to the seabed. Name the job.',
  ],
  frac: [
    'Pumps roar and the rock cracks. What is the job called? Two words.',
    'Water, sand and chemicals go down a well to crack the rock. Name it.',
    'Three stages, one wellhead and a fleet of pump trucks. What job?',
    'Not drilling, not a rig move: pumping to crack open the rock.',
    'The shale will not give up its oil until it is cracked. How?',
  ],
  convoy: [
    'Several trucks, one road, one destination. What is the group called?',
    'Trucks rolling together at first light. One word.',
    'Seros’s LNG and electric trucks run in a line at dawn. What is it?',
    'Its hashtag says two words, and its trucks run on LNG and electricity.',
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
