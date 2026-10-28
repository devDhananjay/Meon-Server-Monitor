import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DaySegmentBar from '../components/DaySegmentBar';
import Meter from '../components/Meter';
import NoticeBar from '../components/NoticeBar';
import ServiceRow from '../components/ServiceRow';
import { useMonitor } from '../context/MonitorContext';
import { getColors, statusColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import {
  buildDaySegments,
  dayFormatter,
  formatDuration,
  getServiceDayTimeline,
  getServiceDowntimeRows,
  getServiceHealthHistory,
  slugify,
  statusMeta,
} from '../utils/monitor';

export default function ServiceDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId, serviceName } = route.params;
  const {
    theme, displayProducts, loadProductDetail, updateServiceMailAlert,
    canManageProducts, savingMailTargetId,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const product = displayProducts.find(item => item.id === productId);
  const service = product?.services?.find(item => item.name === serviceName || slugify(item.name) === slugify(serviceName));
  const hostServer = product?.servers?.find(server =>
    (server.services || []).some(item => item.name === service?.name || slugify(item.name) === slugify(service?.name || ''))
  ) || product?.servers?.[0];

  useEffect(() => {
    if (productId) loadProductDetail(productId);
  }, [productId, loadProductDetail]);

  const history = useMemo(() => (product && service ? getServiceHealthHistory(product, service) : []), [product, service]);
  const downtimeRows = useMemo(() => (service ? getServiceDowntimeRows(service) : []), [service]);
  const dayTimeline = useMemo(() => (service ? getServiceDayTimeline(service) : []), [service]);
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const selectedDay = dayTimeline.find(day => day.key === selectedDayKey) || dayTimeline.at(-1) || null;
  const selectedSegments = useMemo(() => buildDaySegments(selectedDay), [selectedDay]);

  useEffect(() => {
    if (!dayTimeline.length) {
      setSelectedDayKey('');
      return;
    }
    if (!dayTimeline.some(day => day.key === selectedDayKey)) setSelectedDayKey(dayTimeline.at(-1).key);
  }, [dayTimeline, selectedDayKey]);

  if (!product || !service) {
    return (
      <View style={[s.root, s.empty]}>
        <Text style={s.emptyTitle}>Service not found</Text>
        <Pressable style={s.ghostButton} onPress={() => navigation.goBack()}>
          <Text style={s.ghostButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const stateLabel = service.status === 'up' ? 'Running' : service.status === 'slow' ? 'Warning' : 'Down';
  const mailEnabled = service.mailAlertEnabled !== false;
  const color = statusColors[service.status] || statusColors.pending;
  const healthyDays = history.filter(day => day.status === 'healthy').length;
  const degradedDays = history.filter(day => day.status === 'degraded').length;
  const unhealthyDays = history.filter(day => day.status === 'unhealthy').length;
  const avgLatency = Math.round(history.reduce((total, day) => total + day.latency, 0) / Math.max(history.length, 1));

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      <NoticeBar />
      <View style={[s.row, { gap: 8, marginBottom: 12, flexWrap: 'wrap' }]}>
        <Pressable style={s.ghostButton} onPress={() => navigation.goBack()}>
          <Text style={s.ghostButtonText}>Back</Text>
        </Pressable>
        {canManageProducts && (
          <Pressable
            style={s.ghostButton}
            disabled={savingMailTargetId === `service-${product.id}-${service.id}`}
            onPress={() => updateServiceMailAlert(product, service, !mailEnabled)}
          >
            <Text style={s.ghostButtonText}>{mailEnabled ? 'Mail alerts on' : 'Mail muted'}</Text>
          </Pressable>
        )}
      </View>

      <View style={s.panel}>
        <Text style={s.scanline}>SERVICE DETAIL</Text>
        <Text style={s.title}>{service.name}</Text>
        <Text style={[s.body, { marginTop: 6 }]}>{product.name} on {hostServer?.name || product.server || 'server'}</Text>
        <View style={[s.chip, { alignSelf: 'flex-start', marginTop: 10, backgroundColor: `${color}22` }]}>
          <Text style={[s.chipText, { color }]}>{stateLabel} · {service.uptime}</Text>
        </View>
        <View style={[s.row, { marginTop: 12, flexWrap: 'wrap', gap: 12 }]}>
          <Text style={s.body}>IP <Text style={s.h3}>{hostServer?.ip || '-'}</Text></Text>
          <Text style={s.body}>Region <Text style={s.h3}>{hostServer?.region || '-'}</Text></Text>
          <Text style={s.body}>Port <Text style={s.h3}>{service.port || '-'}</Text></Text>
          <Text style={s.body}>Latency <Text style={s.h3}>{service.latency || service.latency_ms || 0} ms</Text></Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.h3}>30-day health</Text>
        <View style={[s.row, { marginTop: 10, flexWrap: 'wrap', gap: 14 }]}>
          <Text style={s.body}><Text style={s.h3}>{healthyDays}</Text> Healthy</Text>
          <Text style={s.body}><Text style={s.h3}>{degradedDays}</Text> Warning</Text>
          <Text style={s.body}><Text style={s.h3}>{unhealthyDays}</Text> Unhealthy</Text>
          <Text style={s.body}><Text style={s.h3}>{avgLatency}ms</Text> Avg</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {history.map(day => (
            <View
              key={day.label}
              style={{
                width: 10,
                height: 28,
                borderRadius: 3,
                marginRight: 3,
                backgroundColor: statusColors[day.status === 'degraded' ? 'warning' : day.status] || statusColors.pending,
              }}
            />
          ))}
        </ScrollView>
        {dayTimeline.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {dayTimeline.map(day => {
              const selected = day.key === selectedDay?.key;
              return (
                <Pressable key={day.key} onPress={() => setSelectedDayKey(day.key)} style={{ width: 36, marginRight: 4, alignItems: 'center' }}>
                  <View style={{
                    width: 20,
                    height: selected ? 44 : 26,
                    borderRadius: 4,
                    backgroundColor: statusColors[day.status] || statusColors.pending,
                  }} />
                  <Text style={[s.label, { fontSize: 9, marginTop: 4 }]}>{day.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {selectedDay && (
          <>
            <Text style={[s.body, { marginTop: 8 }]}>
              {selectedDay.label}: {selectedDay.status}
              {selectedDay.unhealthyDurationSeconds ? ` · down ${formatDuration(selectedDay.unhealthyDurationSeconds)}` : ''}
              {` · ${selectedSegments.length} segments`}
            </Text>
            <DaySegmentBar segments={selectedSegments} label={`${selectedDay.label} up/down segments`} />
            <View style={[s.row, { marginTop: 8, flexWrap: 'wrap', gap: 10 }]}>
              <Text style={s.label}>● Healthy</Text>
              <Text style={[s.label, { color: statusColors.warning }]}>● Warning</Text>
              <Text style={[s.label, { color: statusColors.unhealthy }]}>● Unhealthy</Text>
            </View>
          </>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Down / up timeline</Text>
        {downtimeRows.length ? downtimeRows.map(row => (
          <View key={row.id} style={{ marginTop: 10 }}>
            <Text style={s.h3}>{row.message}</Text>
            <Text style={s.body}>
              {dayFormatter.format(row.downAt)} · Down {row.downAt.toLocaleString()} · Up {row.upAt ? row.upAt.toLocaleString() : 'Still down'} · {formatDuration(row.durationSeconds)}
            </Text>
          </View>
        )) : (
          <Text style={[s.body, { marginTop: 8 }]}>No downtime recorded for this service</Text>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>{product.name}</Text>
        <Text style={s.body}>{product.server}</Text>
        <Text style={[s.label, { marginTop: 6 }]}>{statusMeta[product.status]?.label}</Text>
        <Meter label="CPU usage" value={product.cpu} type="cpu" />
        <Meter label="RAM usage" value={product.ram} type="ram" />
        <Meter label="Network load" value={product.network} type="network" />
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Other services</Text>
        {product.services.map(item => (
          <ServiceRow
            key={item.name}
            service={item}
            onPress={() => navigation.push('ServiceDetail', { productId: product.id, serviceName: item.name })}
          />
        ))}
      </View>
    </ScrollView>
  );
}
