import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';
import ChartTooltip from './ChartTooltip';

export default function DonutChart({ title, center, segments = [], hint }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const size = 120;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
  let offset = 0;
  const [activeLabel, setActiveLabel] = useState(null);
  const active = segments.find(seg => seg.label === activeLabel) || null;
  const activePct = active ? Math.round((active.value / total) * 100) : null;

  return (
    <View style={s.card}>
      <View style={s.spaceBetween}>
        <Text style={s.h3}>{title}</Text>
        <Text style={s.label}>{hint}</Text>
      </View>
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.inputBg} strokeWidth={stroke} fill="none" />
          {segments.map(segment => {
            const length = (segment.value / total) * circumference;
            const selected = activeLabel === segment.label;
            const circle = (
              <Circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={selected ? stroke + 2 : stroke}
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
                opacity={activeLabel && !selected ? 0.35 : 1}
              />
            );
            offset += length;
            return circle;
          })}
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={s.h2}>{active ? active.value : center}</Text>
          <Text style={s.label}>{active ? active.label : 'total'}</Text>
        </View>
      </View>
      {segments.map(segment => {
        const selected = activeLabel === segment.label;
        return (
          <Pressable
            key={segment.label}
            onPress={() => setActiveLabel(prev => (prev === segment.label ? null : segment.label))}
            onHoverIn={() => setActiveLabel(segment.label)}
            onHoverOut={() => setActiveLabel(prev => (prev === segment.label ? null : prev))}
            style={[s.spaceBetween, { marginTop: 4, opacity: activeLabel && !selected ? 0.5 : 1 }]}
          >
            <View style={s.row}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: segment.color, marginRight: 8 }} />
              <Text style={[s.body, selected ? { color: c.text, fontWeight: '800' } : null]}>{segment.label}</Text>
            </View>
            <Text style={s.h3}>{segment.value}</Text>
          </Pressable>
        );
      })}
      {active ? (
        <ChartTooltip
          color={active.color}
          value={`${active.value} · ${activePct}%`}
          label={active.label}
          detail={`${title} · of ${total}`}
        />
      ) : null}
    </View>
  );
}
