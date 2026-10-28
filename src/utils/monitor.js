import { productCatalog } from '../data';
export const statusMeta = {
  pending: { label: 'Not synced', color: '#6f8d98' },
  healthy: { label: 'Healthy', color: '#43e28e' },
  warning: { label: 'Warning', color: '#ffc65a' },
  critical: { label: 'Critical', color: '#ff7a45' },
  unhealthy: { label: 'Unhealthy', color: '#ff5b77' }
};

export const dayFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });

export function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function statusFromServers(servers) {
  if (servers.some(server => server.status === 'unhealthy')) return 'unhealthy';
  if (servers.some(server => server.status === 'critical')) return 'critical';
  if (servers.some(server => server.status === 'warning')) return 'warning';
  return 'healthy';
}

export const STATUS_SEVERITY = {
  healthy: 0,
  warning: 1,
  critical: 2,
  unhealthy: 3
};

export function strongestStatus(...statuses) {
  return statuses.reduce((strongest, status) => {
    const normalized = String(status || 'healthy').toLowerCase();
    return (STATUS_SEVERITY[normalized] ?? 0) > (STATUS_SEVERITY[strongest] ?? 0)
      ? normalized
      : strongest;
  }, 'healthy');
}

export function getGpuMetrics(server) {
  if (Array.isArray(server?.gpu) && server.gpu.length) return server.gpu;

  const stored = server?.raw_payload || {};
  if (Array.isArray(stored.gpu) && stored.gpu.length) return stored.gpu;

  const payload = stored.raw_payload?.payload || stored.payload || {};
  if (Array.isArray(payload.gpu) && payload.gpu.length) return payload.gpu;
  if (Array.isArray(payload.system?.gpu) && payload.system.gpu.length) return payload.system.gpu;

  return [];
}

export function getGpuSummary(server) {
  const metrics = getGpuMetrics(server);
  const getMemory = gpu => Number(
    gpu?.memory_usage_percent
    ?? gpu?.gpu_memory_usage_percent
    ?? gpu?.gpu_consumed_percent
    ?? 0
  ) || 0;
  const getUtilization = gpu => Number(
    gpu?.utilization_percent
    ?? gpu?.gpu_utilization_percent
    ?? 0
  ) || 0;
  const getFreeMemory = gpu => Number(gpu?.free_gb ?? gpu?.gpu_free_gb);
  const memory = metrics.reduce((max, gpu) => Math.max(max, getMemory(gpu)), 0);
  const utilization = metrics.reduce((max, gpu) => Math.max(max, getUtilization(gpu)), 0);
  const lowFreeMemory = metrics.some(gpu => {
    const freeMemory = getFreeMemory(gpu);
    return Number.isFinite(freeMemory) && freeMemory <= 1;
  });
  return {
    metrics,
    available: metrics.length > 0,
    memory,
    utilization,
    lowFreeMemory,
    peak: Math.max(memory, utilization)
  };
}

export function resourceAwareServerStatus(server) {
  const reportedStatus = String(server.status || 'healthy').toLowerCase();
  if (reportedStatus === 'unhealthy') return 'unhealthy';

  const gpu = getGpuSummary(server);
  if (server.gpu_required && (!gpu.available || gpu.lowFreeMemory)) return 'unhealthy';
  const peakUsage = Math.max(
    Number(server.cpu) || 0,
    Number(server.ram) || 0,
    Number(server.disk) || 0,
    gpu.peak
  );
  if (peakUsage >= 90) return 'critical';
  if (peakUsage >= 85) return 'warning';
  return strongestStatus(reportedStatus);
}

export function nodePayloadFromServer(server) {
  return server?.raw_payload?.raw_payload?.payload || server?.raw_payload?.payload || {};
}

