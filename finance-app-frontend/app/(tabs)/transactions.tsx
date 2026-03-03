import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useTranslation, localeToBCP47 } from '@/hooks/useTranslation';
import { TransactionRow } from '@/components/transaction-row';
import { GlassCard } from '@/components/ui/glass-card';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';
import type { Transaction, TransactionType } from '@/types';

type FilterType = 'all' | TransactionType;

interface Section {
  title: string;
  data: Transaction[];
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { transactions, loading, loadTransactions, removeTransaction } = useApp();
  const { t, locale } = useTranslation();
  const dateLocale = localeToBCP47(locale);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = transactions;
    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          t.note?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterType, search]);

  // ── Section grouping ───────────────────────────────────────────────────
  const sections = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const groups: Record<string, Transaction[]> = {};
    for (const tx of filtered) {
      const dateStr = tx.date.slice(0, 10);
      let label: string;
      if (dateStr === todayStr) label = t('common.today');
      else if (dateStr === yesterdayStr) label = t('common.yesterday');
      else label = new Date(tx.date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' });

      if (!groups[label]) groups[label] = [];
      groups[label].push(tx);
    }

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered, t, dateLocale]);

  const onRefresh = useCallback(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDelete = useCallback(
    (id: string) => {
      removeTransaction(id);
    },
    [removeTransaction]
  );

  // ── Render ─────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <SwipeToDelete onDelete={() => handleDelete(item.id)}>
        <TransactionRow transaction={item} index={index} />
      </SwipeToDelete>
    ),
    [handleDelete]
  );

  const renderSectionHeader = useCallback(
    (title: string) => (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
    ),
    [colors]
  );

  // Flatten sections for FlatList
  const flatData = useMemo(() => {
    const result: { type: 'header' | 'item'; title?: string; tx?: Transaction; key: string }[] = [];
    for (const section of sections) {
      result.push({ type: 'header', title: section.title, key: `header-${section.title}` });
      for (const tx of section.data) {
        result.push({ type: 'item', tx, key: tx.id });
      }
    }
    return result;
  }, [sections]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityLabel={t('transactions.title')}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top + 10 }]} accessibilityLabel={t('transactions.title')}>
        <Text style={[styles.title, { color: colors.text }]}>{t('transactions.title')}</Text>
      </Animated.View>

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <View style={styles.searchSection}>
        <GlassCard padding={0} radius={14}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginLeft: 14 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('transactions.searchPlaceholder')}
              placeholderTextColor={colors.placeholder}
              accessibilityLabel={t('a11y.searchTransactions')}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} style={{ marginRight: 12 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </GlassCard>
      </View>

      {/* ── Filter Chips ───────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => {
          const active = filterType === f;
          const chipColor = f === 'income' ? Palette.emerald : f === 'expense' ? Palette.red : colors.primary;
          return (
            <Pressable
              key={f}
              style={[styles.filterChip, { backgroundColor: active ? chipColor + '20' : colors.inputBg, borderColor: active ? chipColor : colors.inputBorder }]}
              onPress={() => setFilterType(f)}
              accessibilityLabel={f === 'all' ? t('transactions.filterAll') : `${t('transactions.filterAll')} ${f}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterLabel, { color: active ? chipColor : colors.textSecondary }]}>
                {f === 'all' ? t('transactions.filterAll') : f === 'income' ? t('dashboard.income') : t('add.expense')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Transaction List ───────────────────────────────────────── */}
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => {
          if (item.type === 'header') return renderSectionHeader(item.title!);
          return renderItem({ item: item.tx!, index });
        }}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}
        accessibilityLabel="Transaction list"
        ListEmptyComponent={
          <GlassCard padding={32} style={{ marginTop: 32 }}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('dashboard.noTransactions')}
            </Text>
          </GlassCard>
        }
      />
    </View>
  );
}

// ─── Swipe to Delete wrapper ─────────────────────────────────────────────────

function SwipeToDelete({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const { colors } = useTheme();

  // Using a simple long-press for deletion (cross-platform and reliable)
  return (
    <Pressable
      onLongPress={onDelete}
      delayLongPress={600}
      accessibilityLabel="Long press to delete"
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['3xl'],
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
  sectionHeader: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
});
