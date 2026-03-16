import { useTheme } from '@/context/ThemeContext';

/**
 * Returns a theme-aware color value.
 * Prefers explicit overrides from `props`, then falls back to `colors[colorName]`.
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
