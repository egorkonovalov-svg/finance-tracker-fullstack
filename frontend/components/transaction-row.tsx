import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useCurrency } from '@/hooks/useCurrency';
import { localeToBCP47 } from '@/hooks/useTranslation';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Transaction } from '@/types';

interface Props {
  transaction: Transaction;
  index?: number;
}

export function TransactionRow({ transaction, index = 0 }: Props) {
  const { colors } = useTheme();
  const { categories, locale } = useApp();
  const { convertAndFormat } = useCurrency();
  const router = useRouter();
  const dateLocale = localeToBCP47(locale);

  const cat = categories.find((c) => c.id === transaction.category_id);
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const sign = isIncome ? '+' : '-';

  const displayDate = new Date(transaction.date).toLocaleDateString(dateLocale, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? colors.surface : 'transparent',
          },
        ]}
        onPress={() => router.push(`/transaction/${transaction.id}`)}
        accessibilityLabel={`${transaction.type} ${transaction.category} ${convertAndFormat(transaction.amount)}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: (cat?.color ?? '#6B7280') + '18' }]}>
          <Ionicons name={(cat?.icon as keyof typeof Ionicons.glyphMap) ?? 'ellipsis-horizontal'} size={20} color={cat?.color ?? '#6B7280'} />
        </View>

        <View style={styles.info}>
          <Animated.Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
            {transaction.category}
          </Animated.Text>
          <Animated.Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.note || displayDate}
          </Animated.Text>
        </View>

        <View style={styles.right}>
          <Animated.Text style={[styles.amount, { color: amountColor }]}>
            {sign}{convertAndFormat(transaction.amount)}
          </Animated.Text>
          <Animated.Text style={[styles.date, { color: colors.textMuted }]}>{displayDate}</Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  category: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
  },
  note: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
  },
  date: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
