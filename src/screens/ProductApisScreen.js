import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NoticeBar from '../components/NoticeBar';
import ScreenHeader from '../components/ScreenHeader';
import { IconServer } from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors, statusColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';
import { statusMeta } from '../utils/monitor';

export default function ProductApisScreen() {
  const navigation = useNavigation();
  const {
    theme, canManageProducts, customProductEndpoints, customProductsLoading,
    loadCustomProductEndpoints, testCustomProductEndpoint, createCustomProductEndpoint,
    updateCustomProductEndpoint, deleteCustomProductEndpoint,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [form, setForm] = useState({ name: '', url: '' });
  const [testResult, setTestResult] = useState(null);
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    if (canManageProducts) loadCustomProductEndpoints();
  }, [canManageProducts, loadCustomProductEndpoints]);

  if (!canManageProducts) {
    return (
      <View style={[s.root, s.empty]}>
        <Text style={s.emptyTitle}>Product API management is not allowed for this account.</Text>
      </View>
    );
  }

  const activeCount = customProductEndpoints.filter(e => e.is_active).length;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <NoticeBar />
      <ScreenHeader
        eyebrow="PRODUCT APIS"
        title="Custom endpoints"
        subtitle="Register and test product health APIs before they appear in the live catalogue."
        icon={IconServer}
        refreshing={customProductsLoading}
        onRefresh={loadCustomProductEndpoints}
      />

      <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginBottom: 14 }]}>
        <View style={[glassSurface(c, theme), { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' }]}>
          <Text style={s.label}>Endpoints</Text>
          <Text style={[s.h3, { color: c.cyan }]}>{customProductEndpoints.length}</Text>
        </View>
        <View style={[glassSurface(c, theme), { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' }]}>
          <Text style={s.label}>Active</Text>
          <Text style={[s.h3, { color: c.green }]}>{activeCount}</Text>
        </View>
      </View>

      <View style={[s.panel, { marginBottom: 14 }]}>
        <Text style={s.h3}>Add product API</Text>
        <Text style={[s.label, { marginBottom: 10 }]}>Test the URL before saving to the catalogue</Text>
        <Text style={s.label}>Product name</Text>
        <TextInput
          style={s.input}
          value={form.name}
          onChangeText={v => setForm(cur => ({ ...cur, name: v }))}
          placeholderTextColor={c.muted}
          placeholder="Facefinder Background Change"
        />
        <Text style={[s.label, { marginTop: 10 }]}>Health API URL</Text>
        <TextInput
          style={s.input}
          value={form.url}
          onChangeText={v => setForm(cur => ({ ...cur, url: v }))}
          autoCapitalize="none"
          placeholderTextColor={c.muted}
          placeholder="https://example.meon.co.in/health"
        />
        <View style={[s.row, { marginTop: 12, gap: 8 }]}>
          <Pressable
            style={[s.ghostButton, { flex: 1, opacity: savingId ? 0.7 : 1 }]}
            disabled={savingId === 'test' || savingId === 'add'}
            onPress={async () => {
              setNotice('');
              setTestResult(null);
              if (!form.name.trim() || !form.url.trim()) return setNotice('Product name and API URL are required.');
              setSavingId('test');
              try {
                const result = await testCustomProductEndpoint(form);
                setTestResult(result);
                setNotice(`API test passed. Status: ${statusMeta[result.status]?.label || result.status}.`);
              } catch (error) {
                setNotice(error.message || 'API test failed.');
              } finally {
                setSavingId('');
              }
            }}
          >
            <Text style={s.ghostButtonText}>{savingId === 'test' ? 'Testing…' : 'Test API'}</Text>
          </Pressable>
          <Pressable
            style={[s.button, { flex: 1, opacity: savingId ? 0.7 : 1 }]}
            disabled={savingId === 'test' || savingId === 'add'}
            onPress={async () => {
              setNotice('');
              if (!form.name.trim() || !form.url.trim()) return setNotice('Product name and API URL are required.');
              setSavingId('add');
              try {
                const result = await createCustomProductEndpoint(form);
                setForm({ name: '', url: '' });
                setTestResult(result.test || null);
                setNotice('Product added after API test passed.');
              } catch (error) {
                setNotice(error.message || 'Product add failed.');
              } finally {
                setSavingId('');
              }
            }}
          >
            <Text style={s.buttonText}>{savingId === 'add' ? 'Adding…' : 'Add product'}</Text>
          </Pressable>
        </View>
      </View>

      {!!notice && (
        <Text style={[s.body, { marginBottom: 10, color: /fail|required/i.test(notice) ? c.red : c.green }]}>
          {notice}
        </Text>
      )}
      {testResult && (
        <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: statusColors[testResult.status] || c.cyan }]}>
          <Text style={s.scanline}>LAST TEST</Text>
          <Text style={[s.h3, { marginTop: 4 }]}>{statusMeta[testResult.status]?.label || testResult.status}</Text>
          <Text style={[s.body, { marginTop: 4 }]}>
            CPU {testResult.server?.cpu ?? 0}% · RAM {testResult.server?.ram ?? 0}% · Disk {testResult.server?.disk ?? 0}% · {testResult.server?.services ?? 0} services
          </Text>
        </View>
      )}

      {customProductEndpoints.map(endpoint => {
        const status = endpoint.product_status || endpoint.last_test_status || (endpoint.is_active ? 'healthy' : 'pending');
        const color = statusColors[endpoint.is_active ? status : 'pending'] || c.muted;
        return (
          <View
            key={endpoint.id || endpoint.slug}
            style={[s.card, { borderLeftWidth: 3, borderLeftColor: color, overflow: 'hidden' }]}
          >
            <View style={[s.spaceBetween, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.h3}>{endpoint.name}</Text>
                <Text style={[s.body, { marginTop: 4 }]} numberOfLines={2}>
                  {endpoint.url || 'No managed API URL'}
                </Text>
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
                  {endpoint.is_active ? (statusMeta[status]?.label || 'Active') : 'Paused'}
                </Text>
              </View>
            </View>
            <Text style={[s.label, { marginTop: 8 }]}>
              {endpoint.slug} · {endpoint.source || 'custom'}
            </Text>
            <View style={[s.row, { marginTop: 12, gap: 8, flexWrap: 'wrap' }]}>
              {endpoint.product && (
                <Pressable
                  style={s.ghostButton}
                  onPress={() => navigation.navigate('ProductDetail', { productId: endpoint.slug })}
                >
                  <Text style={s.ghostButtonText}>Open</Text>
                </Pressable>
              )}
              {endpoint.source === 'custom' && (
                <Pressable
                  style={s.ghostButton}
                  onPress={async () => {
                    try {
                      await updateCustomProductEndpoint(endpoint.id, { is_active: !endpoint.is_active });
                      setNotice(endpoint.is_active ? 'Product API paused.' : 'Product API enabled.');
                    } catch (error) {
                      setNotice(error.message || 'Update failed.');
                    }
                  }}
                >
                  <Text style={s.ghostButtonText}>{endpoint.is_active ? 'Pause' : 'Enable'}</Text>
                </Pressable>
              )}
              <Pressable
                style={s.dangerButton}
                onPress={() => {
                  Alert.alert('Delete product API', `Delete ${endpoint.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteCustomProductEndpoint(endpoint);
                          setNotice('Product API removed.');
                        } catch (error) {
                          setNotice(error.message || 'Delete failed.');
                        }
                      },
                    },
                  ]);
                }}
              >
                <Text style={s.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      {!customProductEndpoints.length && (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>
            {customProductsLoading ? 'Loading product APIs…' : 'No product APIs found'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
