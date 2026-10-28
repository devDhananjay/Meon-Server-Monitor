import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import ToggleRow from './ToggleRow';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';

function usageSchedulesFromConfig(config, fallbackThreshold = 90, fallbackCondition = 'above') {
  if (Array.isArray(config?.alert_schedules) && config.alert_schedules.length) {
    return config.alert_schedules.map((schedule, index) => ({
      id: schedule.id || `rule-${index + 1}`,
      label: schedule.label || `Alert rule ${index + 1}`,
      start_time: String(schedule.start_time || '09:00').slice(0, 5),
      end_time: String(schedule.end_time || '21:00').slice(0, 5),
      threshold: schedule.threshold ?? fallbackThreshold,
      condition: schedule.condition || fallbackCondition,
      enabled: schedule.enabled !== false,
      recipients: Array.isArray(schedule.recipients) ? schedule.recipients.join(', ') : String(schedule.recipients || ''),
    }));
  }

  const dayStart = String(config?.day_start_time || '09:00').slice(0, 5);
  const dayEnd = String(config?.day_end_time || '21:00').slice(0, 5);
  return [
    {
      id: 'day-rule',
      label: 'Day alert',
      start_time: dayStart,
      end_time: dayEnd,
      threshold: config?.alert_threshold ?? fallbackThreshold,
      condition: config?.alert_condition || fallbackCondition,
      enabled: config?.mail_alert_window !== 'night',
      recipients: '',
    },
    {
      id: 'night-rule',
      label: 'Night alert',
      start_time: dayEnd,
      end_time: dayStart,
      threshold: config?.night_alert_threshold ?? config?.alert_threshold ?? fallbackThreshold,
      condition: config?.alert_condition || fallbackCondition,
      enabled: config?.mail_alert_window !== 'day',
      recipients: '',
    },
  ];
}

const emptyConfig = {
  api_url: '',
  request_method: 'GET',
  request_headers_text: '',
  request_body_text: '',
  clear_request_headers: false,
  clear_request_body: false,
  value_key: 'usage',
  bearer_token: '',
  clear_bearer_token: false,
  unit: '%',
  alert_threshold: 90,
  alert_condition: 'above',
  mail_alert_window: 'always',
  night_alert_threshold: '',
  day_start_time: '09:00',
  day_end_time: '21:00',
  alert_schedules: [],
  enabled: true,
  mail_alert_enabled: false,
};

function buildForm(source) {
  const base = { ...emptyConfig, ...(source || {}) };
  return {
    ...base,
    bearer_token: source?.bearer_token || '',
    request_headers_text: source?.request_headers ? JSON.stringify(source.request_headers, null, 2) : '',
    request_body_text: source?.request_body || '',
    alert_schedules: usageSchedulesFromConfig(source, base.alert_threshold, base.alert_condition),
  };
}

