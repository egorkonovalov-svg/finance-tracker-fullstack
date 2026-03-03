import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/glass-card';
import { useTheme } from '@/context/ThemeContext';
import { FontFamily, FontSize, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  delay?: number;
}

export function SummaryCard({ title, value, icon, iconColor, delay = 0 }: Props) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)} style={styles.wrapper}>
      <GlassCard padding={14} radius={16} style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  value: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
  },
});
