import { useEffect } from 'react';
import { useAppStore } from '../store';
import { ALL_THEMES, isProTheme } from '../store/preferences';
import { useEntitlement } from '../entitlement';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.preferences.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const ent = useEntitlement();

  useEffect(() => {
    if (isProTheme(theme) && !ent.isPro) {
      setTheme('dark');
      return;
    }
    const root = document.documentElement;
    for (const t of ALL_THEMES) root.classList.remove(t);
    root.classList.add(theme);
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }, [theme, ent.isPro, setTheme]);

  return <>{children}</>;
}
