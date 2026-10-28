import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import NoticeBar from '../components/NoticeBar';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';
import { IconMail } from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';

function isRecoveryMail(email) {
  const issueType = String(email.issue_type || '').toLowerCase();
  const subject = String(email.subject || '').toLowerCase();
  if (issueType.includes('recovery')) return true;
  if (subject.includes('unhealthy') || subject.includes(' down ')) return false;
  return subject.includes('[meon recovery]') || subject.includes(' is healthy') || subject.includes(' is up ');
}

function acknowledgementName(email) {
  const value = email.acknowledged_by || '';
  if (!value) return 'User';
  return value.split('@')[0].replace(/[._-]+/g, ' ');
}

export default function MailAlertsScreen() {
  const {
    theme, alertEmails, mailLoading, currentUser, loadAlertEmails, acknowledgeAlertEmail,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [query, setQuery] = useState('');

  const filteredEmails = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return alertEmails;
    return alertEmails.filter(email => [
      email.subject,
      email.product_name,
      email.server_name,
      email.service_name,
      email.recipients,
      email.status,
      email.acknowledged_by,
    ].some(value => String(value || '').toLowerCase().includes(needle)));
  }, [alertEmails, query]);

  const openIncidents = alertEmails.filter(email => !email.acknowledged_at).length;
  const recoveryCount = alertEmails.filter(isRecoveryMail).length;
  const unhealthyCount = alertEmails.length - recoveryCount;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <NoticeBar />
      <ScreenHeader
        eyebrow="ALERT MAIL CONTROL"
        title="Alert acknowledgements"
        subtitle="Track alert emails from the last 30 days and acknowledge incidents to stop repeat emails."
        icon={IconMail}
        refreshing={mailLoading}
        onRefresh={() => loadAlertEmails()}
      />

      <View style={s.grid2}>
        <StatCard label="Mail records" value={alertEmails.length} hint="last 30 days" />
        <StatCard label="Down mails" value={unhealthyCount} hint="unhealthy/down" tone="amber" />
        <StatCard label="Healthy mails" value={recoveryCount} hint="recovery" tone="green" />
        <StatCard label="Open ack" value={openIncidents} hint="acknowledge to stop repeats" tone="violet" />
      </View>

      <TextInput
        style={[s.input, { marginBottom: 14 }]}
        value={query}
        onChangeText={setQuery}
        placeholder="Search mail, server, recipient"
        placeholderTextColor={c.muted}
      />

      {filteredEmails.length ? filteredEmails.map(email => {
        const recoveryMail = isRecoveryMail(email);
        const accent = recoveryMail ? c.green : c.red;
        const acknowledged = Boolean(email.acknowledged_at);
        return (
          <View
            key={email.id}
            style={[
              s.card,
              {
                borderLeftWidth: 3,
                borderLeftColor: accent,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: `${accent}10`,
              }}
            />
            <View style={[s.spaceBetween, { alignItems: 'flex-start', marginBottom: 6 }]}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: `${accent}18`,
                  borderWidth: 1,
                  borderColor: `${accent}40`,
                }}
              >
                <Text style={{ color: accent, fontWeight: '800', fontSize: 11 }}>
                  {recoveryMail ? 'Recovery' : 'Incident'}
                </Text>
              </View>
              {acknowledged ? (
                <View
                  style={[
                    glassSurface(c, theme),
                    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
                  ]}
                >
                  <Text style={{ color: c.green, fontWeight: '700', fontSize: 11 }}>Acknowledged</Text>
                </View>
              ) : null}
            </View>

            <Text style={s.h3}>{email.subject}</Text>
            <Text style={[s.body, { marginTop: 4 }]}>
              {email.product_name}
              {email.server_name ? ` · ${email.server_name}` : ''}
              {email.service_name ? ` · ${email.service_name}` : ''}
            </Text>
            <Text style={[s.label, { marginTop: 8 }]}>
              To {email.recipients || '-'} · From {email.from_email} · {new Date(email.sent_at).toLocaleString()}
            </Text>
            {acknowledged && (
              <Text style={[s.label, { marginTop: 4, color: c.green }]}>
                Ack by {acknowledgementName(email)} at {new Date(email.acknowledged_at).toLocaleString()}
              </Text>
            )}
            <Pressable
              style={[s.button, { marginTop: 12, opacity: acknowledged ? 0.45 : 1 }]}
              disabled={acknowledged}
              onPress={() => acknowledgeAlertEmail(email.id, currentUser)}
            >
              <Text style={s.buttonText}>{acknowledged ? 'Acknowledged' : 'Acknowledge'}</Text>
            </Pressable>
          </View>
        );
      }) : (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>
            {mailLoading ? 'Loading alert mails…' : 'No alert mail records found'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
