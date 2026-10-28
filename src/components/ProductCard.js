import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { getColors, statusColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';
import { statusMeta } from '../utils/monitor';
import {
  IconAlert,
  IconBox,
  IconChevronRight,
  IconCpu,
  IconServer,
} from './Icons';

export default function ProductCard({ product, onPress }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const meta = statusMeta[product.status] || statusMeta.pending;
  const liveServices = (product.services || []).filter(service => service.status === 'up').length;
  const accent = statusColors[product.status] || statusColors.pending;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        {
          borderLeftWidth: 3,
          borderLeftColor: accent,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          overflow: 'hidden',
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 42,
          backgroundColor: `${accent}10`,
        }}
      />

      <View style={s.spaceBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8, gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${accent}18`,
              borderWidth: 1,
              borderColor: `${accent}40`,
            }}
          >
            <IconBox size={17} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h3} numberOfLines={1}>{product.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <IconServer size={12} color={c.muted} />
              <Text style={[s.body, { flex: 1 }]} numberOfLines={1}>{product.server}</Text>
            </View>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[s.chip, { backgroundColor: `${accent}22`, borderWidth: 1, borderColor: `${accent}55` }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
            <Text style={[s.chipText, { color: accent }]}>{meta.label}</Text>
          </View>
          <IconChevronRight size={16} color={c.muted} />
        </View>
      </View>

      <View style={[s.row, { marginTop: 14, flexWrap: 'wrap', gap: 8 }]}>
        {[
          { label: 'CPU', value: product.cpu == null ? '--' : `${product.cpu}%`, icon: IconCpu },
          { label: 'RAM', value: product.ram == null ? '--' : `${product.ram}%` },
          ...(product.gpuAvailable || product.gpuRequired
            ? [{ label: 'GPU', value: product.gpuAvailable ? `${product.gpu}%` : 'N/A' }]
            : []),
        ].map(metric => (
          <View
            key={metric.label}
            style={{
              minWidth: 72,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: c.inputBg,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {metric.icon ? <metric.icon size={11} color={c.muted} /> : null}
              <Text style={s.label}>{metric.label}</Text>
            </View>
            <Text style={[s.h3, { marginTop: 3 }]}>{metric.value}</Text>
          </View>
        ))}
      </View>

      <View style={[s.spaceBetween, { marginTop: 12 }]}>
        <Text style={s.label}>
          {product.hasLiveData ? `${liveServices}/${product.services.length} services up` : 'Waiting for sync'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <IconAlert size={12} color={product.alerts ? c.amber : c.muted} />
          <Text style={[s.label, { color: product.alerts ? c.amber : c.muted }]}>
            {product.alerts} alerts
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
