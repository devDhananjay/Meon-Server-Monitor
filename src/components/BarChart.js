import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';
import ChartTooltip from './ChartTooltip';

export default function BarChart({ title, rows = [], hint }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const maxValue = Math.max(...rows.map(row => row.value || 0), 1);
  const [activeLabel, setActiveLabel] = useState(null);
  const active = rows.find(row => row.label === activeLabel) || null;

  return (
    <View style={s.card}>
      <View style={s.spaceBetween}>
        <Text style={s.h3}>{title}</Text>
        <Text style={s.label}>{hint}</Text>
      </View>
      {rows.map(row => {
        const selected = activeLabel === row.label;
        return (
          <Pressable
            key={row.label}
            onPress={() => setActiveLabel(prev => (prev === row.label ? null : row.label))}
            onHoverIn={() => setActiveLabel(row.label)}
            onHoverOut={() => setActiveLabel(prev => (prev === row.label ? null : prev))}
            style={{ marginTop: 10, opacity: activeLabel && !selected ? 0.55 : 1 }}
          >
            <View style={s.spaceBetween}>
              <Text style={[s.label, selected ? { color: c.text, fontWeight: '800' } : null]}>{row.label}</Text>
              <Text style={s.h3}>
                {row.value}
                {row.suffix || ''}
              </Text>
            </View>
            <View style={s.meterTrack}>
              <View
                style={[
                  s.meterFill,
                  {
                    width: `${Math.max(4, ((row.value || 0) / maxValue) * 100)}%`,
                    backgroundColor: row.color || c.cyan,
                    opacity: selected ? 1 : 0.85,
                  },
                ]}
              />
            </View>
          </Pressable>
        );
      })}
      {active ? (
        <ChartTooltip
          color={active.color || c.cyan}
          value={`${active.value}${active.suffix || ''}`}
          label={active.label}
          detail={hint || title}
        />
      ) : null}
    </View>
  );
}
