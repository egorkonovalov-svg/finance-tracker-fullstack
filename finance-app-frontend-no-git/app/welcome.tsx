import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';

const ONBOARDED_KEY = '@fintrack_onboarded';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
    router.replace('/auth');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top spacer */}
      <View style={styles.spacer} />

      {/* Center content */}
      <Animated.View entering={FadeIn.duration(800)} style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: Palette.indigo + '14' }]}>
          <Ionicons name="wallet" size={48} color={Palette.indigo} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('welcome.title')}</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          {t('welcome.tagline')}
        </Text>
      </Animated.View>

      {/* Bottom button */}
      <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: Palette.indigo, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleGetStarted}
          accessibilityLabel={t('a11y.getStarted')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{t('welcome.getStarted')}</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: 42,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.lg,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.lg,
    gap: 8,
    shadowColor: Palette.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
    color: '#FFFFFF',
  },
});
