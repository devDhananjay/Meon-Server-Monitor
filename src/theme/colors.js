export const darkColors = {
  bg: '#050e12',
  bgAlt: '#0a151c',
  panel: 'rgba(12, 28, 36, 0.72)',
  panelStrong: 'rgba(10, 24, 32, 0.88)',
  line: 'rgba(154, 226, 255, 0.14)',
  text: '#edf8ff',
  muted: '#7e9aa5',
  cyan: '#38d5ff',
  green: '#43e28e',
  amber: '#ffc65a',
  critical: '#ff7a45',
  red: '#ff5b77',
  violet: '#a98bff',
  inputBg: 'rgba(255,255,255,0.07)',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.18)',
};

export const lightColors = {
  bg: '#eef7f9',
  bgAlt: '#e4f3ef',
  panel: 'rgba(255, 255, 255, 0.72)',
  panelStrong: 'rgba(255, 255, 255, 0.9)',
  line: 'rgba(18, 71, 88, 0.12)',
  text: '#0d2530',
  muted: '#607681',
  cyan: '#0891b2',
  green: '#16a34a',
  amber: '#d97706',
  critical: '#ea580c',
  red: '#e11d48',
  violet: '#7c3aed',
  inputBg: 'rgba(18, 71, 88, 0.06)',
  glass: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.85)',
};

export const statusColors = {
  pending: '#6f8d98',
  healthy: '#43e28e',
  warning: '#ffc65a',
  critical: '#ff7a45',
  unhealthy: '#ff5b77',
  up: '#43e28e',
  slow: '#ffc65a',
  down: '#ff5b77',
};

export function getColors(theme) {
  return theme === 'light' ? lightColors : darkColors;
}
