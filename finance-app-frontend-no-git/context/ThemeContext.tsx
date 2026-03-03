import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Glass } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];
type GlassTokens = (typeof Glass)['light'] | (typeof Glass)['dark'];

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  glass: GlassTokens;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = '@fintrack_theme';

// ─── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {
        // Storage failed; keep default 'system' mode
      })
      .finally(() => setLoaded(true));
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system');
  }, [mode, setMode]);

  const resolvedScheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const isDark = resolvedScheme === 'dark';

  const value: ThemeContextValue = {
    mode: loaded ? mode : 'system',
    isDark,
    colors: Colors[resolvedScheme],
    glass: Glass[resolvedScheme],
    setMode,
    toggleTheme,
  };

  // Always render with current theme (default 'system' until storage loads) to avoid blank screen
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
