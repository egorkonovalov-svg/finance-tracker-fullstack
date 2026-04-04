import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { GlassCard } from '@/components/ui/glass-card';
import { FontFamily, FontSize, Palette, Radius, Spacing } from '@/constants/theme';
import { CODE_LENGTH } from '@/hooks/useVerificationCode';

interface Props {
  digits: string[];
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
  error: string | null;
  submitting: boolean;
  onDigitChange: (index: number, value: string) => void;
  onKeyPress: (index: number, key: string) => void;
  onPaste: (text: string) => void;
}

export function CodeInput({
  digits,
  inputRefs,
  error,
  submitting,
  onDigitChange,
  onKeyPress,
  onPaste,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <GlassCard padding={24} radius={20}>
      <View style={styles.codeRow}>
        {digits.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { inputRefs.current[i] = ref; }}
            style={[
              styles.digitInput,
              {
                color: colors.text,
                borderColor: digit
                  ? Palette.indigo
                  : error
                    ? Palette.red
                    : colors.inputBorder,
                backgroundColor: colors.inputBg,
              },
            ]}
            value={digit}
            onChangeText={(v) => {
              if (v.length > 1 && i === 0) {
                onPaste(v);
              } else {
                onDigitChange(i, v);
              }
            }}
            onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={i === 0 ? CODE_LENGTH : 1}
            textContentType="oneTimeCode"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            selectTextOnFocus
            editable={!submitting}
            accessibilityLabel={t('a11y.digit', { index: i + 1 })}
          />
        ))}
      </View>

      {error && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={Palette.red} />
          <Text style={[styles.errorText, { color: Palette.red }]}>{error}</Text>
        </Animated.View>
      )}

      {submitting && (
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {t('verify.verifying')}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  digitInput: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize['2xl'],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
  statusText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
