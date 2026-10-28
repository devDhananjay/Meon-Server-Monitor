import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import ChartTooltip from './ChartTooltip';

function usageTimeMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

function usageTimeRangeMatches(startValue, endValue, date) {
  const start = usageTimeMinutes(startValue);
  const end = usageTimeMinutes(endValue);
  if (start === null || end === null || start === end) return false;
  const current = date.getHours() * 60 + date.getMinutes();
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function usageAlertRuleForPoint(config, date) {
  const schedules = Array.isArray(config?.alert_schedules) ? config.alert_schedules : [];
  if (schedules.length) {
    return schedules.find(schedule => schedule?.enabled !== false && usageTimeRangeMatches(schedule.start_time, schedule.end_time, date)) || null;
  }
  const day = usageTimeRangeMatches(config?.day_start_time || '09:00', config?.day_end_time || '21:00', date);
  if (config?.mail_alert_window === 'day' && !day) return null;
  if (config?.mail_alert_window === 'night' && day) return null;
  const nightThreshold = config?.night_alert_threshold === null || config?.night_alert_threshold === undefined || config?.night_alert_threshold === ''
    ? Number(config?.alert_threshold ?? 0)
    : Number(config.night_alert_threshold);
  return {
    threshold: day ? Number(config?.alert_threshold ?? 0) : nightThreshold,
    condition: config?.alert_condition || 'above',
  };
}

export default function UsageBarChart({ logs = [], config }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [rangeHours, setRangeHours] = useState(24);
  const [activeIndex, setActiveIndex] = useState(null);
  const unit = config?.unit || '';

  const points = useMemo(() => {
    const cutoff = Date.now() - rangeHours * 60 * 60 * 1000;
    return (logs || [])
      .map(log => ({
        value: Number(log.value ?? 0),
        date: new Date(log.recorded_at || Date.now()),
      }))
      .filter(point => Number.isFinite(point.value) && !Number.isNaN(point.date.getTime()) && point.date.getTime() >= cutoff)
      .sort((a, b) => a.date - b.date);
  }, [logs, rangeHours]);

  const bars = useMemo(() => {
    const maxBars = 48;
    if (points.length <= maxBars) return points;
    const bucketSize = Math.ceil(points.length / maxBars);
    const rows = [];
    for (let index = 0; index < points.length; index += bucketSize) {
      const bucket = points.slice(index, index + bucketSize);
      rows.push({
        value: bucket.reduce((sum, point) => sum + point.value, 0) / bucket.length,
        date: bucket[bucket.length - 1].date,
      });
    }
    return rows;
  }, [points]);

  const threshold = Number(config?.alert_threshold ?? 0);
  const scheduleThresholds = (Array.isArray(config?.alert_schedules) ? config.alert_schedules : [])
    .map(schedule => Number(schedule?.threshold))
    .filter(value => Number.isFinite(value));
  const legacyNightThreshold = config?.night_alert_threshold === null || config?.night_alert_threshold === '' || config?.night_alert_threshold === undefined
    ? 0
    : Number(config.night_alert_threshold);
  const chartThreshold = Math.max(threshold, legacyNightThreshold, ...scheduleThresholds, 0);
  const values = points.map(point => point.value);
  const latest = values.length ? values[values.length - 1] : Number(config?.last_value ?? 0);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : latest;
  const maximum = values.length ? Math.max(...values) : latest;
  const chartMaximum = Math.max(1, maximum, chartThreshold, unit === '%' ? 100 : 0) * 1.08;

  const formatValue = value => {
    const number = Number(value || 0).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    const separator = unit && !/^[%°]/.test(unit) ? ' ' : '';
    return `${number}${separator}${unit}`;
  };

  return (
    <View style={s.card}>
      <View style={s.spaceBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.h3}>Usage history</Text>
          <Text style={s.label}>Hourly samples · latest 30 days kept in graph</Text>
        </View>
      </View>

      <View style={[s.row, { marginTop: 10, gap: 8 }]}>
        {[24, 168, 720].map(hours => (
          <Pressable
            key={hours}
            onPress={() => {
              setRangeHours(hours);
              setActiveIndex(null);
            }}
            style={[
              s.ghostButton,
              rangeHours === hours ? { backgroundColor: `${c.cyan}33`, borderColor: c.cyan } : null,
            ]}
          >
            <Text style={s.ghostButtonText}>{hours === 24 ? '24h' : hours === 168 ? '7d' : '30d'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.row, { marginTop: 12, flexWrap: 'wrap', gap: 10 }]}>
        <Text style={s.body}><Text style={s.h3}>{formatValue(latest)}</Text> latest</Text>
        <Text style={s.body}><Text style={s.h3}>{formatValue(average)}</Text> avg</Text>
        <Text style={s.body}><Text style={s.h3}>{formatValue(maximum)}</Text> max</Text>
        <Text style={s.body}><Text style={s.h3}>{formatValue(threshold)}</Text> alert</Text>
      </View>

      {config?.mail_alert_enabled ? (
        <Text style={[s.label, { marginTop: 8 }]}>
          Red bars match the configured {config?.alert_condition === 'below' ? 'low' : 'high'}-usage threshold.
        </Text>
      ) : null}

      {bars.length ? (
        <View style={{ marginTop: 14 }}>
          <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
            {bars.map((point, index) => {
              const isZero = point.value <= 0;
              const barHeight = isZero ? 4 : Math.max(4, Math.min(140, (point.value / chartMaximum) * 140));
              const rule = usageAlertRuleForPoint(config, point.date);
              const pointThreshold = Number(rule?.threshold ?? threshold);
              const pointAlertWhenBelow = rule?.condition === 'below';
              const high = config?.mail_alert_enabled && rule && (pointAlertWhenBelow ? point.value <= pointThreshold : point.value >= pointThreshold);
              const selected = activeIndex === index;
              const dimmed = activeIndex != null && !selected;
              return (
                <Pressable
                  key={`${point.date.toISOString()}-${index}`}
                  onPress={() => setActiveIndex(prev => (prev === index ? null : index))}
                  onHoverIn={() => setActiveIndex(index)}
                  onHoverOut={() => setActiveIndex(prev => (prev === index ? null : prev))}
                  onLongPress={() => setActiveIndex(index)}
                  hitSlop={{ top: 12, bottom: 12 }}
                  style={{
                    flex: 1,
                    height: 140,
                    justifyContent: 'flex-end',
                    minWidth: 2,
                  }}
                >
                  <View
                    style={{
                      height: barHeight,
                      borderRadius: 3,
                      backgroundColor: high ? c.red : c.cyan,
                      opacity: dimmed ? 0.28 : isZero ? 0.35 : selected ? 1 : high ? 0.95 : 0.75,
                      borderWidth: selected ? 1 : 0,
                      borderColor: c.text,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
          {activeIndex != null && bars[activeIndex] ? (
            <ChartTooltip
              color={(() => {
                const point = bars[activeIndex];
                const rule = usageAlertRuleForPoint(config, point.date);
                const pointThreshold = Number(rule?.threshold ?? threshold);
                const pointAlertWhenBelow = rule?.condition === 'below';
                const high = config?.mail_alert_enabled && rule && (pointAlertWhenBelow ? point.value <= pointThreshold : point.value >= pointThreshold);
                return high ? c.red : c.cyan;
              })()}
              value={formatValue(bars[activeIndex].value)}
              label={bars[activeIndex].date.toLocaleString()}
              detail={`Bar ${activeIndex + 1} of ${bars.length}`}
            />
          ) : null}
          <View style={[s.spaceBetween, { marginTop: 8 }]}>
            <Text style={s.label}>{bars[0].date.toLocaleString()}</Text>
            <Text style={s.label}>{bars.length} bars · {points.length} samples</Text>
            <Text style={s.label}>{bars[bars.length - 1].date.toLocaleString()}</Text>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <Text style={s.h3}>No usage samples in the selected range</Text>
          <Text style={[s.body, { marginTop: 4 }]}>Use “Save & check now” or wait for the next hourly collection.</Text>
        </View>
      )}
    </View>
  );
}