export function mapLogStreams(server) {
  const payload = nodePayloadFromServer(server);
  return Array.isArray(payload.hot_logs)
    ? payload.hot_logs.filter(Boolean).map(log => ({
      id: log.id || slugify(log.label || 'log'),
      name: log.label || log.id || 'Log stream',
      path: log.path || log.file || '',
      exists: Boolean(log.exists),
      status: log.exists ? 'up' : 'down',
      latency: log.growth_bytes_per_minute || 0,
      uptime: log.growth_display_per_minute || log.current_size_display || 'available',
      currentSize: log.current_size_display || '',
      raw: log
    }))
    : [];
}

export function mapTrafficMetrics(server) {
  const payload = nodePayloadFromServer(server);
  const metrics = payload.request_metrics || {};
  if (!Object.keys(metrics).length) return [];
  const last1m = Number(metrics.last_1m || 0);
  const last5m = Number(metrics.last_5m || 0);
  const failures = Number(metrics.failed || metrics.errors || metrics.error_count || 0);
  const hasTrafficIssue = failures > 0 || String(metrics.status || '').toLowerCase().includes('error');
  return [{
    id: 'request-traffic',
    name: 'Request Traffic',
    port: 'access',
    status: hasTrafficIssue ? 'slow' : 'up',
    latency: last1m,
    uptime: `${last5m} req/5m`,
    last1m,
    last5m,
    raw: metrics
  }];
}

export function getServerConnections(server) {
  const payload = nodePayloadFromServer(server);
  const metrics = payload.request_metrics || {};
  const metricValue = metrics.established ?? metrics.connections ?? metrics.conns ?? metrics.active_connections;
  if (metricValue != null) return Number(metricValue) || 0;

  return (payload.services || []).reduce((total, service) => {
    const sockets = Array.isArray(service?.sockets) ? service.sockets : [];
    return total + sockets.reduce((socketTotal, socket) => socketTotal + (Number(socket?.established) || 0), 0);
  }, 0);
}

export function hasNetworkPercent(server) {
  const payload = nodePayloadFromServer(server);
  const system = payload.system || {};
  const networkMetrics = system.network || {};
  return Boolean(
    system.network_percent != null
    || system.network_usage != null
    || networkMetrics.percent != null
    || networkMetrics.network_percent != null
    || networkMetrics.network_usage != null
    || networkMetrics.usage_percent != null
  );
}

export function getFourthMetric(server) {
  if (hasNetworkPercent(server)) {
    return {
      label: 'Network',
      shortLabel: 'Net',
      value: server.network || 0,
      suffix: '%',
      iconName: 'network',
      color: '#7de3a1',
      detail: 'real network metric'
    };
  }
  return {
    label: 'Conns',
    shortLabel: 'Conns',
    value: getServerConnections(server),
    suffix: '',
    iconName: 'terminal',
    color: '#7de3a1',
    detail: 'established connections'
  };
}

export function mapNodeAlerts(server) {
  const payload = nodePayloadFromServer(server);
  return Array.isArray(payload.alerts)
    ? payload.alerts.filter(Boolean).map((alert, index) => {
      const severity = String(alert.severity || 'warning').toLowerCase();
      const message = String(alert.message || alert.label || '').toLowerCase();
      const isDownAlert = ['critical', 'error', 'down', 'unhealthy', 'failed', 'fail'].includes(severity);
      const hasCriticalResource = Math.max(
        Number(server.cpu) || 0,
        Number(server.ram) || 0,
        Number(server.disk) || 0
      ) >= 90;
      const isCriticalResourceAlert = hasCriticalResource
        && /cpu|ram|memory|disk|resource|usage/.test(message);
      return {
        id: alert.id || `alert-${index}`,
        name: alert.message || alert.label || 'Node alert',
        port: severity,
        status: isDownAlert ? 'down' : isCriticalResourceAlert ? 'critical' : 'slow',
        latency: 0,
        uptime: severity,
        raw: alert
      };
    })
    : [];
}

