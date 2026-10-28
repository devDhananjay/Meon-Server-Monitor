import React from 'react';
import { Text, View } from 'react-native';
import { useMonitor } from '../context/MonitorContext';
import { getColors, statusColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';

export default function DaySegmentBar({ segments = [], label }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);

  if (!segments.length) {
    return (
      <View style={{ marginTop: 10 }}>
        {label ? <Text style={s.label}>{label}</Text> : null}
        <Text style={[s.body, { marginTop: 4 }]}>No day segments available</Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      {label ? <Text style={[s.label, { marginBottom: 6 }]}>{label}</Text> : null}
      <View
        style={{
          height: 18,
          borderRadius: 6,
          overflow: 'hidden',
          backgroundColor: c.inputBg,
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: c.line,
        }}
      >
        {segments.map((segment, index) => (
          <View
            key={`${segment.status}-${index}-${segment.start}`}
            style={{
              position: 'absolute',
              left: `${Math.max(0, Math.min(100, segment.left))}%`,
              width: `${Math.max(0.4, Math.min(100, segment.width))}%`,
              top: 0,
              bottom: 0,
              backgroundColor: statusColors[segment.status] || statusColors.healthy,
              opacity: segment.status === 'healthy' ? 0.55 : 0.95,
            }}
          />
        ))}
      </View>
      <View style={[s.spaceBetween, { marginTop: 4 }]}>
        <Text style={s.label}>00:00</Text>
        <Text style={s.label}>12:00</Text>
        <Text style={s.label}>24:00</Text>
      </View>
    </View>
  );
}
