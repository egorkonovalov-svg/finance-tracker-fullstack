import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Category, CategoryType } from '@/types';

const ICON_OPTIONS = [
  'cash', 'laptop', 'trending-up', 'restaurant', 'car', 'cart', 'game-controller',
  'fitness', 'flash', 'school', 'gift', 'home', 'airplane', 'medical', 'paw',
  'musical-notes', 'shirt', 'construct', 'bus', 'cafe',
] as const;

const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#14B8A6',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#D946EF',
  '#0EA5E9', '#6B7280',
];

const TYPE_KEYS: Record<CategoryType, string> = {
  expense: 'categories.typeExpense',
  income: 'categories.typeIncome',
  both: 'categories.typeBoth',
};

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { categories, addCategory, updateCategory, removeCategory } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [type, setType] = useState<CategoryType>('expense');

  const resetForm = () => {
    setName('');
    setIcon(ICON_OPTIONS[0]);
    setColor(COLOR_OPTIONS[0]);
    setType('expense');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setType(cat.type);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('errors.missingName'), t('errors.enterCategoryName'));
      return;
    }
    try {
      if (editingId) {
        await updateCategory(editingId, { name: name.trim(), icon, color, type });
      } else {
        await addCategory({ name: name.trim(), icon, color, type });
      }
      resetForm();
    } catch {
      Alert.alert(t('errors.generic'), t('errors.failedSaveCategory'));
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(t('categories.deleteTitle'), t('categories.deleteMessage', { name: cat.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => removeCategory(cat.id),
      },
    ]);
  };

  const renderCategory = ({ item, index }: { item: Category; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 40).duration(250)} layout={Layout.springify()}>
      <Pressable
        style={[styles.catRow, { borderBottomColor: colors.separator }]}
        onPress={() => startEdit(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={[styles.catIcon, { backgroundColor: item.color + '18' }]}>
          <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={item.color} />
        </View>
        <View style={styles.catInfo}>
          <Text style={[styles.catName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.catType, { color: colors.textMuted }]}>{t(TYPE_KEYS[item.type])}</Text>
        </View>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Category Form ──────────────────────────────────────────── */}
      {showForm && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.formWrap}>
          <GlassCard padding={16} radius={16}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? t('categories.editCategory') : t('categories.newCategory')}
            </Text>

            {/* Name */}
            <TextInput
              style={[styles.nameInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
              value={name}
              onChangeText={setName}
              placeholder={t('categories.namePlaceholder')}
              placeholderTextColor={colors.placeholder}
              accessibilityLabel={t('a11y.categoryName')}
            />

            {/* Type toggle */}
            <View style={styles.typeRow}>
              {(['expense', 'income', 'both'] as CategoryType[]).map((typeKey) => (
                <Pressable
                  key={typeKey}
                  style={[styles.typeBtn, { backgroundColor: type === typeKey ? colors.primary + '18' : 'transparent', borderColor: type === typeKey ? colors.primary : colors.inputBorder }]}
                  onPress={() => setType(typeKey)}
                >
                  <Text style={[styles.typeBtnLabel, { color: type === typeKey ? colors.primary : colors.textSecondary }]}>
                    {t(TYPE_KEYS[typeKey])}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Icon picker */}
            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t('categories.icon')}</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((ic) => (
                <Pressable
                  key={ic}
                  style={[styles.iconOption, { backgroundColor: icon === ic ? color + '22' : 'transparent', borderColor: icon === ic ? color : colors.inputBorder }]}
                  onPress={() => setIcon(ic)}
                >
                  <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={20} color={icon === ic ? color : colors.textMuted} />
                </Pressable>
              ))}
            </View>

            {/* Color picker */}
            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t('categories.color')}</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text }]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            {/* Actions */}
            <View style={styles.formActions}>
              <Pressable style={[styles.formBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Ionicons name="checkmark" size={18} color="#FFF" />
                <Text style={styles.formBtnLabel}>{t('common.save')}</Text>
              </Pressable>
              <Pressable style={[styles.formBtn, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }]} onPress={resetForm}>
                <Text style={[styles.formBtnLabel, { color: colors.text }]}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* ── Categories List ────────────────────────────────────────── */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !showForm ? (
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary }]}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addBtnLabel, { color: colors.primary }]}>{t('categories.addCategory')}</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <GlassCard padding={32} style={{ marginTop: 20 }}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('categories.empty')}
            </Text>
          </GlassCard>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  formWrap: {
    padding: Spacing.xl,
  },
  formTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
  },
  nameInput: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  typeBtnLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
  pickerLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  iconOption: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  formBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    gap: 6,
  },
  formBtnLabel: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.md,
    color: '#FFF',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 8,
  },
  addBtnLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catInfo: { flex: 1 },
  catName: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
  },
  catType: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
});
