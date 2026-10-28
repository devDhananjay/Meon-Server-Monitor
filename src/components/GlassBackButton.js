import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';

const ROUTE_LABELS = {
  MainDrawer: 'Overview',
  Overview: 'Overview',
  ReverseProxy: 'Reverse proxy',
  MailAlerts: 'Mail ack',
  UserAccess: 'User access',
  ProductApis: 'Product APIs',
  UsageApis: 'Usage APIs',
  Risk: 'Risk',
  Security: 'Security',
  ProductDetail: 'Product',
  ServerDetail: 'Server',
  ServiceDetail: 'Service',
  RiskDetail: 'Risk',
};

function BackChevron({ color }) {
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderLeftWidth: 1.8,
        borderBottomWidth: 1.8,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginLeft: 1,
        opacity: 0.85,
      }}
    />
  );
}

function labelForRoute(route) {
  if (!route) return 'Overview';

  // Always resolve drawer → active tab (never show "Home")
  if (route.name === 'MainDrawer') {
    const nested = route.state?.routes?.[route.state.index ?? 0];
    if (nested?.name && ROUTE_LABELS[nested.name]) return ROUTE_LABELS[nested.name];
    return 'Overview';
  }

  return ROUTE_LABELS[route.name] || route.name || 'Overview';
}

export default function GlassBackButton() {
  const navigation = useNavigation();
  const { theme } = useMonitor();
  const c = getColors(theme);
  const glass = glassSurface(c, theme);

  const previousLabel = useNavigationState(state => {
    if (!state?.routes?.length) return 'Overview';
    const index = state.index ?? 0;
    if (index <= 0) return 'Overview';
    return labelForRoute(state.routes[index - 1]);
  });

  const title = useMemo(() => previousLabel || 'Overview', [previousLabel]);

  return (
    <Pressable
      onPress={() => {
        if (navigation.canGoBack()) navigation.goBack();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Go back to ${title}`}
      style={({ pressed }) => [
        glass,
        {
          marginLeft: 8,
          minHeight: 36,
          maxWidth: 170,
          paddingHorizontal: 11,
          paddingVertical: 7,
          borderRadius: 12,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
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
          height: '42%',
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
      <BackChevron color={c.muted} />
      <Text
        numberOfLines={1}
        style={{
          color: c.muted,
          fontWeight: '500',
          fontSize: 14,
          letterSpacing: 0.1,
          flexShrink: 1,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
