import React from 'react';
import { Text, View } from 'react-native';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';

export default function NoticeBar() {
  const { theme, backendNotice } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  if (!backendNotice) return null;
  return (
    <View style={s.notice}>
      <Text style={s.noticeText}>{backendNotice}</Text>
    </View>
  );
}