export function mapBackendProduct(product) {
  const servers = (product.servers || []).map(server => {
    const mappedServer = {
      id: server.slug,
      name: server.name,
      server: server.name,
      region: server.region || 'KYC',
      ip: server.ip_address || 'unknown',
      status: resourceAwareServerStatus(server),
      lastSeenAt: server.last_seen_at,
      cpu: server.cpu || 0,
      ram: server.ram || 0,
      disk: server.disk || 0,
      network: server.network || 0,
      gpu: Array.isArray(server.gpu) ? server.gpu : [],
      gpuRequired: Boolean(server.gpu_required),
      gpuStatus: server.gpu_status || 'healthy',
      raw_payload: server.raw_payload || {},
      logEntries: server.log_entries || [],
      healthEvents: server.health_events || [],
      ramUsageLogs: server.ram_usage_logs || [],
      usageConfig: server.usage_config || null,
      usageApiConfigured: Boolean(server.usage_api_configured || server.usage_config),
      usageLogs: server.usage_logs || [],
      mailAlertEnabled: server.mail_alert_enabled !== false,
      services: (server.services || []).map(service => ({
        ...service,
        id: service.slug,
        name: service.name,
        port: service.port || '-',
        status: service.status,
        latency: service.latency_ms || 0,
        uptime: service.uptime || '99.0%',
        mailAlertEnabled: service.mail_alert_enabled !== false,
        events: service.events || []
      }))
    };
    mappedServer.logs = mapLogStreams(mappedServer);
    mappedServer.traffic = mapTrafficMetrics(mappedServer);
    mappedServer.nodeAlerts = mapNodeAlerts(mappedServer);
    return mappedServer;
  });
  const primaryServer = servers[0] || {};
  const allServices = servers.flatMap(server => server.services.map(service => ({ ...service, serverName: server.name, serverId: server.id })));
  const alerts = product.alerts ?? servers.reduce((count, server) => count + server.services.filter(service => service.status !== 'up').length, 0);
  const availableGpuServers = servers.map(getGpuSummary).filter(summary => summary.available);
  const gpuRequired = servers.some(server => server.gpuRequired);
  const gpu = availableGpuServers.length
    ? Math.round(availableGpuServers.reduce((sum, summary) => sum + summary.memory, 0) / availableGpuServers.length)
    : null;

  return {
    id: product.slug,
    name: product.name,
    monitorType: product.monitor_type || 'server',
    server: primaryServer.name || `${product.name} servers`,
    region: primaryServer.region || 'Backend',
    ip: primaryServer.ip || '',
    status: strongestStatus(product.status, statusFromServers(servers)),
    cpu: Math.round(servers.reduce((sum, server) => sum + server.cpu, 0) / Math.max(servers.length, 1)),
    ram: Math.round(servers.reduce((sum, server) => sum + server.ram, 0) / Math.max(servers.length, 1)),
    disk: Math.round(servers.reduce((sum, server) => sum + server.disk, 0) / Math.max(servers.length, 1)),
    network: Math.round(servers.reduce((sum, server) => sum + server.network, 0) / Math.max(servers.length, 1)),
    gpu,
    gpuAvailable: availableGpuServers.length > 0,
    gpuRequired,
    alerts,
    services: allServices,
    servers,
    alertMessages: alerts
      ? [`${alerts} service/server alerts recorded in SQLite.`]
      : ['No active alert. All stored checks are healthy.'],
    lastSyncedAt: product.last_synced_at,
    hasLiveData: servers.length > 0
  };
}

export function mergeProductCatalog(backendProducts) {
  const backendById = new Map(backendProducts.map(product => [product.id, product]));
  const backendByName = new Map(backendProducts.map(product => [slugify(product.name), product]));
  const merged = productCatalog.map(product => backendById.get(product.id) || backendByName.get(slugify(product.name)) || product);
  backendProducts.forEach(product => {
    const alreadyMerged = merged.some(item => item.id === product.id || slugify(item.name) === slugify(product.name));
    if (!alreadyMerged) merged.push(product);
  });
  return merged;
}

