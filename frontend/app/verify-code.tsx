import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useVerificationCode } from '@/hooks/useVerificationCode';
import { CodeInput } from '@/components/CodeInput';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export default function VerifyCodeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const {
    digits,
    error,
    submitting,
    resending,
    cooldown,
    inputRefs,
    maskedEmail,
    handleDigitChange,
    handleKeyPress,
    handlePaste,
    handleResend,
  } = useVerificationCode();

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
          <CodeInput
            digits={digits}
            inputRefs={inputRefs}
            error={error}
            submitting={submitting}
            onDigitChange={handleDigitChange}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
          />
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
