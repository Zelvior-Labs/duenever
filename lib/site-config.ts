/* Site configuration — served from the Supabase edge gateway, with safe fallbacks.
   The website never holds Supabase credentials: reads hit a public edge function,
   writes require the server-side admin token. */

export interface GameOverride {
  title?: string;
  tagline?: string;
  description?: string;
  category?: string;
  tags?: string[];
  controls?: string[];
  featured?: boolean;
  playable?: boolean;
  hidden?: boolean;
  cardImage?: string;
  bannerImage?: string;
}

export interface SiteConfig {
  site: {
    title: string;
    description: string;
    footerText: string;
    accent: string;
  };
  hero: {
    enabled: boolean;
    badge: string;
    headline: string;
    subtext: string;
    cta: string;
    secondaryCta: string;
    image: string;
  };
  games: Record<string, GameOverride>;
  flags: {
    showRecents: boolean;
    showFooter: boolean;
    showCategories: boolean;
  };
}

export const DEFAULT_CONFIG: SiteConfig = {
  site: {
    title: 'DueNever — Browser games for bored people',
    description:
      'A lightweight browser-game platform for bored people. No installs or mandatory signup. Instant play on any hardware.',
    footerText: 'Browser games for bored people.',
    accent: '#CCFF00',
  },
  hero: {
    enabled: true,
    badge: '★ New · Featured',
    headline: 'Rocket Rampage',
    subtext:
      'Shred asteroids with auto-cannons, outgun alien fighters, and survive escalating waves. Your high score is the only thing due.',
    cta: '▶ Play now',
    secondaryCta: 'Game details',
    image: '/games/rocket-rampage/banner.jpg',
  },
  games: {},
  flags: {
    showRecents: true,
    showFooter: true,
    showCategories: true,
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_STR = 400;

function cleanStr(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (s.length === 0) return fallback;
  return s.slice(0, MAX_STR);
}

function cleanBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function cleanStrArray(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const arr = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim().slice(0, 60));
  return arr.length > 0 ? arr.slice(0, 24) : fallback;
}

function cleanColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX.test(v.trim()) ? v.trim() : fallback;
}

function cleanImage(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (s.length === 0) return fallback;
  // Only allow site-relative or https URLs to avoid javascript:/data: injection
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 400);
  if (/^https:\/\/[\w.-]+/.test(s)) return s.slice(0, 400);
  return fallback;
}

function cleanOverride(v: unknown): GameOverride {
  const o: GameOverride = {};
  if (typeof v !== 'object' || v === null) return o;
  const src = v as Record<string, unknown>;
  if ('title' in src && typeof src.title === 'string' && src.title.trim()) o.title = src.title.trim().slice(0, 80);
  if ('tagline' in src && typeof src.tagline === 'string' && src.tagline.trim()) o.tagline = src.tagline.trim().slice(0, 160);
  if ('description' in src && typeof src.description === 'string' && src.description.trim())
    o.description = src.description.trim().slice(0, 600);
  if ('category' in src && typeof src.category === 'string' && src.category.trim()) o.category = src.category.trim().slice(0, 30);
  if ('tags' in src && Array.isArray(src.tags)) o.tags = cleanStrArray(src.tags, []);
  if ('controls' in src && Array.isArray(src.controls)) o.controls = cleanStrArray(src.controls, []);
  if ('featured' in src) o.featured = cleanBool(src.featured, false);
  if ('playable' in src) o.playable = cleanBool(src.playable, false);
  if ('hidden' in src) o.hidden = cleanBool(src.hidden, false);
  if ('cardImage' in src && typeof src.cardImage === 'string' && src.cardImage.trim()) o.cardImage = cleanImage(src.cardImage, '');
  if ('bannerImage' in src && typeof src.bannerImage === 'string' && src.bannerImage.trim())
    o.bannerImage = cleanImage(src.bannerImage, '');
  return o;
}

