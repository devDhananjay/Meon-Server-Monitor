import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoticeBar from '../components/NoticeBar';
import ScreenHeader from '../components/ScreenHeader';
import UsageApiConfigPanel from '../components/UsageApiConfigPanel';
import UsageBarChart from '../components/UsageBarChart';
import { IconGauge } from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';

export default function UsageApisScreen() {
  const {
    theme, canManageUsage, displayProducts, loadProductDetail, loadProducts,
    savingUsageTargetId, saveServerUsageConfig, syncServerUsage, clearServerUsageLogs,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [loadingKey, setLoadingKey] = useState('');
  const [pageLoading, setPageLoading] = useState(false);

  const allServerRows = useMemo(
    () =>
      displayProducts
        .filter(product => product.monitorType !== 'reverse_proxy')
        .flatMap(product => (product.servers || []).map(server => ({
          product,
          server,
          key: `${product.id}:${server.id}`,
        }))),
    [displayProducts],
  );

  const serverRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allServerRows;
    return allServerRows.filter(row =>
      `${row.product.name} ${row.server.name}`.toLowerCase().includes(query),
    );
  }, [allServerRows, search]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setPageLoading(true);
        try {
          await loadProducts?.();
        } catch {
          // keep existing catalogue
        } finally {
          if (active) setPageLoading(false);
        }
      })();
      return () => { active = false; };
    }, [loadProducts]),
  );

  useEffect(() => {
    if (!serverRows.length) {
      setSelectedKey('');
      return;
    }
    if (!serverRows.some(row => row.key === selectedKey)) {
      setSelectedKey(serverRows[0].key);
    }
  }, [serverRows, selectedKey]);

  const selectedRow = serverRows.find(row => row.key === selectedKey) || null;
  const configuredCount = allServerRows.filter(
    row => row.server.usageConfig || row.server.usageApiConfigured,
  ).length;

  const selectServer = async row => {
    setSelectedKey(row.key);
    setLoadingKey(row.key);
    try {
      await loadProductDetail(row.product.id);
    } finally {
      setLoadingKey('');
    }
  };

  // Prefer refreshed row data after loadProductDetail
  const liveSelected = useMemo(() => {
    if (!selectedKey) return null;
    return allServerRows.find(row => row.key === selectedKey) || selectedRow;
  }, [allServerRows, selectedKey, selectedRow]);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <NoticeBar />

      <ScreenHeader
        eyebrow="USAGE API MANAGEMENT"
        title="Usage APIs"
        subtitle="Select a product server to configure its hourly usage API, alerts, and stored logs."
        icon={IconGauge}
        refreshing={pageLoading}
        onRefresh={() => loadProducts?.()}
      />

      <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginBottom: 14 }]}>
        <View
          style={[
            glassSurface(c, theme),
            { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' },
          ]}
        >
          <Text style={s.label}>Servers</Text>
          <Text style={[s.h3, { color: c.cyan, marginTop: 2 }]}>{allServerRows.length}</Text>
        </View>
        <View
          style={[
            glassSurface(c, theme),
            { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' },
          ]}
        >
          <Text style={s.label}>Configured</Text>
          <Text style={[s.h3, { color: c.green, marginTop: 2 }]}>{configuredCount}</Text>
        </View>
        {!canManageUsage ? (
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: `${c.amber}18`,
              borderWidth: 1,
              borderColor: `${c.amber}44`,
            }}
          >
            <Text style={[s.label, { color: c.amber }]}>View only</Text>
          </View>
        ) : null}
      </View>

      <View style={[s.card, { overflow: 'hidden' }]}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 42,
            backgroundColor: 'rgba(56,213,255,0.07)',
          }}
        />
        <Text style={s.h3}>Products</Text>
        <Text style={[s.body, { marginTop: 2, marginBottom: 10 }]}>
          Choose a server to manage its usage API.
        </Text>

        <TextInput
          style={s.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search product or server"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {pageLoading && !allServerRows.length ? (
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <ActivityIndicator color={c.cyan} />
            <Text style={[s.body, { marginTop: 10 }]}>Loading servers…</Text>
          </View>
        ) : null}

        {!pageLoading && !serverRows.length ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={s.emptyTitle}>
              {allServerRows.length ? 'No matching servers' : 'No product servers found'}
            </Text>
            <Text style={[s.body, { marginTop: 6, textAlign: 'center' }]}>
              {allServerRows.length
                ? 'Try a different search.'
                : 'Sync products from Overview, then open this page again.'}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 12, gap: 8 }}>
          {serverRows.map(row => {
            const selected = row.key === selectedKey;
            const configured = Boolean(row.server.usageConfig || row.server.usageApiConfigured);
            const loading = loadingKey === row.key;
            return (
              <Pressable
                key={row.key}
                onPress={() => selectServer(row)}
                style={({ pressed }) => [
                  {
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    overflow: 'hidden',
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                    backgroundColor: selected ? `${c.cyan}16` : c.inputBg,
                    borderColor: selected ? `${c.cyan}66` : c.line,
                    borderTopColor: selected ? 'rgba(180,240,255,0.45)' : 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                {selected ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '48%',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                    }}
                  />
                ) : null}
                <View style={s.spaceBetween}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[s.h3, { color: selected ? c.cyan : c.text }]} numberOfLines={1}>
                      {row.product.name}
                    </Text>
                    <Text style={[s.body, { marginTop: 3 }]} numberOfLines={1}>
                      {row.server.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.chip,
                      {
                        backgroundColor: configured ? `${c.green}18` : c.panelStrong,
                        borderWidth: 1,
                        borderColor: configured ? `${c.green}44` : c.line,
                      },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color={c.cyan} size="small" />
                    ) : (
                      <Text style={[s.chipText, { color: configured ? c.green : c.muted }]}>
                        {configured ? 'Configured' : 'Not set'}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {liveSelected ? (
        <>
          <View style={[s.card, { marginTop: 4, overflow: 'hidden' }]}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 48,
                backgroundColor: 'rgba(169,139,255,0.08)',
              }}
            />
            <Text style={s.scanline}>SELECTED SERVER</Text>
            <View style={[s.spaceBetween, { marginTop: 2 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.h2}>{liveSelected.product.name}</Text>
                <Text style={[s.body, { marginTop: 2 }]}>{liveSelected.server.name}</Text>
              </View>
              {liveSelected.server.usageConfig?.last_status ? (
                <View
                  style={[
                    s.chip,
                    {
                      backgroundColor:
                        liveSelected.server.usageConfig.last_status === 'ok'
                          ? `${c.green}22`
                          : `${c.red}22`,
                      borderWidth: 1,
                      borderColor:
                        liveSelected.server.usageConfig.last_status === 'ok'
                          ? `${c.green}55`
                          : `${c.red}55`,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor:
                        liveSelected.server.usageConfig.last_status === 'ok' ? c.green : c.red,
                    }}
                  />
                  <Text
                    style={[
                      s.chipText,
                      {
                        color:
                          liveSelected.server.usageConfig.last_status === 'ok' ? c.green : c.red,
                      },
                    ]}
                  >
                    {liveSelected.server.usageConfig.last_status === 'ok' ? 'API working' : 'API error'}
                  </Text>
                </View>
              ) : null}
            </View>
            {loadingKey === liveSelected.key ? (
              <View style={[s.row, { marginTop: 12, gap: 8 }]}>
                <ActivityIndicator color={c.cyan} size="small" />
                <Text style={s.label}>Loading server usage details…</Text>
              </View>
            ) : null}
          </View>

          <UsageApiConfigPanel
            config={liveSelected.server.usageConfig}
            canManageUsage={canManageUsage}
            saving={
              savingUsageTargetId ===
              `usage-${liveSelected.product.id}-${liveSelected.server.id}`
            }
            onSave={payload =>
              saveServerUsageConfig(liveSelected.product, liveSelected.server, payload)
            }
            onSync={() => syncServerUsage(liveSelected.product, liveSelected.server)}
            onClearLogs={(dateFrom, dateTo) =>
              clearServerUsageLogs(liveSelected.product, liveSelected.server, dateFrom, dateTo)
            }
          />

          {liveSelected.server.usageConfig ? (
            <UsageBarChart
              logs={liveSelected.server.usageLogs || []}
              config={liveSelected.server.usageConfig}
            />
          ) : null}

          {!canManageUsage ? (
            <View style={[s.notice, { marginTop: 4 }]}>
              <Text style={s.noticeText}>
                This account can view usage configuration and history, but cannot edit settings.
              </Text>
            </View>
          ) : null}
        </>
      ) : !pageLoading && allServerRows.length === 0 ? null : (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
          <Text style={s.emptyTitle}>Select a product server</Text>
          <Text style={[s.body, { marginTop: 6, textAlign: 'center' }]}>
            Choose a server from the list above to configure its usage API.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
