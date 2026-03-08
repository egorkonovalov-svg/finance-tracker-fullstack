import React, { useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { SummaryCard } from '@/components/summary-card';
import { TransactionRow } from '@/components/transaction-row';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { transactions, stats, budgetSummary, goals, loading, error, refresh, clearError } = useApp();
  const { convertAndFormat } = useCurrency();
  const { t } = useTranslation();

  const recentTxs = transactions.slice(0, 5);
  const budgetItems = (budgetSummary ?? []).slice(0, 3);
  const dashboardGoals = goals.slice(0, 2);

  const totalBalance = stats?.balance ?? 0;
  const totalIncome = stats?.total_income ?? 0;
  const totalExpenses = stats?.total_expenses ?? 0;

  const userName = user?.name ?? t('dashboard.user');
  const greeting = getGreeting(t);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}
      accessibilityLabel={t('tabs.dashboard')}
      accessibilityRole="none"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header} accessibilityLabel={`${greeting}, ${userName}. ${t('dashboard.yourFinances')}`}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}, {userName}</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('dashboard.yourFinances')}</Text>
      </Animated.View>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <Animated.View entering={FadeInUp.duration(300)} style={[styles.errorBanner, { backgroundColor: colors.expenseLight + '30', borderColor: colors.expense }]}>
          <View style={styles.errorBannerRow}>
            <Ionicons name="alert-circle" size={20} color={colors.expense} />
            <Text style={[styles.errorBannerText, { color: colors.text }]} numberOfLines={2}>{error}</Text>
          </View>
          <View style={styles.errorBannerActions}>
            <Pressable onPress={clearError} hitSlop={8} accessibilityLabel={t('common.dismiss')} accessibilityRole="button">
              <Text style={[styles.errorBannerBtn, { color: colors.textSecondary }]}>{t('common.dismiss')}</Text>
            </Pressable>
            <Pressable onPress={() => refresh()} hitSlop={8} accessibilityLabel={t('common.retry')} accessibilityRole="button">
              <Text style={[styles.errorBannerBtn, { color: colors.primary }]}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* ── Balance Card ───────────────────────────────────────────────── */}
      <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.section} accessibilityLabel={`${t('dashboard.totalBalance')} ${convertAndFormat(totalBalance)}. ${t('dashboard.income')} ${convertAndFormat(totalIncome)}. ${t('dashboard.expenses')} ${convertAndFormat(totalExpenses)}`}>
        <GlassCard radius={24} padding={0}>
          <LinearGradient
            colors={isDark ? [Palette.indigoDark, '#1a1145'] : [Palette.indigo, Palette.indigoLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceGradient}
          >
            <Text style={styles.balanceLabel}>{t('dashboard.totalBalance')}</Text>
            <Text style={styles.balanceAmount}>{convertAndFormat(totalBalance)}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceMiniLabel}>{t('dashboard.income')}</Text>
                <Text style={styles.balanceMiniValue}>{convertAndFormat(totalIncome)}</Text>
              </View>
              <View style={[styles.balanceDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceMiniLabel}>{t('dashboard.expenses')}</Text>
                <Text style={styles.balanceMiniValue}>{convertAndFormat(totalExpenses)}</Text>
              </View>
            </View>
          </LinearGradient>
        </GlassCard>
      </Animated.View>

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <View style={styles.summaryRow} accessibilityLabel={`${t('dashboard.income')}, ${t('dashboard.expenses')}, ${t('dashboard.savings')}`} accessibilityRole="summary">
        <SummaryCard
          title={t('dashboard.income')}
          value={convertAndFormat(totalIncome)}
          icon="arrow-down-circle"
          iconColor={Palette.emerald}
          delay={200}
        />
        <View style={{ width: Spacing.md }} />
        <SummaryCard
          title={t('dashboard.expenses')}
          value={convertAndFormat(totalExpenses)}
          icon="arrow-up-circle"
          iconColor={Palette.red}
          delay={300}
        />
        <View style={{ width: Spacing.md }} />
        <SummaryCard
          title={t('dashboard.savings')}
          value={convertAndFormat(totalBalance)}
          icon="wallet"
          iconColor={Palette.indigo}
          delay={400}
        />
      </View>

      {/* ── Budgets (this month) ────────────────────────────────────────── */}
      {budgetItems.length > 0 && (
        <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.section} accessibilityLabel={t('dashboard.budgets')}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.budgets')}</Text>
          <GlassCard padding={12} radius={16}>
            {budgetItems.map((item) => {
              const over = item.percent_used >= 100;
              return (
                <View key={item.category} style={[styles.budgetRow, { borderBottomColor: colors.separator }]}>
                  <View style={styles.budgetRowMain}>
                    <Text style={[styles.budgetCategory, { color: colors.text }]} numberOfLines={1}>{item.category}</Text>
                    <Text style={[styles.budgetAmounts, { color: colors.textSecondary }]}>
                      {convertAndFormat(item.amount_spent)} / {convertAndFormat(item.amount_limit)}
                      {over && ` · ${t('dashboard.overBudget')}`}
                    </Text>
                  </View>
                  <View style={[styles.budgetProgressTrack, { backgroundColor: colors.inputBg }]}>
                    <View
                      style={[
                        styles.budgetProgressFill,
                        {
                          width: `${Math.min(100, item.percent_used)}%`,
                          backgroundColor: over ? Palette.red : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </GlassCard>
        </Animated.View>
      )}

      {/* ── Goals ───────────────────────────────────────────────────────── */}
      {dashboardGoals.length > 0 && (
        <Animated.View entering={FadeInUp.delay(380).duration(400)} style={styles.section} accessibilityLabel={t('dashboard.goals')}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.goals')}</Text>
          <GlassCard padding={12} radius={16}>
            {dashboardGoals.map((g) => (
              <View key={g.id} style={[styles.goalRow, { borderBottomColor: colors.separator }]}>
                <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>{g.name}</Text>
                <Text style={[styles.goalAmounts, { color: colors.textSecondary }]}>
                  {convertAndFormat(g.current_amount)} / {convertAndFormat(g.target_amount)}
                </Text>
                <View style={[styles.goalProgressTrack, { backgroundColor: colors.inputBg }]}>
                  <View
                    style={[
                      styles.goalProgressFill,
                      {
                        width: `${Math.min(100, (g.current_amount / g.target_amount) * 100)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      {/* ── Recent Transactions ────────────────────────────────────────── */}
      <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.section} accessibilityLabel={t('dashboard.recentTransactions')}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.recentTransactions')}</Text>
        {recentTxs.length === 0 ? (
          <GlassCard padding={24} accessibilityLabel={t('dashboard.noTransactions')}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('dashboard.noTransactions')}
            </Text>
          </GlassCard>
        ) : (
          <GlassCard padding={8} accessibilityLabel={`${recentTxs.length} recent transactions`}>
            {recentTxs.map((tx, i) => (
              <TransactionRow key={tx.id} transaction={tx} index={i} />
            ))}
          </GlassCard>
        )}
      </Animated.View>
    </ScrollView>
  );
}

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greetingMorning');
  if (hour < 18) return t('dashboard.greetingAfternoon');
  return t('dashboard.greetingEvening');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
  },
  headerTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['3xl'],
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  // Balance card
  balanceGradient: {
    padding: 24,
    borderRadius: 24,
  },
  balanceLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceAmount: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['4xl'],
    color: '#FFFFFF',
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  balanceItem: {
    flex: 1,
  },
  balanceDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 16,
  },
  balanceMiniLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  balanceMiniValue: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
    color: '#FFFFFF',
    marginTop: 2,
  },
  // Summary row
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  // Section title
  sectionTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.xl,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  // Error banner
  errorBanner: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  errorBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorBannerText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    flex: 1,
  },
  errorBannerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.lg,
  },
  errorBannerBtn: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
  // Budget rows
  budgetRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  budgetRowMain: {},
  budgetCategory: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
  budgetAmounts: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  budgetProgressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Goal rows
  goalRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  goalName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
  goalAmounts: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  goalProgressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
