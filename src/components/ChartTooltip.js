import React from 'react';
import { Text, View } from 'react-native';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';

export default function ChartTooltip({ label, value, detail, color }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  if (!label && value == null) return null;

  return (
    <View
      style={{
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${color || c.cyan}55`,
        backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(8,20,26,0.92)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color || c.cyan,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
          {value}
        </Text>
        {label ? (
          <Text style={{ color: c.muted, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
            {label}
          </Text>
        ) : null}
        {detail ? (
          <Text style={{ color: c.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
