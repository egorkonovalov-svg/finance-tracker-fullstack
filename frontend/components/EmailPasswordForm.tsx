import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';

interface Props {
  mode: 'login' | 'signup';
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
}

export function EmailPasswordForm({
  mode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  submitting,
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isLogin = mode === 'login';

  return (
    <GlassCard padding={20} radius={20}>
      {!isLogin && (
        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.name')}</Text>
          <View style={[styles.inputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder={t('auth.namePlaceholder')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              autoComplete="name"
              accessibilityLabel={t('auth.name')}
            />
          </View>
        </View>
      )}

      <View style={styles.fieldWrap}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
        <View style={[styles.inputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel={t('auth.email')}
          />
        </View>
      </View>

      <View style={styles.fieldWrap}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
        <View style={[styles.inputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            accessibilityLabel={t('auth.password')}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.primaryBtn, { backgroundColor: Palette.indigo, opacity: submitting ? 0.7 : 1 }]}
        onPress={() => { console.log('[DEBUG] Pressable onPress fired'); onSubmit(); }}
        disabled={submitting}
        accessibilityLabel={isLogin ? t('auth.logIn') : t('auth.signUp')}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>
          {submitting ? t('auth.pleaseWait') : isLogin ? t('auth.logIn') : t('auth.signUp')}
        </Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    padding: 0,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    shadowColor: Palette.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
    color: '#FFFFFF',
  },
});
