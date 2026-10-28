import React from 'react';
import { Text, View } from 'react-native';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';

const toneMap = {
  cyan: 'cyan',
  green: 'green',
  amber: 'amber',
  violet: 'violet',
};

export default function StatCard({ label, value, hint, tone = 'cyan', icon: Icon }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const accent = c[toneMap[tone] || 'cyan'];

  return (
    <View
      style={[
        s.statCard,
        {
          borderLeftWidth: 0,
          overflow: 'hidden',
          borderTopColor: 'rgba(255,255,255,0.12)',
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -18,
          right: -14,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: `${accent}14`,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[s.label, { flex: 1, paddingRight: 6 }]} numberOfLines={1}>{label}</Text>
        {Icon ? (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${accent}18`,
              borderWidth: 1,
              borderColor: `${accent}40`,
            }}
          >
            <Icon size={15} color={accent} />
          </View>
        ) : null}
      </View>
      <Text style={[s.h2, { marginTop: 10, color: accent, fontSize: 22 }]}>{value}</Text>
      <Text style={[s.body, { marginTop: 4 }]} numberOfLines={2}>{hint}</Text>
    </View>
  );
}