/** Deep-normalizes any incoming config (from DB or the admin UI) against defaults. */
export function normalizeConfig(raw: unknown): SiteConfig {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const site = (r.site ?? {}) as Record<string, unknown>;
  const hero = (r.hero ?? {}) as Record<string, unknown>;
  const flags = (r.flags ?? {}) as Record<string, unknown>;

  const games: Record<string, GameOverride> = {};
  if (typeof r.games === 'object' && r.games !== null && !Array.isArray(r.games)) {
    for (const [k, v] of Object.entries(r.games as Record<string, unknown>)) {
      const ov = cleanOverride(v);
      if (Object.keys(ov).length > 0) games[k.slice(0, 60)] = ov;
    }
  }

  return {
    site: {
      title: cleanStr(site.title, DEFAULT_CONFIG.site.title),
      description: cleanStr(site.description, DEFAULT_CONFIG.site.description),
      footerText: cleanStr(site.footerText, DEFAULT_CONFIG.site.footerText),
      accent: cleanColor(site.accent, DEFAULT_CONFIG.site.accent),
    },
    hero: {
      enabled: cleanBool(hero.enabled, DEFAULT_CONFIG.hero.enabled),
      badge: cleanStr(hero.badge, DEFAULT_CONFIG.hero.badge),
      headline: cleanStr(hero.headline, DEFAULT_CONFIG.hero.headline),
      subtext: cleanStr(hero.subtext, DEFAULT_CONFIG.hero.subtext),
      cta: cleanStr(hero.cta, DEFAULT_CONFIG.hero.cta),
      secondaryCta: cleanStr(hero.secondaryCta, DEFAULT_CONFIG.hero.secondaryCta),
      image: cleanImage(hero.image, DEFAULT_CONFIG.hero.image),
    },
    games,
    flags: {
      showRecents: cleanBool(flags.showRecents, DEFAULT_CONFIG.flags.showRecents),
      showFooter: cleanBool(flags.showFooter, DEFAULT_CONFIG.flags.showFooter),
      showCategories: cleanBool(flags.showCategories, DEFAULT_CONFIG.flags.showCategories),
    },
  };
}

import type { Game, GameCategory } from './games';

/** Merge Control Center overrides into the static game catalog. */
export function applyGameOverrides(games: Game[], cfg: SiteConfig): Game[] {
  const out: Game[] = [];
  for (const g of games) {
    const o = cfg.games[g.id];
    if (o?.hidden) continue;
    out.push({
      ...g,
      title: o?.title ?? g.title,
      tagline: o?.tagline ?? g.tagline,
      description: o?.description ?? g.description,
      category: (o?.category as GameCategory) ?? g.category,
      tags: o?.tags && o.tags.length > 0 ? o.tags : g.tags,
      controls: o?.controls && o.controls.length > 0 ? o.controls : g.controls,
      featured: o?.featured ?? g.featured,
      playable: o?.playable ?? g.playable,
      art: {
        cardImage: o?.cardImage || g.art?.cardImage || '',
        bannerImage: o?.bannerImage || g.art?.bannerImage || g.art?.cardImage || '',
      },
    });
  }
  return out;
}

const EDGE_PATH = '/functions/v1/site-config';

/** Server-side read (cached 30s) with graceful fallback to defaults. */
export async function getSiteConfig(): Promise<SiteConfig> {
  const base = process.env.SUPABASE_URL;
  if (!base) return DEFAULT_CONFIG;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${EDGE_PATH}`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return DEFAULT_CONFIG;
    const json = (await res.json()) as { config?: unknown };
    return normalizeConfig(json.config);
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Uncached read used by the Control Center API. */
export async function getSiteConfigFresh(): Promise<SiteConfig | null> {
  const base = process.env.SUPABASE_URL;
  const token = process.env.SUPABASE_ADMIN_TOKEN;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${EDGE_PATH}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { config?: unknown };
    return normalizeConfig(json.config);
  } catch {
    void token;
    return null;
  }
}

/** Server-side write through the edge gateway (requires the admin token env). */
export async function saveSiteConfig(config: SiteConfig): Promise<{ ok: boolean; error?: string }> {
  const base = process.env.SUPABASE_URL;
  const token = process.env.SUPABASE_ADMIN_TOKEN;
  if (!base || !token) return { ok: false, error: 'Server is not configured for writes (missing SUPABASE_URL / SUPABASE_ADMIN_TOKEN).' };
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${EDGE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(config),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? `gateway returned ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}
