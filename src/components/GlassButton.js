import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';

/**
 * Liquid-glass pressable used for header menu, chips, and drawer actions.
 */
export default function GlassButton({
  onPress,
  children,
  label,
  style,
  contentStyle,
  size = 40,
  rounded = 14,
  disabled = false,
  accessibilityLabel,
}) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const glass = glassSurface(c, theme);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: rounded,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        glass,
        style,
      ]}
    >
      {/* Specular highlight — liquid glass sheen */}
      <View pointerEvents="none" style={styles.sheenTop} />
      <View pointerEvents="none" style={styles.sheenGlow} />
      <View style={[{ alignItems: 'center', justifyContent: 'center' }, contentStyle]}>
        {children}
        {label ? (
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheenTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  sheenGlow: {
    position: 'absolute',
    top: -8,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
