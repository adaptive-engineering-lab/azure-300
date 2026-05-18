export type Theme = 'dark' | 'light' | 'solar' | 'forest';
export const FREE_THEMES: Theme[] = ['dark', 'light'];
export const PRO_THEMES: Theme[] = ['solar', 'forest'];
export const ALL_THEMES: Theme[] = [...FREE_THEMES, ...PRO_THEMES];

export function isProTheme(theme: Theme): boolean {
  return PRO_THEMES.includes(theme);
}
export type SessionLength = 10 | 20 | 30;
export type GameMode = 'flashcards' | 'mcq' | 'code-review';

export interface SessionPreferences {
  theme: Theme;
  defaultSessionLength: SessionLength;
  defaultStartingMode: GameMode | null;
  reducedMotion: boolean | 'system';
  /** ISO date (YYYY-MM-DD) of the user's scheduled AI-300 exam. Pro-only. */
  examDate: string | null;
}

export const DEFAULT_PREFERENCES: SessionPreferences = {
  theme: 'dark',
  defaultSessionLength: 20,
  defaultStartingMode: null,
  reducedMotion: 'system',
  examDate: null,
};
