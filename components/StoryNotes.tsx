import { GAME_STORIES, unlockedStoryNotes, type StoryId } from '@/lib/game-stories';

/** Optional, local-only reading: never changes gameplay or room state. */
export function StoryNotes({ game, progress = 0 }: { game: StoryId; progress?: number }) {
  const story = GAME_STORIES[game];
  const notes = unlockedStoryNotes(game, progress);
  return <details className="w-full max-w-lg rounded-lg border border-white/15 bg-black/40 p-3 text-left font-mono text-xs leading-relaxed text-neutral-300">
    <summary className="cursor-pointer font-bold text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Story · {story.title}</summary>
    <div className="mt-3 max-h-[32vh] space-y-3 overflow-y-auto pr-1">
      <p>{story.introduction}</p>
      {notes.map(note => <div key={note.heading} className="border-t border-white/10 pt-2"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">{note.heading}</p><p>{note.text}</p></div>)}
      {story.unit && <p className="text-[10px] text-neutral-400">{notes.length < story.notes.length ? `More notes unlock as ${story.unit} increases.` : 'All notes for this run are available.'}</p>}
    </div>
  </details>;
}
