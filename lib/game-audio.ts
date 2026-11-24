// Short synthesized effects are started only after a user gesture. No audio files
// or remote services are needed; one context belongs to each mounted game.
export type SoundCue = 'move' | 'merge' | 'jump' | 'slide' | 'collect' | 'hit' | 'win' | 'roll' | 'start' | 'error';
export const SOUND_KEY = 'duenever_sound_muted_v1';
const CUES: Record<SoundCue, [OscillatorType, number, number, number, number][]> = {
  move: [['triangle', 340, 240, .08, .035]], merge: [['sine', 480, 720, .13, .055]],
  jump: [['triangle', 260, 600, .15, .055]], slide: [['triangle', 250, 140, .10, .04]],
  collect: [['sine', 700, 1050, .14, .055]], hit: [['sawtooth', 190, 65, .22, .07]],
  win: [['sine', 480, 880, .3, .055]], roll: [['triangle', 150, 330, .12, .05]],
  start: [['sine', 330, 550, .15, .045]], error: [['triangle', 230, 115, .12, .04]],
};
export class GameAudio {
  private context: AudioContext | null = null;
  private sources = new Set<OscillatorNode>();
  muted = false;
  unlock() {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context ??= new Ctor();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Unsupported or blocked audio must never stop gameplay. */ }
  }
  play(cue: SoundCue) {
    const ctx = this.context;
    if (!ctx || this.muted || ctx.state === 'closed' || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      for (const [type, from, to, duration, volume] of CUES[cue]) {
        const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + duration);
        gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .008); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
        osc.connect(gain); gain.connect(ctx.destination); this.sources.add(osc);
        osc.onended = () => { this.sources.delete(osc); osc.disconnect(); gain.disconnect(); };
        osc.start(now); osc.stop(now + duration + .01);
      }
    } catch { /* Audio is optional. */ }
  }
  stop() { for (const source of this.sources) { try { source.stop(); } catch {} } this.sources.clear(); }
  close() { this.stop(); const context = this.context; this.context = null; if (context && context.state !== 'closed') void context.close().catch(() => {}); }
}
