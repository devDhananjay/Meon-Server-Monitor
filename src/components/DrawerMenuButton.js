import React from 'react';
import { View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import GlassButton from './GlassButton';

function MenuLines({ color }) {
  return (
    <View style={{ width: 18, height: 14, justifyContent: 'space-between' }}>
      <View style={{ height: 2, borderRadius: 2, backgroundColor: color, width: '100%' }} />
      <View style={{ height: 2, borderRadius: 2, backgroundColor: color, width: '72%' }} />
      <View style={{ height: 2, borderRadius: 2, backgroundColor: color, width: '88%' }} />
    </View>
  );
}

export default function DrawerMenuButton() {
  const navigation = useNavigation();
  const { theme } = useMonitor();
  const c = getColors(theme);

  const openDrawer = () => {
    let current = navigation;
    while (current) {
      const state = current.getState?.();
      if (state?.type === 'drawer') {
        current.dispatch(DrawerActions.openDrawer());
        return;
      }
      current = current.getParent?.();
    }
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <GlassButton
      onPress={openDrawer}
      accessibilityLabel="Open menu"
      size={40}
      rounded={14}
      style={{ marginLeft: 8 }}
    >
      <MenuLines color={c.text} />
    </GlassButton>
  );
}
