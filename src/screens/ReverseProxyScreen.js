import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import NoticeBar from '../components/NoticeBar';
import ScreenHeader from '../components/ScreenHeader';
import { IconLink, IconMail, IconServer } from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors, statusColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';
import { statusMeta } from '../utils/monitor';

function MetricPill({ label, value, c, theme }) {
  return (
    <View
      style={[
        glassSurface(c, theme),
        {
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 12,
          overflow: 'hidden',
          minWidth: 72,
        },
      ]}
    >
      <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 15, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export default function ReverseProxyScreen() {
  const {
    theme, reverseProxyEndpoints, reverseProxyLoading, canManageProducts,
    loadReverseProxyServers, syncReverseProxyServers, createReverseProxyServer,
    updateReverseProxyServer, deleteReverseProxyServer,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [form, setForm] = useState({ name: '', health_api_url: '' });
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    loadReverseProxyServers();
  }, [loadReverseProxyServers]);

  const activeCount = reverseProxyEndpoints.filter(e => e.is_active).length;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <NoticeBar />
      <ScreenHeader
        eyebrow="REVERSE PROXY"
        title="Proxy servers"
        subtitle="Monitor gateway health endpoints and mute or pause mail alerts per proxy."
        icon={IconLink}
        refreshing={reverseProxyLoading}
        onRefresh={() => syncReverseProxyServers(false)}
      />

      <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginBottom: 14 }]}>
        <MetricPill label="Proxies" value={reverseProxyEndpoints.length} c={c} theme={theme} />
        <MetricPill label="Active" value={activeCount} c={c} theme={theme} />
        <MetricPill label="Paused" value={reverseProxyEndpoints.length - activeCount} c={c} theme={theme} />
      </View>

      {canManageProducts && (
        <View style={[s.panel, { marginBottom: 14 }]}>
          <View style={[s.row, { alignItems: 'center', gap: 10, marginBottom: 12 }]}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${c.cyan}18`,
                borderWidth: 1,
                borderColor: `${c.cyan}40`,
              }}
            >
              <IconServer size={16} color={c.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.h3}>Add proxy server</Text>
              <Text style={s.label}>Name + health API URL</Text>
            </View>
          </View>
          <Text style={s.label}>Server name</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={v => setForm(cur => ({ ...cur, name: v }))}
            placeholderTextColor={c.muted}
            placeholder="Nginx Gateway 01"
          />
          <Text style={[s.label, { marginTop: 10 }]}>Health API URL</Text>
          <TextInput
            style={s.input}
            value={form.health_api_url}
            onChangeText={v => setForm(cur => ({ ...cur, health_api_url: v }))}
            autoCapitalize="none"
            placeholderTextColor={c.muted}
            placeholder="https://proxy.example.com/health"
          />
          <Pressable
            style={[s.button, { marginTop: 12, opacity: savingId === 'add' ? 0.7 : 1 }]}
            disabled={savingId === 'add'}
            onPress={async () => {
              setNotice('');
              if (!form.name.trim() || !form.health_api_url.trim()) {
                return setNotice('Server name and health API URL are required.');
              }
              setSavingId('add');
              try {
                const result = await createReverseProxyServer(form);
                setForm({ name: '', health_api_url: '' });
                const syncError = result.sync_error ? ` Initial check failed: ${result.sync_error}` : '';
                setNotice(`Reverse proxy server added.${syncError}`);
              } catch (error) {
                setNotice(error.message || 'Add failed.');
              } finally {
                setSavingId('');
              }
            }}
          >
            <Text style={s.buttonText}>{savingId === 'add' ? 'Adding…' : 'Add server'}</Text>
          </Pressable>
        </View>
      )}

      {!!notice && (
        <Text style={[s.body, { marginBottom: 12, color: /fail|required/i.test(notice) ? c.red : c.green }]}>
          {notice}
        </Text>
      )}

      {reverseProxyEndpoints.length ? reverseProxyEndpoints.map(endpoint => {
        const product = endpoint.product;
        const server = product?.servers?.[0];
        const status = endpoint.is_active ? (server?.status || endpoint.last_sync_status || 'pending') : 'pending';
        const color = statusColors[status] || statusColors.pending;
        const mailEnabled = server?.mailAlertEnabled !== false;
        return (
          <View
            key={endpoint.id}
            style={[
              s.card,
              {
                borderLeftWidth: 3,
                borderLeftColor: color,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: `${color}12`,
              }}
            />
            <View style={[s.spaceBetween, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.h2}>{endpoint.name}</Text>
                <Text style={[s.body, { marginTop: 4 }]} numberOfLines={2}>{endpoint.health_api_url}</Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: `${color}18`,
                  borderWidth: 1,
                  borderColor: `${color}44`,
                }}
              >
                <Text style={{ color, fontWeight: '800', fontSize: 11 }}>
                  {endpoint.is_active ? (statusMeta[status]?.label || status) : 'Paused'}
                </Text>
              </View>
            </View>

            <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginTop: 12 }]}>
              <MetricPill label="CPU" value={server ? `${server.cpu}%` : '--'} c={c} theme={theme} />
              <MetricPill label="RAM" value={server ? `${server.ram}%` : '--'} c={c} theme={theme} />
              <MetricPill label="Disk" value={server ? `${server.disk}%` : '--'} c={c} theme={theme} />
            </View>

            <Text style={[s.label, { marginTop: 10 }]}>
              Host {endpoint.host || '-'} · Last {endpoint.last_synced_at ? new Date(endpoint.last_synced_at).toLocaleString() : 'Waiting'}
            </Text>
            {!!endpoint.last_sync_message && status === 'unhealthy' && (
              <Text style={[s.body, { color: c.red, marginTop: 6 }]}>{endpoint.last_sync_message}</Text>
            )}
            <View style={[s.row, { alignItems: 'center', gap: 6, marginTop: 8 }]}>
              <IconMail size={14} color={mailEnabled ? c.green : c.muted} />
              <Text style={[s.label, { color: mailEnabled ? c.green : c.muted, marginTop: 0 }]}>
                {mailEnabled ? 'Mail alerts on' : 'Mail muted'}
              </Text>
            </View>

            {canManageProducts && (
              <View style={[s.row, { marginTop: 12, gap: 8, flexWrap: 'wrap' }]}>
                <Pressable
                  style={s.ghostButton}
                  disabled={!server}
                  onPress={async () => {
                    try {
                      await updateReverseProxyServer(endpoint.id, { mail_alert_enabled: !mailEnabled });
                      setNotice(`Mail alerts ${!mailEnabled ? 'enabled' : 'muted'} for ${endpoint.name}.`);
                    } catch (error) {
                      setNotice(error.message);
                    }
                  }}
                >
                  <Text style={s.ghostButtonText}>{mailEnabled ? 'Mute mail' : 'Enable mail'}</Text>
                </Pressable>
                <Pressable
                  style={s.ghostButton}
                  onPress={async () => {
                    try {
                      await updateReverseProxyServer(endpoint.id, { is_active: !endpoint.is_active });
                      setNotice(`${endpoint.name} monitoring ${!endpoint.is_active ? 'resumed' : 'paused'}.`);
                    } catch (error) {
                      setNotice(error.message);
                    }
                  }}
                >
                  <Text style={s.ghostButtonText}>{endpoint.is_active ? 'Pause' : 'Resume'}</Text>
                </Pressable>
                <Pressable
                  style={s.dangerButton}
                  onPress={() => {
                    Alert.alert('Delete', `Delete ${endpoint.name}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteReverseProxyServer(endpoint);
                            setNotice('Reverse proxy server removed.');
                          } catch (error) {
                            setNotice(error.message);
                          }
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={s.dangerButtonText}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      }) : (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>
            {reverseProxyLoading ? 'Checking reverse proxy servers…' : 'No reverse proxy servers added'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
