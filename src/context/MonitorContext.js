import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { productCatalog } from '../data';
import { apiFetch, clearSessionCookies, hydrateSessionCookies, normalizeList } from '../api/client';
import { getFcmDeviceToken, PUSH_BUNDLE_ID } from '../services/pushNotifications';
import {
  buildCurrentNotifications,
  mapBackendProduct,
  mergeBackendProductsPreservingDetails,
  preferLiveProducts,
  slugify,
  upsertProduct,
} from '../utils/monitor';

const MonitorContext = createContext(null);

export function MonitorProvider({ children }) {
  const [products, setProducts] = useState(productCatalog);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [backendNotice, setBackendNotice] = useState('');
  const [lastAutoSyncAt, setLastAutoSyncAt] = useState(null);
  const [alertEmails, setAlertEmails] = useState([]);
  const [mailLoading, setMailLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState('');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [canManageUsage, setCanManageUsage] = useState(false);
  const [managedUsers, setManagedUsers] = useState([]);
  const [managedUsersLoading, setManagedUsersLoading] = useState(false);
  const [alertRecipients, setAlertRecipients] = useState([]);
  const [alertRecipientsLoading, setAlertRecipientsLoading] = useState(false);
  const [customProductEndpoints, setCustomProductEndpoints] = useState([]);
  const [customProductsLoading, setCustomProductsLoading] = useState(false);
  const [reverseProxyEndpoints, setReverseProxyEndpoints] = useState([]);
  const [reverseProxyLoading, setReverseProxyLoading] = useState(false);
  const [disabledProductIds, setDisabledProductIds] = useState([]);
  const [savingMailTargetId, setSavingMailTargetId] = useState('');
  const [savingUsageTargetId, setSavingUsageTargetId] = useState('');
  const [riskItems, setRiskItems] = useState([]);
  const [riskPagination, setRiskPagination] = useState({ page: 1, pageSize: 12, totalPages: 1, count: 0, query: '' });
  const [riskLoading, setRiskLoading] = useState(false);
  const [savingRiskItemId, setSavingRiskItemId] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const pollingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('server-dashboard-theme').then(value => {
      if (value === 'light' || value === 'dark') setTheme(value);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('server-dashboard-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await hydrateSessionCookies();
        const response = await apiFetch('/auth/me');
        const data = response.ok ? await response.json().catch(() => null) : null;
        if (!active) return;
        if (data?.authenticated && data.email) {
          setCurrentUser(data.email);
          setCanManageUsers(Boolean(data.can_manage_users));
          setCanManageProducts(Boolean(data.can_manage_products));
          setCanManageUsage(Boolean(data.can_manage_usage));
        }
      } catch {
        // stay logged out
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await apiFetch('/products/');
      if (!response.ok) throw new Error(`Backend unavailable (${response.status})`);
      const data = await response.json();
      const productRows = Array.isArray(data) ? data : data.products || [];
      setDisabledProductIds(Array.isArray(data.disabled_slugs) ? data.disabled_slugs : []);
      setProducts(current => mergeBackendProductsPreservingDetails(current, productRows));
      setBackendNotice('');
    } catch (error) {
      setBackendNotice(`Backend unavailable. ${error.message}`);
      setDisabledProductIds([]);
      setProducts(productCatalog);
    }
  }, []);

  const loadProductDetail = useCallback(async (productId) => {
    try {
      const response = await apiFetch(`/products/${productId}/`);
      if (!response.ok) throw new Error(`Product detail unavailable (${response.status})`);
      const data = await response.json();
      setProducts(current => upsertProduct(current, data));
    } catch (error) {
      setBackendNotice(error.message);
    }
  }, []);

  const loadAlertEmails = useCallback(async () => {
    setMailLoading(true);
    try {
      const response = await apiFetch('/alert-emails/');
      if (!response.ok) throw new Error(`Mail history unavailable (${response.status})`);
      const data = await response.json();
      setAlertEmails(data);
    } catch (error) {
      setBackendNotice(error.message);
    } finally {
      setMailLoading(false);
    }
  }, []);

  const acknowledgeAlertEmail = useCallback(async (emailId, acknowledgedBy) => {
    try {
      const response = await apiFetch(`/alert-emails/${emailId}/acknowledge/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
      });
      if (!response.ok) throw new Error(`Acknowledge failed (${response.status})`);
      await loadAlertEmails();
    } catch (error) {
      setBackendNotice(error.message);
    }
  }, [loadAlertEmails]);

  const loadManagedUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setManagedUsersLoading(true);
    try {
      const response = await apiFetch('/auth/users');
      const data = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(data.detail || `User list unavailable (${response.status})`);
      setManagedUsers(normalizeList(data, ['users', 'results', 'items', 'data']));
    } catch (error) {
      setBackendNotice(error.message);
      setManagedUsers([]);
    } finally {
      setManagedUsersLoading(false);
    }
  }, [canManageUsers]);

  const loadAlertRecipients = useCallback(async () => {
    if (!canManageUsers) return;
    setAlertRecipientsLoading(true);
    try {
      const response = await apiFetch('/auth/alert-recipients');
      const data = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(data.detail || `Recipient list unavailable (${response.status})`);
      setAlertRecipients(normalizeList(data, ['recipients', 'results', 'items', 'data']));
    } catch (error) {
      setBackendNotice(error.message);
      setAlertRecipients([]);
    } finally {
      setAlertRecipientsLoading(false);
    }
  }, [canManageUsers]);

  const loadCustomProductEndpoints = useCallback(async () => {
    if (!canManageProducts) return;
    setCustomProductsLoading(true);
    try {
      const response = await apiFetch('/products/custom/');
      const data = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(data.detail || `Product API list unavailable (${response.status})`);
      setCustomProductEndpoints(data);
    } catch (error) {
      setBackendNotice(error.message);
    } finally {
      setCustomProductsLoading(false);
    }
  }, [canManageProducts]);

  const loadReverseProxyServers = useCallback(async () => {
    setReverseProxyLoading(true);
    try {
      const response = await apiFetch('/reverse-proxy-servers/');
      const data = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(data.detail || `Reverse proxy list unavailable (${response.status})`);
      setReverseProxyEndpoints((Array.isArray(data) ? data : []).map(endpoint => ({
        ...endpoint,
        product: endpoint.product ? mapBackendProduct(endpoint.product) : null,
      })));
    } catch (error) {
      setBackendNotice(error.message);
    } finally {
      setReverseProxyLoading(false);
    }
  }, []);

  const loadRiskManagement = useCallback(async (options = {}) => {
    const nextPage = options.page ?? riskPagination.page;
    const nextQuery = options.query ?? riskPagination.query;
    const nextPageSize = options.pageSize ?? riskPagination.pageSize;
    setRiskLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(nextPageSize),
      });
      if (nextQuery.trim()) params.set('q', nextQuery.trim());
      if (options.refresh) params.set('refresh', '1');
      const response = await apiFetch(`/risk-management/?${params.toString()}`);
      const data = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(data.detail || `Risk data unavailable (${response.status})`);
      const rows = Array.isArray(data) ? data : data.results || [];
      setRiskItems(rows);
      setRiskPagination({
        page: Array.isArray(data) ? nextPage : data.page || nextPage,
        pageSize: Array.isArray(data) ? nextPageSize : data.page_size || nextPageSize,
        totalPages: Array.isArray(data) ? 1 : data.total_pages || 1,
        count: Array.isArray(data) ? rows.length : data.count || rows.length,
        query: nextQuery,
      });
      setBackendNotice('');
    } catch (error) {
      setRiskItems([]);
      setRiskPagination(current => ({ ...current, count: 0, totalPages: 1, page: 1 }));
      setBackendNotice(error.message);
    } finally {
      setRiskLoading(false);
    }
  }, [riskPagination.page, riskPagination.pageSize, riskPagination.query]);

  const loadRiskProductDetail = useCallback(async (productSlug) => {
    if (!productSlug) return;
    setRiskLoading(true);
    try {
      const response = await apiFetch(`/risk-management/${productSlug}/`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Risk product detail unavailable (${response.status})`);
      setRiskItems(current => {
        const exists = current.some(product => product.slug === productSlug);
        if (exists) return current.map(product => (product.slug === productSlug ? data : product));
        return [data, ...current];
      });
      setBackendNotice('');
    } catch (error) {
      setBackendNotice(error.message);
    } finally {
      setRiskLoading(false);
    }
  }, []);

  const syncReverseProxyServers = useCallback(async (silent = false) => {
    if (!silent) {
      setReverseProxyLoading(true);
      setBackendNotice('');
    }
    try {
      const response = await apiFetch('/reverse-proxy-servers/sync/', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Reverse proxy sync failed (${response.status})`);
      const rows = Array.isArray(data.reverse_proxies) ? data.reverse_proxies : [];
      setReverseProxyEndpoints(rows.map(endpoint => ({
        ...endpoint,
        product: endpoint.product ? mapBackendProduct(endpoint.product) : null,
      })));
      return data;
    } catch (error) {
      if (!silent) setBackendNotice(error.message);
      return { reverse_proxies: [], errors: [{ error: error.message }] };
    } finally {
      if (!silent) setReverseProxyLoading(false);
    }
  }, []);

  const syncLiveProducts = useCallback(async (silent = false, onlyProductId = null) => {
    if (pollingRef.current) {
      if (!silent) {
        setSyncing(true);
        setBackendNotice('Sync is already running. Please wait a moment.');
        setTimeout(() => setSyncing(false), 900);
      }
      return;
    }
    pollingRef.current = true;
    const detailProductIds = onlyProductId ? [onlyProductId] : [];
    if (!silent) {
      setSyncing(true);
      setBackendNotice('');
    }
    try {
      const syncedNames = [];
      let syncErrorCount = 0;
      let syncWasSkipped = false;
      let syncRetryAfter = 0;
      if (!onlyProductId) {
        const response = await apiFetch('/products/sync-live/', { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `Live product sync failed (${response.status})`);
        const syncedProducts = Array.isArray(data) ? data : data.products || [];
        const syncErrors = Array.isArray(data) ? [] : data.errors || [];
        syncWasSkipped = !Array.isArray(data) && data.sync_skipped;
        syncRetryAfter = data.retry_after_seconds || 0;
        syncErrorCount = syncErrors.length;
        syncedProducts.forEach(product => {
          setProducts(current => upsertProduct(current, product));
          syncedNames.push(product.name);
        });
        const reverseProxyData = await syncReverseProxyServers(true);
        syncErrorCount += (reverseProxyData.errors || []).length;
        (reverseProxyData.reverse_proxies || []).forEach(endpoint => syncedNames.push(endpoint.name));
      }
      for (const productId of detailProductIds) {
        const response = await apiFetch(`/products/${productId}/sync/?detail=1`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `Sync failed (${response.status})`);
        setProducts(current => upsertProduct(current, data));
        syncedNames.push(data.name || productId);
      }
      if (!silent && onlyProductId) await loadProductDetail(onlyProductId);
      await loadAlertEmails();
      setLastAutoSyncAt(new Date());
      if (!silent) {
        setBackendNotice(
          syncWasSkipped
            ? `Sync is already controlled by the 30s interval.${syncRetryAfter ? ` Try again in ${syncRetryAfter}s.` : ''}`
            : syncErrorCount
              ? `${syncErrorCount} product API${syncErrorCount === 1 ? '' : 's'} failed, synced ${syncedNames.length}.`
              : `${syncedNames.join(', ')} data synced and stored in SQLite.`
        );
      }
    } catch (error) {
      await loadProducts();
      if (!silent) setBackendNotice(error.message);
    } finally {
      if (!silent) setSyncing(false);
      pollingRef.current = false;
    }
  }, [loadAlertEmails, loadProductDetail, loadProducts, syncReverseProxyServers]);

  useEffect(() => {
    if (!currentUser) return undefined;
    loadProducts();
    loadAlertEmails();
    loadReverseProxyServers();
    syncLiveProducts(true);
    const intervalId = setInterval(() => syncLiveProducts(true), 30000);
    return () => clearInterval(intervalId);
  }, [currentUser, loadAlertEmails, loadProducts, loadReverseProxyServers, syncLiveProducts]);

  useEffect(() => {
    if (!currentUser || !canManageUsers) return;
    loadManagedUsers();
    loadAlertRecipients();
  }, [currentUser, canManageUsers, loadManagedUsers, loadAlertRecipients]);

  const handleLogin = async (email, password) => {
    const deviceToken = await getFcmDeviceToken();
    const payload = { email, password };
    if (deviceToken) {
      payload.device_token = deviceToken;
      payload.platform = Platform.OS === 'ios' ? 'ios' : 'android';
      payload.bundle_id = PUSH_BUNDLE_ID;
    }

    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Invalid username or password.');

    // Give native cookie jar a beat, then verify session without JS Cookie header.
    let me = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 150 * attempt));
      }
      const meResponse = await apiFetch('/auth/me');
      me = meResponse.ok ? await meResponse.json().catch(() => null) : null;
      if (me?.authenticated && me.email) break;
    }
    if (!me?.authenticated || !me.email) {
      throw new Error('Login succeeded but session cookie was not saved. Please try again.');
    }

    setCurrentUser(me.email || data.email);
    setCanManageUsers(Boolean(me.can_manage_users ?? data.can_manage_users));
    setCanManageProducts(Boolean(me.can_manage_products ?? data.can_manage_products));
    setCanManageUsage(Boolean(me.can_manage_usage ?? data.can_manage_usage));
  };

  const handleLogout = async () => {
    try {
      const deviceToken = await getFcmDeviceToken();
      const payload = {};
      if (deviceToken) payload.device_token = deviceToken;
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Local session still clears if the server call fails.
    }
    await clearSessionCookies();
    setCurrentUser('');
    setCanManageUsers(false);
    setCanManageProducts(false);
    setCanManageUsage(false);
    setManagedUsers([]);
    setAlertRecipients([]);
    setCustomProductEndpoints([]);
    setReverseProxyEndpoints([]);
    setRiskItems([]);
    setBackendNotice('');
    setLastAutoSyncAt(null);
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    const response = await apiFetch('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser,
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Password change failed.');
  };

  const updateServerMailAlert = async (product, server, enabled) => {
    const targetId = `server-${product.id}-${server.id}`;
    setSavingMailTargetId(targetId);
    try {
      const response = await apiFetch(`/products/${product.id}/servers/${server.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail_alert_enabled: enabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Mail alert setting update failed.');
      if (data.product) setProducts(current => upsertProduct(current, data.product));
      else setProducts(current => upsertProduct(current, data));
      await loadProductDetail(product.id);
      setBackendNotice(`${server.name} mail alerts ${enabled ? 'enabled' : 'muted'}.`);
    } catch (error) {
      setBackendNotice(error.message);
    } finally {
      setSavingMailTargetId('');
    }
  };

  const updateServiceMailAlert = async (product, service, enabled) => {
    const targetId = `service-${product.id}-${service.id}`;
    setSavingMailTargetId(targetId);
    try {
      const response = await apiFetch(`/products/${product.id}/services/${service.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail_alert_enabled: enabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Mail alert setting update failed.');
      await loadProductDetail(product.id);
      setBackendNotice(`${service.name} mail alerts ${enabled ? 'enabled' : 'muted'}.`);
    } catch (error) {
      setBackendNotice(error.message);
    } finally {
      setSavingMailTargetId('');
    }
  };


  const createManagedUser = async (payload) => {
    const response = await apiFetch('/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'User create failed.');
    await loadManagedUsers();
  };

  const updateManagedUser = async (userId, payload) => {
    const response = await apiFetch(`/auth/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'User update failed.');
    await loadManagedUsers();
    if (data.email === currentUser) {
      setCanManageUsers(Boolean(data.can_manage_users));
      setCanManageProducts(Boolean(data.can_manage_products));
      setCanManageUsage(Boolean(data.can_manage_usage));
    }
  };

  const deleteManagedUser = async (userId) => {
    if (userId == null || userId === '' || userId === 'undefined') {
      throw new Error('Cannot delete user: missing user id.');
    }
    const response = await apiFetch(`/auth/users/${userId}`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map(item => item?.msg || item).join(', ')
          : data?.error;
      throw new Error(detail || `User delete failed (${response.status}).`);
    }
    // Remove locally first so UI updates even if reload is slow
    setManagedUsers(current => (Array.isArray(current) ? current.filter(user => String(user.id) !== String(userId)) : []));
    await loadManagedUsers();
  };

  const createAlertRecipient = async (payload) => {
    const response = await apiFetch('/auth/alert-recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Recipient add failed.');
    await loadAlertRecipients();
  };

  const updateAlertRecipient = async (recipientId, payload) => {
    const response = await apiFetch(`/auth/alert-recipients/${recipientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Recipient update failed.');
    await loadAlertRecipients();
  };

  const deleteAlertRecipient = async (recipientId) => {
    if (recipientId == null || recipientId === '' || recipientId === 'undefined') {
      throw new Error('Cannot delete recipient: missing id.');
    }
    const response = await apiFetch(`/auth/alert-recipients/${recipientId}`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `Recipient delete failed (${response.status}).`);
    }
    setAlertRecipients(current => (
      Array.isArray(current) ? current.filter(item => String(item.id) !== String(recipientId)) : []
    ));
    await loadAlertRecipients();
  };

  const refreshAccessManagement = useCallback(async () => {
    await Promise.all([loadManagedUsers(), loadAlertRecipients()]);
  }, [loadManagedUsers, loadAlertRecipients]);

  const testCustomProductEndpoint = async (payload) => {
    const response = await apiFetch('/products/custom/test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.detail || 'API test failed.');
    return data;
  };

  const createCustomProductEndpoint = async (payload) => {
    const response = await apiFetch('/products/custom/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.detail || 'Product add failed.');
    await loadCustomProductEndpoints();
    await syncLiveProducts(true, data.endpoint?.slug);
    await loadProducts();
    return data;
  };

  const updateCustomProductEndpoint = async (endpointId, payload) => {
    const response = await apiFetch(`/products/custom/${endpointId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Product API update failed.');
    await loadCustomProductEndpoints();
    return data;
  };

  const deleteCustomProductEndpoint = async (endpoint) => {
    const response = await apiFetch(`/products/custom/${endpoint.slug}/delete/`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Product API delete failed.');
    setDisabledProductIds(current => (current.includes(endpoint.slug) ? current : current.concat(endpoint.slug)));
    setProducts(current => current.filter(product => product.id !== endpoint.slug && slugify(product.name) !== slugify(endpoint.name)));
    await loadCustomProductEndpoints();
    await loadProducts();
  };

  const createReverseProxyServer = async (payload) => {
    const response = await apiFetch('/reverse-proxy-servers/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Reverse proxy server add failed.');
    await loadReverseProxyServers();
    await loadAlertEmails();
    return data;
  };

  const updateReverseProxyServer = async (endpointId, payload) => {
    const response = await apiFetch(`/reverse-proxy-servers/${endpointId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Reverse proxy server update failed.');
    await loadReverseProxyServers();
    await loadAlertEmails();
    return data;
  };

  const deleteReverseProxyServer = async (endpoint) => {
    const response = await apiFetch(`/reverse-proxy-servers/${endpoint.id}/`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Reverse proxy server delete failed.');
    setReverseProxyEndpoints(current => current.filter(item => item.id !== endpoint.id));
    await loadAlertEmails();
    return data;
  };

  const saveServerUsageConfig = async (product, server, payload) => {
    const targetId = `usage-${product.id}-${server.id}`;
    setSavingUsageTargetId(targetId);
    try {
      const response = await apiFetch(`/products/${product.id}/servers/${server.id}/usage-config/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Usage API configuration failed.');
      await loadProductDetail(product.id);
      return data;
    } finally {
      setSavingUsageTargetId('');
    }
  };

  const syncServerUsage = async (product, server) => {
    const targetId = `usage-${product.id}-${server.id}`;
    setSavingUsageTargetId(targetId);
    try {
      const response = await apiFetch(`/products/${product.id}/servers/${server.id}/usage-sync/`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Usage API check failed.');
      if (data.product) setProducts(current => upsertProduct(current, data.product));
      await loadAlertEmails();
      return data.result || {};
    } finally {
      setSavingUsageTargetId('');
    }
  };

  const clearServerUsageLogs = async (product, server, dateFrom, dateTo) => {
    const targetId = `usage-${product.id}-${server.id}`;
    setSavingUsageTargetId(targetId);
    try {
      const response = await apiFetch(`/products/${product.id}/servers/${server.id}/usage-logs/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Usage log deletion failed.');
      await loadProductDetail(product.id);
      return data;
    } finally {
      setSavingUsageTargetId('');
    }
  };

  const updateRiskChecklistItem = async (productSlug, category, item, isSafe, comment, productName = '') => {
    const targetId = `${productSlug}-${category}-${item}`;
    setSavingRiskItemId(targetId);
    try {
      const payload = { category, item, product_name: productName };
      if (typeof isSafe === 'boolean') payload.is_safe = isSafe;
      if (typeof comment === 'string') payload.comment = comment;
      const response = await apiFetch(`/risk-management/${productSlug}/items/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Risk checklist update failed (${response.status})`);
      setRiskItems(current => current.map(product => (product.slug === productSlug ? data : product)));
      setBackendNotice('');
      return data;
    } catch (error) {
      setBackendNotice(error.message);
      throw error;
    } finally {
      setSavingRiskItemId('');
    }
  };


  const displayProducts = useMemo(
    () => preferLiveProducts(products).filter(product => !disabledProductIds.includes(product.id)),
    [products, disabledProductIds]
  );

  const filteredProducts = useMemo(() => displayProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(query.toLowerCase())
      || product.server.toLowerCase().includes(query.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || product.status === statusFilter);
  }), [displayProducts, query, statusFilter]);

  const liveProducts = displayProducts.filter(product => product.hasLiveData);
  const reverseProxyProducts = useMemo(
    () => reverseProxyEndpoints.map(endpoint => endpoint.product).filter(Boolean),
    [reverseProxyEndpoints]
  );
  const currentNotifications = useMemo(
    () => buildCurrentNotifications([...displayProducts, ...reverseProxyProducts]),
    [displayProducts, reverseProxyProducts]
  );

  const stats = useMemo(() => {
    const healthyCount = displayProducts.filter(product => product.status === 'healthy').length;
    const unhealthyCount = displayProducts.filter(product => product.status === 'unhealthy').length;
    const criticalCount = displayProducts.filter(product => product.status === 'critical').length;
    const warningCount = displayProducts.filter(product => product.status === 'warning').length;
    const totalServices = displayProducts.reduce((count, product) => count + product.services.length, 0);
    const runningServices = displayProducts.reduce((count, product) => count + product.services.filter(s => s.status === 'up').length, 0);
    const degradedServices = displayProducts.reduce((count, product) => count + product.services.filter(s => s.status === 'slow').length, 0);
    const downServices = displayProducts.reduce((count, product) => count + product.services.filter(s => s.status === 'down').length, 0);
    const avgLiveCpu = Math.round(liveProducts.reduce((sum, product) => sum + product.cpu, 0) / Math.max(liveProducts.length, 1));
    const avgLiveRam = Math.round(liveProducts.reduce((sum, product) => sum + product.ram, 0) / Math.max(liveProducts.length, 1));
    const avgLiveDisk = Math.round(liveProducts.reduce((sum, product) => sum + product.disk, 0) / Math.max(liveProducts.length, 1));
    const avgLiveNetwork = Math.round(liveProducts.reduce((sum, product) => sum + product.network, 0) / Math.max(liveProducts.length, 1));
    const healthScore = Math.round((healthyCount / Math.max(liveProducts.length, 1)) * 100);
    const serviceUptime = Math.round((runningServices / Math.max(totalServices, 1)) * 100);
    const openAlerts = displayProducts.reduce((count, product) => count + (product.alerts || 0), 0);
    const avgResponse = Math.round(
      displayProducts.reduce(
        (sum, product) => sum + product.services.reduce((serviceSum, service) => serviceSum + (service.latency || service.latency_ms || 0), 0),
        0
      ) / Math.max(totalServices, 1)
    );
    return {
      healthyCount, unhealthyCount, criticalCount, warningCount, totalServices, runningServices,
      degradedServices, downServices, avgLiveCpu, avgLiveRam, avgLiveDisk, avgLiveNetwork,
      healthScore, serviceUptime, openAlerts, avgResponse, liveCount: liveProducts.length,
    };
  }, [displayProducts, liveProducts]);

  const value = {
    products, displayProducts, filteredProducts, query, setQuery, statusFilter, setStatusFilter,
    syncing, backendNotice, setBackendNotice, lastAutoSyncAt, alertEmails, mailLoading,
    theme, setTheme, currentUser, canManageUsers, canManageProducts, canManageUsage,
    managedUsers, managedUsersLoading, alertRecipients, alertRecipientsLoading,
    customProductEndpoints, customProductsLoading, reverseProxyEndpoints, reverseProxyLoading,
    savingMailTargetId, savingUsageTargetId, riskItems, riskPagination, riskLoading, savingRiskItemId,
    authChecked, stats, currentNotifications, liveProducts,
    loadProducts, loadProductDetail, loadAlertEmails, acknowledgeAlertEmail,
    loadManagedUsers, loadAlertRecipients, loadCustomProductEndpoints, loadReverseProxyServers,
    loadRiskManagement, loadRiskProductDetail, syncLiveProducts, syncReverseProxyServers,
    handleLogin, handleLogout, handleChangePassword, updateServerMailAlert, updateServiceMailAlert,
    createManagedUser, updateManagedUser, deleteManagedUser,
    createAlertRecipient, updateAlertRecipient, deleteAlertRecipient, refreshAccessManagement,
    testCustomProductEndpoint, createCustomProductEndpoint, updateCustomProductEndpoint, deleteCustomProductEndpoint,
    createReverseProxyServer, updateReverseProxyServer, deleteReverseProxyServer,
    saveServerUsageConfig, syncServerUsage, clearServerUsageLogs, updateRiskChecklistItem,
    setSavingRiskItemId, setRiskItems, setRiskPagination, setSavingUsageTargetId, setCustomProductEndpoints,
    setManagedUsers, setAlertRecipients, setReverseProxyEndpoints, setDisabledProductIds, setProducts,
    slugify,
  };

  return <MonitorContext.Provider value={value}>{children}</MonitorContext.Provider>;
}

export function useMonitor() {
  const ctx = useContext(MonitorContext);
  if (!ctx) throw new Error('useMonitor must be used inside MonitorProvider');
  return ctx;
}