export function buildCurrentNotifications(products) {
  const notifications = [];
  products.forEach(product => {
    if (!product.hasLiveData) return;
    const productRoute = product.monitorType === 'reverse_proxy' ? '/reverse-proxy-servers' : `/${product.id}`;

    if (['warning', 'critical', 'unhealthy'].includes(product.status)) {
      notifications.push({
        id: `${product.id}-product-${product.status}`,
        type: 'Product',
        title: `${product.name} is ${statusMeta[product.status]?.label || product.status}`,
        detail: `${product.alerts || 0} active alert${(product.alerts || 0) === 1 ? '' : 's'}`,
        severity: product.status,
        route: productRoute
      });
    }

    (product.servers || []).forEach(server => {
      if (['warning', 'critical', 'unhealthy'].includes(server.status)) {
        const gpu = getGpuSummary(server);
        notifications.push({
          id: `${product.id}-${server.id}-server-${server.status}`,
          type: 'Server',
          title: `${server.name} is ${statusMeta[server.status]?.label || server.status}`,
          detail: `CPU ${server.cpu || 0}% - RAM ${server.ram || 0}% - Disk ${server.disk || 0}%${gpu.available ? ` - GPU ${gpu.memory}% memory` : ''} - ${getFourthMetric(server).shortLabel} ${getFourthMetric(server).value}${getFourthMetric(server).suffix}`,
          severity: server.status,
          route: product.monitorType === 'reverse_proxy' ? '/reverse-proxy-servers' : `/${product.id}/servers/${server.id}`
        });
      }

      (server.services || []).forEach(service => {
        if (!['slow', 'down'].includes(service.status)) return;
        notifications.push({
          id: `${product.id}-${server.id}-${service.id || slugify(service.name)}-${service.status}`,
          type: 'Service',
          title: `${service.name} is ${service.status === 'down' ? 'Down' : 'Warning'}`,
          detail: `${server.name} - ${service.port || '-'} - ${service.uptime || 'current issue'}`,
          severity: service.status === 'down' ? 'unhealthy' : 'warning',
          route: product.monitorType === 'reverse_proxy' ? '/reverse-proxy-servers' : `/${product.id}/services/${slugify(service.name)}`
        });
      });

      (server.nodeAlerts || []).forEach(alert => {
        notifications.push({
          id: `${product.id}-${server.id}-${alert.id}`,
          type: 'Alert',
          title: alert.name,
          detail: `${server.name} - ${alert.uptime || 'warning'}`,
          severity: alert.status === 'down' ? 'unhealthy' : alert.status === 'critical' ? 'critical' : 'warning',
          route: product.monitorType === 'reverse_proxy' ? '/reverse-proxy-servers' : `/${product.id}/servers/${server.id}`
        });
      });
    });
  });

  return notifications;
}

export function mergePreservingDetails(existingProduct, incomingProduct) {
  if (!existingProduct?.servers?.length) return incomingProduct;

  const servers = incomingProduct.servers.map(server => {
    const existingServer = existingProduct.servers.find(item => item.id === server.id);
    if (!existingServer) return server;
    const services = server.services.map(service => {
      const existingService = existingServer.services?.find(item => item.id === service.id || slugify(item.name) === slugify(service.name));
      return {
        ...service,
        events: service.events?.length ? service.events : existingService?.events || []
      };
    });
    return {
      ...server,
      services,
      raw_payload: server.raw_payload && Object.keys(server.raw_payload).length ? server.raw_payload : existingServer.raw_payload,
      logEntries: server.logEntries?.length ? server.logEntries : existingServer.logEntries || [],
      healthEvents: server.healthEvents?.length ? server.healthEvents : existingServer.healthEvents || [],
      ramUsageLogs: server.ramUsageLogs?.length ? server.ramUsageLogs : existingServer.ramUsageLogs || [],
      usageConfig: server.usageConfig || existingServer.usageConfig || null,
      usageLogs: server.usageLogs?.length ? server.usageLogs : existingServer.usageLogs || [],
      logs: server.logs?.length ? server.logs : existingServer.logs || [],
      traffic: server.traffic?.length ? server.traffic : existingServer.traffic || [],
      nodeAlerts: server.nodeAlerts?.length ? server.nodeAlerts : existingServer.nodeAlerts || []
    };
  });

  return {
    ...incomingProduct,
    servers,
    services: servers.flatMap(server => server.services.map(service => ({ ...service, serverName: server.name, serverId: server.id })))
  };
}

