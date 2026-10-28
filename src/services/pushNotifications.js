import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { queueNotificationRoute } from './notificationRouting';
import {
  displayForegroundNotification,
  ensureAndroidChannel,
  registerNotifeeOpenHandlers,
} from './notifeeNotifications';

function messaging() {
  return getMessaging();
}

export const PUSH_BUNDLE_ID = 'co.meon.servermonitor';

/**
 * Request permission + return current FCM registration token (or null).
 * Used at login and logout so the backend can store or drop device_token.
 */
export async function getFcmDeviceToken() {
  try {
    const msg = messaging();
    const authStatus = await requestPermission(msg);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(msg)) {
      await registerDeviceForRemoteMessages(msg);
    }

    await ensureAndroidChannel();

    return (await getToken(msg)) || null;
  } catch (error) {
    console.warn('[FCM] get token failed:', error?.message || error);
    return null;
  }
}

/**
 * Request notification permission + return FCM token (iOS/Android).
 * Foreground alerts via Notifee; open handlers for FCM + Notifee deep links.
 */
export async function initPushNotifications({ onToken, onForegroundMessage, onOpen } = {}) {
  try {
    const token = await getFcmDeviceToken();
    if (!token) {
      return { enabled: false, token: null };
    }

    const msg = messaging();
    if (typeof onToken === 'function') {
      onToken(token);
    }

    const handleOpen = remoteMessage => {
      if (!remoteMessage) return;
      queueNotificationRoute(remoteMessage);
      if (typeof onOpen === 'function') onOpen(remoteMessage);
    };

    const unsubToken = onTokenRefresh(msg, next => {
      if (typeof onToken === 'function') onToken(next);
    });

    const unsubMessage = onMessage(msg, async remoteMessage => {
      try {
        await displayForegroundNotification(remoteMessage);
      } catch (error) {
        console.warn('[Notifee] display failed:', error?.message || error);
      }
      if (typeof onForegroundMessage === 'function') {
        onForegroundMessage(remoteMessage);
      }
    });

    const unsubOpened = onNotificationOpenedApp(msg, handleOpen);
    const unsubNotifee = registerNotifeeOpenHandlers({ onOpen });

    getInitialNotification(msg)
      .then(remoteMessage => {
        if (remoteMessage) handleOpen(remoteMessage);
      })
      .catch(error => {
        console.warn('[FCM] getInitialNotification failed:', error?.message || error);
      });

    return {
      enabled: true,
      token,
      cleanup: () => {
        unsubToken();
        unsubMessage();
        unsubOpened();
        if (typeof unsubNotifee === 'function') unsubNotifee();
      },
    };
  } catch (error) {
    console.warn('[FCM] init failed:', error?.message || error);
    return { enabled: false, token: null, error };
  }
}

/** Background/quit handler — register once at app entry (index.js). */
export function registerBackgroundHandler() {
  try {
    setBackgroundMessageHandler(messaging(), async remoteMessage => {
      console.log('[FCM] background message', remoteMessage?.messageId);
    });
  } catch (error) {
    console.warn('[FCM] background handler failed:', error?.message || error);
  }
}
