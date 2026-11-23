'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PlayableReactionGameProps {
  onBack: () => void;
}

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'finished';

export function PlayableReactionGame({ onBack }: PlayableReactionGameProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [scores, setScores] = useState<number[]>([]);
  const [currentResult, setCurrentResult] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState<boolean>(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedBest = localStorage.getItem('duenever_snaptap_best');
    if (savedBest) {
      setBestScore(parseInt(savedBest, 10));
    }
  }, []);

  const startRound = () => {
    setGameState('waiting');
    setTooEarly(false);
    setCurrentResult(null);

    const delay = 1500 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      setGameState('ready');
      startTimeRef.current = performance.now();
    }, delay);
  };

  const handleTap = () => {
    if (gameState === 'idle') {
      startRound();
    } else if (gameState === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTooEarly(true);
      setGameState('result');
    } else if (gameState === 'ready') {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setCurrentResult(elapsed);
      const newScores = [...scores, elapsed];
      setScores(newScores);

      if (!bestScore || elapsed < bestScore) {
        setBestScore(elapsed);
        localStorage.setItem('duenever_snaptap_best', elapsed.toString());
      }

      if (newScores.length >= 5) {
        setGameState('finished');
      } else {
        setGameState('result');
      }
    } else if (gameState === 'result') {
      startRound();
    } else if (gameState === 'finished') {
      setScores([]);
      startRound();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState, scores]);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="w-full max-w-xl mx-auto bg-neutral-900 border-2 border-neutral-700 rounded-lg p-6 font-mono text-neutral-100 flex flex-col items-center select-none shadow-xl">
      <div className="w-full flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#CCFF00]">SNAP TAP 3000</h2>
          <p className="text-xs text-neutral-400">Reaction Speed Benchmark (5 Rounds)</p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-600 transition-colors cursor-pointer"
        >
          ← Back to details
        </button>
      </div>

      {/* Main Trigger Arena */}
      <div
        onClick={handleTap}
        className={`w-full h-64 rounded-lg border-2 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors ${
          gameState === 'idle'
            ? 'bg-neutral-800 border-neutral-600 hover:border-[#CCFF00]'
            : gameState === 'waiting'
            ? 'bg-amber-950/80 border-amber-600'
            : gameState === 'ready'
            ? 'bg-[#CCFF00] text-black border-[#CCFF00]'
            : tooEarly
            ? 'bg-rose-950/80 border-rose-600'
            : 'bg-neutral-800 border-neutral-600'
        }`}
      >
        {gameState === 'idle' && (
          <>
            <p className="text-lg font-bold">CLICK OR PRESS SPACE TO START</p>
            <p className="text-xs text-neutral-400 mt-2">Wait for GREEN, then tap as fast as possible!</p>
          </>
        )}

        {gameState === 'waiting' && (
          <>
            <p className="text-xl font-bold text-amber-400 animate-pulse">WAIT FOR GREEN...</p>
            <p className="text-xs text-amber-300/70 mt-2">Don't tap yet!</p>
          </>
        )}

        {gameState === 'ready' && (
          <>
            <p className="text-3xl font-extrabold text-black">TAP NOW!</p>
          </>
        )}

        {gameState === 'result' && tooEarly && (
          <>
            <p className="text-xl font-bold text-rose-400">TOO EARLY!</p>
            <p className="text-xs text-neutral-400 mt-2">Click to try round {scores.length + 1} again.</p>
          </>
        )}

        {gameState === 'result' && !tooEarly && currentResult !== null && (
          <>
            <p className="text-4xl font-extrabold text-[#CCFF00]">{currentResult} ms</p>
            <p className="text-xs text-neutral-400 mt-2">
              Round {scores.length} of 5. Click or press Space to continue.
            </p>
          </>
        )}

        {gameState === 'finished' && (
          <>
            <p className="text-xs text-neutral-400">5-ROUND AVERAGE</p>
            <p className="text-5xl font-extrabold text-[#CCFF00] my-2">{avgScore} ms</p>
            <p className="text-xs text-neutral-300">
              {avgScore && avgScore < 200
                ? 'Esports Reflexes!'
                : avgScore && avgScore < 250
                ? 'Above Average'
                : 'Room for improvement'}
            </p>
            <p className="text-xs text-neutral-400 mt-4 underline">Click to start a new 5-round run</p>
          </>
        )}
      </div>

      {/* Stats footer */}
      <div className="w-full mt-6 grid grid-cols-2 gap-4 text-xs border-t border-neutral-800 pt-4">
        <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
          <span className="text-neutral-500 block">Personal Best:</span>
          <span className="text-sm font-bold text-neutral-200">
            {bestScore ? `${bestScore} ms` : 'None yet'}
          </span>
        </div>
        <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
          <span className="text-neutral-500 block">Current Rounds:</span>
          <span className="text-sm font-bold text-neutral-200">
            {scores.length > 0 ? scores.join('ms, ') + 'ms' : '0/5'}
          </span>
        </div>
      </div>
    </div>
  );
}
