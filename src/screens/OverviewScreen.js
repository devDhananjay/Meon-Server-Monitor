import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import HealthScoreWave from '../components/HealthScoreWave';
import NoticeBar from '../components/NoticeBar';
import ProductCard from '../components/ProductCard';
import NotificationBell from '../components/NotificationBell';
import StatCard from '../components/StatCard';
import {
  IconActivity,
  IconAlert,
  IconCheck,
  IconClock,
  IconGrid,
  IconInfo,
  IconPie,
  IconPulse,
  IconRefresh,
  IconSearch,
  IconServer,
  IconWarning,
  IconXCircle,
  IconZap,
} from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', Icon: IconGrid, colorKey: 'cyan' },
  { value: 'healthy', label: 'Healthy', Icon: IconCheck, colorKey: 'green' },
  { value: 'warning', label: 'Warning', Icon: IconWarning, colorKey: 'amber' },
  { value: 'critical', label: 'Critical', Icon: IconAlert, colorKey: 'critical' },
  { value: 'unhealthy', label: 'Unhealthy', Icon: IconXCircle, colorKey: 'red' },
];

const LEGEND = [
  { Icon: IconCheck, color: '#43e28e', title: 'Healthy', text: 'Resources and services are fine' },
  { Icon: IconWarning, color: '#ffc65a', title: 'Warning', text: 'Elevated CPU/RAM/Disk/GPU or slow services' },
  { Icon: IconAlert, color: '#ff7a45', title: 'Critical', text: 'Resource pressure ≥ 90%' },
  { Icon: IconXCircle, color: '#ff5b77', title: 'Unhealthy', text: 'Server/service down or GPU free ≤ 1 GB' },
  { Icon: IconClock, color: '#6f8d98', title: 'Pending', text: 'Catalogue product not synced yet' },
];

