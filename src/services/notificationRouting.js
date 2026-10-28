import { slugify } from '../utils/monitor';
import { navigateRoot } from '../navigation/navigationRef';

let pendingRoute = null;
let pendingAttempts = 0;
const routeListeners = new Set();

/**
 * Expected FCM data (all string values):
 * {
 *   product_id | product_slug | product: "esign",
 *   server_id | server_slug | server?: "esign-live-server",
 *   type?: "server_critical" | "server_recovery" | ...
 * }
 */
export function parseNotificationRoute(remoteMessage) {
  const data = remoteMessage?.data || {};
  const productRaw =
    data.product_id ||
    data.product_slug ||
    data.product ||
    data.slug ||
    data.product_name ||
    '';
  const serverRaw = data.server_id || data.server_slug || data.server || data.server_name || '';

  const productKey = String(productRaw || '').trim();
  const serverKey = String(serverRaw || '').trim();
  if (!productKey) return null;

  if (serverKey) {
    return {
      screen: 'ServerDetail',
      productKey,
      serverKey,
      params: null,
    };
  }

  return {
    screen: 'ProductDetail',
    productKey,
    serverKey: '',
    params: null,
  };
}

/** Notify UI when a deep link is queued (tap while app already open). */
export function subscribeNotificationRoute(listener) {
  if (typeof listener !== 'function') return () => {};
  routeListeners.add(listener);
  return () => routeListeners.delete(listener);
}

function notifyRouteListeners() {
  routeListeners.forEach(listener => {
    try {
      listener(pendingRoute);
    } catch (error) {
      console.warn('[FCM] route listener failed:', error?.message || error);
    }
  });
}

function resolveProductId(products, productKey) {
  if (!productKey || !Array.isArray(products)) return '';
  const key = slugify(productKey);
  const match = products.find(
    item =>
      item.id === productKey ||
      slugify(item.id) === key ||
      slugify(item.name || '') === key ||
      slugify(item.slug || '') === key,
  );
  return match?.id || (key || productKey);
}

function resolveServerId(product, serverKey) {
  if (!product || !serverKey) return '';
  const key = slugify(serverKey);
  const match = (product.servers || []).find(
    item => item.id === serverKey || slugify(item.id) === key || slugify(item.name || '') === key,
  );
  return match?.id || serverKey;
}

export function queueNotificationRoute(remoteMessage) {
  const route = parseNotificationRoute(remoteMessage);
  if (!route) {
    console.warn('[FCM] deep link skipped — missing product in data', remoteMessage?.data);
    return;
  }
  pendingRoute = route;
  pendingAttempts = 0;
  console.log('[FCM] queued deep link', route);
  notifyRouteListeners();
}

export function flushNotificationRoute(products = []) {
  if (!pendingRoute) return false;

  const productId = resolveProductId(products, pendingRoute.productKey);
  if (!productId) {
    pendingAttempts += 1;
    return false;
  }

  if (pendingRoute.screen === 'ServerDetail') {
    const product = products.find(item => item.id === productId);
    const serverId = resolveServerId(product, pendingRoute.serverKey) || pendingRoute.serverKey;
    const ok = navigateRoot('ServerDetail', { productId, serverId });
    if (ok) {
      console.log('[FCM] navigated ServerDetail', { productId, serverId });
      pendingRoute = null;
      pendingAttempts = 0;
    } else {
      pendingAttempts += 1;
    }
    return ok;
  }

  const ok = navigateRoot('ProductDetail', { productId });
  if (ok) {
    console.log('[FCM] navigated ProductDetail', { productId });
    pendingRoute = null;
    pendingAttempts = 0;
  } else {
    pendingAttempts += 1;
  }
  return ok;
}

export function hasPendingNotificationRoute() {
  return Boolean(pendingRoute);
}
