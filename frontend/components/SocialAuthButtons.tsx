import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { FontFamily, FontSize, Radius } from '@/constants/theme';

interface Props {
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  /** Disable both buttons while another auth action is in progress */
  disabled?: boolean;
}

export function SocialAuthButtons({ onGoogleSignIn, onAppleSignIn, disabled }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.socialRow}>
      <Pressable
        style={[styles.socialBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        onPress={onGoogleSignIn}
        disabled={disabled}
        accessibilityLabel={`Sign in with ${t('auth.google')}`}
        accessibilityRole="button"
      >
        <Ionicons name="logo-google" size={20} color="#DB4437" />
        <Text style={[styles.socialBtnText, { color: colors.text }]}>{t('auth.google')}</Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Pressable
          style={[styles.socialBtn, { backgroundColor: '#000000', borderColor: '#000000' }]}
          onPress={onAppleSignIn}
          disabled={disabled}
          accessibilityLabel={`Sign in with ${t('auth.apple')}`}
          accessibilityRole="button"
        >
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
          <Text style={[styles.socialBtnText, { color: '#FFFFFF' }]}>{t('auth.apple')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 8,
  },
  socialBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
  },
});
