import React from 'react';
import { Text, View } from 'react-native';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';

const typeColor = {
  cpu: '#38d5ff',
  ram: '#a98bff',
  disk: '#43e28e',
  network: '#7de3a1',
  gpu: '#ffc65a',
};

export default function Meter({ label, value = 0, type = 'cpu' }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={{ marginTop: 10 }}>
      <View style={s.spaceBetween}>
        <Text style={s.label}>{label}</Text>
        <Text style={[s.h3, { color: c.text }]}>{pct}%</Text>
      </View>
      <View style={s.meterTrack}>
        <View style={[s.meterFill, { width: `${pct}%`, backgroundColor: typeColor[type] || c.cyan }]} />
      </View>
    </View>
  );
}
