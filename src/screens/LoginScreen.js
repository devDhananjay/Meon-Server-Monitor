import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LOGIN_USER_COUNT } from '../config';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';
import { glassSurface } from '../theme/glass';
import { makeStyles } from '../theme/styles';

export default function LoginScreen() {
  const { theme, setTheme, handleLogin } = useMonitor();
  const c = getColors(theme);
  const s = makeStyles(c);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    const email = username.trim().toLowerCase();
    setLoading(true);
    setError('');
    try {
      await handleLogin(email, password);
    } catch (loginError) {
      setError(loginError.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center', flexGrow: 1 }]}>
          <View style={[s.panel, { overflow: 'hidden' }]}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 90,
                backgroundColor: 'rgba(56,213,255,0.08)',
              }}
            />
            <Image
              source={require('../../assets/favicon.png')}
              style={{ width: 72, height: 72, alignSelf: 'center', marginBottom: 16, borderRadius: 18 }}
              resizeMode="contain"
            />
            <Text style={s.scanline}>SECURE ACCESS</Text>
            <Text style={s.title}>Login to monitor product servers</Text>
            <Text style={[s.body, { marginTop: 8, marginBottom: 18 }]}>
              Use your MEON username and password to view live server health, service status, alerts, and timelines.
            </Text>

            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              placeholder="name@meon.co.in"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <Text style={[s.label, { marginTop: 12 }]}>Password</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[s.input, { paddingRight: 72 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={c.muted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword(current => !current)}
                hitSlop={8}
                style={[
                  glassSurface(c, theme),
                  {
                    position: 'absolute',
                    right: 8,
                    top: 12,
                    bottom: 6,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    overflow: 'hidden',
                  },
                ]}
              >
                <Text style={{ color: c.cyan, fontWeight: '700', fontSize: 12 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            {!!error && <Text style={s.error}>{error}</Text>}

            <Pressable style={[s.button, { marginTop: 18, opacity: loading ? 0.7 : 1 }]} onPress={submitLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#041018" /> : <Text style={s.buttonText}>Login</Text>}
            </Pressable>

            <View style={[s.spaceBetween, { marginTop: 16 }]}>
              <Text style={s.label}>Allowed users: {LOGIN_USER_COUNT}</Text>
              <Pressable
                style={[glassSurface(c, theme), s.ghostButton, { overflow: 'hidden' }]}
                onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Text style={s.ghostButtonText}>{theme === 'dark' ? 'Light' : 'Dark'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