export function upsertProduct(products, backendProduct) {
  const mappedProduct = mapBackendProduct(backendProduct);
  const existingProduct = products.find(product => product.id === mappedProduct.id || slugify(product.name) === slugify(mappedProduct.name));
  const mergedProduct = mergePreservingDetails(existingProduct, mappedProduct);
  const backendProducts = products
    .filter(product => product.hasLiveData && product.id !== mergedProduct.id && slugify(product.name) !== slugify(mergedProduct.name))
    .concat(mergedProduct);
  return mergeProductCatalog(backendProducts);
}

export function mergeBackendProducts(productRows) {
  const mappedProducts = productRows.map(mapBackendProduct);
  return mergeProductCatalog(mappedProducts);
}

export function mergeBackendProductsPreservingDetails(currentProducts, productRows) {
  return mergeProductCatalog(
    productRows.map(productRow => {
      const mappedProduct = mapBackendProduct(productRow);
      const existingProduct = currentProducts.find(product => product.id === mappedProduct.id || slugify(product.name) === slugify(mappedProduct.name));
      return mergePreservingDetails(existingProduct, mappedProduct);
    })
  );
}

export function preferLiveProducts(productList) {
  return productList.reduce((items, product) => {
    const existingIndex = items.findIndex(item => item.id === product.id || slugify(item.name) === slugify(product.name));
    if (existingIndex === -1) return items.concat(product);
    if (product.hasLiveData && !items[existingIndex].hasLiveData) {
      const next = items.slice();
      next[existingIndex] = product;
      return next;
    }
    return items;
  }, []);
}

export function getProductRouteFromPath(pathname, productList) {
  const match = pathname.match(/^\/([^/]+)$/);
  if (!match || match[1] === '') return null;
  return productList.find(item => item.id === match[1]) || null;
}

export function getServiceRouteFromPath(pathname, productList) {
  const match = pathname.match(/^\/(?:servers\/)?([^/]+)\/services\/([^/]+)$/);
  if (!match) return null;

  const product = productList.find(item => item.id === match[1]);
  const service = product?.services.find(item => slugify(item.name) === match[2]);
  if (!product || !service) return null;

  return { product, service };
}

export function getServerRouteFromPath(pathname, productList) {
  const match = pathname.match(/^\/([^/]+)\/servers\/([^/]+)$/);
  if (!match) return null;

  const product = productList.find(item => item.id === match[1]);
  const server = product?.servers.find(item => item.id === match[2]);
  if (!product || !server) return null;

  return { product, server };
}

