import { Platform } from 'react-native';
import { queueNotificationRoute } from './notificationRouting';

const ANDROID_CHANNEL_ID = 'meon_server_alerts';

function getNotifee() {
  // Lazy require so Metro can load even before a native rebuild,
  // and so missing native binaries don't crash app boot.
  // eslint-disable-next-line global-require
  return require('@notifee/react-native').default;
}

function getEventType() {
  // eslint-disable-next-line global-require
  return require('@notifee/react-native').EventType;
}

function getAndroidImportance() {
  // eslint-disable-next-line global-require
  return require('@notifee/react-native').AndroidImportance;
}

function asDataStrings(data = {}) {
  const out = {};
  Object.keys(data || {}).forEach(key => {
    const value = data[key];
    if (value == null) return;
    out[key] = typeof value === 'string' ? value : String(value);
  });
  return out;
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return ANDROID_CHANNEL_ID;
  try {
    const notifee = getNotifee();
    const AndroidImportance = getAndroidImportance();
    return notifee.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'Server Alerts',
      description: 'MEON server health alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  } catch (error) {
    console.warn('[Notifee] createChannel failed:', error?.message || error);
    return ANDROID_CHANNEL_ID;
  }
}

/**
 * Show a local notification from an FCM remote message (foreground).
 */
export async function displayForegroundNotification(remoteMessage) {
  if (!remoteMessage) return null;

  try {
    const notifee = getNotifee();
    const AndroidImportance = getAndroidImportance();

    const title =
      remoteMessage.notification?.title ||
      remoteMessage.data?.title ||
      'Meon Servers';
    const body =
      remoteMessage.notification?.body ||
      remoteMessage.data?.body ||
      '';
    const data = asDataStrings(remoteMessage.data);
    const channelId = await ensureAndroidChannel();

    return notifee.displayNotification({
      id: remoteMessage.messageId || `fcm-${Date.now()}`,
      title,
      body,
      data,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          banner: true,
          list: true,
          sound: true,
          badge: true,
        },
      },
    });
  } catch (error) {
    console.warn('[Notifee] display failed (rebuild app if native module missing):', error?.message || error);
    return null;
  }
}

function routeFromNotifeeNotification(notification) {
  if (!notification) return;
  queueNotificationRoute({
    data: asDataStrings(notification.data),
    notification: {
      title: notification.title,
      body: notification.body,
    },
  });
}

/**
 * Wire Notifee press events → product deep link queue.
 */
export function registerNotifeeOpenHandlers({ onOpen } = {}) {
  try {
    const notifee = getNotifee();
    const EventType = getEventType();

    const unsubForeground = notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.PRESS) return;
      routeFromNotifeeNotification(detail.notification);
      if (typeof onOpen === 'function') onOpen(detail.notification);
    });

    notifee
      .getInitialNotification()
      .then(initial => {
        if (!initial?.notification) return;
        routeFromNotifeeNotification(initial.notification);
        if (typeof onOpen === 'function') onOpen(initial.notification);
      })
      .catch(error => {
        console.warn('[Notifee] getInitialNotification failed:', error?.message || error);
      });

    return unsubForeground;
  } catch (error) {
    console.warn('[Notifee] open handlers skipped:', error?.message || error);
    return () => {};
  }
}

/** Register once from index.js for background press handling. */
export function registerNotifeeBackgroundEvents() {
  try {
    const notifee = getNotifee();
    const EventType = getEventType();
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        routeFromNotifeeNotification(detail.notification);
      }
    });
  } catch (error) {
    console.warn('[Notifee] background events failed:', error?.message || error);
  }
}
