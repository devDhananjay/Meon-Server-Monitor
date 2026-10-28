export const telemetry = {
  healthScore: 0,
  uptime: 0,
  alerts: 0,
  avgLatency: 0
};

export const productCatalog = [
  'KYC',
  'CRM',
  'Re-KYC',
  'Closure',
  'IPO',
  'Chat Bot',
  'eSign',
  'Digilocker E-Doc Issuer',
  'PDF Generator',
  'Digilocker E-Doc Retriever',
  'Face Detection',
  'PAN Card API',
  'Penny Drop',
  'Reverse Penny Drop',
  'Whatsapp Business',
  'eSign-uat',
  'SGB',
  'BuyBack',
  'KYC-uat',
  'Closure-uat',
  'Face Finder',
  'Face Finder Live',
  'Facefinder (Background Change)',
  'Mutual Funds',
  'OCR (Physical)',
  'OCR UAT',
  'Central Tool',
  'API Manager'
].map(name => {
  const id = name === 'OCR (Physical)'
    ? 'ocr'
    : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    id,
    name,
    server: 'Not synced',
    region: 'Waiting for live data',
    ip: '',
    status: 'pending',
    cpu: null,
    ram: null,
    disk: null,
    network: null,
    alerts: 0,
    services: [],
    servers: [],
    alertMessages: ['No live server data synced yet.'],
    lastSyncedAt: null,
    hasLiveData: false
  };
});
