import React from 'react';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import GlassButton from './GlassButton';
import { IconMoon, IconSun } from './Icons';

export default function ThemeToggleButton({ size = 40, style }) {
  const { theme, setTheme } = useMonitor();
  const c = getColors(theme);
  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? IconSun : IconMoon;

  return (
    <GlassButton
      onPress={() => setTheme(next)}
      accessibilityLabel={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      size={size}
      rounded={14}
      style={style}
    >
      <Icon size={Math.round(size * 0.5)} color={c.text} />
    </GlassButton>
  );
}