export function getServiceHealthHistory(product, service) {
  if (service.events?.length) {
    return service.events.slice(0, 30).reverse().map(event => {
      const date = new Date(event.started_at);
      const endDate = event.ended_at ? new Date(event.ended_at) : null;
      return {
        id: event.id,
        date,
        endDate,
        label: dayFormatter.format(date),
        status: event.status,
        cpu: event.cpu || product.cpu,
        ram: event.ram || product.ram,
        latency: event.latency_ms || service.latency || service.latency_ms || 0,
        uptime: event.duration_seconds ? `${Math.round(event.duration_seconds / 60)}m event` : service.uptime,
        durationSeconds: event.duration_seconds || Math.max(0, Math.floor(((endDate || new Date()) - date) / 1000)),
        note: event.message || `${service.name} was ${event.status}`
      };
    });
  }

  const status = service.status === 'up' ? 'healthy' : service.status === 'slow' ? 'degraded' : 'unhealthy';
  const date = new Date();
  return [{
    date,
    label: dayFormatter.format(date),
    status,
    cpu: product.cpu,
    ram: product.ram,
    latency: service.latency || service.latency_ms || 0,
    uptime: service.uptime,
    note: 'Current live status; no stored transition history yet.'
  }];
}

export function getServiceDowntimeRows(service) {
  return (service.events || [])
    .filter(event => normalizeTimelineStatus(event.status) === 'unhealthy')
    .map(event => {
      const downAt = new Date(event.started_at);
      const upAt = event.ended_at ? new Date(event.ended_at) : null;
      return {
        id: event.id,
        downAt,
        upAt,
        durationSeconds: event.duration_seconds || Math.max(0, Math.floor(((upAt || new Date()) - downAt) / 1000)),
        message: event.message || `${service.name} became unhealthy`,
        isOpen: !event.ended_at
      };
    })
    .sort((a, b) => b.downAt - a.downAt);
}

export function getServiceDayTimeline(service) {
  const now = new Date();
  const eventRows = (service.events || [])
    .map(event => {
      const date = new Date(event.started_at);
      const endDate = event.ended_at ? new Date(event.ended_at) : null;
      return {
        id: event.id,
        date,
        endDate,
        status: normalizeTimelineStatus(event.status),
        message: event.message || `${service.name} became ${event.status}`,
        durationSeconds: event.duration_seconds || Math.max(0, Math.floor(((endDate || now) - date) / 1000))
      };
    })
    .filter(event => !Number.isNaN(event.date.getTime()))
    .sort((a, b) => a.date - b.date);

  const dayMap = new Map();
  eventRows.forEach(event => {
    const endDate = event.status === 'unhealthy' ? (event.endDate || now) : event.date;
    const cursor = new Date(event.date);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const key = dayKeyFromDate(dayStart);
      const day = dayMap.get(key) || {
        key,
        date: new Date(dayStart),
        label: dayFormatter.format(dayStart),
        status: 'healthy',
        events: [],
        unhealthyDurationSeconds: 0
      };

      const startsOnDay = dayKeyFromDate(event.date) === key;
      if (startsOnDay || event.status === 'unhealthy') day.events.push(event);
      if (event.status === 'unhealthy') {
        const overlapStart = Math.max(event.date, dayStart);
        const overlapEnd = Math.min(event.endDate || now, dayEnd);
        day.status = 'unhealthy';
        day.unhealthyDurationSeconds += Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));
      }
      dayMap.set(key, day);
      if (event.status !== 'unhealthy') break;
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return Array.from(dayMap.values()).sort((a, b) => a.date - b.date);
}

export function buildDaySegments(day) {
  if (!day) return [];
  const dayStart = new Date(day.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day.date);
  dayEnd.setHours(23, 59, 59, 999);
  const totalMs = dayEnd - dayStart;
  const downSegments = day.events
    .filter(event => event.status === 'unhealthy')
    .map(event => ({
      status: 'unhealthy',
      start: Math.max(event.date, dayStart),
      end: Math.min(event.endDate || new Date(), dayEnd)
    }))
    .filter(segment => segment.end > segment.start)
    .sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = dayStart.getTime();
  downSegments.forEach(segment => {
    if (segment.start > cursor) {
      segments.push({ status: 'healthy', start: cursor, end: segment.start });
    }
    segments.push({ ...segment, start: segment.start, end: segment.end });
    cursor = Math.max(cursor, segment.end);
  });
  if (cursor < dayEnd.getTime()) segments.push({ status: 'healthy', start: cursor, end: dayEnd.getTime() });

  return segments.map(segment => ({
    ...segment,
    left: ((segment.start - dayStart.getTime()) / totalMs) * 100,
    width: Math.max(.35, ((segment.end - segment.start) / totalMs) * 100)
  }));
}

