export const SCENE_SECONDS = 60;
export const TOTAL_SECONDS = 15 * SCENE_SECONDS;
export type Option = { label: string; reply: string; proof?: number; witnesses?: number };
export type Scene = { chapter: string; title: string; message: string; evidenceTitle: string; evidence: string; pressure: string; options: readonly [Option, Option, Option] };

/** Each minute presents a new piece of the same incident; none of the threats leave the fiction. */
export const SCENES: readonly Scene[] = [
  {
    chapter: 'I · The incoming line', title: 'The night desk',
    message: 'The night operator has gone home sick. At 11:45, a voice on the emergency circuit introduces himself as Morrow, duty director. Water is rising at the North Gate. In fifteen minutes the automatic sequence will run a signed release toward the old freight district; without one, the desk defaults to a hold. “I need a second signature,” he says. “You are the only desk still staffed.”',
    evidenceTitle: 'Shift card', evidence: 'The card names three desks: North Gate, Records, and Ward Six liaison. Beside the last is a handwritten number, crossed out and rewritten twice.',
    pressure: '“A signature is not a decision,” Morrow says. “It just says you received the instruction.”',
    options: [
      { label: 'Copy the instruction into the ledger', reply: '“You like records. Fine. Put my name down correctly.”', proof: 1 },
      { label: 'Call the liaison desk', reply: '“That line is probably dead. But I can wait while you try.”', witnesses: 1 },
      { label: 'Acknowledge Morrow’s instruction', reply: '“Good. We can be efficient.”' },
    ],
  },
  {
    chapter: 'I · The incoming line', title: 'The map',
    message: 'A map appears on the desk terminal. The freight district is marked EMPTY in red. Morrow says the gate will protect the hospital on the opposite bank. The drawing is tidy: a blue arrow, a red arrow, and no addresses. He asks you to mark the route as understood.',
    evidenceTitle: 'Map revision', evidence: 'The map is four years old. A grease-pencil note on the paper copy reads: “Freight district renamed Ward Six. Housing conversion, blocks 4–9.”',
    pressure: '“People confuse an old district name with an occupied one,” Morrow says. “That is exactly why I kept the map simple.”',
    options: [
      { label: 'Preserve the map and revision date', reply: '“If that helps you focus, preserve it.”', proof: 1 },
      { label: 'Ask Ward Six about the housing', reply: '“Do not start a rumor from a pencil mark.”', witnesses: 1 },
      { label: 'Mark the route understood', reply: '“That is one thing we can take off the list.”' },
    ],
  },
  {
    chapter: 'I · The incoming line', title: 'A voice below the static',
    message: 'The liaison line answers. A woman named Irena is at the Ward Six community hall, where the basement is already wet. She can hear Morrow faintly through your receiver. He says she is a volunteer, not an engineer, and asks you not to make her responsible for a technical decision.',
    evidenceTitle: 'Liaison directory', evidence: 'Irena Sol is the registered ward liaison. Her job is to report conditions and relay warnings, not operate the gate.',
    pressure: '“I am trying to spare her,” Morrow says. Irena says, quietly, “I can hear both of you.”',
    options: [
      { label: 'Log the call and her report', reply: '“You do not need a transcript of every conversation.”', proof: 1 },
      { label: 'Keep Irena on the line', reply: '“All right. But do not ask her to guess at the engineering.”', witnesses: 1 },
      { label: 'End the liaison call', reply: '“Thank you. One less frightened person on the circuit.”' },
    ],
  },
  {
    chapter: 'II · The missing figures', title: 'The gauge',
    message: 'The terminal shows a rapidly climbing water level. Morrow calls it proof that the release cannot wait. A second number, smaller and grey, is moving in the opposite direction. He says the second gauge is a duplicate and asks you to use the large reading.',
    evidenceTitle: 'Gauge key', evidence: 'The large figure is upstream pressure. The grey figure is downstream depth. They measure different things, and neither alone predicts which streets will flood.',
    pressure: '“There are always two numbers,” he says. “Only one of them is about to breach its limit.”',
    options: [
      { label: 'Record both readings and the key', reply: '“That is accurate. I never said it was not.”', proof: 1 },
      { label: 'Read both figures to Irena', reply: '“She cannot interpret them from a hall telephone.”', witnesses: 1 },
      { label: 'Use the upstream reading only', reply: '“Now we are looking at the same problem.”' },
    ],
  },
  {
    chapter: 'II · The missing figures', title: 'The unsigned page',
    message: 'A release order feeds from the printer. The director’s signature is a typed name, not a signature. The form leaves your box blank. Morrow says the printer cannot reproduce his credentials and asks you to sign for both of you. “You can amend it later,” he adds.',
    evidenceTitle: 'Authorization policy', evidence: 'Two independent sign-offs are required. An operator may record an unsigned order, but cannot supply the missing signature for someone else.',
    pressure: '“You are confusing a defect in the form with a defect in the decision. That distinction will matter to the inquiry.”',
    options: [
      { label: 'Keep the unsigned page', reply: '“Keep it. The water will not read it.”', proof: 1 },
      { label: 'Ask a second desk to witness it', reply: '“You are adding people to a line that is already overloaded.”', witnesses: 1 },
      { label: 'Treat the typed name as authorization', reply: '“Finally, a practical reading.”' },
    ],
  },
  {
    chapter: 'II · The missing figures', title: 'A convenient silence',
    message: 'The Ward Six line goes quiet. Morrow says the exchange has probably failed. A light beside Irena’s circuit is still on, but the desk manual says a lit line can mean either connection or a receiver left off its hook. He suggests you stop wasting time on it.',
    evidenceTitle: 'Circuit test', evidence: 'The line test sends a tone and prints a connection status. It cannot tell you who, if anyone, is listening at the other end.',
    pressure: '“You cannot solve every uncertainty,” he says. “You can choose which one costs the least time.”',
    options: [
      { label: 'Save the circuit test result', reply: '“A tone. Not a person. I hope the distinction is clear.”', proof: 1 },
      { label: 'Try the second number on the card', reply: '“She will be sheltering, if she is sensible.”', witnesses: 1 },
      { label: 'Accept that the line is down', reply: '“It is better not to promise what the system cannot deliver.”' },
    ],
  },
  {
    chapter: 'III · The second signature', title: 'The rehearsal',
    message: 'Morrow asks you to rehearse the release sequence without sending it. The switches move on the screen; the real gate does not. When you stop at the final key, he praises your speed. Then he asks why you would hesitate to do the same thing for real.',
    evidenceTitle: 'Training mode', evidence: 'The training panel is disconnected from the gate. Its map, however, is copied from the same old file as the live panel.',
    pressure: '“You already know what to do. You are letting the word ‘real’ make you less competent.”',
    options: [
      { label: 'Note the training map’s date', reply: '“You have made your point about the map.”', proof: 1 },
      { label: 'Tell Irena a rehearsal took place', reply: '“That is an alarming way to describe a test.”', witnesses: 1 },
      { label: 'Agree the sequence is ready', reply: '“Exactly. The procedure works.”' },
    ],
  },
  {
    chapter: 'III · The second signature', title: 'The hospital',
    message: 'Morrow gives you a choice of words: release the gate and protect the hospital, or refuse and accept the risk there. He does not mention Ward Six. Irena calls back from the second number. Her hall has people upstairs and no transport. Neither person can see the other’s side of the river.',
    evidenceTitle: 'Evacuation sheet', evidence: 'The hospital has an elevated backup ward. The sheet does not say it is safe indefinitely; it does show a transfer team is on call.',
    pressure: '“If the hospital floods,” Morrow says, “I will have to tell them why the gate stayed shut.”',
    options: [
      { label: 'Copy the transfer-team details', reply: '“A team on call is not the same as a team on site.”', proof: 1 },
      { label: 'Connect Irena to the transfer team', reply: '“Please do not promise either side a rescue you cannot guarantee.”', witnesses: 1 },
      { label: 'Prioritize Morrow’s hospital warning', reply: '“At least someone is thinking about the patients.”' },
    ],
  },
  {
    chapter: 'III · The second signature', title: 'The correction',
    message: 'A correction arrives on the printer: Ward Six is occupied. It is stamped DRAFT. Morrow says he ordered the correction himself and that this proves he has not concealed anything. The print time is seven minutes ago. He has been speaking to you since before then.',
    evidenceTitle: 'Printer strip', evidence: 'The strip records a failed delivery, followed by a successful retry. It does not show who blocked or delayed the first attempt.',
    pressure: '“I cannot make a faulty printer honest,” Morrow says. “You are treating a delay as intent.”',
    options: [
      { label: 'Keep the correction and printer strip', reply: '“That is fair. Keep both, not just the part you like.”', proof: 1 },
      { label: 'Read the correction to both lines', reply: '“Now everyone knows. Can we get back to the gate?”', witnesses: 1 },
      { label: 'Accept the correction without logging it', reply: '“Thank you for giving me the benefit of the doubt.”' },
    ],
  },
  {
    chapter: 'IV · The people on the line', title: 'Who is Morrow?',
    message: 'Irena recognizes the name. Morrow designed the gate’s diversion system before leaving the city service. He says he returned as a consultant tonight because nobody else understood it. “I have been here from the beginning,” he says. “You arrived twelve minutes ago.”',
    evidenceTitle: 'Staff register', evidence: 'Morrow is listed as a consultant, not duty director. A consultant can advise. The register does not grant him authority to issue a release order.',
    pressure: '“You can question my title or listen to my experience. I suggest the second.”',
    options: [
      { label: 'Keep a copy of the staff register', reply: '“Titles change. The gate has not.”', proof: 1 },
      { label: 'Ask the duty office to confirm his role', reply: '“They called me because their own staff could not answer.”', witnesses: 1 },
      { label: 'Continue treating him as director', reply: '“Good. Whatever they call me, I am the one still here.”' },
    ],
  },
  {
    chapter: 'IV · The people on the line', title: 'The hold',
    message: 'The duty office finally answers. An engineer says the gate can be held for a short interval while the hospital transfer team moves. Morrow immediately objects: a hold is not a repair, and the pressure will keep rising. The engineer agrees. Neither can promise how long the interval will last.',
    evidenceTitle: 'Hold procedure', evidence: 'A hold buys time; it does not lower upstream pressure. The procedure requires crews at both sites to be told before the interval begins.',
    pressure: '“A little time,” Morrow says, “is a very expensive thing to buy when you do not know its price.”',
    options: [
      { label: 'Preserve the hold procedure', reply: '“At least you are reading the limitations.”', proof: 1 },
      { label: 'Put both crews on the circuit', reply: '“Then they all get to hear when it fails.”', witnesses: 1 },
      { label: 'Reject the uncertain hold', reply: '“A difficult choice, but a responsible one.”' },
    ],
  },
  {
    chapter: 'IV · The people on the line', title: 'The favor',
    message: 'Morrow drops the formal tone. He says the diversion was his design and he knows what an inquiry will make of it. He asks you not to turn a bad night into a public hunt for one person. Then he asks you to sign the old order before you choose what happens at the gate.',
    evidenceTitle: 'Order copy', evidence: 'The old order identifies the freight district as empty. Signing it would certify information you now know is outdated.',
    pressure: '“I have trusted you with the truth,” he says. “Do not make that the mistake I regret.”',
    options: [
      { label: 'Preserve the outdated order', reply: '“You could have left my name out of it.”', proof: 1 },
      { label: 'Let the other desks hear his request', reply: '“I was speaking to you, not to a committee.”', witnesses: 1 },
      { label: 'Sign the old order', reply: '“I will remember that you helped.”' },
    ],
  },
  {
    chapter: 'V · The last minute', title: 'A revised order',
    message: 'The duty office sends a revised order with the occupied blocks marked. It still recommends diversion, but includes the hold as an alternative. Morrow calls the addition a way for the office to avoid responsibility. Irena asks for warning time, not a promise that her ward can be saved.',
    evidenceTitle: 'Revised order', evidence: 'Both options carry risk. The revised order identifies the people affected and requires the operator’s actual choice to be recorded.',
    pressure: '“They have given you a menu,” Morrow says. “If it goes wrong, they will point to the item you chose.”',
    options: [
      { label: 'Keep both versions of the order', reply: '“You are building a good file. I hope it is useful to someone.”', proof: 1 },
      { label: 'Read the alternatives to the crews', reply: '“They cannot vote the pressure down.”', witnesses: 1 },
      { label: 'Follow the recommendation without discussion', reply: '“The office and I agree on something at last.”' },
    ],
  },
  {
    chapter: 'V · The last minute', title: 'The record',
    message: 'The desk offers to transmit your ledger to the duty office. Morrow asks you to send only the final order; he says a partial record will mislead an inquiry. Irena says a partial record is all a frightened person can usually manage. The engineer asks for a clear decision, soon.',
    evidenceTitle: 'Transmission queue', evidence: 'The desk can send what you have recorded. Documents you chose not to preserve will not be reconstructed from memory.',
    pressure: '“You have been deciding what counts as evidence all night,” Morrow says. “Do not pretend the file is neutral.”',
    options: [
      { label: 'Prepare the records you kept', reply: '“Then they will see what you chose to write down.”', proof: 1 },
      { label: 'Ask the desks to confirm their accounts', reply: '“They will remember what they think they heard.”', witnesses: 1 },
      { label: 'Prepare only the final order', reply: '“A clean record. That is kinder to everyone.”' },
    ],
  },
  {
    chapter: 'V · The last minute', title: 'The last line',
    message: 'The automatic sequence runs in one minute. Irena is counting people at the hall. The engineer is waiting at the hold switch. Morrow has stopped asking to be called director. “Whatever you do,” he says, “someone will remember that you were the one at the desk.” The final choice is yours.',
    evidenceTitle: 'The choices', evidence: 'Release the record and refuse the old order; hold the gate and warn the crews; or authorize the diversion. If you make no selection, the desk defaults to a hold. Earlier records and witnesses affect what can be established afterward.',
    pressure: 'Morrow says nothing for a while. Then: “You do not have to prove me wrong to do what I asked.”',
    options: [
      { label: 'Release the record; refuse the old order', reply: '“Then make sure they get the whole thing.”' },
      { label: 'Hold the gate and warn the crews', reply: '“I hope the interval is long enough.”' },
      { label: 'Authorize the diversion', reply: '“Understood. I will give the crews the order.”' },
    ],
  },
];

