// Waiting-room lines in rig-floor language. One is picked at random each time something loads, so the
// same screen rarely says the same thing twice. Keep them short, harmless and true to the trade.
const LOADING = [
  'Circulating mud…',
  'Running casing…',
  'Tripping out…',
  'Tripping in…',
  'Making a connection…',
  'Spudding in…',
  'Rigging up…',
  'Pulling the pipe…',
  'Breaking circulation…',
  'Weighing up the mud…',
  'Checking the BOP…',
  'Torquing the connections…',
  'Reading the gauges…',
  'Sweeping the hole…',
  'Pumping a sweep…',
  'Cementing the casing…',
  'Waiting on cement…',
  'Drilling ahead…',
  'Reaming the hole…',
  'Racking back the stands…',
  'Picking up the kelly…',
  'Greasing the top drive…',
  'Calibrating the weight indicator…',
  'Tallying the pipe…',
  'Pressure testing the lines…',
  'Shaking the shale shakers…',
  'Checking the mud pits…',
  'Reading the mud logger…',
  'Listening to the driller…',
  'Consulting the tool pusher…',
  'Asking the company man nicely…',
  'Waiting on weather…',
  'Waiting on orders…',
  'Waiting on a crew change…',
  'Waiting on the helicopter…',
  'Waiting on the supply boat…',
  'Climbing the derrick…',
  'Walking the pipe deck…',
  'Hoisting the block…',
  'Latching the elevators…',
  'Swapping out the bit…',
  'Dressing the bit…',
  'Chasing the pay zone…',
  'Following the contour lines…',
  'Surveying the well path…',
  'Steering the bit…',
  'Going down the hole…',
  'Making hole…',
  'Fishing for the answer…',
  'Washing over the fish…',
  'Jarring it loose…',
  'Taking a survey…',
  'Flowing back the well…',
  'Killing the well (gently)…',
  'Squeezing the cement…',
  'Perforating politely…',
  'Setting the packer…',
  'Opening the choke…',
  'Bleeding off the pressure…',
  'Topping up the trip tank…',
  'Watching the trip tank…',
  'Counting the stands…',
  'Hanging off the string…',
  'Laying down the drill pipe…',
  'Stabbing the pipe…',
  'Slacking off the weight…',
  'Taking weight…',
  'Making up the BHA…',
  'Mixing a fresh batch of mud…',
  'Adding barite…',
  'Checking the mud weight…',
  'Spinning up the rotary…',
  'Firing up the generators…',
  'Warming up the mud pumps…',
  'Counting the strokes…',
  'Polishing the crown block…',
  'Coffee break on the rig floor…',
  'Refilling the coffee pot…',
  'Wiping the rig floor…',
  'Painting the handrails…',
  'Safety meeting before the job…',
  'Doing a toolbox talk…',
  'Filling in the JSA…',
  'Observing the stop-work authority…',
  'Hard hats on, data loading…',
  'Giving the derrick a pep talk…',
  'Reading between the contour lines…',
  'Digging for data…',
  'Striking data…',
  'Bringing it up from the deep…',
  'Hitting the sweet spot…',
  'Almost at total depth…',
  'Nearly at TD…',
  'Staying out of the red zone…',
  'Keeping the hook load happy…',
  'Rig-days are not the same as days…',
  'Counting rig-days…',
  'Drilling through the paperwork…',
  'Spooling up the wireline…',
  'Pinging the sonar…',
  'Sounding the depths…',
  'Charting the seabed…',
  'Rolling out the red carpet (a very oily one)…',
  'This will be a gusher of a page…',
  'Oil be right with you…',
  'Just a moment, we are drilling for it…',
]

// Shorter, for the "load the next page of rows" moment at the foot of a long list.
const MORE = [
  'Pulling up more…',
  'Tripping in more rows…',
  'Racking more stands…',
  'Drilling a bit deeper…',
  'Making more hole…',
  'Fetching the next stand…',
  'Going a little deeper…',
  'Bringing up more core…',
  'Adding another joint…',
  'Another connection, one moment…',
  'More from the pipe deck…',
  'Hoisting the next load…',
  'Pumping up more…',
  'Digging for more…',
  'Sweeping up more…',
  'Reaching further down…',
  'Lowering the bit…',
  'Spooling out more line…',
  'Next stand coming up…',
  'Dropping another joint in…',
]

// A shuffled bag per list: every line is used once before any line comes round again, and the first line of a
// new round is never the last of the old one.
const bags = {}
function pick(list, key) {
  const bag = (bags[key] ||= { queue: [], last: -1 })
  if (bag.queue.length === 0) {
    const order = list.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    if (order.length > 1 && order[order.length - 1] === bag.last) [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]]
    bag.queue = order
  }
  bag.last = bag.queue.pop()
  return list[bag.last]
}

export const pickLoadingLine = () => pick(LOADING, 'loading')
export const pickMoreLine = () => pick(MORE, 'more')

// What the logo easter egg says. Every line is used once before any repeats. Always starts "Spud in, <name>." (spudding in is the first day of a well).
const SPUD = [
  'Today’s forecast: gushers.',
  'The hole will not drill itself.',
  'Hard hat on, spirits up.',
  'Mind the wet floor.',
  'We just struck oil. Probably.',
  'Let’s make some hole.',
  'May all your connections be quick.',
  'Zero days without a good idea.',
  'Slick work. Very slick.',
  'Your data is in good hands, and slightly oily ones.',
  'First one to TD buys the coffee.',
  'Tripping out of the ordinary.',
  'Ahead of schedule. Nobody check.',
  'The derrick says hello.',
  'Don’t forget to log it.',
]
export function pickSpudMessage(name) {
  return `Spud in${name ? `, ${name}` : ''}. ${pick(SPUD, 'spud')}`
}
