'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { GameAudio, SOUND_KEY, type SoundCue } from '@/lib/game-audio';
import { getStoredSettings } from '@/lib/storage';

export function useGameSound() {
  const engine = useRef<GameAudio | null>(null);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const audio = new GameAudio(); engine.current = audio;
    setReducedMotion(getStoredSettings().reducedMotion);
    try { audio.muted = localStorage.getItem(SOUND_KEY) === '1'; } catch {}
    setMuted(audio.muted);
    const unlock = () => audio.unlock();
    const blur = () => audio.stop();
    const hidden = () => { if (document.hidden) audio.stop(); };
    const storage = (event: StorageEvent) => { if (event.key === 'duenever_settings_v1') setReducedMotion(getStoredSettings().reducedMotion); if (event.key === SOUND_KEY) { audio.muted = event.newValue === '1'; setMuted(audio.muted); if (audio.muted) audio.stop(); } };
    window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
    window.addEventListener('storage', storage); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); window.removeEventListener('storage', storage); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); audio.close(); if (engine.current === audio) engine.current = null; };
  }, []);
  const play = useCallback((cue: SoundCue) => engine.current?.play(cue), []);
  const stop = useCallback(() => engine.current?.stop(), []);
  const toggle = useCallback(() => {
    const audio = engine.current; if (!audio) return;
    audio.muted = !audio.muted; setMuted(audio.muted);
    if (audio.muted) audio.stop(); else audio.unlock();
    try { localStorage.setItem(SOUND_KEY, audio.muted ? '1' : '0'); } catch {}
  }, []);
  return { muted, play, stop, toggle, reducedMotion };
}
export function SoundButton({ muted, toggle }: { muted: boolean; toggle: () => void }) {
  return <button type="button" onClick={toggle} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Unmute sound' : 'Mute sound'} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/15 bg-black/40 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>;
}