function SectionHeader({ title, hint, Icon, c, s }) {
  return (
    <View style={[s.spaceBetween, { marginTop: 8, marginBottom: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${c.cyan}16`,
            borderWidth: 1,
            borderColor: `${c.cyan}33`,
          }}
        >
          <Icon size={16} color={c.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>{title}</Text>
          {hint ? <Text style={[s.label, { marginTop: 2 }]}>{hint}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export default function OverviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollRef = useRef(null);
  const serversY = useRef(0);
  const {
    theme, filteredProducts, query, setQuery, statusFilter, setStatusFilter,
    stats, displayProducts, syncing, syncLiveProducts, lastAutoSyncAt,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);

  useEffect(() => {
    if (!route.params?.scrollToServers) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, serversY.current - 12), animated: true });
      navigation.setParams({ scrollToServers: undefined });
    }, 250);
    return () => clearTimeout(timer);
  }, [route.params?.scrollToServers, navigation]);

  return (
    <ScrollView ref={scrollRef} style={s.root} contentContainerStyle={s.scroll}>
      <NoticeBar />

      {/* Hero */}
      <View
        style={[
          s.panel,
          {
            overflow: 'hidden',
            marginBottom: 14,
            paddingVertical: 16,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -30,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(56,213,255,0.08)',
          }}
        />
        <View style={s.spaceBetween}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${c.cyan}18`,
                  borderWidth: 1,
                  borderColor: `${c.cyan}40`,
                }}
              >
                <IconPulse size={14} color={c.cyan} />
              </View>
              <Text style={[s.scanline, { marginBottom: 0 }]}>MEON SUPER ADMIN</Text>
            </View>
            <Text style={s.title}>Product server health</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <IconClock size={13} color={c.green} />
              <Text style={s.livePill}>
                Auto sync 30s{lastAutoSyncAt ? ` · ${lastAutoSyncAt.toLocaleTimeString()}` : ''}
              </Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <NotificationBell compact />
            <Pressable
              onPress={() => syncLiveProducts(false)}
              disabled={syncing}
              style={[
                glassSurface(c, theme),
                {
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  opacity: syncing ? 0.55 : 1,
                },
              ]}
            >
              <IconRefresh size={18} color={c.cyan} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Health water score */}
      <View style={[s.panel, { alignItems: 'center', overflow: 'hidden', paddingVertical: 16, marginBottom: 14 }]}>
        <HealthScoreWave
          score={stats.healthScore}
          subtitle={`${stats.healthyCount}/${stats.liveCount || 0} live products healthy`}
        />
      </View>

      {/* Stats */}
      <View style={[s.grid2, { marginBottom: 6 }]}>
        <StatCard
          label="Products"
          value={displayProducts.length}
          hint={`${stats.liveCount} synced live`}
          icon={IconServer}
        />
        <StatCard
          label="Service uptime"
          value={`${stats.serviceUptime}%`}
          hint={`${stats.runningServices}/${stats.totalServices} running`}
          tone="green"
          icon={IconActivity}
        />
        <StatCard
          label="Open alerts"
          value={stats.openAlerts}
          hint={`${stats.criticalCount} critical · ${stats.unhealthyCount} down`}
          tone="amber"
          icon={IconAlert}
        />
        <StatCard
          label="Avg response"
          value={`${stats.avgResponse}ms`}
          hint="Across active services"
          tone="violet"
          icon={IconZap}
        />
      </View>

      <SectionHeader title="Health analytics" hint="Live distribution & resources" Icon={IconPie} c={c} s={s} />

      <DonutChart
        title="Product health"
        center={displayProducts.length}
        hint="catalogue"
        segments={[
          { label: 'Healthy', value: stats.healthyCount, color: '#43e28e' },
          { label: 'Critical', value: stats.criticalCount, color: '#ff7a45' },
          { label: 'Warning', value: stats.warningCount, color: '#ffc65a' },
          { label: 'Unhealthy', value: stats.unhealthyCount, color: '#ff5b77' },
          { label: 'Pending', value: displayProducts.length - stats.liveCount, color: '#6f8d98' },
        ]}
      />
      <DonutChart
        title="Service health"
        center={stats.totalServices}
        hint="live services"
        segments={[
          { label: 'Running', value: stats.runningServices, color: '#43e28e' },
          { label: 'Warning', value: stats.degradedServices, color: '#ffc65a' },
          { label: 'Down', value: stats.downServices, color: '#ff5b77' },
        ]}
      />
      <BarChart
        title="Live resource average"
        hint={`${stats.liveCount} synced`}
        rows={[
          { label: 'CPU', value: stats.avgLiveCpu, suffix: '%', color: '#38d5ff' },
          { label: 'RAM', value: stats.avgLiveRam, suffix: '%', color: '#a98bff' },
          { label: 'Disk', value: stats.avgLiveDisk, suffix: '%', color: stats.avgLiveDisk >= 85 ? '#ffc65a' : '#43e28e' },
          { label: 'Network', value: stats.avgLiveNetwork, suffix: '%', color: '#7de3a1' },
        ]}
      />

      {/* Legend */}
      <View style={[s.card, { overflow: 'hidden' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <IconInfo size={16} color={c.cyan} />
          <Text style={s.h3}>Status meaning</Text>
        </View>
        <View style={{ gap: 10 }}>
          {LEGEND.map(item => (
            <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${item.color}18`,
                  borderWidth: 1,
                  borderColor: `${item.color}40`,
                }}
              >
                <item.Icon size={14} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.h3, { fontSize: 13, color: item.color }]}>{item.title}</Text>
                <Text style={[s.body, { marginTop: 1 }]}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Product grid */}
      <View onLayout={event => { serversY.current = event.nativeEvent.layout.y; }}>
        <SectionHeader
          title="Product server grid"
          hint={`${filteredProducts.length} shown · ${displayProducts.length} total`}
          Icon={IconGrid}
          c={c}
          s={s}
        />
      </View>

      <View style={{ position: 'relative', marginBottom: 12 }}>
        <View style={{ position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 2 }}>
          <IconSearch size={16} color={c.muted} />
        </View>
        <TextInput
          style={[s.input, { marginTop: 0, paddingLeft: 42 }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search product or server"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {STATUS_OPTIONS.map(option => {
          const active = statusFilter === option.value;
          const tone = c[option.colorKey] || c.cyan;
          const Icon = option.Icon;
          return (
            <Pressable
              key={option.value}
              onPress={() => setStatusFilter(option.value)}
              style={[
                glassSurface(c, theme),
                {
                  marginRight: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  overflow: 'hidden',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  backgroundColor: active ? tone : undefined,
                  borderColor: active ? tone : c.glassBorder || c.line,
                },
              ]}
            >
              <Icon size={14} color={active ? '#041018' : tone} />
              <Text style={{ color: active ? '#041018' : c.text, fontWeight: '800', fontSize: 13 }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filteredProducts.length ? filteredProducts.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
        />
      )) : (
        <View style={[s.card, s.empty]}>
          <IconSearch size={28} color={c.muted} />
          <Text style={[s.emptyTitle, { marginTop: 10 }]}>No products match this filter</Text>
          <Text style={[s.body, { textAlign: 'center' }]}>Clear search or change status filter.</Text>
        </View>
      )}
    </ScrollView>
  );
}
