import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { extractErrorMessage } from '@/utils/error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type AuthMode = 'login' | 'signup';

export function useEmailPasswordAuth() {
  const { t } = useTranslation();
  const { login, signup, setPendingVerification } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const isLogin = mode === 'login';

    if (!trimmedEmail || !password) {
      Alert.alert(t('errors.missingFields'), t('errors.enterEmailPassword'));
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      Alert.alert(t('errors.invalidEmail'), t('errors.validEmail'));
      return;
    }
    if (!isLogin && password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(t('errors.weakPassword'), t('errors.passwordMinLength', { count: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);
    try {
      const res = isLogin
        ? await login({ email: trimmedEmail, password })
        : await signup({ email: trimmedEmail, password, name: name.trim() || undefined });
      setPendingVerification({ session_id: res.session_id, email: trimmedEmail });
      router.push('/verify-code');
    } catch (e: unknown) {
      Alert.alert(t('errors.generic'), extractErrorMessage(e, t('errors.generic')));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    mode, setMode,
    name, setName,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    submitting, setSubmitting,
    handleSubmit,
  };
}
