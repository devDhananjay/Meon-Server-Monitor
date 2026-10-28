import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import BarChart from '../components/BarChart';
import DaySegmentBar from '../components/DaySegmentBar';
import DonutChart from '../components/DonutChart';
import Meter from '../components/Meter';
import NoticeBar from '../components/NoticeBar';
import RamUsageLineChart from '../components/RamUsageLineChart';
import ServiceRow from '../components/ServiceRow';
import StatCard from '../components/StatCard';
import UsageApiConfigPanel from '../components/UsageApiConfigPanel';
import UsageBarChart from '../components/UsageBarChart';
import { useMonitor } from '../context/MonitorContext';
import { getColors, statusColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import {
  buildDaySegments,
  formatDuration,
  getFourthMetric,
  getGpuSummary,
  getServerHealthHistory,
  getServerIssueReasons,
  getStoredStatusRows,
  statusMeta,
} from '../utils/monitor';

export default function ServerDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId, serverId } = route.params;
  const {
    theme, displayProducts, loadProductDetail, updateServerMailAlert,
    canManageProducts, canManageUsage, savingMailTargetId, savingUsageTargetId,
    saveServerUsageConfig, syncServerUsage, clearServerUsageLogs,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const product = displayProducts.find(item => item.id === productId);
  const server = product?.servers?.find(item => item.id === serverId);

  useEffect(() => {
    if (productId) loadProductDetail(productId);
  }, [productId, loadProductDetail]);

  const { days, events } = useMemo(() => (server ? getServerHealthHistory(server) : { days: [], events: [] }), [server]);
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const [logQuery, setLogQuery] = useState('');
  const selectedDay = days.find(day => day.key === selectedDayKey) || days.at(-1) || null;
  const selectedSegments = useMemo(() => buildDaySegments(selectedDay), [selectedDay]);
  const selectedEvents = selectedDay ? selectedDay.events.slice().sort((a, b) => a.date - b.date) : [];
  const runningServices = server?.services?.filter(svc => svc.status === 'up').length || 0;
  const degradedServices = server?.services?.filter(svc => svc.status === 'slow').length || 0;
  const downServices = server?.services?.filter(svc => svc.status === 'down').length || 0;

  useEffect(() => {
    if (!days.length) {
      setSelectedDayKey('');
      return;
    }
    if (!days.some(day => day.key === selectedDayKey)) setSelectedDayKey(days.at(-1).key);
  }, [days, selectedDayKey]);

  if (!product || !server) {
    return (
      <View style={[s.root, s.empty]}>
        <Text style={s.emptyTitle}>Server not found</Text>
        <Pressable style={s.ghostButton} onPress={() => navigation.goBack()}>
          <Text style={s.ghostButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const issueReasons = getServerIssueReasons(server);
  const gpu = getGpuSummary(server);
  const fourth = getFourthMetric(server);
  const storedStatusRows = getStoredStatusRows(server).slice(0, 20);
  const mailEnabled = server.mailAlertEnabled !== false;
  const statusColor = statusColors[server.status] || statusColors.pending;
  const filteredLogs = (server.logs || []).filter(log => {
    const q = logQuery.trim().toLowerCase();
    if (!q) return true;
    return `${log.name || ''} ${log.path || ''} ${log.message || ''} ${log.status || ''}`.toLowerCase().includes(q);
  });

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      <NoticeBar />
      <View style={[s.row, { gap: 8, marginBottom: 12, flexWrap: 'wrap' }]}>
        <Pressable style={s.ghostButton} onPress={() => navigation.goBack()}>
          <Text style={s.ghostButtonText}>Back to {product.name}</Text>
        </Pressable>
        {canManageProducts && (
          <Pressable
            style={[s.ghostButton, { opacity: savingMailTargetId === `server-${product.id}-${server.id}` ? 0.6 : 1 }]}
            disabled={savingMailTargetId === `server-${product.id}-${server.id}`}
            onPress={() => updateServerMailAlert(product, server, !mailEnabled)}
          >
            <Text style={s.ghostButtonText}>{mailEnabled ? 'Mail alerts on' : 'Mail muted'}</Text>
          </Pressable>
        )}
      </View>

      <View style={s.panel}>
        <Text style={s.scanline}>SERVER DETAIL</Text>
        <Text style={s.title}>{server.name}</Text>
        <Text style={[s.body, { marginTop: 6 }]}>{product.name} · {server.region} · {server.ip}</Text>
        <View style={[s.chip, { alignSelf: 'flex-start', marginTop: 10, backgroundColor: `${statusColor}22` }]}>
          <Text style={[s.chipText, { color: statusColor }]}>{statusMeta[server.status]?.label || server.status}</Text>
        </View>
      </View>

      <View style={s.grid2}>
        <StatCard label="Services" value={server.services.length} hint={`${runningServices} running`} tone="green" />
        <StatCard label="CPU" value={`${server.cpu}%`} hint="current" />
        <StatCard label="RAM" value={`${server.ram}%`} hint="current" tone="violet" />
        <StatCard label="Disk" value={`${server.disk}%`} hint={`${fourth.shortLabel} ${fourth.value}${fourth.suffix}`} tone="amber" />
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Resources</Text>
        <Meter label="CPU usage" value={server.cpu} type="cpu" />
        <Meter label="RAM usage" value={server.ram} type="ram" />
        <Meter label="Disk usage" value={server.disk} type="disk" />
        {(gpu.available || server.gpuRequired) && (
          <Meter label="GPU memory" value={gpu.available ? gpu.memory : 0} type="gpu" />
        )}
        <Meter label={fourth.label} value={hasPercent(fourth) ? fourth.value : Math.min(100, fourth.value)} type="network" />
      </View>

      <DonutChart
        title="Service health"
        center={server.services.length}
        hint="services"
        segments={[
          { label: 'Running', value: runningServices, color: '#43e28e' },
          { label: 'Warning', value: degradedServices, color: '#ffc65a' },
          { label: 'Down', value: downServices, color: '#ff5b77' },
        ]}
      />
      <BarChart
        title="Resource usage"
        hint="live node"
        rows={[
          { label: 'CPU', value: server.cpu, suffix: '%', color: '#38d5ff' },
          { label: 'RAM', value: server.ram, suffix: '%', color: '#a98bff' },
          { label: 'Disk', value: server.disk, suffix: '%', color: server.disk >= 85 ? '#ffc65a' : '#43e28e' },
          ...(gpu.available ? [{ label: 'GPU memory', value: gpu.memory, suffix: '%', color: gpu.peak >= 85 ? '#ffc65a' : '#43e28e' }] : []),
          { label: fourth.shortLabel || 'Net', value: fourth.value, suffix: fourth.suffix || '%', color: '#7de3a1' },
        ]}
      />

      {(gpu.available || server.gpuRequired) && (
        <View style={s.card}>
          <Text style={s.h3}>GPU devices</Text>
          {gpu.available ? gpu.metrics.map((device, index) => {
            const memory = Number(device.memory_usage_percent ?? device.gpu_memory_usage_percent ?? device.gpu_consumed_percent ?? 0) || 0;
            const utilization = Number(device.utilization_percent ?? device.gpu_utilization_percent ?? 0) || 0;
            return (
              <View key={device.id || device.name || index} style={{ marginTop: 10 }}>
                <Text style={s.h3}>{device.name || device.model || `GPU ${index + 1}`}</Text>
                <Text style={s.body}>
                  Utilization {utilization}% · Memory {memory}% · Used {device.used_gb ?? device.gpu_used_gb ?? '-'} GB / {device.total_gb ?? device.gpu_total_gb ?? '-'} GB · Free {device.free_gb ?? device.gpu_free_gb ?? '-'} GB
                </Text>
              </View>
            );
          }) : (
            <Text style={[s.body, { marginTop: 8 }]}>GPU device not reported</Text>
          )}
        </View>
      )}

      <View style={s.card}>
        <Text style={s.h3}>Current issue reasons</Text>
        {issueReasons.length ? issueReasons.map((reason, index) => (
          <View key={`${reason.label}-${index}`} style={{ marginTop: 10 }}>
            <Text style={[s.h3, { color: statusColors[reason.type] || c.amber }]}>{reason.label}</Text>
            <Text style={s.body}>{reason.detail}</Text>
          </View>
        )) : (
          <Text style={[s.body, { marginTop: 8 }]}>No active issue detected</Text>
        )}
      </View>

      <RamUsageLineChart logs={server.ramUsageLogs || []} currentRam={server.ram} />

      <UsageApiConfigPanel
        config={server.usageConfig}
        canManageUsage={canManageUsage}
        saving={savingUsageTargetId === `usage-${product.id}-${server.id}`}
        onSave={payload => saveServerUsageConfig(product, server, payload)}
        onSync={() => syncServerUsage(product, server)}
        onClearLogs={(dateFrom, dateTo) => clearServerUsageLogs(product, server, dateFrom, dateTo)}
      />

      {server.usageConfig ? <UsageBarChart logs={server.usageLogs || []} config={server.usageConfig} /> : null}

      <View style={s.card}>
        <View style={s.spaceBetween}>
          <Text style={s.h3}>Uptime timeline</Text>
          <Text style={s.label}>{days.length} days</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {days.map(day => {
            const selected = day.key === selectedDay?.key;
            return (
              <Pressable
                key={day.key}
                onPress={() => setSelectedDayKey(day.key)}
                style={{
                  width: 28,
                  marginRight: 4,
                  alignItems: 'center',
                }}
              >
                <View style={{
                  width: 18,
                  height: selected ? 48 : 28,
                  borderRadius: 4,
                  backgroundColor: statusColors[day.status] || statusColors.pending,
                  opacity: selected ? 1 : 0.75,
                }} />
                <Text style={[s.label, { fontSize: 9, marginTop: 4 }]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {selectedDay && (
          <>
            <Text style={[s.body, { marginTop: 10 }]}>
              {selectedDay.label}: {selectedDay.status} · down {formatDuration(selectedDay.unhealthyDurationSeconds)} · {selectedSegments.length} segments
            </Text>
            <DaySegmentBar segments={selectedSegments} label={`${selectedDay.label} up/down segments`} />
          </>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Services</Text>
        {server.services.map(service => (
          <ServiceRow
            key={service.name}
            service={service}
            onPress={() => navigation.navigate('ServiceDetail', {
              productId: product.id,
              serviceName: service.name,
            })}
          />
        ))}
      </View>

      {!!server.traffic?.length && (
        <View style={s.card}>
          <Text style={s.h3}>Traffic</Text>
          {server.traffic.map(metric => <ServiceRow key={metric.id || metric.name} service={metric} />)}
        </View>
      )}

      {!!(server.logs?.length) && (
        <View style={s.card}>
          <Text style={s.h3}>Logs</Text>
          <TextInput
            style={[s.input, { marginTop: 8, marginBottom: 8 }]}
            value={logQuery}
            onChangeText={setLogQuery}
            placeholder="Search logs"
            placeholderTextColor={c.muted}
            autoCapitalize="none"
          />
          {filteredLogs.length ? filteredLogs.slice(0, 30).map(log => (
            <ServiceRow key={log.id || log.name} service={{ ...log, port: log.path || 'log' }} />
          )) : (
            <Text style={[s.body, { marginTop: 8 }]}>No logs match this search</Text>
          )}
        </View>
      )}

      {!!server.nodeAlerts?.length && (
        <View style={s.card}>
          <Text style={s.h3}>Alerts</Text>
          {server.nodeAlerts.map(alert => <ServiceRow key={alert.id || alert.name} service={alert} />)}
        </View>
      )}

      <View style={s.card}>
        <Text style={s.h3}>Recent status events</Text>
        {storedStatusRows.length ? storedStatusRows.map(row => (
          <View key={row.id} style={{ marginTop: 10, borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 8 }}>
            <Text style={s.h3}>{row.label}</Text>
            <Text style={s.body}>{row.kind} · {row.detail}</Text>
            <Text style={s.label}>{row.observedAt ? new Date(row.observedAt).toLocaleString() : '-'}</Text>
          </View>
        )) : (
          <Text style={[s.body, { marginTop: 8 }]}>No stored status events yet</Text>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>{selectedDay ? `${selectedDay.label} timeline` : 'Status timeline'}</Text>
        {selectedEvents.length ? selectedEvents.map(event => (
          <View key={`${event.kind}-${event.source}-${event.id}-${event.started_at}`} style={{ marginTop: 10 }}>
            <Text style={s.h3}>{event.source} is {event.status}</Text>
            <Text style={s.body}>
              {event.date.toLocaleTimeString()} · {event.note} · {formatDuration(event.duration_seconds || 0)}
            </Text>
          </View>
        )) : (
          <Text style={[s.body, { marginTop: 8 }]}>Select a recorded day to see status changes</Text>
        )}
        <Text style={[s.label, { marginTop: 8 }]}>{events.length} total history records</Text>
      </View>
    </ScrollView>
  );
}

function hasPercent(metric) {
  return metric.suffix === '%';
}
