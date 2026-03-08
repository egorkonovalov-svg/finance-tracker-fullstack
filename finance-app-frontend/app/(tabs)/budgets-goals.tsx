import React, { useState } from 'react';
import {
  Alert,
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
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation, localeToBCP47 } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';
import type { Budget, Goal } from '@/types';

export default function BudgetsGoalsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { convertAndFormat } = useCurrency();
  const { t, locale } = useTranslation();
  const dateLocale = localeToBCP47(locale);
  const {
    categories,
    budgets,
    goals,
    addBudget,
    updateBudget,
    removeBudget,
    addGoal,
    updateGoal,
    removeGoal,
    loadBudgetSummary,
  } = useApp();

  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  // Budget form
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState(new Date());
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);

  // Update progress (single field)
  const [progressGoalId, setProgressGoalId] = useState<string | null>(null);
  const [progressAmount, setProgressAmount] = useState('');

  const resetBudgetForm = () => {
    setBudgetCategory('');
    setBudgetLimit('');
    setEditingBudgetId(null);
    setShowBudgetForm(false);
  };

  const startEditBudget = (b: Budget) => {
    setEditingBudgetId(b.id);
    setBudgetCategory(b.category);
    setBudgetLimit(String(b.amount_limit));
    setShowBudgetForm(true);
  };

  const saveBudget = async () => {
    const limit = parseFloat(budgetLimit);
    if (!budgetCategory.trim()) {
      Alert.alert(t('errors.generic'), t('budgets.selectCategory'));
      return;
    }
    if (Number.isNaN(limit) || limit <= 0) {
      Alert.alert(t('errors.generic'), t('budgets.enterValidLimit'));
      return;
    }
    try {
      if (editingBudgetId) {
        await updateBudget(editingBudgetId, { category: budgetCategory.trim(), amount_limit: limit });
      } else {
        await addBudget({ category: budgetCategory.trim(), amount_limit: limit });
      }
      loadBudgetSummary();
      resetBudgetForm();
    } catch {
      Alert.alert(t('errors.generic'), t('budgets.failedSave'));
    }
  };

  const deleteBudget = (b: Budget) => {
    Alert.alert(t('budgets.deleteTitle'), t('budgets.deleteBudgetMessage', { category: b.category }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeBudget(b.id).then(() => loadBudgetSummary()) },
    ]);
  };

  const resetGoalForm = () => {
    setGoalName('');
    setGoalTargetAmount('');
    setGoalTargetDate(new Date());
    setGoalCurrentAmount('');
    setEditingGoalId(null);
    setShowGoalForm(false);
  };

  const startEditGoal = (g: Goal) => {
    setEditingGoalId(g.id);
    setGoalName(g.name);
    setGoalTargetAmount(String(g.target_amount));
    setGoalTargetDate(new Date(g.target_date));
    setGoalCurrentAmount(String(g.current_amount));
    setShowGoalForm(true);
  };

  const saveGoal = async () => {
    const target = parseFloat(goalTargetAmount);
    const current = goalCurrentAmount.trim() === '' ? 0 : parseFloat(goalCurrentAmount);
    if (!goalName.trim()) {
      Alert.alert(t('errors.generic'), t('goals.enterName'));
      return;
    }
    if (Number.isNaN(target) || target <= 0) {
      Alert.alert(t('errors.generic'), t('goals.enterValidTarget'));
      return;
    }
    if (Number.isNaN(current) || current < 0) {
      Alert.alert(t('errors.generic'), t('goals.enterValidCurrent'));
      return;
    }
    try {
      if (editingGoalId) {
        await updateGoal(editingGoalId, {
          name: goalName.trim(),
          target_amount: target,
          target_date: goalTargetDate.toISOString().slice(0, 10),
          current_amount: current,
        });
      } else {
        await addGoal({
          name: goalName.trim(),
          target_amount: target,
          target_date: goalTargetDate.toISOString().slice(0, 10),
          current_amount: current,
        });
      }
      resetGoalForm();
    } catch {
      Alert.alert(t('errors.generic'), t('goals.failedSave'));
    }
  };

  const saveProgress = async () => {
    if (!progressGoalId) return;
    const current = parseFloat(progressAmount);
    if (Number.isNaN(current) || current < 0) {
      Alert.alert(t('errors.generic'), t('goals.enterValidCurrent'));
      return;
    }
    try {
      const goal = goals.find((g) => g.id === progressGoalId);
      if (goal) await updateGoal(progressGoalId, { current_amount: current });
      setProgressGoalId(null);
      setProgressAmount('');
    } catch {
      Alert.alert(t('errors.generic'), t('goals.failedSave'));
    }
  };

  const deleteGoal = (g: Goal) => {
    Alert.alert(t('goals.deleteTitle'), t('goals.deleteGoalMessage', { name: g.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeGoal(g.id) },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('budgetsGoals.title')}</Text>
      </Animated.View>

      {/* ── Budgets section ─────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInUp.delay(50).duration(400)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('budgets.title')}</Text>
          {!showBudgetForm && (
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.primary + '20' }]}
              onPress={() => { setShowBudgetForm(true); setEditingBudgetId(null); setBudgetCategory(''); setBudgetLimit(''); }}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addBtnLabel, { color: colors.primary }]}>{t('budgets.addBudget')}</Text>
            </Pressable>
          )}
        </View>

        {showBudgetForm && (
          <GlassCard padding={16} radius={16} style={styles.formCard}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('budgets.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {expenseCategories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.chip,
                    { borderColor: colors.inputBorder, backgroundColor: budgetCategory === c.name ? colors.primary + '20' : colors.inputBg },
                  ]}
                  onPress={() => setBudgetCategory(c.name)}
                >
                  <Text style={[styles.chipText, { color: budgetCategory === c.name ? colors.primary : colors.text }]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('budgets.monthlyLimit')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder }]}
              value={budgetLimit}
              onChangeText={(text) => setBudgetLimit(text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
            />
            <View style={styles.formActions}>
              <Pressable style={[styles.formBtn, { backgroundColor: colors.inputBg }]} onPress={resetBudgetForm}>
                <Text style={[styles.formBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.formBtn, { backgroundColor: colors.primary }]} onPress={saveBudget}>
                <Text style={[styles.formBtnText, { color: '#FFF' }]}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </GlassCard>
        )}

        {budgets.length === 0 && !showBudgetForm && (
          <GlassCard padding={20} radius={16}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('budgets.noBudgets')}</Text>
          </GlassCard>
        )}
        {budgets.map((b) => (
          <Pressable
            key={b.id}
            style={[styles.row, { borderBottomColor: colors.separator }]}
            onPress={() => startEditBudget(b)}
          >
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{b.category}</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{t('budgets.limit')}: {convertAndFormat(b.amount_limit)}</Text>
            </View>
            <Pressable onPress={() => deleteBudget(b)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={Palette.red} />
            </Pressable>
          </Pressable>
        ))}
      </Animated.View>

      {/* ── Goals section ────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('goals.title')}</Text>
          {!showGoalForm && (
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.primary + '20' }]}
              onPress={() => { setShowGoalForm(true); setEditingGoalId(null); setGoalName(''); setGoalTargetAmount(''); setGoalTargetDate(new Date()); setGoalCurrentAmount(''); }}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addBtnLabel, { color: colors.primary }]}>{t('goals.addGoal')}</Text>
            </Pressable>
          )}
        </View>

        {showGoalForm && (
          <GlassCard padding={16} radius={16} style={styles.formCard}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('goals.name')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder }]}
              value={goalName}
              onChangeText={setGoalName}
              placeholder={t('goals.namePlaceholder')}
              placeholderTextColor={colors.placeholder}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('goals.targetAmount')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder }]}
              value={goalTargetAmount}
              onChangeText={(text) => setGoalTargetAmount(text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('goals.targetDate')}</Text>
            <Pressable style={[styles.dateRow, { borderColor: colors.inputBorder }]} onPress={() => setShowGoalDatePicker(true)}>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {goalTargetDate.toLocaleDateString(dateLocale)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <DateTimePickerModal
              isVisible={showGoalDatePicker}
              mode="date"
              date={goalTargetDate}
              onConfirm={(d) => { setGoalTargetDate(d); setShowGoalDatePicker(false); }}
              onCancel={() => setShowGoalDatePicker(false)}
              isDarkModeEnabled={isDark}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('goals.currentAmount')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder }]}
              value={goalCurrentAmount}
              onChangeText={(text) => setGoalCurrentAmount(text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
            />
            <View style={styles.formActions}>
              <Pressable style={[styles.formBtn, { backgroundColor: colors.inputBg }]} onPress={resetGoalForm}>
                <Text style={[styles.formBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.formBtn, { backgroundColor: colors.primary }]} onPress={saveGoal}>
                <Text style={[styles.formBtnText, { color: '#FFF' }]}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </GlassCard>
        )}

        {goals.length === 0 && !showGoalForm && (
          <GlassCard padding={20} radius={16}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('goals.noGoals')}</Text>
          </GlassCard>
        )}
        {goals.map((g) => (
          <GlassCard key={g.id} padding={16} radius={16} style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={[styles.goalName, { color: colors.text }]}>{g.name}</Text>
              <View style={styles.goalActions}>
                <Pressable
                  onPress={() => {
                    setProgressGoalId(g.id);
                    setProgressAmount(String(g.current_amount));
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => startEditGoal(g)} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={() => deleteGoal(g)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={Palette.red} />
                </Pressable>
              </View>
            </View>
            <Text style={[styles.goalAmounts, { color: colors.textSecondary }]}>
              {convertAndFormat(g.current_amount)} / {convertAndFormat(g.target_amount)}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.inputBg }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.goalDate, { color: colors.textMuted }]}>
              {t('goals.byDate')} {new Date(g.target_date).toLocaleDateString(dateLocale)}
            </Text>
            {progressGoalId === g.id && (
              <View style={styles.progressForm}>
                <TextInput
                  style={[styles.input, styles.progressInput, { color: colors.text, borderColor: colors.inputBorder }]}
                  value={progressAmount}
                  onChangeText={setProgressAmount}
                  placeholder={t('goals.currentAmount')}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                />
                <Pressable style={[styles.formBtn, { backgroundColor: colors.primary }]} onPress={saveProgress}>
                  <Text style={[styles.formBtnText, { color: '#FFF' }]}>{t('common.save')}</Text>
                </Pressable>
                <Pressable style={[styles.formBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setProgressGoalId(null); setProgressAmount(''); }}>
                  <Text style={[styles.formBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            )}
          </GlassCard>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, marginBottom: Spacing.sm },
  title: { fontFamily: FontFamily.heading, fontSize: FontSize['3xl'] },
  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.xl },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.lg, gap: 6 },
  addBtnLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm },
  formCard: { marginBottom: Spacing.md },
  label: { fontFamily: FontFamily.body, fontSize: FontSize.sm, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: FontSize.md },
  chipScroll: { marginBottom: Spacing.md },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.full, marginRight: 8, borderWidth: 1 },
  chipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm },
  formActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  formBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.lg, alignItems: 'center' },
  formBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md },
  emptyText: { fontFamily: FontFamily.body, fontSize: FontSize.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowMain: { flex: 1 },
  rowTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md },
  rowSub: { fontFamily: FontFamily.body, fontSize: FontSize.sm, marginTop: 2 },
  goalCard: { marginBottom: Spacing.md },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalName: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.lg },
  goalActions: { flexDirection: 'row', gap: Spacing.md },
  goalAmounts: { fontFamily: FontFamily.body, fontSize: FontSize.sm, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  goalDate: { fontFamily: FontFamily.body, fontSize: FontSize.xs, marginTop: 6 },
  progressForm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  progressInput: { flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.md },
  dateText: { fontFamily: FontFamily.body, fontSize: FontSize.md },
});
