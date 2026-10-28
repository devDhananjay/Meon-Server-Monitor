/**
 * MEON Server Monitor
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MonitorProvider, useMonitor } from './src/context/MonitorContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initPushNotifications } from './src/services/pushNotifications';

function Root() {
  const { theme, currentUser } = useMonitor();
  const systemDark = useColorScheme() === 'dark';
  const isDark = theme ? theme === 'dark' : systemDark;

  useEffect(() => {
    if (!currentUser) return undefined;
    let cleanup = () => {};
    (async () => {
      const result = await initPushNotifications({
        onToken: token => {
          console.log('[FCM] token', token);
        },
        onForegroundMessage: message => {
          console.log('[FCM] foreground', message?.notification?.title || message?.messageId);
        },
      });
      if (typeof result.cleanup === 'function') cleanup = result.cleanup;
    })();
    return () => cleanup();
  }, [currentUser]);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MonitorProvider>
          <Root />
        </MonitorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
