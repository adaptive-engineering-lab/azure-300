interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ENGAGEMENT_KEY = 'ai300game.v1.engagement.ms';
const PROMPT_DISMISSED_KEY = 'ai300game.v1.installPrompt.dismissedAt';
const ENGAGEMENT_THRESHOLD_MS = 3 * 60 * 1000;
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

let captured: BeforeInstallPromptEvent | null = null;

export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    captured = e as BeforeInstallPromptEvent;
  });
}

export function bumpEngagement(ms: number): void {
  try {
    const prev = Number(localStorage.getItem(ENGAGEMENT_KEY) ?? 0);
    localStorage.setItem(ENGAGEMENT_KEY, String(prev + ms));
  } catch {
    // ignore
  }
}

export function shouldShowInstallPrompt(): boolean {
  if (!captured) return false;
  try {
    const total = Number(localStorage.getItem(ENGAGEMENT_KEY) ?? 0);
    if (total < ENGAGEMENT_THRESHOLD_MS) return false;
    const dismissedAt = Number(localStorage.getItem(PROMPT_DISMISSED_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!captured) return 'unavailable';
  await captured.prompt();
  const { outcome } = await captured.userChoice;
  captured = null;
  return outcome;
}

export function markInstallPromptDismissed(): void {
  try {
    localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/** Test-only helpers */
export const __testing = {
  ENGAGEMENT_KEY,
  PROMPT_DISMISSED_KEY,
  ENGAGEMENT_THRESHOLD_MS,
  DISMISS_COOLDOWN_MS,
  setCaptured: (e: unknown) => {
    captured = e as BeforeInstallPromptEvent | null;
  },
};
