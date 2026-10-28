import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoticeBar from '../components/NoticeBar';
import ScreenHeader from '../components/ScreenHeader';
import { IconUsers } from '../components/Icons';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';

function userKey(user, index) {
  return String(user?.id ?? user?.pk ?? user?.user_id ?? user?.email ?? index);
}

function resolveUserId(user) {
  const id = user?.id ?? user?.pk ?? user?.user_id;
  return id == null || id === '' ? null : id;
}

function PermissionChip({ label, value, onPress, disabled, c, theme }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[
        {
          flex: 1,
          minWidth: '46%',
          paddingVertical: 10,
          paddingHorizontal: 10,
          borderRadius: 12,
          borderWidth: 1,
          opacity: disabled ? 0.45 : 1,
          backgroundColor: value ? `${c.cyan}18` : c.inputBg,
          borderColor: value ? `${c.cyan}55` : c.line,
          borderTopColor: value ? 'rgba(180,240,255,0.45)' : 'rgba(255,255,255,0.08)',
        },
      ]}
    >
      <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text style={{ color: value ? c.cyan : c.text, fontWeight: '800', marginTop: 3, fontSize: 13 }}>
        {value ? 'Allowed' : 'No access'}
      </Text>
    </Pressable>
  );
}

function StatusChip({ active, activeLabel, inactiveLabel, onPress, disabled, c }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        opacity: disabled ? 0.45 : 1,
        backgroundColor: active ? `${c.green}18` : `${c.red}12`,
        borderColor: active ? `${c.green}55` : `${c.red}40`,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: active ? c.green : c.red,
        }}
      />
      <Text style={{ color: active ? c.green : c.red, fontWeight: '800', fontSize: 12 }}>
        {active ? activeLabel : inactiveLabel}
      </Text>
    </Pressable>
  );
}

