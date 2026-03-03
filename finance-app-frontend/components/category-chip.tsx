import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/types';

interface Props {
  category: Category;
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ category, selected, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? category.color + '22' : colors.inputBg,
          borderColor: selected ? category.color : colors.inputBorder,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityLabel={`Category ${category.name}`}
      accessibilityState={{ selected }}
    >
      <Ionicons
        name={category.icon as keyof typeof Ionicons.glyphMap}
        size={16}
        color={selected ? category.color : colors.textSecondary}
      />
      <Text
        style={[
          styles.label,
          { color: selected ? category.color : colors.textSecondary },
        ]}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
});
