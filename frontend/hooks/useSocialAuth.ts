import { Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { USE_MOCK } from '@/services/api-client';
import { extractErrorMessage } from '@/utils/error';

interface Options {
  setSubmitting: (v: boolean) => void;
}

/**
 * Provides Google and Apple sign-in handlers.
 *
 * - **Google:** Only available in dev mode with mock data enabled
 *   (`__DEV__ && USE_MOCK`). Uses a static mock token in place of a real OAuth flow.
 * - **Apple:** Uses `expo-apple-authentication`. Silently ignores
 *   `ERR_REQUEST_CANCELED` when the user dismisses the native sheet.
 *
 * @param options.setSubmitting - Called with `true`/`false` around each sign-in
 *   attempt so the parent can show a loading indicator.
 * @returns `{ handleGoogleSignIn, handleAppleSignIn }` async event handlers.
 *
 * @example
 * ```tsx
 * const { handleAppleSignIn } = useSocialAuth({ setSubmitting });
 * ```
 */
export function useSocialAuth({ setSubmitting }: Options) {
  const { t } = useTranslation();
  const { socialAuth } = useAuth();

  const handleGoogleSignIn = async () => {
    if (!(__DEV__ && USE_MOCK)) {
      Alert.alert(t('errors.generic'), t('errors.googleSignInFailed'));
      return;
    }
    setSubmitting(true);
    try {
      await socialAuth({ provider: 'google', id_token: 'google-mock-token' });
    } catch (e: unknown) {
      Alert.alert(t('errors.generic'), extractErrorMessage(e, t('errors.googleSignInFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setSubmitting(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        await socialAuth({ provider: 'apple', id_token: credential.identityToken });
      }
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('errors.generic'), extractErrorMessage(e, t('errors.appleSignInFailed')));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return { handleGoogleSignIn, handleAppleSignIn };
}
