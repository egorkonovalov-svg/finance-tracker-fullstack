import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useTranslation, localeToBCP47 } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { CategoryChip } from '@/components/category-chip';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';
import type { TransactionType } from '@/types';

interface Props {
  type: TransactionType;
  setType: (v: TransactionType) => void;
  amount: string;
  setAmount: (v: string) => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  date: Date;
  setDate: (v: Date) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  type,
  setType,
  amount,
  setAmount,
  selectedCategoryId,
  setSelectedCategoryId,
  note,
  setNote,
  date,
  setDate,
  onSave,
  onCancel,
}: Props) {
  const { colors, isDark } = useTheme();
  const { categories, locale } = useApp();
  const { t } = useTranslation();
  const dateLocale = localeToBCP47(locale);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const accentColor = type === 'income' ? colors.income : colors.expense;
  const filteredCategories = categories.filter((c) => c.type === type || c.type === 'both');

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={styles.content}>
      {/* Type toggle */}
      <GlassCard padding={6} radius={16}>
        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggleBtn, type === 'expense' && { backgroundColor: Palette.red + '20' }]} onPress={() => setType('expense')}>
            <Text style={[styles.toggleLabel, { color: type === 'expense' ? Palette.red : colors.textMuted }]}>{t('add.expense')}</Text>
          </Pressable>
          <Pressable style={[styles.toggleBtn, type === 'income' && { backgroundColor: Palette.emerald + '20' }]} onPress={() => setType('income')}>
            <Text style={[styles.toggleLabel, { color: type === 'income' ? Palette.emerald : colors.textMuted }]}>{t('add.income')}</Text>
          </Pressable>
        </View>
      </GlassCard>

      {/* Amount */}
      <GlassCard padding={20} radius={16} style={{ marginTop: Spacing.lg }}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('detail.amount')}</Text>
        <TextInput
          style={[styles.editAmount, { color: colors.text, borderBottomColor: accentColor }]}
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          accessibilityLabel={t('a11y.editAmount')}
        />
      </GlassCard>

      {/* Category */}
      <Text style={[styles.fieldLabel, { color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>{t('detail.category')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filteredCategories.map((cat) => (
          <CategoryChip key={cat.id} category={cat} selected={selectedCategoryId === cat.id} onPress={() => setSelectedCategoryId(cat.id)} />
        ))}
      </ScrollView>

      {/* Date */}
      <GlassCard padding={14} radius={14} style={{ marginTop: Spacing.lg }}>
        <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
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

      {/* Note */}
      <GlassCard padding={14} radius={14} style={{ marginTop: Spacing.lg }}>
        <TextInput
          style={[styles.noteInput, { color: colors.text }]}
          value={note}
          onChangeText={setNote}
          placeholder={t('detail.notePlaceholder')}
          placeholderTextColor={colors.placeholder}
          multiline
          accessibilityLabel={t('a11y.editNote')}
        />
      </GlassCard>

      {/* Save / Cancel */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={onSave}>
          <Ionicons name="checkmark" size={18} color="#FFF" />
          <Text style={styles.actionLabel}>{t('common.save')}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }]} onPress={onCancel}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl },
  toggleRow: { flexDirection: 'row' },
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
  fieldLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
  editAmount: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['3xl'],
    borderBottomWidth: 2,
    paddingBottom: 4,
    marginTop: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
  },
  noteInput: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: 6,
  },
  actionLabel: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.md,
    color: '#FFF',
  },
});
