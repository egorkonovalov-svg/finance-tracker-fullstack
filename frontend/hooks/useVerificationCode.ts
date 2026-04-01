import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { extractErrorMessage } from '@/utils/error';

export const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function useVerificationCode() {
  const { t } = useTranslation();
  const { verifyCode, resendCode, pendingVerification } = useAuth();
  const router = useRouter();

  const [sessionId, setSessionId] = useState(pendingVerification?.session_id ?? '');
  const email = pendingVerification?.email ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  const submitCode = useCallback(
    async (code: string) => {
      if (submitting) return;
      setError(null);
      setSubmitting(true);
      try {
        await verifyCode({ session_id: sessionId, code });
      } catch (e: unknown) {
        const msg = extractErrorMessage(e, t('verify.verificationFailed'));
        setError(msg);
        setDigits(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, verifyCode, submitting, t],
  );

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      const char = value.replace(/[^0-9]/g, '').slice(-1);

      setDigits((prev) => {
        const next = [...prev];
        next[index] = char;

        if (char && index < CODE_LENGTH - 1) {
          inputRefs.current[index + 1]?.focus();
        }

        if (char && index === CODE_LENGTH - 1) {
          const code = next.join('');
          if (code.length === CODE_LENGTH) {
            setTimeout(() => submitCode(code), 50);
          }
        }

        return next;
      });
    },
    [submitCode],
  );

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
      if (cleaned.length === 0) return;

      const next = Array(CODE_LENGTH).fill('');
      for (let i = 0; i < cleaned.length; i++) {
        next[i] = cleaned[i];
      }
      setDigits(next);

      if (cleaned.length === CODE_LENGTH) {
        setTimeout(() => submitCode(cleaned), 50);
      } else {
        inputRefs.current[cleaned.length]?.focus();
      }
    },
    [submitCode],
  );

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      const res = await resendCode({ session_id: sessionId });
      setSessionId(res.session_id);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (e: unknown) {
      const msg = extractErrorMessage(e, t('verify.resendCode'));
      if (msg.includes('start over') || msg.includes('Maximum resend')) {
        Alert.alert(t('verify.sessionExpired'), msg, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        setError(msg);
      }
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : '';

  return {
    digits,
    error,
    submitting,
    resending,
    cooldown,
    inputRefs,
    maskedEmail,
    submitCode,
    handleDigitChange,
    handleKeyPress,
    handlePaste,
    handleResend,
  };
}