export type Run = { elapsed: number; answers: (number | null)[] };
export const newRun = (): Run => ({ elapsed: 0, answers: Array(SCENES.length).fill(null) });
export function sceneIndex(run: Run): number { return Math.min(SCENES.length - 1, Math.max(0, Math.floor(run.elapsed / SCENE_SECONDS))); }
export function advanceRun(run: Run, seconds: number): Run {
  if (!Number.isFinite(seconds) || seconds <= 0) return run;
  return { ...run, elapsed: Math.min(TOTAL_SECONDS, run.elapsed + seconds) };
}
/** Only the current minute may be changed; a completed run is immutable. */
export function choose(run: Run, choice: number): Run {
  if (run.elapsed >= TOTAL_SECONDS || !Number.isInteger(choice) || choice < 0 || choice > 2) return run;
  const answers = run.answers.slice(); answers[sceneIndex(run)] = choice;
  return { ...run, answers };
}
export function readRun(value: unknown): Run | null {
  if (!value || typeof value !== 'object') return null;
  const run = value as Partial<Run>;
  if (typeof run.elapsed !== 'number' || !Number.isFinite(run.elapsed) || run.elapsed < 0 || run.elapsed > TOTAL_SECONDS || !Array.isArray(run.answers) || run.answers.length !== SCENES.length) return null;
  if (!Array.from(run.answers).every(a => a === null || (Number.isInteger(a) && a >= 0 && a <= 2))) return null;
  const last = sceneIndex({ elapsed: run.elapsed, answers: run.answers });
  if (run.elapsed < TOTAL_SECONDS && run.answers.some((a, i) => i > last && a !== null)) return null;
  return { elapsed: run.elapsed, answers: [...run.answers] };
}
export function ending(run: Run) {
  const previous = run.answers.slice(0, -1);
  const proof = previous.reduce<number>((n, choice, i) => n + (choice === null ? 0 : (SCENES[i].options[choice].proof || 0)), 0);
  const witnesses = previous.reduce<number>((n, choice, i) => n + (choice === null ? 0 : (SCENES[i].options[choice].witnesses || 0)), 0);
  const final = run.answers.at(-1);
  if (final === 0) return { title: 'The file goes out', text: proof >= 4 ? 'The duty office receives a record with enough dated documents to establish that the old order was wrong. The gate is held while crews act on the revised order. Morrow disputes the account, but he cannot make the earlier map current.' : 'The duty office receives your refusal, but the file has gaps. The gate is held while crews act on the revised order; afterward, people agree that the old order was wrong but cannot establish when everyone knew it.', proof, witnesses };
  if (final === 2) return { title: 'The diversion', text: witnesses >= 3 ? 'The diversion begins. The crews you brought into the conversation have warning to move people from the lowest floors, though the water still reaches Ward Six. Their accounts leave little room to call the district empty.' : 'The diversion begins. Water reaches Ward Six before every warning gets through. The office records your authorization; the people at the hall must later work out what was known and when.', proof, witnesses };
  return { title: final === null ? 'The desk defaults to hold' : 'The hold', text: witnesses >= 3 ? 'The gate holds while the crews you contacted use the interval to move people and equipment. Pressure continues to rise; the next shift inherits a difficult decision, but not an empty room.' : 'The gate holds and the engineer starts the interval. Some warnings are slow to reach the crews. The next shift inherits rising pressure and an incomplete account of the people on the line.', proof, witnesses };
}
