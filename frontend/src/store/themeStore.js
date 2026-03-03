import { create } from 'zustand';

/**
 * Lightweight theme store.
 * Persists the user's preference to localStorage and toggles a `dark`
 * class on the root <html> element so Tailwind `dark:` variants work.
 */
const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const stored = localStorage.getItem('theme') || 'dark';
applyTheme(stored);

const useThemeStore = create((set) => ({
  theme: stored,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      applyTheme(next);
      return { theme: next };
    }),
}));

export default useThemeStore;
