/** Shared liquid-glass styles for a polished mobile feel. */

export function glassSurface(c, theme = 'dark') {
  const isLight = theme === 'light';
  return {
    backgroundColor: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)',
    borderTopColor: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.28)',
    borderLeftColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.22)',
    shadowColor: isLight ? '#0d2530' : '#38d5ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isLight ? 0.08 : 0.18,
    shadowRadius: 16,
    elevation: 4,
  };
}

export function glassCard(c, theme = 'dark') {
  const isLight = theme === 'light';
  return {
    backgroundColor: isLight ? 'rgba(255,255,255,0.78)' : 'rgba(13, 32, 40, 0.72)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(18, 71, 88, 0.1)' : 'rgba(154, 226, 255, 0.14)',
    borderTopColor: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isLight ? 0.06 : 0.28,
    shadowRadius: 14,
    elevation: 3,
  };
}

export function glassChip(active, c, theme = 'dark') {
  const isLight = theme === 'light';
  if (active) {
    return {
      backgroundColor: isLight ? 'rgba(8,145,178,0.18)' : 'rgba(56,213,255,0.22)',
      borderColor: isLight ? 'rgba(8,145,178,0.45)' : 'rgba(56,213,255,0.55)',
      borderTopColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(180,240,255,0.55)',
    };
  }
  return glassSurface(c, theme);
}
