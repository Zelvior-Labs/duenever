// Local storage helpers with cross-tab SWR updates & error safety
export const STORAGE_KEYS = {
  FAVOURITES: 'duenever_favs_v1',
  RECENTLY_PLAYED: 'duenever_recents_v1',
  SETTINGS: 'duenever_settings_v1',
};

export interface Settings {
  reducedMotion: boolean;
  lowPerformance: boolean;
}

export const defaultSettings: Settings = {
  reducedMotion: false,
  lowPerformance: false,
};

export function getStoredFavourites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVOURITES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('LocalStorage read error for favourites', e);
    return [];
  }
}

export function setStoredFavourites(favs: string[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(favs));
    return true;
  } catch (e) {
    console.warn('LocalStorage write error for favourites', e);
    return false;
  }
}

export interface RecentItem {
  id: string;
  playedAt: number;
}

export function getStoredRecents(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('LocalStorage read error for recents', e);
    return [];
  }
}

export function addStoredRecent(gameId: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getStoredRecents().filter(item => item.id !== gameId);
    const updated = [{ id: gameId, playedAt: Date.now() }, ...current].slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('LocalStorage write error for recents', e);
    return [];
  }
}

export function clearStoredRecents(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENTLY_PLAYED);
    return true;
  } catch (e) {
    return false;
  }
}

export function getStoredSettings(): Settings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
}

export function setStoredSettings(settings: Settings): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
}
