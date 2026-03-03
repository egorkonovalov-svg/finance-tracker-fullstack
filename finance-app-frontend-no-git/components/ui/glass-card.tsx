import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import { Radius } from '@/constants/theme';

interface GlassCardProps extends ViewProps {
  /** Override border radius. Default: Radius.xl (20) */
  radius?: number;
  /** Extra padding inside. Default: 20 */
  padding?: number;
  /** Disable blur (for performance on low-end). Default: false */
  noBlur?: boolean;
}

export function GlassCard({ radius = Radius.xl, padding = 20, noBlur = false, style, children, ...rest }: GlassCardProps) {
  const { glass, colors } = useTheme();

  const containerStyle = [
    styles.container,
    {
      borderRadius: radius,
      borderColor: glass.borderColor,
      borderWidth: glass.borderWidth,
      shadowColor: glass.shadowColor,
      shadowOffset: glass.shadowOffset,
      shadowOpacity: glass.shadowOpacity,
      shadowRadius: glass.shadowRadius,
      elevation: 6,
    },
    style,
  ];

  if (noBlur) {
    return (
      <View style={[containerStyle, { backgroundColor: colors.surface, padding }]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View style={containerStyle} {...rest}>
      <BlurView
        intensity={glass.blur}
        tint={glass.tint}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: glass.backgroundColor,
          },
        ]}
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
