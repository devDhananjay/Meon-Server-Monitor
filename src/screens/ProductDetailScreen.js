import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import NoticeBar from '../components/NoticeBar';
import ServiceRow from '../components/ServiceRow';
import AlertConfigModal from '../components/AlertConfigModal';
import StatCard from '../components/StatCard';
import { LIVE_CPU_PRODUCTS } from '../config';
import { useMonitor } from '../context/MonitorContext';
import { getColors, statusColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { getGpuSummary, statusMeta } from '../utils/monitor';

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = route.params;
  const { theme, displayProducts, loadProductDetail, syncLiveProducts, syncing } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const product = displayProducts.find(item => item.id === productId);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (productId) loadProductDetail(productId);
  }, [productId, loadProductDetail]);

  if (!product) {
    return (
      <View style={[s.root, s.empty]}>
        <Text style={s.emptyTitle}>Product not found</Text>
        <Pressable style={s.ghostButton} onPress={() => navigation.goBack()}>
          <Text style={s.ghostButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const servers = product.servers || [];
  const healthyServers = servers.filter(server => server.status === 'healthy').length;
  const unhealthyServers = servers.filter(server => server.status === 'unhealthy').length;
  const criticalServers = servers.filter(server => server.status === 'critical').length;
  const warningServers = servers.filter(server => server.status === 'warning').length;
  const totalProductServices = servers.reduce((count, server) => count + server.services.length, 0);
  const runningProductServices = servers.reduce((count, server) => count + server.services.filter(svc => svc.status === 'up').length, 0);
  const degradedProductServices = servers.reduce((count, server) => count + server.services.filter(svc => svc.status === 'slow').length, 0);
  const downProductServices = servers.reduce((count, server) => count + server.services.filter(svc => svc.status === 'down').length, 0);
  const conclusion = unhealthyServers
    ? `${unhealthyServers} server is down.`
    : criticalServers
      ? `${criticalServers} server has critical resource usage.`
      : warningServers
        ? `${warningServers} server has warning services.`
        : product.hasLiveData ? 'All servers are healthy.' : 'No live server data is synced yet.';
  const hasLiveSync = ['kyc', 're-kyc', ...LIVE_CPU_PRODUCTS].includes(product.id);
  const statusColor = statusColors[product.status] || statusColors.pending;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      <NoticeBar />
      <View style={[s.row, { marginBottom: 12, gap: 8, flexWrap: 'wrap' }]}>
        <Pressable style={s.ghostButton} onPress={() => navigation.goBack()}>
          <Text style={s.ghostButtonText}>Back</Text>
        </Pressable>
        {hasLiveSync && (
          <Pressable style={[s.ghostButton, { opacity: syncing ? 0.6 : 1 }]} onPress={() => syncLiveProducts(false, product.id)} disabled={syncing}>
            <Text style={s.ghostButtonText}>{syncing ? `Syncing ${product.name}` : `Sync ${product.name}`}</Text>
          </Pressable>
        )}
        {product.hasLiveData && (
          <Pressable style={s.ghostButton} onPress={() => setConfigOpen(true)}>
            <Text style={s.ghostButtonText}>Alert config</Text>
          </Pressable>
        )}
      </View>

      <View style={s.panel}>
        <Text style={s.scanline}>PRODUCT SERVER CONCLUSION</Text>
        <Text style={s.title}>{product.name}</Text>
        <Text style={[s.body, { marginTop: 8 }]}>{conclusion}</Text>
        <View style={[s.chip, { alignSelf: 'flex-start', marginTop: 12, backgroundColor: `${statusColor}22` }]}>
          <Text style={[s.chipText, { color: statusColor }]}>{statusMeta[product.status]?.label || product.status}</Text>
        </View>
      </View>

      <View style={s.grid2}>
        <StatCard label="Servers" value={servers.length} hint={`${healthyServers} healthy`} />
        <StatCard label="Alerts" value={product.alerts} hint={conclusion} tone="amber" />
        <StatCard label="Services" value={product.services.length} hint={`${product.services.filter(svc => svc.status === 'up').length} running`} tone="green" />
        <StatCard label="Last sync" value={product.lastSyncedAt ? 'Live' : 'None'} hint={product.lastSyncedAt ? new Date(product.lastSyncedAt).toLocaleString() : 'waiting'} tone="violet" />
      </View>

      <DonutChart
        title="Server status"
        center={servers.length}
        hint="nodes"
        segments={[
          { label: 'Healthy', value: healthyServers, color: '#43e28e' },
          { label: 'Critical', value: criticalServers, color: '#ff7a45' },
          { label: 'Warning', value: warningServers, color: '#ffc65a' },
          { label: 'Unhealthy', value: unhealthyServers, color: '#ff5b77' },
        ]}
      />
      <DonutChart
        title="Service status"
        center={totalProductServices}
        hint="services"
        segments={[
          { label: 'Running', value: runningProductServices, color: '#43e28e' },
          { label: 'Warning', value: degradedProductServices, color: '#ffc65a' },
          { label: 'Down', value: downProductServices, color: '#ff5b77' },
        ]}
      />
      <BarChart
        title="Server resource average"
        hint="avg usage"
        rows={[
          { label: 'CPU', value: product.cpu, suffix: '%', color: '#38d5ff' },
          { label: 'RAM', value: product.ram, suffix: '%', color: '#a98bff' },
          { label: 'Disk', value: product.disk, suffix: '%', color: product.disk >= 85 ? '#ffc65a' : '#43e28e' },
          ...(product.gpuAvailable ? [{ label: 'GPU memory', value: product.gpu, suffix: '%', color: product.gpu >= 85 ? '#ffc65a' : '#43e28e' }] : []),
          { label: 'Network', value: product.network, suffix: '%', color: '#7de3a1' },
        ]}
      />

      {servers.length ? servers.map(server => {
        const gpu = getGpuSummary(server);
        return (
          <Pressable
            key={server.id}
            style={[s.card, { borderLeftWidth: 3, borderLeftColor: statusColors[server.status] || statusColors.pending }]}
            onPress={() => navigation.navigate('ServerDetail', { productId: product.id, serverId: server.id })}
          >
            <View style={s.spaceBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.h2}>{server.name}</Text>
                <Text style={s.body}>{server.region} - {server.ip}</Text>
              </View>
              <Text style={[s.chipText, { color: statusColors[server.status] }]}>
                {statusMeta[server.status]?.label || server.status}
              </Text>
            </View>
            <View style={[s.row, { marginTop: 10, flexWrap: 'wrap', gap: 12 }]}>
              <Text style={s.body}>CPU <Text style={s.h3}>{server.cpu}%</Text></Text>
              <Text style={s.body}>RAM <Text style={s.h3}>{server.ram}%</Text></Text>
              <Text style={s.body}>Disk <Text style={s.h3}>{server.disk}%</Text></Text>
              {(gpu.available || server.gpuRequired) && (
                <Text style={s.body}>GPU <Text style={s.h3}>{gpu.available ? `${gpu.memory}%` : 'N/A'}</Text></Text>
              )}
              <Text style={s.body}>Net <Text style={s.h3}>{server.network}%</Text></Text>
            </View>
            <View style={{ marginTop: 8 }}>
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
            {(server.traffic?.length || server.logs?.length || server.nodeAlerts?.length) ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {!!server.traffic?.length && (
                  <View>
                    <Text style={s.label}>Traffic</Text>
                    {server.traffic.map(metric => <ServiceRow key={metric.id || metric.name} service={metric} />)}
                  </View>
                )}
                {!!server.logs?.length && (
                  <View>
                    <Text style={s.label}>Logs</Text>
                    {server.logs.slice(0, 5).map(log => (
                      <ServiceRow key={log.id || log.name} service={{ ...log, port: log.path || log.port || 'log' }} />
                    ))}
                  </View>
                )}
                {!!server.nodeAlerts?.length && (
                  <View>
                    <Text style={s.label}>Alerts</Text>
                    {server.nodeAlerts.map(alert => <ServiceRow key={alert.id || alert.name} service={alert} />)}
                  </View>
                )}
              </View>
            ) : null}
          </Pressable>
        );
      }) : (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No live server data</Text>
          <Text style={s.body}>Sync this product to populate server details.</Text>
        </View>
      )}
      <AlertConfigModal product={product} visible={configOpen} onClose={() => setConfigOpen(false)} />
    </ScrollView>
  );
}