export default function UsageApiConfigPanel({
  config,
  canManageUsage,
  saving,
  onSave,
  onSync,
  onClearLogs,
}) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [form, setForm] = useState(buildForm(config));
  const [notice, setNotice] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [deleteFrom, setDeleteFrom] = useState('');
  const [deleteTo, setDeleteTo] = useState('');

  useEffect(() => {
    setForm(buildForm(config));
  }, [config]);

  const openConfig = () => {
    setForm(buildForm(config));
    setNotice('');
    setDeleteFrom('');
    setDeleteTo('');
    setConfigOpen(true);
  };

  const updateAlertRule = (index, field, value) => {
    setForm(current => ({
      ...current,
      alert_schedules: current.alert_schedules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, [field]: value } : rule
      ),
    }));
  };

  const addAlertRule = () => {
    setForm(current => ({
      ...current,
      alert_schedules: [
        ...current.alert_schedules,
        {
          id: `rule-${Date.now()}`,
          label: `Alert rule ${current.alert_schedules.length + 1}`,
          start_time: '09:00',
          end_time: '21:00',
          threshold: current.alert_threshold || 90,
          condition: current.alert_condition || 'above',
          enabled: true,
          recipients: '',
        },
      ],
    }));
  };

  const removeAlertRule = index => {
    setForm(current => ({
      ...current,
      alert_schedules: current.alert_schedules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const saveConfig = async (checkNow = false) => {
    setNotice('');
    if (!form.api_url.trim() || !form.value_key.trim()) {
      setNotice('Usage API URL and JSON value key are required.');
      return;
    }
    const schedules = Array.isArray(form.alert_schedules) ? form.alert_schedules : [];
    if (!schedules.length) {
      setNotice('Add at least one alert rule.');
      return;
    }
    if (schedules.some(rule => !rule.start_time || !rule.end_time || rule.start_time === rule.end_time)) {
      setNotice('Each alert rule needs different start and end times.');
      return;
    }
    if (schedules.some(rule => !Number.isFinite(Number(rule.threshold)) || Number(rule.threshold) < 0)) {
      setNotice('Each alert rule needs a valid non-negative threshold.');
      return;
    }
    const normalizedSchedules = schedules.map(rule => ({
      ...rule,
      recipients: String(rule.recipients || '')
        .split(/[,;\s]+/)
        .map(email => email.trim().toLowerCase())
        .filter(Boolean),
    }));
    if (form.mail_alert_enabled && !schedules.some(rule => rule.enabled)) {
      setNotice('Enable at least one alert rule when usage alert mail is enabled.');
      return;
    }
    try {
      const firstRule = normalizedSchedules.find(rule => rule.enabled) || normalizedSchedules[0];
      await onSave({
        ...form,
        request_headers: form.request_headers_text,
        request_body: form.request_body_text,
        alert_schedules: normalizedSchedules,
        alert_threshold: firstRule.threshold,
        alert_condition: firstRule.condition,
      });
      if (checkNow) {
        const result = await onSync();
        const separator = form.unit && !/^[%°]/.test(form.unit) ? ' ' : '';
        setNotice(
          result?.status === 'ok'
            ? `Usage sample stored: ${result.value}${separator}${form.unit || ''}.`
            : result?.error || 'Usage API check failed.'
        );
      } else {
        setNotice('Usage API configuration saved.');
      }
    } catch (error) {
      setNotice(error.message || 'Usage API configuration failed.');
    }
  };

  const clearUsageLogs = async () => {
    setNotice('');
    if (!deleteFrom || !deleteTo) {
      setNotice('Select both From date and To date (YYYY-MM-DD).');
      return;
    }
    if (deleteFrom > deleteTo) {
      setNotice('From date cannot be after To date.');
      return;
    }
    try {
      const result = await onClearLogs(deleteFrom, deleteTo);
      setNotice(result?.detail || 'Usage logs deleted.');
    } catch (error) {
      setNotice(error.message || 'Usage log deletion failed.');
    }
  };

  const savedRules = Array.isArray(config?.alert_schedules) ? config.alert_schedules : [];
  const savedRulesLabel = savedRules.length
    ? savedRules
        .map(
          rule =>
            `${rule.label || 'Rule'} ${String(rule.start_time || '').slice(0, 5)}–${String(rule.end_time || '').slice(0, 5)} ${
              rule.condition === 'below' ? '≤' : '≥'
            } ${rule.threshold}`
        )
        .join(' · ')
    : 'Legacy schedule';

  return (
    <View style={[s.card, { overflow: 'hidden' }]}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          backgroundColor: 'rgba(56,213,255,0.06)',
        }}
      />
      <View style={s.spaceBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.h3}>Usage API configuration</Text>
          <Text style={s.label}>
            {config?.last_fetched_at
              ? `Last checked ${new Date(config.last_fetched_at).toLocaleString()}`
              : 'No usage API sample collected yet'}
          </Text>
        </View>
        {config?.last_status ? (
          <View
            style={[
              s.chip,
              {
                backgroundColor: config.last_status === 'ok' ? `${c.green}22` : `${c.red}22`,
                borderWidth: 1,
                borderColor: config.last_status === 'ok' ? `${c.green}55` : `${c.red}55`,
              },
            ]}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: config.last_status === 'ok' ? c.green : c.red,
              }}
            />
            <Text style={[s.chipText, { color: config.last_status === 'ok' ? c.green : c.red }]}>
              {config.last_status === 'ok' ? 'API working' : 'API error'}
            </Text>
          </View>
        ) : null}
      </View>

      {config ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.line }}>
            <Text style={s.label}>API URL</Text>
            <Text style={[s.body, { color: c.text, marginTop: 3 }]} numberOfLines={2}>{config.api_url}</Text>
          </View>
          <Text style={s.label}>Value key: {config.value_key} · Unit: {config.unit || '-'}</Text>
          <Text style={s.label}>Alert rules: {savedRulesLabel}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
            <View
              style={[
                s.chip,
                {
                  backgroundColor: config.mail_alert_enabled ? `${c.amber}18` : c.inputBg,
                  borderWidth: 1,
                  borderColor: config.mail_alert_enabled ? `${c.amber}44` : c.line,
                },
              ]}
            >
              <Text style={[s.chipText, { color: config.mail_alert_enabled ? c.amber : c.muted }]}>
                Mail {config.mail_alert_enabled ? 'On' : 'Off'}
              </Text>
            </View>
            <View
              style={[
                s.chip,
                {
                  backgroundColor: config.enabled ? `${c.green}18` : c.inputBg,
                  borderWidth: 1,
                  borderColor: config.enabled ? `${c.green}44` : c.line,
                },
              ]}
            >
              <Text style={[s.chipText, { color: config.enabled ? c.green : c.muted }]}>
                {config.enabled ? 'Hourly on' : 'Paused'}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <Text style={[s.body, { marginTop: 12 }]}>No usage API configured for this server yet.</Text>
      )}

      {!!config?.last_error && <Text style={[s.error, { marginTop: 8 }]}>{config.last_error}</Text>}

      {canManageUsage && (
        <Pressable style={[s.button, { marginTop: 14, minHeight: 48 }]} onPress={openConfig}>
          <Text style={s.buttonText}>{config ? 'Edit usage API' : 'Configure usage API'}</Text>
        </Pressable>
      )}

      <Modal visible={configOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !saving && setConfigOpen(false)}>
        <View style={[s.safe, { backgroundColor: c.bg }]}>
          <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 40 }]}>
            <View style={s.spaceBetween}>
              <Text style={s.title}>Usage API configuration</Text>
              <Pressable style={s.ghostButton} disabled={saving} onPress={() => setConfigOpen(false)}>
                <Text style={s.ghostButtonText}>Close</Text>
              </Pressable>
            </View>
            <Text style={[s.body, { marginBottom: 12 }]}>
              Collect one numeric API value every hour and optionally send threshold alerts.
            </Text>

            <Text style={s.label}>Usage API URL</Text>
            <TextInput
              style={s.input}
              value={form.api_url}
              onChangeText={v => setForm(cur => ({ ...cur, api_url: v }))}
              autoCapitalize="none"
              placeholderTextColor={c.muted}
              placeholder="https://server.example.com/usage"
            />

            <Text style={[s.label, { marginTop: 10 }]}>HTTP method</Text>
            <View style={[s.row, { gap: 8, flexWrap: 'wrap', marginTop: 6 }]}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
                <Pressable
                  key={method}
                  style={[s.ghostButton, form.request_method === method ? { backgroundColor: `${c.cyan}33` } : null]}
                  onPress={() => setForm(cur => ({ ...cur, request_method: method }))}
                >
                  <Text style={s.ghostButtonText}>{method}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[s.label, { marginTop: 10 }]}>Custom headers JSON (optional)</Text>
            <TextInput
              style={[s.input, { minHeight: 88, textAlignVertical: 'top' }]}
              value={form.request_headers_text}
              onChangeText={v => setForm(cur => ({ ...cur, request_headers_text: v, clear_request_headers: false }))}
              multiline
              autoCapitalize="none"
              placeholderTextColor={c.muted}
              placeholder={'{\n  "X-API-Key": "token"\n}'}
            />

            <Text style={[s.label, { marginTop: 10 }]}>Request body (optional)</Text>
            <TextInput
              style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
              value={form.request_body_text}
              onChangeText={v => setForm(cur => ({ ...cur, request_body_text: v, clear_request_body: false }))}
              multiline
              autoCapitalize="none"
              placeholderTextColor={c.muted}
              placeholder={'{\n  "from": "last_hour"\n}'}
            />

            <Text style={[s.label, { marginTop: 10 }]}>Bearer token (optional)</Text>
            <TextInput
              style={s.input}
              value={form.bearer_token}
              onChangeText={v => setForm(cur => ({ ...cur, bearer_token: v, clear_bearer_token: false }))}
              autoCapitalize="none"
              placeholderTextColor={c.muted}
              placeholder="token without Bearer prefix"
            />

            <Text style={[s.label, { marginTop: 10 }]}>JSON value key</Text>
            <TextInput
              style={s.input}
              value={form.value_key}
              onChangeText={v => setForm(cur => ({ ...cur, value_key: v }))}
              autoCapitalize="none"
              placeholderTextColor={c.muted}
              placeholder="usage, completed_count, data.usage"
            />

            <Text style={[s.label, { marginTop: 10 }]}>Display unit</Text>
            <TextInput
              style={s.input}
              value={form.unit}
              onChangeText={v => setForm(cur => ({ ...cur, unit: v }))}
              placeholderTextColor={c.muted}
              placeholder="%, requests"
            />

            <View style={[s.spaceBetween, { marginTop: 16 }]}>
              <Text style={s.h3}>Alert rules</Text>
              <Pressable style={s.ghostButton} onPress={addAlertRule}>
                <Text style={s.ghostButtonText}>Add rule</Text>
              </Pressable>
            </View>

            {form.alert_schedules.map((rule, index) => (
              <View key={rule.id || index} style={[s.card, { marginTop: 10 }]}>
                <Text style={s.label}>Rule name</Text>
                <TextInput
                  style={s.input}
                  value={rule.label}
                  onChangeText={v => updateAlertRule(index, 'label', v)}
                  placeholderTextColor={c.muted}
                />
                <View style={[s.row, { gap: 8, marginTop: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>From (HH:MM)</Text>
                    <TextInput
                      style={s.input}
                      value={rule.start_time}
                      onChangeText={v => updateAlertRule(index, 'start_time', v)}
                      autoCapitalize="none"
                      placeholderTextColor={c.muted}
                      placeholder="09:00"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>To (HH:MM)</Text>
                    <TextInput
                      style={s.input}
                      value={rule.end_time}
                      onChangeText={v => updateAlertRule(index, 'end_time', v)}
                      autoCapitalize="none"
                      placeholderTextColor={c.muted}
                      placeholder="21:00"
                    />
                  </View>
                </View>
                <Text style={[s.label, { marginTop: 8 }]}>Threshold</Text>
                <TextInput
                  style={s.input}
                  value={String(rule.threshold)}
                  onChangeText={v => updateAlertRule(index, 'threshold', v)}
                  keyboardType="decimal-pad"
                  placeholderTextColor={c.muted}
                />
                <Text style={[s.label, { marginTop: 8 }]}>Condition</Text>
                <View style={[s.row, { gap: 8, marginTop: 6 }]}>
                  {['above', 'below'].map(condition => (
                    <Pressable
                      key={condition}
                      style={[s.ghostButton, rule.condition === condition ? { backgroundColor: `${c.cyan}33` } : null]}
                      onPress={() => updateAlertRule(index, 'condition', condition)}
                    >
                      <Text style={s.ghostButtonText}>{condition === 'above' ? 'At or above' : 'At or below'}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[s.label, { marginTop: 8 }]}>Extra recipients</Text>
                <TextInput
                  style={s.input}
                  value={rule.recipients || ''}
                  onChangeText={v => updateAlertRule(index, 'recipients', v)}
                  autoCapitalize="none"
                  placeholderTextColor={c.muted}
                  placeholder="team@example.com, owner@example.com"
                />
                <ToggleRow
                  label="Enabled"
                  value={Boolean(rule.enabled)}
                  onValueChange={v => updateAlertRule(index, 'enabled', v)}
                />
                <Pressable style={[s.ghostButton, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => removeAlertRule(index)}>
                  <Text style={[s.ghostButtonText, { color: c.red }]}>Remove rule</Text>
                </Pressable>
              </View>
            ))}

            <ToggleRow
              label="Collect hourly"
              value={Boolean(form.enabled)}
              onValueChange={v => setForm(cur => ({ ...cur, enabled: v }))}
            />
            <ToggleRow
              label="Usage alert mail"
              value={Boolean(form.mail_alert_enabled)}
              onValueChange={v => setForm(cur => ({ ...cur, mail_alert_enabled: v }))}
            />
            {config?.has_bearer_token ? (
              <ToggleRow
                label="Clear saved token"
                value={Boolean(form.clear_bearer_token)}
                onValueChange={v => setForm(cur => ({ ...cur, clear_bearer_token: v, bearer_token: '' }))}
              />
            ) : null}
            {config?.has_custom_headers ? (
              <ToggleRow
                label="Clear saved custom headers"
                value={Boolean(form.clear_request_headers)}
                onValueChange={v => setForm(cur => ({ ...cur, clear_request_headers: v, request_headers_text: '' }))}
              />
            ) : null}
            {config?.has_request_body ? (
              <ToggleRow
                label="Clear saved request body"
                value={Boolean(form.clear_request_body)}
                onValueChange={v => setForm(cur => ({ ...cur, clear_request_body: v, request_body_text: '' }))}
              />
            ) : null}

            {config ? (
              <View style={[s.card, { marginTop: 12 }]}>
                <Text style={s.h3}>Clear usage logs</Text>
                <Text style={[s.label, { marginBottom: 8 }]}>Logs are stored permanently. Graph shows latest 30 days.</Text>
                <Text style={s.label}>From date (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.input}
                  value={deleteFrom}
                  onChangeText={setDeleteFrom}
                  autoCapitalize="none"
                  placeholderTextColor={c.muted}
                  placeholder="2026-01-01"
                />
                <Text style={[s.label, { marginTop: 8 }]}>To date (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.input}
                  value={deleteTo}
                  onChangeText={setDeleteTo}
                  autoCapitalize="none"
                  placeholderTextColor={c.muted}
                  placeholder="2026-01-31"
                />
                <Pressable style={[s.ghostButton, { marginTop: 10, alignSelf: 'flex-start' }]} disabled={saving} onPress={clearUsageLogs}>
                  <Text style={[s.ghostButtonText, { color: c.red }]}>Delete selected logs</Text>
                </Pressable>
              </View>
            ) : null}

            {!!notice && (
              <Text style={[s.body, { marginTop: 12, color: /fail|required|cannot/i.test(notice) ? c.red : c.green }]}>
                {notice}
              </Text>
            )}

            <View style={[s.row, { gap: 8, flexWrap: 'wrap', marginTop: 16 }]}>
              <Pressable style={[s.button, { opacity: saving ? 0.7 : 1 }]} disabled={saving} onPress={() => saveConfig(false)}>
                <Text style={s.buttonText}>Save</Text>
              </Pressable>
              <Pressable style={[s.ghostButton, { opacity: saving ? 0.7 : 1 }]} disabled={saving} onPress={() => saveConfig(true)}>
                <Text style={s.ghostButtonText}>Save & check now</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
