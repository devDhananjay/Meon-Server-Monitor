import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import ChartTooltip from './ChartTooltip';

const dayLabel = date =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export default function RamUsageLineChart({ logs = [], currentRam = 0 }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);

  const points = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const mapped = (logs || [])
      .map(log => ({
        value: Math.max(0, Math.min(100, Number(log.usage_percent ?? log.ram ?? 0))),
        date: new Date(log.recorded_at || log.created_at || Date.now()),
      }))
      .filter(point => !Number.isNaN(point.date.getTime()) && point.date.getTime() >= thirtyDaysAgo)
      .sort((a, b) => a.date - b.date);
    return mapped.length ? mapped : [{ value: Number(currentRam) || 0, date: new Date() }];
  }, [logs, currentRam]);

  const height = 200;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;
  const maxPoints = 180;
  const chartPoints =
    points.length <= maxPoints
      ? points
      : points.filter((_, index) => index % Math.ceil(points.length / maxPoints) === 0 || index === points.length - 1);

  const plotted = chartPoints.map((point, index) => {
    const x = padding.left + (index / Math.max(1, chartPoints.length - 1)) * plotWidth;
    const y = padding.top + (1 - point.value / 100) * plotHeight;
    return { ...point, x, y, index };
  });

  const path = plotted
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const areaPath = plotted.length
    ? `${path} L ${(padding.left + plotWidth).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} L ${padding.left.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`
    : '';

  const values = points.map(point => point.value);
  const latest = values.at(-1) || 0;
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const hasRealLogs = (logs || []).length > 0;
  const active = activeIndex != null ? plotted[activeIndex] : null;

  const selectAtX = locationX => {
    if (!plotted.length) return;
    let best = 0;
    let bestDist = Infinity;
    plotted.forEach((point, index) => {
      const dist = Math.abs(point.x - locationX);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    setActiveIndex(best);
  };

  return (
    <View style={s.card}>
      <View style={s.spaceBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.h3}>RAM utilization</Text>
          <Text style={s.label}>Last 30 days stored samples · tap/drag for details</Text>
        </View>
        <Text style={s.label}>{hasRealLogs ? `${logs.length} pts` : 'live'}</Text>
      </View>

      <View style={[s.row, { marginTop: 10, flexWrap: 'wrap', gap: 10 }]}>
        <Text style={s.body}><Text style={s.h3}>{latest}%</Text> latest</Text>
        <Text style={s.body}><Text style={s.h3}>{avg}%</Text> avg</Text>
        <Text style={s.body}><Text style={s.h3}>{min}%</Text> min</Text>
        <Text style={s.body}><Text style={s.h3}>{max}%</Text> max</Text>
      </View>

      <Pressable
        style={{ marginTop: 12, height }}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        onPress={event => selectAtX(event.nativeEvent.locationX)}
        onPressIn={event => selectAtX(event.nativeEvent.locationX)}
        onTouchMove={event => selectAtX(event.nativeEvent.locationX)}
        onHoverIn={event => {
          const x = event?.nativeEvent?.locationX;
          if (typeof x === 'number') selectAtX(x);
        }}
        onHoverOut={() => setActiveIndex(null)}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="ramArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#a98bff" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#38d5ff" stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            {[0, 25, 50, 75, 100].map(value => {
              const y = padding.top + (1 - value / 100) * plotHeight;
              return (
                <React.Fragment key={value}>
                  <SvgLine
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + plotWidth}
                    y2={y}
                    stroke={c.line}
                    strokeWidth={1}
                  />
                  <SvgText x={padding.left - 8} y={y + 3} fill={c.muted} fontSize="9" textAnchor="end">
                    {value}%
                  </SvgText>
                </React.Fragment>
              );
            })}
            {areaPath ? <Path d={areaPath} fill="url(#ramArea)" /> : null}
            {path ? <Path d={path} stroke="#a98bff" strokeWidth={2} fill="none" /> : null}
            {active ? (
              <>
                <SvgLine
                  x1={active.x}
                  y1={padding.top}
                  x2={active.x}
                  y2={padding.top + plotHeight}
                  stroke={c.cyan}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Circle cx={active.x} cy={active.y} r={5} fill={c.cyan} stroke={c.panelStrong || c.panel} strokeWidth={2} />
              </>
            ) : plotted.length ? (
              <Circle
                cx={plotted[plotted.length - 1].x}
                cy={plotted[plotted.length - 1].y}
                r={3.5}
                fill="#38d5ff"
              />
            ) : null}
            <SvgText x={padding.left} y={height - 8} fill={c.muted} fontSize="9">
              {dayLabel(chartPoints[0].date)}
            </SvgText>
            <SvgText x={padding.left + plotWidth} y={height - 8} fill={c.muted} fontSize="9" textAnchor="end">
              {dayLabel(chartPoints[chartPoints.length - 1].date)}
            </SvgText>
          </Svg>
        )}
      </Pressable>

      {active ? (
        <ChartTooltip
          color={c.cyan}
          value={`${Math.round(active.value)}% RAM`}
          label={active.date.toLocaleString()}
          detail={`Point ${active.index + 1} of ${plotted.length}`}
        />
      ) : null}

      {!hasRealLogs && (
        <Text style={[s.label, { marginTop: 8 }]}>
          RAM graph will fill after the next sync stores a sample.
        </Text>
      )}
    </View>
  );
}
