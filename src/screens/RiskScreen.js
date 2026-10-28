import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import NoticeBar from '../components/NoticeBar';
import ScreenHeader from '../components/ScreenHeader';
import { IconShield } from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';

function RiskBar({ riskPercent, safePercent, c }) {
  const riskW = Math.max(0, Math.min(100, riskPercent));
  const safeW = Math.max(0, Math.min(100 - riskW, safePercent));
  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: c.inputBg,
        overflow: 'hidden',
        flexDirection: 'row',
        marginTop: 10,
      }}
    >
      <View style={{ width: `${riskW}%`, backgroundColor: c.red }} />
      <View style={{ width: `${safeW}%`, backgroundColor: c.green }} />
    </View>
  );
}

function MetricChip({ label, value, color, c, theme }) {
  return (
    <View
      style={[
        glassSurface(c, theme),
        { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, overflow: 'hidden', minWidth: 70 },
      ]}
    >
      <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: color || c.text, fontWeight: '800', fontSize: 15, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export default function RiskScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const productSlug = route.params?.productSlug || '';
  const {
    theme, riskItems, riskLoading, riskPagination, loadRiskManagement, loadRiskProductDetail,
    setRiskPagination, savingRiskItemId, updateRiskChecklistItem,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [localQuery, setLocalQuery] = useState(riskPagination.query || '');

  useEffect(() => {
    if (productSlug) loadRiskProductDetail(productSlug);
    else loadRiskManagement();
  }, [productSlug, loadRiskManagement, loadRiskProductDetail]);

  const detail = productSlug ? riskItems.find(item => item.slug === productSlug) : null;

  const toggleItem = async (category, item, isSafe) => {
    try {
      await updateRiskChecklistItem(productSlug, category, item, isSafe, undefined, detail?.name || '');
    } catch (error) {
      // notice set in context
    }
  };

  if (productSlug && detail) {
    const categories = detail.categories || detail.checklist || [];
    const safeCount = Number(detail.safe_count ?? detail.safeCount ?? 0);
    const totalCount = Number(detail.total_count ?? detail.totalCount ?? 0) || Math.max(safeCount, 1);
    const riskCount = Math.max(0, totalCount - safeCount);
    const riskPercent = Math.round((riskCount / totalCount) * 100);
    const safePercent = Math.round((safeCount / totalCount) * 100);

    return (
      <ScrollView style={s.root} contentContainerStyle={s.scroll}>
        <NoticeBar />
        <ScreenHeader
          eyebrow="RISK DETAIL"
          title={detail.name || productSlug}
          subtitle={detail.summary || 'Checklist and graph nodes for this product.'}
          icon={IconShield}
        />

        <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginBottom: 6 }]}>
          <MetricChip label="Risk" value={`${riskPercent}%`} color={c.red} c={c} theme={theme} />
          <MetricChip label="Safe" value={`${safePercent}%`} color={c.green} c={c} theme={theme} />
          <MetricChip label="Checks" value={totalCount} c={c} theme={theme} />
        </View>
        <RiskBar riskPercent={riskPercent} safePercent={safePercent} c={c} />
        <View style={{ height: 14 }} />

        {(Array.isArray(categories) ? categories : Object.entries(categories).map(([name, items]) => ({ name, items }))).map((category, index) => {
          const name = category.name || category.category || `Category ${index + 1}`;
          const items = category.items || category.checks || [];
          return (
            <View key={name} style={[s.card, { overflow: 'hidden' }]}>
              <Text style={s.h3}>{name}</Text>
              <Text style={[s.label, { marginBottom: 4 }]}>{(items || []).length} checks</Text>
              {(items || []).map(item => {
                const label = typeof item === 'string' ? item : item.item || item.name;
                const isSafe = typeof item === 'object' ? Boolean(item.is_safe ?? item.isSafe) : false;
                const comment = typeof item === 'object' ? (item.comment || item.notes || '') : '';
                const busy = savingRiskItemId === `${productSlug}-${name}-${label}`;
                return (
                  <Pressable
                    key={label}
                    style={[
                      glassSurface(c, theme),
                      {
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        overflow: 'hidden',
                        opacity: busy ? 0.6 : 1,
                        borderLeftWidth: 3,
                        borderLeftColor: isSafe ? c.green : c.amber,
                      },
                    ]}
                    disabled={busy}
                    onPress={() => toggleItem(name, label, !isSafe)}
                  >
                    <View style={s.spaceBetween}>
                      <Text style={[s.body, { flex: 1, paddingRight: 8 }]}>{label}</Text>
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 999,
                          backgroundColor: isSafe ? `${c.green}18` : `${c.amber}18`,
                          borderWidth: 1,
                          borderColor: isSafe ? `${c.green}44` : `${c.amber}44`,
                        }}
                      >
                        <Text style={{ color: isSafe ? c.green : c.amber, fontWeight: '800', fontSize: 11 }}>
                          {isSafe ? 'Safe' : 'Risk'}
                        </Text>
                      </View>
                    </View>
                    {!!comment && <Text style={[s.label, { marginTop: 6 }]}>Comment: {comment}</Text>}
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {(detail.graph?.nodes || detail.nodes || []).length ? (
          <View style={s.card}>
            <Text style={s.h3}>Risk network nodes</Text>
            {(detail.graph?.nodes || detail.nodes).map(node => (
              <View
                key={node.id || node.label}
                style={[
                  glassSurface(c, theme),
                  { marginTop: 10, padding: 12, borderRadius: 14, overflow: 'hidden' },
                ]}
              >
                <Text style={s.h3}>{node.label || node.name || node.id}</Text>
                <Text style={[s.body, { marginTop: 4 }]}>{node.status || node.type || 'node'}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <NoticeBar />
      <ScreenHeader
        eyebrow="RISK MANAGEMENT"
        title="Product risk checklist"
        subtitle="Open a product to review and toggle checklist items across risk categories."
        icon={IconShield}
        refreshing={riskLoading}
        onRefresh={() => loadRiskManagement({ refresh: true })}
      />

      <TextInput
        style={[s.input, { marginBottom: 14 }]}
        value={localQuery}
        onChangeText={setLocalQuery}
        placeholder="Search products"
        placeholderTextColor={c.muted}
        onSubmitEditing={() => {
          setRiskPagination(current => ({ ...current, query: localQuery, page: 1 }));
          loadRiskManagement({ query: localQuery, page: 1 });
        }}
      />

      {riskItems.length ? riskItems.map(item => {
        const safeCount = Number(item.safe_count ?? item.safeCount ?? 0);
        const totalCount = Number(item.total_count ?? item.totalCount ?? 0) || Math.max(safeCount, 1);
        const riskCount = Math.max(0, totalCount - safeCount);
        const riskPercent = Math.round((riskCount / totalCount) * 100);
        const safePercent = Math.round((safeCount / totalCount) * 100);
        return (
          <Pressable
            key={item.slug || item.id}
            style={[s.card, { overflow: 'hidden' }]}
            onPress={() => navigation.navigate('RiskDetail', { productSlug: item.slug })}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -16,
                right: -12,
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: riskPercent > 40 ? `${c.red}12` : `${c.green}10`,
              }}
            />
            <View style={s.spaceBetween}>
              <Text style={[s.h2, { flex: 1, paddingRight: 8 }]}>{item.name || item.slug}</Text>
              <Text style={{ color: c.cyan, fontWeight: '700', fontSize: 12 }}>Open →</Text>
            </View>
            <Text style={[s.body, { marginTop: 4 }]}>
              {item.summary || `${safeCount} safe / ${totalCount} checks`}
            </Text>
            <View style={[s.row, { marginTop: 12, flexWrap: 'wrap', gap: 8 }]}>
              <MetricChip label="Risk" value={`${riskPercent}%`} color={c.red} c={c} theme={theme} />
              <MetricChip label="Safe" value={`${safePercent}%`} color={c.green} c={c} theme={theme} />
              <MetricChip label="Checks" value={totalCount} c={c} theme={theme} />
              <MetricChip label="Servers" value={item.server_count ?? item.servers?.length ?? '-'} c={c} theme={theme} />
            </View>
            <RiskBar riskPercent={riskPercent} safePercent={safePercent} c={c} />
          </Pressable>
        );
      }) : (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>{riskLoading ? 'Loading risk data…' : 'No risk products found'}</Text>
        </View>
      )}

      {riskPagination.totalPages > 1 && (
        <View style={[s.row, { justifyContent: 'center', gap: 12, marginTop: 8 }]}>
          <Pressable
            style={s.ghostButton}
            disabled={riskPagination.page <= 1}
            onPress={() => loadRiskManagement({ page: riskPagination.page - 1 })}
          >
            <Text style={s.ghostButtonText}>Prev</Text>
          </Pressable>
          <Text style={s.body}>{riskPagination.page} / {riskPagination.totalPages}</Text>
          <Pressable
            style={s.ghostButton}
            disabled={riskPagination.page >= riskPagination.totalPages}
            onPress={() => loadRiskManagement({ page: riskPagination.page + 1 })}
          >
            <Text style={s.ghostButtonText}>Next</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
