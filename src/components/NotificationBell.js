import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getColors, statusColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';
import { IconAlert, IconBell } from './Icons';

export default function NotificationBell({ compact = false }) {
  const navigation = useNavigation();
  const { theme, currentNotifications } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [open, setOpen] = useState(false);
  const count = currentNotifications.length;

  const openRoute = (route) => {
    setOpen(false);
    if (!route) return;
    if (route === '/mail-alerts') return navigation.navigate('MailAlerts');
    if (route === '/reverse-proxy-servers') return navigation.navigate('ReverseProxy');
    if (route.startsWith('/risk-management')) return navigation.navigate('Risk');
    const serverMatch = route.match(/^\/([^/]+)\/servers\/([^/]+)$/);
    if (serverMatch) {
      return navigation.navigate('ServerDetail', {
        productId: serverMatch[1],
        serverId: serverMatch[2],
      });
    }
    const serviceMatch = route.match(/^\/([^/]+)\/services\/([^/]+)$/);
    if (serviceMatch) {
      return navigation.navigate('ServiceDetail', {
        productId: serviceMatch[1],
        serviceName: serviceMatch[2],
      });
    }
    const productMatch = route.match(/^\/([^/]+)$/);
    if (productMatch && productMatch[1]) {
      return navigation.navigate('ProductDetail', { productId: productMatch[1] });
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          glassSurface(c, theme),
          compact
            ? {
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }
            : [s.ghostButton, { overflow: 'hidden', gap: 6 }],
        ]}
      >
        <IconBell size={compact ? 18 : 15} color={count ? c.amber : c.text} />
        {!compact ? (
          <Text style={s.ghostButtonText}>Alerts ({count})</Text>
        ) : count > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              paddingHorizontal: 3,
              backgroundColor: c.red,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
              {count > 9 ? '9+' : count}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <IconAlert size={18} color={c.amber} />
              <Text style={s.h2}>Open alerts</Text>
            </View>
            <ScrollView style={{ marginTop: 12, maxHeight: 420 }}>
              {count ? currentNotifications.map(item => (
                <Pressable
                  key={item.id}
                  style={[s.card, { borderLeftWidth: 3, borderLeftColor: statusColors[item.severity] || c.amber }]}
                  onPress={() => openRoute(item.route)}
                >
                  <Text style={s.label}>{item.type}</Text>
                  <Text style={s.h3}>{item.title}</Text>
                  <Text style={s.body}>{item.detail}</Text>
                </Pressable>
              )) : (
                <Text style={s.body}>No open notifications</Text>
              )}
            </ScrollView>
            <Pressable style={[s.ghostButton, { marginTop: 8, alignSelf: 'flex-end' }]} onPress={() => setOpen(false)}>
              <Text style={s.ghostButtonText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