export function normalizeHistoryStatus(status) {
  if (status === 'unhealthy' || status === 'down') return 'unhealthy';
  if (status === 'critical') return 'critical';
  if (status === 'warning' || status === 'degraded' || status === 'slow') return 'warning';
  return 'healthy';
}

export function normalizeTimelineStatus(status) {
  return ['unhealthy', 'down'].includes(String(status || '').toLowerCase()) ? 'unhealthy' : 'healthy';
}

export function dayKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 1) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function getServerHealthHistory(server) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const serverEvents = (server.healthEvents || []).map(event => ({
    ...event,
    kind: 'Server',
    source: server.name,
    date: new Date(event.started_at),
    endDate: event.ended_at ? new Date(event.ended_at) : null,
    rawStatus: normalizeHistoryStatus(event.status),
    status: normalizeTimelineStatus(event.status),
    cpu: event.cpu ?? server.cpu,
    ram: event.ram ?? server.ram,
    disk: event.disk ?? server.disk,
    network: event.network ?? server.network,
    note: event.message || `${server.name} became ${event.status}`
  }));

  const serviceEvents = (server.services || []).flatMap(service => (service.events || []).map(event => ({
      ...event,
      kind: 'Service',
      source: service.name,
      date: new Date(event.started_at),
      endDate: event.ended_at ? new Date(event.ended_at) : null,
      rawStatus: normalizeHistoryStatus(event.status),
      status: normalizeTimelineStatus(event.status),
      cpu: event.cpu ?? server.cpu,
      ram: event.ram ?? server.ram,
      disk: server.disk,
      network: server.network,
      note: event.message || `${service.name} became ${event.status}`
    })));

  const events = [...serverEvents, ...serviceEvents]
    .filter(event => !Number.isNaN(event.date.getTime()))
    .filter(event => event.date >= start && event.date <= now)
    .sort((a, b) => a.date - b.date);

  const dayMap = new Map();
  events.forEach(event => {
    const startDate = new Date(Math.max(event.date, start));
    const endDate = event.status === 'unhealthy' ? new Date(Math.min(event.endDate || now, now)) : event.date;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const key = dayKeyFromDate(dayStart);
      const day = dayMap.get(key) || {
        key,
        date: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate()),
        label: dayFormatter.format(dayStart),
        status: 'healthy',
        events: [],
        unhealthyDurationSeconds: 0
      };

      if (dayKeyFromDate(event.date) === key || event.status === 'unhealthy') {
        day.events.push(event);
      }
      if (event.status === 'unhealthy') {
        const overlapStart = Math.max(event.date, dayStart);
        const overlapEnd = Math.min(event.endDate || now, dayEnd);
        day.status = 'unhealthy';
        day.unhealthyDurationSeconds += Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));
      }

      dayMap.set(key, day);
      if (event.status !== 'unhealthy') break;
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const recordedDays = Array.from(dayMap.values()).sort((a, b) => a.date - b.date);

  return {
    days: recordedDays,
    events: events.slice().reverse()
  };
}

