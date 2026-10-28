import React from 'react';
import Svg, { Circle, Path, Rect, Polyline, Line } from 'react-native-svg';

function Base({ size = 18, color = '#38d5ff', children, strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {typeof children === 'function' ? children({ color, strokeWidth }) : children}
    </Svg>
  );
}

export function IconServer({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Rect x="3" y="4" width="18" height="6" rx="1.5" stroke={c} strokeWidth={sw} />
          <Rect x="3" y="14" width="18" height="6" rx="1.5" stroke={c} strokeWidth={sw} />
          <Circle cx="7" cy="7" r="1" fill={c} />
          <Circle cx="7" cy="17" r="1" fill={c} />
        </>
      )}
    </Base>
  );
}

export function IconActivity({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <Polyline
          points="22 12 18 12 15 21 9 3 6 12 2 12"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Base>
  );
}

export function IconAlert({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path
            d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
            stroke={c}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Line x1="12" y1="9" x2="12" y2="13" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="12" cy="17" r="1" fill={c} />
        </>
      )}
    </Base>
  );
}

export function IconZap({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <Path
          d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
          stroke={c}
          strokeWidth={sw}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </Base>
  );
}

export function IconRefresh({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path d="M21 12a9 9 0 11-2.6-6.3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Polyline points="21 3 21 9 15 9" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Base>
  );
}

export function IconBell({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path
            d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke={c}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M13.7 21a2 2 0 01-3.4 0" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconSearch({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth={sw} />
          <Line x1="16.5" y1="16.5" x2="21" y2="21" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconGrid({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth={sw} />
          <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth={sw} />
          <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth={sw} />
          <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth={sw} />
        </>
      )}
    </Base>
  );
}

export function IconPie({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path d="M21.2 15a9 9 0 11-8.2-12v9h9z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M22 12A9 9 0 0013 3v9h9z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
        </>
      )}
    </Base>
  );
}

export function IconCpu({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Rect x="6" y="6" width="12" height="12" rx="2" stroke={c} strokeWidth={sw} />
          <Rect x="9" y="9" width="6" height="6" rx="1" stroke={c} strokeWidth={sw} />
          <Line x1="9" y1="2" x2="9" y2="6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="15" y1="2" x2="15" y2="6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="9" y1="18" x2="9" y2="22" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="15" y1="18" x2="15" y2="22" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="2" y1="9" x2="6" y2="9" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="2" y1="15" x2="6" y2="15" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="18" y1="9" x2="22" y2="9" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="18" y1="15" x2="22" y2="15" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconCheck({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={sw} />
          <Polyline points="8 12 11 15 16 9" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Base>
  );
}

export function IconWarning({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={sw} />
          <Line x1="12" y1="8" x2="12" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="12" cy="16" r="1" fill={c} />
        </>
      )}
    </Base>
  );
}

export function IconXCircle({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={sw} />
          <Line x1="9" y1="9" x2="15" y2="15" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="15" y1="9" x2="9" y2="15" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconClock({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={sw} />
          <Polyline points="12 7 12 12 15 14" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Base>
  );
}

export function IconChevronRight({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <Polyline points="9 6 15 12 9 18" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Base>
  );
}

export function IconInfo({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={sw} />
          <Line x1="12" y1="11" x2="12" y2="16" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="12" cy="8" r="1" fill={c} />
        </>
      )}
    </Base>
  );
}

export function IconBox({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
          <Polyline points="3.3 7.5 12 12.5 20.7 7.5" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
          <Line x1="12" y1="12.5" x2="12" y2="22" stroke={c} strokeWidth={sw} />
        </>
      )}
    </Base>
  );
}

export function IconPulse({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="12" r="3" fill={c} />
          <Circle cx="12" cy="12" r="7" stroke={c} strokeWidth={sw} opacity={0.55} />
          <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth={sw} opacity={0.25} />
        </>
      )}
    </Base>
  );
}

export function IconShield({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <Path
          d="M12 3l8 3v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6l8-3z"
          stroke={c}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      )}
    </Base>
  );
}

export function IconMail({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2" stroke={c} strokeWidth={sw} />
          <Polyline points="3 7 12 13 21 7" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
        </>
      )}
    </Base>
  );
}

export function IconLink({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path d="M10 13a5 5 0 007.1 0l2.1-2.1a5 5 0 00-7.1-7.1L10.5 5.4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M14 11a5 5 0 00-7.1 0L4.8 13.1a5 5 0 007.1 7.1l1.6-1.6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconLock({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Rect x="5" y="11" width="14" height="10" rx="2" stroke={c} strokeWidth={sw} />
          <Path d="M8 11V8a4 4 0 018 0v3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconUsers({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="9" cy="8" r="3" stroke={c} strokeWidth={sw} />
          <Path d="M2.5 19a6.5 6.5 0 0113 0" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="17" cy="9" r="2.5" stroke={c} strokeWidth={sw} />
          <Path d="M16 19a5 5 0 015.5-4.8" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconGauge({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path d="M5 19a9 9 0 1114 0" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M12 14l4-5" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="12" cy="14" r="1.5" fill={c} />
        </>
      )}
    </Base>
  );
}

export function IconSun({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="12" r="4" stroke={c} strokeWidth={sw} />
          <Line x1="12" y1="2" x2="12" y2="4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="12" y1="20" x2="12" y2="22" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="2" y1="12" x2="4" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="20" y1="12" x2="22" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="4.93" y1="19.07" x2="6.34" y2="17.66" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="17.66" y1="6.34" x2="19.07" y2="4.93" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconMoon({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <Path
          d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Base>
  );
}

export function IconLogout({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Polyline points="15 8 20 12 15 16" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="20" y1="12" x2="10" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}

export function IconUser({ size, color }) {
  return (
    <Base size={size} color={color}>
      {({ color: c, strokeWidth: sw }) => (
        <>
          <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth={sw} />
          <Path d="M4 20a8 8 0 0116 0" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Base>
  );
}
