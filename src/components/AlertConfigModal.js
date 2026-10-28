import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch } from '../api/client';
import ToggleRow from './ToggleRow';
import { getColors } from '../theme/colors';
import { makeStyles } from '../theme/styles';
import { useMonitor } from '../context/MonitorContext';

export default function AlertConfigModal({ product, visible, onClose }) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [form, setForm] = useState({ enabled: true, email_to: '', notify_when: 'unhealthy' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!visible || !product?.id) return;
    apiFetch(`/products/${product.id}/alert-config/`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => data && setForm(current => ({ ...current, ...data })))
      .catch(() => setNotice('Backend config is offline; editing local values only.'));
  }, [visible, product?.id]);

  const save = async () => {
    setSaving(true);
    setNotice('');
    try {
      const response = await apiFetch(`/products/${product.id}/alert-config/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Save failed');
      setNotice('Alert config saved.');
    } catch (error) {
      setNotice(error.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <Text style={s.h2}>Alert config · {product?.name}</Text>
          <ScrollView style={{ marginTop: 12 }}>
            <ToggleRow label="Enabled" value={form.enabled} onValueChange={v => setForm(current => ({ ...current, enabled: v }))} />
            <Text style={[s.label, { marginTop: 12 }]}>Email to</Text>
            <TextInput
              style={s.input}
              value={form.email_to || ''}
              onChangeText={v => setForm(current => ({ ...current, email_to: v }))}
              placeholder="alerts@meon.co.in"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
            />
            <Text style={[s.label, { marginTop: 12 }]}>Send mail when</Text>
            {[
              { value: 'unhealthy', label: 'Server unhealthy or service down' },
              { value: 'warning', label: 'Warning, critical, unhealthy, or down' },
              { value: 'critical', label: 'Critical, unhealthy, or down' },
              { value: 'any_non_healthy', label: 'Any non-healthy status' },
            ].map(option => {
              const active = (form.notify_when || 'unhealthy') === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setForm(current => ({ ...current, notify_when: option.value }))}
                  style={[
                    s.ghostButton,
                    {
                      marginTop: 8,
                      alignSelf: 'stretch',
                      backgroundColor: active ? `${c.cyan}33` : c.inputBg,
                      borderColor: active ? c.cyan : c.line,
                    },
                  ]}
                >
                  <Text style={s.ghostButtonText}>{option.label}</Text>
                </Pressable>
              );
            })}
            <Text style={[s.label, { marginTop: 12 }]}>
              Default recipients come from User access. Extra emails above are only for this product. Mail repeats every 10 minutes while the issue stays open.
            </Text>
            {!!notice && <Text style={[s.body, { marginTop: 10, color: notice.toLowerCase().includes('fail') ? c.red : c.green }]}>{notice}</Text>}
          </ScrollView>
          <View style={[s.row, { marginTop: 14, gap: 8 }]}>
            <Pressable style={[s.ghostButton, { flex: 1 }]} onPress={onClose}>
              <Text style={s.ghostButtonText}>Close</Text>
            </Pressable>
            <Pressable style={[s.button, { flex: 1, opacity: saving ? 0.7 : 1 }]} onPress={save} disabled={saving}>
              <Text style={s.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
