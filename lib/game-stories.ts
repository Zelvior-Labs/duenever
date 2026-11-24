/** Fictional framing for the games. Notes never alter game rules or multiplayer state. */
export type StoryId = 'the-last-line' | 'rocket-rampage' | 'rune-bastion' | 'treasure-drift' | 'skyline-sprint' | 'circuit-merge' | 'chess' | 'ludo';
export type StoryNote = { at: number; heading: string; text: string };
export type GameStory = { title: string; introduction: string; unit: string | null; notes: readonly StoryNote[] };

export const GAME_STORIES: Record<StoryId, GameStory> = {
  'the-last-line': {
    title: 'The night desk',
    introduction: 'The night operator has gone home sick. A rising river, an old map and an unsigned order arrive at your desk. A caller says he can explain everything—if you do not waste the next fifteen minutes asking the wrong questions.',
    unit: null, notes: [],
  },
  'rocket-rampage': {
    title: 'The shipping lane',
    introduction: 'The freight pilots call it the short way home. On the charts it is a lane through a debris field; lately someone has been shooting at anything that uses it. Your shift is to keep a passage open.',
    unit: 'wave',
    notes: [
      { at: 1, heading: 'Flight log · 01', text: 'The first returns on the scope are mostly rock. The ships behind you have asked for a clear channel, not a victory speech.' },
      { at: 3, heading: 'Flight log · 03', text: 'The traffic is getting organized. Pilots report that some fighters break from the group to dive; the freighters have stopped asking how long this will take.' },
      { at: 5, heading: 'Flight log · 05', text: 'The lane is still open, though the clean line on the chart no longer resembles what is outside the cockpit. Keep flying as long as you can.' },
    ],
  },
  'rune-bastion': {
    title: 'The causeway',
    introduction: 'The bastion was built to collect tolls, not withstand a siege. Now the road behind it is crowded with people leaving the valley, and the old rune pads are all the garrison has time to put to use.',
    unit: 'wave',
    notes: [
      { at: 0, heading: 'Garrison ledger · Before the first wave', text: 'The mason has marked each working pad in chalk. Every tower costs materials the repair crews could have used elsewhere.' },
      { at: 3, heading: 'Garrison ledger · Wave 3', text: 'Between attacks, the crews patch the stone and count what is left. The road behind the gate is quieter; the causeway is not.' },
      { at: 8, heading: 'Garrison ledger · Wave 8', text: 'The sentries have reported a dragon among the approaching force. The old plans say nothing about keeping one off the road.' },
    ],
  },
  'treasure-drift': {
    title: 'The reef ledger',
    introduction: 'After a storm, a merchant hands you a water-stained inventory and a boat. The cargo is somewhere among the reefs. Anything recovered will pay for the voyage; the rest goes down in the ledger as lost.',
    unit: 'seconds at sea',
    notes: [
      { at: 0, heading: 'Logbook · Departure', text: 'The chart ends at the outer reef. Beyond it, steer by the rocks and pick up what the current has not carried away.' },
      { at: 30, heading: 'Logbook · Underway', text: 'The wreckage is scattered farther than the merchant guessed. A chest is worth hauling aboard, but it is the loose coins that keep the tally moving.' },
      { at: 75, heading: 'Logbook · Open water', text: 'The current has quickened. There is no proper salvage route out here, only the next safe stretch of water.' },
    ],
  },
  'skyline-sprint': {
    title: 'The evening route',
    introduction: 'The lifts are out again, so the evening deliveries go by roof. Your dispatch slip has a long list of addresses and one instruction in the margin: do not leave the bag unattended.',
    unit: 'distance',
    notes: [
      { at: 0, heading: 'Dispatch · Start', text: 'Construction crews leave crates wherever the lift drops them. The inspection drones keep their usual schedule, whether the route is clear or not.' },
      { at: 250, heading: 'Dispatch · On route', text: 'The cells left on the roofs belong to the maintenance crews. They are easy to spot, less easy to reach while keeping your footing.' },
      { at: 700, heading: 'Dispatch · Late shift', text: 'The route has become a rhythm: watch the roofline, duck the drone, keep the bag moving. Dispatch can sort the receipts later.' },
    ],
  },
  'circuit-merge': {
    title: 'The spare board',
    introduction: 'A technician finds an unlabelled circuit board in the back of the workshop. Its manual is missing, but matching contacts still combine. There is enough power to experiment, provided the grid does not lock up.',
    unit: 'highest tile',
    notes: [
      { at: 0, heading: 'Bench notes · First test', text: 'The board accepts a slide in any direction. Each new contact takes up room, so the empty spaces matter as much as the numbered ones.' },
      { at: 128, heading: 'Bench notes · 128', text: 'The larger contacts are holding their charge. A pencilled note suggests keeping the strongest one near an edge, with room to work around it.' },
      { at: 512, heading: 'Bench notes · 512', text: 'There is no sign of a reset switch on the board itself. A careful reversal on the test rig is preferable to starting over.' },
      { at: 2048, heading: 'Bench notes · 2048', text: 'The test target is reached. The board is still live; the rest of the experiment is up to you.' },
    ],
  },
  chess: {
    title: 'The long table',
    introduction: 'At the end of the room is a table with enough wear to show where generations of players have rested their hands. The pieces are set, the chairs pulled out. What happens next belongs to the two players.',
    unit: null, notes: [],
  },
  ludo: {
    title: 'The kitchen table',
    introduction: 'Someone clears the dishes, someone finds the die, and the board goes in the middle. The pieces make the same familiar circuit; the stories around the table are different every time.',
    unit: null, notes: [],
  },
};

export function getGameStory(id: string): GameStory | undefined {
  return Object.prototype.hasOwnProperty.call(GAME_STORIES, id) ? GAME_STORIES[id as StoryId] : undefined;
}
/** Progress is local to the current run; rewinds and new games reveal only current notes. */
export function unlockedStoryNotes(id: StoryId, progress: number): readonly StoryNote[] {
  const safeProgress = Number.isFinite(progress) ? Math.max(0, progress) : 0;
  return GAME_STORIES[id].notes.filter(note => note.at <= safeProgress);
}
