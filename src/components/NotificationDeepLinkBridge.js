import { useEffect, useRef } from 'react';
import { useMonitor } from '../context/MonitorContext';
import {
  flushNotificationRoute,
  hasPendingNotificationRoute,
  subscribeNotificationRoute,
} from '../services/notificationRouting';

/**
 * Consumes queued FCM / Notifee deep links once the user is logged in
 * and products are available. Also reacts immediately when a notification
 * is tapped while the app is already open.
 */
export default function NotificationDeepLinkBridge() {
  const { currentUser, displayProducts } = useMonitor();
  const productsRef = useRef(displayProducts);
  productsRef.current = displayProducts;

  const tryFlush = () => {
    if (!currentUser || !hasPendingNotificationRoute()) return;
    let tries = 0;
    const tick = () => {
      const ok = flushNotificationRoute(productsRef.current || []);
      tries += 1;
      if (!ok && tries < 12 && hasPendingNotificationRoute()) {
        setTimeout(tick, 400);
      }
    };
    setTimeout(tick, 50);
  };

  useEffect(() => {
    if (!currentUser) return undefined;
    return subscribeNotificationRoute(() => {
      tryFlush();
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !hasPendingNotificationRoute()) return undefined;
    tryFlush();
    return undefined;
  }, [currentUser, displayProducts]);

  return null;
}
