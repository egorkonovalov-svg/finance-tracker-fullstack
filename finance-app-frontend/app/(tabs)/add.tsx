import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation, localeToBCP47 } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { CategoryChip } from '@/components/category-chip';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';
import type { TransactionType } from '@/types';

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { categories, addTransaction } = useApp();
  const { symbol, currency, rate } = useCurrency();
  const { t, locale } = useTranslation();
  const dateLocale = localeToBCP47(locale);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [recurring, setRecurring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Button scale animation
  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const accentColor = type === 'income' ? colors.income : colors.expense;
  const filteredCategories = categories.filter((c) => c.type === type || c.type === 'both');

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(t('errors.invalidAmount'), t('errors.enterValidAmount'));
      return;
    }
    if (!selectedCategory) {
      Alert.alert(t('errors.noCategory'), t('errors.selectCategory'));
      return;
    }

    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    setSubmitting(true);
    try {
      await addTransaction({
        type,
        amount: parseFloat(amount) / rate,
        currency,
        category: selectedCategory,
        note: note.trim() || undefined,
        date: date.toISOString(),
        recurring,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Reset form
      setAmount('');
      setSelectedCategory('');
      setNote('');
      setDate(new Date());
      setRecurring(false);
      Alert.alert(t('errors.success'), t('errors.transactionAdded'));
    } catch {
      Alert.alert(t('errors.generic'), t('errors.failedAddTransaction'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 10 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('add.title')}</Text>
        </Animated.View>

        {/* ── Type Toggle ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(50).duration(400)} style={styles.section}>
          <GlassCard padding={6} radius={16}>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, type === 'expense' && { backgroundColor: Palette.red + '20' }]}
                onPress={() => setType('expense')}
              >
                <Ionicons name="arrow-up-circle" size={20} color={type === 'expense' ? Palette.red : colors.textMuted} />
                <Text style={[styles.toggleLabel, { color: type === 'expense' ? Palette.red : colors.textMuted }]}>
                  {t('add.expense')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, type === 'income' && { backgroundColor: Palette.emerald + '20' }]}
                onPress={() => setType('income')}
              >
                <Ionicons name="arrow-down-circle" size={20} color={type === 'income' ? Palette.emerald : colors.textMuted} />
                <Text style={[styles.toggleLabel, { color: type === 'income' ? Palette.emerald : colors.textMuted }]}>
                  {t('add.income')}
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Amount ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.section}>
          <GlassCard padding={24} radius={20}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.amount')}</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: accentColor }]}>
                {symbol}
              </Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text, borderBottomColor: accentColor }]}
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                placeholder={t('add.amountPlaceholder')}
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                maxLength={12}
                accessibilityLabel={t('a11y.transactionAmount')}
              />
            </View>
            {currency !== 'RUB' && amount !== '' && parseFloat(amount) > 0 && (
              <Text style={[styles.usdHint, { color: colors.textMuted }]}>
                {t('add.storedInRUB')} ≈ {(parseFloat(amount) / rate).toFixed(2)} ₽
              </Text>
            )}
          </GlassCard>
        </Animated.View>

        {/* ── Category Picker ────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('add.category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {filteredCategories.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                selected={selectedCategory === cat.name}
                onPress={() => setSelectedCategory(cat.name)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Date Picker ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.section}>
          <GlassCard padding={16} radius={16}>
            <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {date.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </GlassCard>
          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            date={date}
            onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)}
            isDarkModeEnabled={isDark}
          />
        </Animated.View>

        {/* ── Note ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(250).duration(400)} style={styles.section}>
          <GlassCard padding={16} radius={16}>
            <TextInput
              style={[styles.noteInput, { color: colors.text }]}
              value={note}
              onChangeText={setNote}
              placeholder={t('add.notePlaceholder')}
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={200}
              accessibilityLabel={t('a11y.editNote')}
            />
          </GlassCard>
        </Animated.View>

        {/* ── Recurring Toggle ───────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.section}>
          <Pressable
            style={[styles.recurringRow, { backgroundColor: recurring ? colors.primary + '12' : 'transparent', borderColor: colors.inputBorder }]}
            onPress={() => setRecurring(!recurring)}
          >
            <Ionicons name={recurring ? 'checkbox' : 'square-outline'} size={22} color={recurring ? colors.primary : colors.textMuted} />
            <Text style={[styles.recurringLabel, { color: colors.text }]}>{t('add.recurring')}</Text>
          </Pressable>
        </Animated.View>

        {/* ── Submit ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.section}>
          <Animated.View style={buttonAnimStyle}>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: accentColor }]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityLabel={t('a11y.addTransaction')}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.submitLabel}>
                {submitting ? t('add.adding') : type === 'income' ? t('add.addIncome') : t('add.addExpense')}
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['3xl'],
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  toggleLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
  },
  // Amount
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currencySymbol: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['3xl'],
    marginRight: 8,
    marginBottom: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.heading,
    fontSize: FontSize['4xl'],
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  usdHint: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  // Category chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingRight: Spacing.xl,
  },
  // Date
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
  },
  // Note
  noteInput: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  // Recurring
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 10,
  },
  recurringLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
  },
  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.lg,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  submitLabel: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
    color: '#FFFFFF',
  },
});
