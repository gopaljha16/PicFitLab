const RECENT_KEY = 'picfitlab_recent_tools';
const FAVORITES_KEY = 'picfitlab_favorite_tools';

export function recordRecentTool(toolId: string): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [toolId, ...list.filter((id) => id !== toolId)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors (private mode / denied storage)
  }
}

export function getRecentTools(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getFavoriteTools(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteTool(toolId: string): string[] {
  try {
    const current = getFavoriteTools();
    const next = current.includes(toolId)
      ? current.filter((id) => id !== toolId)
      : [...current, toolId];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function clearLocalPreferences(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
    localStorage.removeItem(FAVORITES_KEY);
  } catch {
    // Ignore
  }
}
