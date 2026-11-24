'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export function ControlCenterLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? 'Login failed.');
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-neutral-100 flex items-center justify-center p-6 font-sans">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-neutral-900 border-2 border-neutral-700 rounded-xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-[color:var(--accent)]" />
          <h1 className="font-mono text-lg font-black tracking-tight">CONTROL CENTER</h1>
        </div>
        <p className="text-xs font-mono text-neutral-400 mb-5">Restricted area. Admin access only.</p>

        <label className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5" htmlFor="cc-email">
          Admin email
        </label>
        <input
          id="cc-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm font-mono text-neutral-100 focus:outline-none focus:border-[color:var(--accent)] mb-4"
          placeholder="admin@example.com"
        />

        <label className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5" htmlFor="cc-password">
          Admin password
        </label>
        <input
          id="cc-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm font-mono text-neutral-100 focus:outline-none focus:border-[var(--accent)]"
          placeholder="••••••••••••"
        />

        {error && <p className="mt-3 text-xs font-mono text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={busy || password.length === 0 || email.length === 0}
          className="mt-5 w-full px-4 py-2.5 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.25)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-none"
        >
          {busy ? 'Verifying…' : 'Unlock'}
        </button>

        <a href="/" className="block mt-4 text-center text-[11px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors">
          ← Back to site
        </a>
      </form>
    </div>
  );
}
