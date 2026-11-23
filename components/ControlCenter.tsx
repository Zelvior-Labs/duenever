'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogOut, RotateCcw, Save, TriangleAlert } from 'lucide-react';
import { SiteConfig, DEFAULT_CONFIG } from '@/lib/site-config';
import { GAMES, CATEGORIES, GameCategory } from '@/lib/games';

interface Props {
  initialConfig: SiteConfig;
  /** true when the config gateway is unreachable (e.g. local env without Supabase) */
  offline: boolean;
}

type Tab = 'site' | 'hero' | 'games' | 'flags';

const inputCls =
  'w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#CCFF00]';
const labelCls = 'block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5';
const cardCls = 'bg-neutral-900 border border-neutral-800 rounded-xl p-4';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4">
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] font-mono text-neutral-600">{hint}</p>}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2 border-b border-neutral-800 last:border-0">
      <span className="font-mono text-xs text-neutral-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`w-10 h-5.5 rounded-full border transition-colors relative cursor-pointer ${value ? 'bg-[#CCFF00] border-[#CCFF00]' : 'bg-neutral-800 border-neutral-600'}`}
        style={{ height: 22 }}
      >
        <span
          className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-[2px]'}`}
        />
      </button>
    </label>
  );
}

export function ControlCenter({ initialConfig, offline }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('site');
  const [config, setConfig] = useState<SiteConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [openGame, setOpenGame] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(initialConfig), [config, initialConfig]);

  const save = async (payload: SiteConfig = config) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMsg({ kind: 'ok', text: 'Saved — live on the site.' });
        router.refresh();
      } else {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg({ kind: 'err', text: json.error ?? 'Save failed.' });
      }
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (!confirm('Reset the entire site config to factory defaults? This goes live immediately.')) return;
    setConfig(DEFAULT_CONFIG);
    void save(DEFAULT_CONFIG);
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  };

  const setSite = (k: keyof SiteConfig['site'], v: string) =>
    setConfig((c) => ({ ...c, site: { ...c.site, [k]: v } }));
  const setHero = (k: keyof SiteConfig['hero'], v: string | boolean) =>
    setConfig((c) => ({ ...c, hero: { ...c.hero, [k]: v } }));
  const setFlag = (k: keyof SiteConfig['flags'], v: boolean) =>
    setConfig((c) => ({ ...c, flags: { ...c.flags, [k]: v } }));
  const setGameField = (id: string, patch: Record<string, unknown>) =>
    setConfig((c) => ({
      ...c,
      games: { ...c.games, [id]: { ...(c.games[id] ?? {}), ...patch } },
    }));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'site', label: 'Site' },
    { id: 'hero', label: 'Hero banner' },
    { id: 'games', label: `Games (${GAMES.length})` },
    { id: 'flags', label: 'Toggles' },
  ];

  return (
    <div className="min-h-screen bg-[#111111] text-neutral-100 font-sans flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur border-b-2 border-neutral-800 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="font-mono text-lg font-black tracking-tight">
              Control <span className="text-[#CCFF00]">Center</span>
            </span>
            <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            {offline && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-amber-400 px-2 py-1 border border-amber-700/50 rounded">
                <TriangleAlert className="w-3.5 h-3.5" /> gateway offline — saves will fail
              </span>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg font-mono text-xs text-neutral-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={() => void save()}
              disabled={busy}
              className={`flex items-center gap-1.5 px-4 py-2 font-mono text-xs font-bold rounded-lg border-2 border-black transition-all cursor-pointer ${
                dirty ? 'bg-[#CCFF00] text-black hover:bg-lime-300' : 'bg-neutral-700 text-neutral-300 cursor-not-allowed'
              } disabled:opacity-60`}
            >
              <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : dirty ? 'Save & publish' : 'Saved'}
            </button>
            <button
              onClick={() => void logout()}
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {msg && (
        <div
          className={`max-w-5xl mx-auto w-full px-4 sm:px-6 pt-3 font-mono text-xs ${
            msg.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg border shrink-0 transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-[#CCFF00] text-black font-bold border-[#CCFF00]'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              {showRaw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} Raw JSON
            </button>
          </div>
        </div>

        {showRaw && (
          <div className={cardCls}>
            <Field label="Live config JSON (read-only copy you can copy out)">
              <textarea
                readOnly
                value={JSON.stringify(config, null, 2)}
                className={`${inputCls} h-72 resize-y`}
              />
            </Field>
            <Field label="Paste JSON to load into the editor (then press Save & publish)">
              <textarea
                value={JSON.stringify(config, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setConfig(parsed);
                    setMsg({ kind: 'ok', text: 'Loaded into editor — review and save.' });
                  } catch {
                    /* keep last good state while typing invalid json */
                  }
                }}
                className={`${inputCls} h-40 resize-y`}
              />
            </Field>
          </div>
        )}

        {tab === 'site' && (
          <div className={cardCls}>
            <h2 className="font-mono font-bold text-sm text-neutral-200 mb-4 border-b border-neutral-800 pb-2">
              Site identity
            </h2>
            <Field label="Browser tab title">
              <input className={inputCls} value={config.site.title} onChange={(e) => setSite('title', e.target.value)} />
            </Field>
            <Field label="Meta description">
              <textarea
                className={`${inputCls} h-20 resize-y`}
                value={config.site.description}
                onChange={(e) => setSite('description', e.target.value)}
              />
            </Field>
            <Field label="Footer text">
              <input
                className={inputCls}
                value={config.site.footerText}
                onChange={(e) => setSite('footerText', e.target.value)}
              />
            </Field>
            <Field label="Accent color" hint="Applied to the header brand, active filters and hero buttons.">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.site.accent}
                  onChange={(e) => setSite('accent', e.target.value)}
                  className="w-12 h-9 rounded border border-neutral-700 bg-neutral-950 cursor-pointer"
                />
                <input className={inputCls} value={config.site.accent} onChange={(e) => setSite('accent', e.target.value)} />
              </div>
            </Field>
          </div>
        )}

        {tab === 'hero' && (
          <div className={cardCls}>
            <h2 className="font-mono font-bold text-sm text-neutral-200 mb-4 border-b border-neutral-800 pb-2">
              Homepage hero banner
            </h2>
            <Toggle label="Show hero section" value={config.hero.enabled} onChange={(v) => setHero('enabled', v)} />
            <div className="h-3" />
            <Field label="Badge">
              <input className={inputCls} value={config.hero.badge} onChange={(e) => setHero('badge', e.target.value)} />
            </Field>
            <Field label="Headline">
              <input className={inputCls} value={config.hero.headline} onChange={(e) => setHero('headline', e.target.value)} />
            </Field>
            <Field label="Subtext">
              <textarea
                className={`${inputCls} h-20 resize-y`}
                value={config.hero.subtext}
                onChange={(e) => setHero('subtext', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Primary button">
                <input className={inputCls} value={config.hero.cta} onChange={(e) => setHero('cta', e.target.value)} />
              </Field>
              <Field label="Secondary button">
                <input
                  className={inputCls}
                  value={config.hero.secondaryCta}
                  onChange={(e) => setHero('secondaryCta', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Background image" hint="Site-relative path or https:// URL — used by the featured game's banner too.">
              <div className="flex items-center gap-3">
                {config.hero.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.hero.image} alt="" className="w-24 h-14 object-cover rounded border border-neutral-700" />
                )}
                <input className={inputCls} value={config.hero.image} onChange={(e) => setHero('image', e.target.value)} />
              </div>
            </Field>
          </div>
        )}

        {tab === 'games' && (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] text-neutral-500">
              Override any game&apos;s content. &quot;Hidden&quot; removes the game from the site; images accept site paths or
              https URLs.
            </p>
            {GAMES.map((g) => {
              const o = config.games[g.id] ?? {};
              const isOpen = openGame === g.id;
              const hasOverrides = Object.keys(config.games[g.id] ?? {}).length > 0;
              return (
                <div key={g.id} className={cardCls}>
                  <button
                    onClick={() => setOpenGame(isOpen ? null : g.id)}
                    className="w-full flex items-center justify-between cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      {g.art?.cardImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.art.cardImage} alt="" className="w-14 h-9 object-cover rounded border border-neutral-700" />
                      )}
                      <div>
                        <span className="font-mono text-sm font-bold text-neutral-100">{o.title || g.title}</span>
                        <span className="ml-2 text-[10px] font-mono text-neutral-500">{g.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      {o.hidden ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/40">hidden</span>
                      ) : (
                        <>
                          {(o.featured ?? g.featured) && (
                            <span className="px-1.5 py-0.5 rounded bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/40">featured</span>
                          )}
                          {(o.playable ?? g.playable) && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                              playable
                            </span>
                          )}
                        </>
                      )}
                      {hasOverrides && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40">edited</span>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 border-t border-neutral-800 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <Field label="Title">
                          <input
                            className={inputCls}
                            value={o.title ?? g.title}
                            onChange={(e) => setGameField(g.id, { title: e.target.value })}
                          />
                        </Field>
                        <Field label="Category">
                          <select
                            className={`${inputCls} cursor-pointer`}
                            value={o.category ?? g.category}
                            onChange={(e) => setGameField(g.id, { category: e.target.value as GameCategory })}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Tagline">
                        <input
                          className={inputCls}
                          value={o.tagline ?? g.tagline}
                          onChange={(e) => setGameField(g.id, { tagline: e.target.value })}
                        />
                      </Field>
                      <Field label="Description">
                        <textarea
                          className={`${inputCls} h-20 resize-y`}
                          value={o.description ?? g.description}
                          onChange={(e) => setGameField(g.id, { description: e.target.value })}
                        />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <Field label="Tags (comma separated)">
                          <input
                            className={inputCls}
                            value={(o.tags ?? g.tags).join(', ')}
                            onChange={(e) =>
                              setGameField(g.id, {
                                tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              })
                            }
                          />
                        </Field>
                        <Field label="Controls (one per line)">
                          <textarea
                            className={`${inputCls} h-[38px] resize-y`}
                            value={(o.controls ?? g.controls).join('\n')}
                            onChange={(e) =>
                              setGameField(g.id, {
                                controls: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <Field label="Card image">
                          <input
                            className={inputCls}
                            placeholder={g.art?.cardImage ?? '/games/...'}
                            value={o.cardImage ?? ''}
                            onChange={(e) => setGameField(g.id, { cardImage: e.target.value })}
                          />
                        </Field>
                        <Field label="Banner image">
                          <input
                            className={inputCls}
                            placeholder={g.art?.bannerImage ?? '/games/...'}
                            value={o.bannerImage ?? ''}
                            onChange={(e) => setGameField(g.id, { bannerImage: e.target.value })}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                        <Toggle
                          label="Featured"
                          value={o.featured ?? !!g.featured}
                          onChange={(v) => setGameField(g.id, { featured: v })}
                        />
                        <Toggle
                          label="Playable"
                          value={o.playable ?? !!g.playable}
                          onChange={(v) => setGameField(g.id, { playable: v })}
                        />
                        <Toggle label="Hidden" value={!!o.hidden} onChange={(v) => setGameField(g.id, { hidden: v })} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'flags' && (
          <div className={cardCls}>
            <h2 className="font-mono font-bold text-sm text-neutral-200 mb-2 border-b border-neutral-800 pb-2">
              Site toggles
            </h2>
            <Toggle label="Show Recently Played section" value={config.flags.showRecents} onChange={(v) => setFlag('showRecents', v)} />
            <Toggle label="Show category filter pills" value={config.flags.showCategories} onChange={(v) => setFlag('showCategories', v)} />
            <Toggle label="Show footer" value={config.flags.showFooter} onChange={(v) => setFlag('showFooter', v)} />
          </div>
        )}

        <p className="text-[10px] font-mono text-neutral-600 text-center pb-4">
          Changes publish to Supabase and go live for every visitor within seconds. Sessions expire after 8 hours.
        </p>
      </main>
    </div>
  );
}