export default function UserAccessScreen() {
  const {
    theme, canManageUsers, currentUser, managedUsers, managedUsersLoading, alertRecipients,
    alertRecipientsLoading, refreshAccessManagement, createManagedUser, updateManagedUser,
    deleteManagedUser, createAlertRecipient, updateAlertRecipient, deleteAlertRecipient,
    backendNotice,
  } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const emptyForm = {
    email: '',
    password: '',
    is_active: true,
    can_manage_users: false,
    can_manage_products: false,
    can_manage_usage: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [drafts, setDrafts] = useState({});
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientDrafts, setRecipientDrafts] = useState({});
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');
  const users = Array.isArray(managedUsers) ? managedUsers : [];
  const recipients = Array.isArray(alertRecipients) ? alertRecipients : [];
  const loading = managedUsersLoading || alertRecipientsLoading;

  useFocusEffect(
    useCallback(() => {
      if (canManageUsers) refreshAccessManagement();
    }, [canManageUsers, refreshAccessManagement]),
  );

  useEffect(() => {
    const next = {};
    users.forEach((user, index) => {
      const key = userKey(user, index);
      next[key] = {
        email: user.email || '',
        password: '',
        is_active: Boolean(user.is_active),
        can_manage_users: Boolean(user.can_manage_users),
        can_manage_products: Boolean(user.can_manage_products),
        can_manage_usage: Boolean(user.can_manage_usage),
      };
    });
    setDrafts(next);
  }, [users]);

  useEffect(() => {
    const next = {};
    recipients.forEach((recipient, index) => {
      const key = userKey(recipient, index);
      next[key] = { email: recipient.email || '', is_active: Boolean(recipient.is_active) };
    });
    setRecipientDrafts(next);
  }, [recipients]);

  if (!canManageUsers) {
    return (
      <View style={[s.root, s.empty]}>
        <Text style={s.emptyTitle}>User access is not allowed for this account.</Text>
      </View>
    );
  }

  const createUser = async () => {
    setNotice('');
    if (!form.email.trim()) return setNotice('Email is required.');
    if (form.password.length < 8) return setNotice('Password must be at least 8 characters.');
    setSavingId('new');
    try {
      await createManagedUser(form);
      setForm(emptyForm);
      setNotice('User created.');
    } catch (error) {
      setNotice(error.message || 'User create failed.');
    } finally {
      setSavingId('');
    }
  };

  const patchDraft = (key, field, value) => {
    setDrafts(cur => ({ ...cur, [key]: { ...(cur[key] || {}), [field]: value } }));
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <NoticeBar />

      <ScreenHeader
        eyebrow="ACCESS CONTROL"
        title="User access"
        subtitle="Add, update, delete, activate, and grant separate monitoring permissions."
        icon={IconUsers}
        refreshing={loading}
        onRefresh={refreshAccessManagement}
      />

      {/* Add user */}
      <View style={[s.card, { borderColor: `${c.cyan}33`, overflow: 'hidden' }]}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 48,
            backgroundColor: 'rgba(56,213,255,0.08)',
          }}
        />
        <Text style={s.h3}>Add user</Text>
        <Text style={[s.label, { marginTop: 12 }]}>Email</Text>
        <TextInput
          style={s.input}
          value={form.email}
          onChangeText={v => setForm(cur => ({ ...cur, email: v }))}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholderTextColor={c.muted}
          placeholder="name@meon.co.in"
        />
        <Text style={[s.label, { marginTop: 10 }]}>Initial password</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          value={form.password}
          onChangeText={v => setForm(cur => ({ ...cur, password: v }))}
          placeholderTextColor={c.muted}
          placeholder="Minimum 8 characters"
        />

        <View style={{ marginTop: 12 }}>
          <StatusChip
            active={form.is_active}
            activeLabel="Login active"
            inactiveLabel="Login inactive"
            c={c}
            onPress={() => setForm(cur => ({ ...cur, is_active: !cur.is_active }))}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <PermissionChip
            label="Manage users"
            value={form.can_manage_users}
            c={c}
            theme={theme}
            onPress={() => setForm(cur => ({ ...cur, can_manage_users: !cur.can_manage_users }))}
          />
          <PermissionChip
            label="Add products"
            value={form.can_manage_products}
            c={c}
            theme={theme}
            onPress={() => setForm(cur => ({ ...cur, can_manage_products: !cur.can_manage_products }))}
          />
          <PermissionChip
            label="Usage APIs"
            value={form.can_manage_usage}
            c={c}
            theme={theme}
            onPress={() => setForm(cur => ({ ...cur, can_manage_usage: !cur.can_manage_usage }))}
          />
        </View>

        <Pressable
          style={[s.button, { marginTop: 16, opacity: savingId === 'new' ? 0.7 : 1 }]}
          onPress={createUser}
          disabled={savingId === 'new'}
        >
          {savingId === 'new' ? (
            <ActivityIndicator color="#041018" />
          ) : (
            <Text style={s.buttonText}>Add user</Text>
          )}
        </Pressable>
      </View>

      {!!notice && (
        <View
          style={[
            s.notice,
            {
              backgroundColor: /fail|required|cannot|login|session/i.test(notice)
                ? 'rgba(255,91,119,0.12)'
                : 'rgba(67,226,142,0.12)',
              borderColor: /fail|required|cannot|login|session/i.test(notice)
                ? 'rgba(255,91,119,0.35)'
                : 'rgba(67,226,142,0.35)',
            },
          ]}
        >
          <Text
            style={{
              color: /fail|required|cannot|login|session/i.test(notice) ? c.red : c.green,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {notice}
          </Text>
        </View>
      )}

      <View style={[s.spaceBetween, { marginTop: 4, marginBottom: 8 }]}>
        <Text style={s.h2}>Managed users</Text>
        <View style={[s.chip, { backgroundColor: `${c.cyan}18`, borderWidth: 1, borderColor: `${c.cyan}44` }]}>
          <Text style={[s.chipText, { color: c.cyan }]}>
            {managedUsersLoading ? '…' : `${users.length}`}
          </Text>
        </View>
      </View>

      {managedUsersLoading && users.length === 0 ? (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
          <ActivityIndicator color={c.cyan} />
          <Text style={[s.body, { marginTop: 10 }]}>Loading users…</Text>
        </View>
      ) : null}

      {!managedUsersLoading && users.length === 0 ? (
        <View style={[s.card, { borderColor: c.amber, alignItems: 'center' }]}>
          <Text style={s.h3}>{backendNotice ? 'Could not load users' : 'No users found'}</Text>
          <Text style={[s.body, { marginTop: 6, textAlign: 'center' }]}>
            {backendNotice || 'No managed users returned from the server.'}
          </Text>
          <Pressable style={[s.button, { marginTop: 14, minWidth: 140 }]} onPress={refreshAccessManagement}>
            <Text style={s.buttonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {users.map((user, index) => {
        const key = userKey(user, index);
        const draft = drafts[key] || {};
        const isSelf = user.email === currentUser;
        return (
          <View key={key} style={[s.card, { overflow: 'hidden' }]}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 40,
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
            />

            <View style={s.spaceBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.h3} numberOfLines={1}>
                  {user.email}
                </Text>
                {isSelf ? (
                  <Text style={{ color: c.cyan, fontSize: 11, fontWeight: '700', marginTop: 2 }}>YOU</Text>
                ) : null}
              </View>
              <StatusChip
                active={Boolean(draft.is_active)}
                activeLabel="Active"
                inactiveLabel="Inactive"
                disabled={isSelf}
                c={c}
                onPress={() => patchDraft(key, 'is_active', !draft.is_active)}
              />
            </View>

            <Text style={[s.label, { marginTop: 12 }]}>Email</Text>
            <TextInput
              style={s.input}
              value={draft.email || ''}
              onChangeText={v => patchDraft(key, 'email', v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholderTextColor={c.muted}
            />

            <Text style={[s.label, { marginTop: 10 }]}>Reset password</Text>
            <TextInput
              style={s.input}
              secureTextEntry
              value={draft.password || ''}
              onChangeText={v => patchDraft(key, 'password', v)}
              placeholder="Leave blank to keep current"
              placeholderTextColor={c.muted}
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <PermissionChip
                label="Manage users"
                value={Boolean(draft.can_manage_users)}
                disabled={isSelf}
                c={c}
                theme={theme}
                onPress={() => patchDraft(key, 'can_manage_users', !draft.can_manage_users)}
              />
              <PermissionChip
                label="Add products"
                value={Boolean(draft.can_manage_products)}
                disabled={isSelf}
                c={c}
                theme={theme}
                onPress={() => patchDraft(key, 'can_manage_products', !draft.can_manage_products)}
              />
              <PermissionChip
                label="Usage APIs"
                value={Boolean(draft.can_manage_usage)}
                disabled={isSelf}
                c={c}
                theme={theme}
                onPress={() => patchDraft(key, 'can_manage_usage', !draft.can_manage_usage)}
              />
            </View>

            <View style={[s.row, { marginTop: 14, gap: 10 }]}>
              <Pressable
                style={[s.button, { flex: 1.15, minHeight: 48, opacity: savingId === key ? 0.7 : 1 }]}
                disabled={savingId === key}
                onPress={async () => {
                  setSavingId(key);
                  setNotice('');
                  try {
                    const payload = {
                      email: draft.email,
                      is_active: Boolean(draft.is_active),
                      can_manage_users: Boolean(draft.can_manage_users),
                      can_manage_products: Boolean(draft.can_manage_products),
                      can_manage_usage: Boolean(draft.can_manage_usage),
                    };
                    if (draft.password) {
                      if (draft.password.length < 8) throw new Error('Password must be at least 8 characters.');
                      payload.password = draft.password;
                    }
                    const userId = resolveUserId(user);
                    if (userId == null) throw new Error('Cannot save user: missing user id.');
                    await updateManagedUser(userId, payload);
                    setNotice('User updated.');
                  } catch (error) {
                    setNotice(error.message || 'User update failed.');
                  } finally {
                    setSavingId('');
                  }
                }}
              >
                <Text style={s.buttonText}>{savingId === key ? 'Saving…' : 'Save'}</Text>
              </Pressable>
              <Pressable
                style={[
                  s.dangerButton,
                  {
                    flex: 1,
                    minHeight: 48,
                    opacity: isSelf || savingId === `delete-${key}` ? 0.4 : 1,
                  },
                ]}
                disabled={isSelf || savingId === `delete-${key}`}
                onPress={() => {
                  const userId = resolveUserId(user);
                  if (userId == null) {
                    Alert.alert('Delete failed', 'This user has no id from the server.');
                    return;
                  }
                  Alert.alert(
                    'Delete user',
                    `Remove ${user.email || 'this user'}? This cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          setSavingId(`delete-${key}`);
                          setNotice('');
                          try {
                            await deleteManagedUser(userId);
                            setNotice('User deleted.');
                            Alert.alert('Deleted', `${user.email || 'User'} removed.`);
                          } catch (error) {
                            const message = error.message || 'User delete failed.';
                            setNotice(message);
                            Alert.alert('Delete failed', message);
                          } finally {
                            setSavingId('');
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={s.dangerButtonText}>
                  {savingId === `delete-${key}` ? 'Deleting…' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Recipients */}
      <View style={{ marginTop: 18, marginBottom: 10 }}>
        <Text style={s.h2}>Alert mail recipients</Text>
        <Text style={[s.body, { marginTop: 4 }]}>
          These emails receive default server down and service down alerts.
        </Text>
        <View
          style={[
            s.chip,
            {
              alignSelf: 'flex-start',
              marginTop: 10,
              backgroundColor: `${c.green}14`,
              borderWidth: 1,
              borderColor: `${c.green}40`,
            },
          ]}
        >
          <Text style={[s.chipText, { color: c.green }]}>From no-reply@meon.co.in</Text>
        </View>
      </View>

      <View style={[s.card, { borderColor: `${c.green}33`, overflow: 'hidden' }]}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 40,
            backgroundColor: 'rgba(67,226,142,0.08)',
          }}
        />
        <Text style={s.label}>Add recipient</Text>
        <TextInput
          style={s.input}
          value={recipientEmail}
          onChangeText={setRecipientEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="name@meon.co.in"
          placeholderTextColor={c.muted}
        />
        <Pressable
          style={[s.button, { marginTop: 12, backgroundColor: c.green }]}
          onPress={async () => {
            if (!recipientEmail.trim()) return setNotice('Recipient email is required.');
            setSavingId('recipient-new');
            try {
              await createAlertRecipient({ email: recipientEmail, is_active: true });
              setRecipientEmail('');
              setNotice('Alert recipient added.');
            } catch (error) {
              setNotice(error.message || 'Recipient add failed.');
            } finally {
              setSavingId('');
            }
          }}
        >
          <Text style={s.buttonText}>
            {savingId === 'recipient-new' ? 'Adding…' : 'Add recipient'}
          </Text>
        </Pressable>
      </View>

      {alertRecipientsLoading && recipients.length === 0 ? (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 22 }]}>
          <ActivityIndicator color={c.green} />
          <Text style={[s.body, { marginTop: 8 }]}>Loading recipients…</Text>
        </View>
      ) : null}

      {!alertRecipientsLoading && recipients.length === 0 ? (
        <View style={s.card}>
          <Text style={s.h3}>No alert recipients configured</Text>
        </View>
      ) : null}

      {recipients.map((recipient, index) => {
        const key = userKey(recipient, index);
        const draft = recipientDrafts[key] || {};
        return (
          <View key={key} style={s.card}>
            <TextInput
              style={s.input}
              value={draft.email || ''}
              onChangeText={v => setRecipientDrafts(cur => ({
                ...cur,
                [key]: { ...draft, email: v },
              }))}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholderTextColor={c.muted}
            />
            <View style={{ marginTop: 10 }}>
              <StatusChip
                active={Boolean(draft.is_active)}
                activeLabel="Receiving"
                inactiveLabel="Paused"
                c={c}
                onPress={() => setRecipientDrafts(cur => ({
                  ...cur,
                  [key]: { ...draft, is_active: !draft.is_active },
                }))}
              />
            </View>
            <View style={[s.row, { marginTop: 12, gap: 10 }]}>
              <Pressable
                style={[s.button, { flex: 1.15, minHeight: 48 }]}
                onPress={async () => {
                  try {
                    await updateAlertRecipient(recipient.id, {
                      email: draft.email,
                      is_active: Boolean(draft.is_active),
                    });
                    setNotice('Alert recipient updated.');
                  } catch (error) {
                    setNotice(error.message || 'Recipient update failed.');
                  }
                }}
              >
                <Text style={s.buttonText}>Save</Text>
              </Pressable>
              <Pressable
                style={[s.dangerButton, { flex: 1, minHeight: 48 }]}
                onPress={() => {
                  const recipientId = resolveUserId(recipient);
                  if (recipientId == null) {
                    Alert.alert('Delete failed', 'This recipient has no id from the server.');
                    return;
                  }
                  Alert.alert(
                    'Delete recipient',
                    `Remove ${recipient.email || 'this recipient'}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteAlertRecipient(recipientId);
                            setNotice('Alert recipient deleted.');
                          } catch (error) {
                            Alert.alert('Delete failed', error.message || 'Recipient delete failed.');
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={s.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
