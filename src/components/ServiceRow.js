import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { getColors, statusColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';

function statusLabel(status) {
  if (status === 'up') return 'Running';
  if (status === 'critical') return 'Critical';
  if (status === 'slow') return 'Warning';
  return 'Down';
}

export default function ServiceRow({ service, onPress }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const color = statusColors[service.status] || statusColors.pending;
  const content = (
    <>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.h3}>{service.name}</Text>
        <Text style={s.label}>
          {service.port} - {service.latency} ms - {service.uptime}
          {service.mailAlertEnabled === false ? ' - mail muted' : ''}
        </Text>
      </View>
      <Text style={[s.chipText, { color }]}>{statusLabel(service.status)}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[s.row, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[s.row, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }]}>
      {content}
    </View>
  );
}
