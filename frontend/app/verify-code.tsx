import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ApiError } from '@/services/api-client';
import { GlassCard } from '@/components/ui/glass-card';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const body = e.body as Record<string, unknown> | null;
    return (body?.detail as string) ?? (body?.message as string) ?? fallback;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export default function VerifyCodeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { verifyCode, resendCode } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id: string; email: string }>();

  const [sessionId, setSessionId] = useState(params.session_id ?? '');
  const email = params.email ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for resend button
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
            hitSlop={8}
            accessibilityLabel={t('verify.goBack')}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: Palette.indigo + '14' }]}>
            <Ionicons name="mail-open" size={36} color={Palette.indigo} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('verify.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('verify.sentCodeTo')}{'\n'}
            <Text style={{ fontFamily: FontFamily.bodySemiBold, color: colors.text }}>
              {maskedEmail}
            </Text>
          </Text>
        </Animated.View>

        {/* Code inputs */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.section}>
          <GlassCard padding={24} radius={20}>
            <View style={styles.codeRow}>
              {digits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { inputRefs.current[i] = ref; }}
                  style={[
                    styles.digitInput,
                    {
                      color: colors.text,
                      borderColor: digit
                        ? Palette.indigo
                        : error
                          ? Palette.red
                          : colors.inputBorder,
                      backgroundColor: colors.inputBg,
                    },
                  ]}
                  value={digit}
                  onChangeText={(v) => {
                    if (v.length > 1 && i === 0) {
                      handlePaste(v);
                    } else {
                      handleDigitChange(i, v);
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={i === 0 ? CODE_LENGTH : 1}
                  textContentType="oneTimeCode"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  selectTextOnFocus
                  editable={!submitting}
                  accessibilityLabel={t('a11y.digit', { index: i + 1 })}
                />
              ))}
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={Palette.red} />
                <Text style={[styles.errorText, { color: Palette.red }]}>{error}</Text>
              </Animated.View>
            )}

            {submitting && (
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {t('verify.verifying')}
              </Text>
            )}
          </GlassCard>
        </Animated.View>

        {/* Resend section */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.section}>
          <View style={styles.resendRow}>
            <Text style={[styles.resendLabel, { color: colors.textSecondary }]}>
              {t('verify.didNotReceive')}
            </Text>
            {cooldown > 0 ? (
              <Text style={[styles.cooldownText, { color: colors.textMuted }]}>
                {t('verify.resendIn', { count: cooldown })}
              </Text>
            ) : (
              <Pressable
                onPress={handleResend}
                disabled={resending}
                accessibilityLabel={t('a11y.resendCode')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.resendBtn,
                    { color: Palette.indigo, opacity: resending ? 0.5 : 1 },
                  ]}
                >
                  {resending ? t('verify.sending') : t('verify.resendCode')}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backRow: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['3xl'],
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  digitInput: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize['2xl'],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
  statusText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  resendRow: {
    alignItems: 'center',
    gap: 6,
  },
  resendLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
  cooldownText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
  resendBtn: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
  },
});
