import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';
import { IconRefresh } from './Icons';

/**
 * Shared polished header for drawer screens.
 */
export default function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  onRefresh,
  refreshing = false,
  right,
}) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);

  return (
    <View
      style={[
        s.panel,
        {
          overflow: 'hidden',
          marginBottom: 14,
          paddingVertical: 16,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -24,
          right: -18,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: 'rgba(56,213,255,0.08)',
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {Icon ? (
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${c.cyan}18`,
              borderWidth: 1,
              borderColor: `${c.cyan}40`,
            }}
          >
            <Icon size={20} color={c.cyan} />
          </View>
        ) : null}
        <View style={{ flex: 1, paddingRight: 4 }}>
          {eyebrow ? <Text style={s.scanline}>{eyebrow}</Text> : null}
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={[s.body, { marginTop: 6 }]}>{subtitle}</Text> : null}
        </View>
        {right || (onRefresh ? (
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={[
              glassSurface(c, theme),
              {
                width: 42,
                height: 42,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                opacity: refreshing ? 0.55 : 1,
              },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator color={c.cyan} size="small" />
            ) : (
              <IconRefresh size={18} color={c.cyan} />
            )}
          </Pressable>
        ) : null)}
      </View>
    </View>
  );
}
