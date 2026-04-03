import { useTheme } from '@/context/ThemeContext';

/**
 * Returns a theme-aware color value for a given color name.
 *
 * Priority: explicit `props.light` / `props.dark` override →
 * `colors[colorName]` from the active theme → `'#000'` fallback.
 *
 * @param props - Optional per-theme color overrides.
 * @param colorName - Key in the theme's `colors` object (e.g. `'text'`, `'background'`).
 * @returns Hex color string appropriate for the current light/dark mode.
 *
 * @example
 * ```tsx
 * const bg = useThemeColor({ light: '#fff', dark: '#111' }, 'background');
 * ```
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: string,
) {
  const { isDark, colors } = useTheme();
  const override = isDark ? props.dark : props.light;
  if (override) return override;
  return (colors as Record<string, string>)[colorName] ?? '#000';
}
