import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Web implementation of `useColorScheme`.
 *
 * Returns `'light'` during SSR/static rendering to avoid hydration mismatches,
 * then switches to the real system color scheme after client-side hydration.
 *
 * @returns `'light' | 'dark' | null`
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
