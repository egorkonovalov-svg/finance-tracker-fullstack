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

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useEmailPasswordAuth } from '@/hooks/useEmailPasswordAuth';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { EmailPasswordForm } from '@/components/EmailPasswordForm';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { GlassCard } from '@/components/ui/glass-card';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { authError, clearAuthError } = useAuth();

  React.useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  const {
    mode, setMode,
    name, setName,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    submitting, setSubmitting,
    handleSubmit,
  } = useEmailPasswordAuth();

  const { handleGoogleSignIn, handleAppleSignIn } = useSocialAuth({ setSubmitting });

  const isLogin = mode === 'login';

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
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: Palette.indigo + '14' }]}>
            <Ionicons name="wallet" size={36} color={Palette.indigo} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isLogin ? t('auth.signInContinue') : t('auth.startTracking')}
          </Text>
        </Animated.View>

        {/* ── Auth error (e.g. session restore failed) ────────────────── */}
        {authError && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.authErrorBanner, { backgroundColor: Palette.red + '18', borderColor: Palette.red }]}>
            <Ionicons name="alert-circle" size={18} color={Palette.red} />
            <Text style={[styles.authErrorText, { color: colors.text }]}>{authError}</Text>
            <Pressable onPress={clearAuthError} hitSlop={8} accessibilityLabel={t('common.dismiss')} accessibilityRole="button">
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        )}

        {/* ── Mode Toggle ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.section}>
          <GlassCard padding={6} radius={16}>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, isLogin && { backgroundColor: Palette.indigo + '20' }]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.toggleLabel, { color: isLogin ? Palette.indigo : colors.textMuted }]}>
                  {t('auth.logIn')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, !isLogin && { backgroundColor: Palette.indigo + '20' }]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.toggleLabel, { color: !isLogin ? Palette.indigo : colors.textMuted }]}>
                  {t('auth.signUp')}
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Form ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.section}>
          <EmailPasswordForm
            mode={mode}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </Animated.View>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t('auth.orContinueWith')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
        </Animated.View>

        {/* ── Social Buttons ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.section}>
          <SocialAuthButtons
            onGoogleSignIn={handleGoogleSignIn}
            onAppleSignIn={handleAppleSignIn}
            disabled={submitting}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  authErrorBanner: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  authErrorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  toggleLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
});
