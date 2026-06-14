"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Minimal theme provider — replaces next-themes, whose anti-flash inline
// <script> trips React 19's "Encountered a script tag" error and drives a
// hydration mismatch (Next 16 / React 19). We apply the theme AFTER mount, so
// SSR and the first client render are identical (no mismatch) and nothing
// renders a <script> into the React tree. Trade-off: a dark-mode user sees a
// brief light flash on first load — acceptable for a light-default personal app.

type Theme = "light" | "dark";
const STORAGE_KEY = "scout-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Load the stored preference once, after mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") setThemeState(stored);
    } catch {
      // localStorage unavailable — stay on the light default.
    }
  }, []);

  // Reflect the active theme onto <html>.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore persistence failures
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
