import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useTranslation, localeToBCP47 } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { TransactionForm } from '@/components/TransactionForm';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import type { TransactionType } from '@/types';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { transactions, categories, updateTransaction, removeTransaction, locale } = useApp();
  const { t } = useTranslation();
  const { convertAndFormat, convert, rate } = useCurrency();
  const dateLocale = localeToBCP47(locale);

  const tx = transactions.find((t) => t.id === id);

  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<TransactionType>(tx?.type ?? 'expense');
  const [amount, setAmount] = useState(tx ? convert(tx.amount).toFixed(2) : '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(tx?.category_id ?? '');
  const [note, setNote] = useState(tx?.note ?? '');
  const [date, setDate] = useState(tx ? new Date(tx.date) : new Date());

  useEffect(() => {
    if (tx) {
      setType(tx.type);
      setAmount(convert(tx.amount).toFixed(2));
      setSelectedCategoryId(tx.category_id);
      setNote(tx.note ?? '');
      setDate(new Date(tx.date));
    }
  }, [tx, convert]);

  if (!tx) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('detail.notFound')}</Text>
      </View>
    );
  }

  const accentColor = type === 'income' ? colors.income : colors.expense;
  const cat = categories.find((c) => c.id === tx.category_id);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(t('errors.invalidAmount'), t('errors.enterValidAmount'));
      return;
    }
    try {
      await updateTransaction(tx.id, {
        type,
        amount: parseFloat(amount) / rate,
        category_id: selectedCategoryId,
        note: note.trim() || undefined,
        date: date.toISOString(),
      });
      setEditing(false);
    } catch {
      Alert.alert(t('errors.generic'), t('errors.failedUpdateTransaction'));
    }
  };

  const handleDelete = () => {
    Alert.alert(t('detail.deleteTransaction'), t('detail.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(tx.id);
          router.back();
        },
      },
    ]);
  };

  // ── View Mode ──────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
          {/* Amount */}
          <GlassCard radius={20} padding={24} style={{ alignItems: 'center' as const }}>
            <View style={[styles.typeBadge, { backgroundColor: accentColor + '18' }]}>
              <Ionicons
                name={tx.type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={20}
                color={accentColor}
              />
              <Text style={[styles.typeBadgeText, { color: accentColor }]}>
                {tx.type === 'income' ? t('add.income') : t('add.expense')}
              </Text>
            </View>
            <Text style={[styles.detailAmount, { color: accentColor }]}>
              {tx.type === 'income' ? '+' : '-'}{convertAndFormat(tx.amount)}
            </Text>
          </GlassCard>

          {/* Details */}
          <GlassCard radius={16} padding={16} style={{ marginTop: Spacing.lg }}>
            <DetailRow icon="folder-outline" label={t('detail.category')} value={tx.category} iconColor={cat?.color ?? colors.icon} colors={colors} />
            <DetailRow icon="calendar-outline" label={t('detail.date')} value={new Date(tx.date).toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} iconColor={colors.primary} colors={colors} />
            {tx.note ? <DetailRow icon="document-text-outline" label={t('detail.note')} value={tx.note} iconColor={colors.primary} colors={colors} /> : null}
            {tx.recurring ? <DetailRow icon="repeat" label={t('detail.recurring')} value={t('common.yes')} iconColor={Palette.amber} colors={colors} /> : null}
          </GlassCard>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => setEditing(true)}>
              <Ionicons name="pencil" size={18} color="#FFF" />
              <Text style={styles.actionLabel}>{t('detail.edit')}</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: Palette.red }]} onPress={handleDelete}>
              <Ionicons name="trash" size={18} color="#FFF" />
              <Text style={styles.actionLabel}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <TransactionForm
          type={type}
          setType={setType}
          amount={amount}
          setAmount={setAmount}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          note={note}
          setNote={setNote}
          date={date}
          setDate={setDate}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DetailRow({ icon, label, value, iconColor, colors }: { icon: string; label: string; value: string; iconColor: string; colors: ThemeColors }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={iconColor} />
      <View style={styles.detailInfo}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    gap: 6,
    marginBottom: Spacing.md,
  },
  typeBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
  detailAmount: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['4xl'],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailInfo: { flex: 1 },
  detailLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
  },
  detailValue: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    marginTop: 2,
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
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
  },
});