export function logMatchesQuery(log, query) {
  const text = [
    log.name,
    log.label,
    log.path,
    log.status,
    log.currentSize,
    log.size_display,
    log.growth_display_per_minute,
    log.observed_at
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(query.trim().toLowerCase());
}



export function statusEventMatchesQuery(row, query) {
  const text = [
    row.kind,
    row.label,
    row.detail,
    row.status,
    row.observedAt
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

export function getStoredStatusRows(server) {
  const serverRows = (server.healthEvents || []).map(event => ({
    id: `server-${event.id}`,
    kind: 'Server',
    label: `${server.name} ${statusMeta[normalizeHistoryStatus(event.status)]?.label || event.status}`,
    detail: event.message || `CPU ${event.cpu}% - RAM ${event.ram}% - Disk ${event.disk}% - Network ${event.network}%`,
    status: normalizeHistoryStatus(event.status),
    observedAt: event.started_at
  }));

  const serviceRows = (server.services || []).flatMap(service => (service.events || []).map(event => ({
    id: `service-${service.id}-${event.id}`,
    kind: 'Service',
    label: `${service.name} ${event.status}`,
    detail: event.message || `${service.name} became ${event.status}`,
    status: normalizeHistoryStatus(event.status),
    observedAt: event.started_at
  })));

  const alertRows = (server.nodeAlerts || []).map((alert, index) => ({
    id: `alert-${alert.id || index}`,
    kind: 'Alert',
    label: alert.name,
    detail: alert.port || alert.uptime || 'API warning',
    status: alert.status === 'down' || alert.status === 'critical' ? 'critical' : 'warning',
    observedAt: server.lastSeenAt || new Date().toISOString()
  }));

  return [...serverRows, ...serviceRows, ...alertRows]
    .filter(row => row.status !== 'healthy' || row.kind === 'Server')
    .sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt));
}

export function getServerIssueReasons(server) {
  const reasons = [];
  const addReason = (type, label, detail) => {
    reasons.push({ type, label, detail });
  };

  if (server.status === 'unhealthy') {
    addReason('down', 'Server down', 'The server or upstream health API is reporting unhealthy.');
  }
  if (server.cpu >= 90) addReason('critical', 'CPU critical', `CPU usage is ${server.cpu}%.`);
  else if (server.cpu >= 85) addReason('warning', 'CPU high', `CPU usage is ${server.cpu}%.`);
  if (server.ram >= 90) addReason('critical', 'RAM critical', `RAM usage is ${server.ram}%.`);
  else if (server.ram >= 85) addReason('warning', 'RAM high', `RAM usage is ${server.ram}%.`);
  if (server.disk >= 90) addReason('critical', 'Disk critical', `Disk usage is ${server.disk}%.`);
  else if (server.disk >= 85) addReason('warning', 'Disk high', `Disk usage is ${server.disk}%.`);
  if (hasNetworkPercent(server) && server.network >= 90) addReason('warning', 'Network high', `Network load is ${server.network}%.`);
  const gpu = getGpuSummary(server);
  if (server.gpuRequired && !gpu.available) addReason('down', 'GPU unavailable', 'No GPU device data was returned by the server API.');
  else if (server.gpuRequired && gpu.lowFreeMemory) addReason('down', 'GPU memory low', 'GPU free memory is at or below 1 GB.');
  else if (gpu.peak >= 90) addReason('critical', 'GPU critical', `GPU usage is ${gpu.peak}%.`);
  else if (gpu.peak >= 85) addReason('warning', 'GPU high', `GPU usage is ${gpu.peak}%.`);

  (server.services || []).forEach(service => {
    if (service.status === 'down') addReason('down', `${service.name} down`, `${service.port || 'service'} is down.`);
    if (service.status === 'slow') addReason('warning', `${service.name} warning`, `${service.port || 'service'} needs attention.`);
  });

  (server.logs || []).forEach(log => {
    if (log.status !== 'up') addReason('down', `${log.name || log.label} missing`, log.path || 'Log stream is missing.');
  });

  (server.nodeAlerts || []).forEach(alert => {
    addReason(alert.status === 'down' || alert.status === 'critical' ? 'critical' : 'warning', alert.name, alert.port || 'API alert');
  });

  if (!reasons.length && server.status !== 'healthy') {
    addReason('warning', statusMeta[server.status]?.label || 'Server issue', 'No detailed reason was returned by the API.');
  }

  return reasons;
}
