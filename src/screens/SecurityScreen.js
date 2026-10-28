import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import NoticeBar from '../components/NoticeBar';
import ScreenHeader from '../components/ScreenHeader';
import { IconLock, IconUser } from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';

export default function SecurityScreen() {
  const { theme, currentUser, handleChangePassword, setBackendNotice } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await handleChangePassword(currentPassword, newPassword);
      setBackendNotice('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Password change failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <NoticeBar />
      <ScreenHeader
        eyebrow="SECURITY"
        title="Account security"
        subtitle="Update your monitor password. Use a strong passphrase you do not reuse elsewhere."
        icon={IconLock}
      />

      <View
        style={[
          glassSurface(c, theme),
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 14,
          },
        ]}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${c.cyan}18`,
            borderWidth: 1,
            borderColor: `${c.cyan}40`,
          }}
        >
          <IconUser size={18} color={c.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Signed in as</Text>
          <Text style={[s.h3, { marginTop: 2 }]}>{currentUser || '—'}</Text>
        </View>
      </View>

      <View style={[s.panel, { overflow: 'hidden' }]}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -20,
            right: -16,
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: 'rgba(56,213,255,0.08)',
          }}
        />
        <Text style={s.h3}>Change password</Text>
        <Text style={[s.label, { marginBottom: 12 }]}>Minimum 8 characters · confirm to apply</Text>

        <Text style={s.label}>Current password</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholderTextColor={c.muted}
          placeholder="••••••••"
        />
        <Text style={[s.label, { marginTop: 12 }]}>New password</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholderTextColor={c.muted}
          placeholder="At least 8 characters"
        />
        <Text style={[s.label, { marginTop: 12 }]}>Confirm password</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor={c.muted}
          placeholder="Repeat new password"
        />
        {!!error && <Text style={[s.error, { marginTop: 10 }]}>{error}</Text>}
        <Pressable
          style={[s.button, { marginTop: 16, opacity: saving ? 0.7 : 1 }]}
          onPress={submit}
          disabled={saving}
        >
          <Text style={s.buttonText}>{saving ? 'Saving…' : 'Update password'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
