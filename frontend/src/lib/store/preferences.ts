export type Theme = 'dark' | 'light';
export type SessionLength = 10 | 20 | 30;
export type GameMode = 'flashcards' | 'mcq' | 'code-review';

export interface SessionPreferences {
  theme: Theme;
  defaultSessionLength: SessionLength;
  defaultStartingMode: GameMode | null;
  reducedMotion: boolean | 'system';
}

export const DEFAULT_PREFERENCES: SessionPreferences = {
  theme: 'dark',
  defaultSessionLength: 20,
  defaultStartingMode: null,
  reducedMotion: 'system',
};
