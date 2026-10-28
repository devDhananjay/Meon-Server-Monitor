import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';

export default function ToggleRow({ label, value, onValueChange, disabled }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  return (
    <View style={[s.spaceBetween, { marginTop: 10 }]}>
      <Text style={[s.body, { flex: 1, paddingRight: 12 }]}>{label}</Text>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: c.line, true: c.cyan }}
        thumbColor="#fff"
      />
    </View>
  );
}
