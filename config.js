/**
 * CONFIG.JS - Konfigurasi Utama POS Teras Foodies
 * Digunakan baik saat berjalan di Cloudflare Pages (posdimsum.pages.dev)
 * maupun saat pengujian lokal atau server mandiri.
 */

const APP_CONFIG = {
  // Profil Toko & Kontak
  STORE_NAME: 'Teras Foodies',
  STORE_SLOGAN: 'Dimsum & Mie Jebew Lezat',
  STORE_ADDRESS: 'Jalan Jaya Rengel-Widang, Ds. Kedungrojo, 100 m Timur Tugu',
  STORE_PHONE: '0857-3027-2661',
  STORE_IG: '@terasfoodies2',

  // Kontak Developer untuk Upgrade Fitur Pro
  DEVELOPER_WA: '6288228511309',

  // Endpoint API:
  // Pada Cloudflare Pages (posdimsum.pages.dev), request diarahkan ke proxy '/api'
  // yang ditangani secara transparan oleh _worker.js tanpa kendala CORS.
  API_PROXY_ENDPOINT: '/api',

  // Direct Google Apps Script Web App URL (Fallback jika tidak lewat Cloudflare Worker)
  DEFAULT_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz_placeholder/exec',

  // Status Fitur (Fitur Pro Terkunci untuk Monetisasi Upsell)
  FEATURES: {
    // FITUR UTAMA (AKTIF / UNLOCKED)
    POS_CASHIER: true,        // Menu kasir penjualan cepat
    AUTO_RECAP: true,         // Rekap penjualan otomatis
    THERMAL_PRINT: true,      // Cetak struk printer thermal 58mm/80mm
    WHATSAPP_RECEIPT: true,   // Kirim struk digital ke WhatsApp pelanggan
    PWA_OFFLINE: true,        // Akses offline & install di Tablet

    // FITUR PRO (TERKUNCI / LOCKED - Butuh Upgrade Biaya)
    SHIFT_MANAGEMENT: false,  // Manajemen buka/tutup shift kasir & selisih laci kas
    EXPENSE_TRACKING: false,  // Catat pengeluaran operasional & kalkulasi laba bersih
    ONLINE_MARKUP: false,     // Auto-markup harga khusus GoFood/ShopeeFood/GrabFood
    MENU_EDITOR_WEB: false,   // Tambah/edit menu langsung dari layar web kasir
    EXPORT_REPORTS: false     // Ekspor laporan penjualan bulanan ke Excel / PDF
  },

  STORAGE_KEYS: {
    API_URL: 'tf_pos_api_url',
    MENU_CACHE: 'tf_pos_menu_cache',
    SETTINGS_CACHE: 'tf_pos_settings_cache',
    OFFLINE_QUEUE: 'tf_pos_offline_queue',
    ACTIVE_CASHIER: 'tf_pos_active_cashier',
    THEME: 'tf_pos_theme'
  }
};

/**
 * Mendapatkan URL endpoint API yang aktif
 * Jika sedang berjalan di Cloudflare Pages, memprioritaskan proxy '/api'
 * kecuali jika user secara spesifik memasukkan URL custom di modal pengaturan.
 */
function getApiUrl() {
  const customUrl = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.API_URL);
  if (customUrl && customUrl.trim() !== '') {
    return customUrl.trim();
  }

  // Jika diakses dari domain Cloudflare Pages (*.pages.dev), gunakan /api proxy
  if (window.location.hostname.includes('pages.dev')) {
    return APP_CONFIG.API_PROXY_ENDPOINT;
  }

  return APP_CONFIG.DEFAULT_APPS_SCRIPT_URL;
}

/**
 * Menyimpan URL API baru ke localStorage
 */
function saveApiUrl(url) {
  if (url && url.trim() !== '') {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.API_URL, url.trim());
    return true;
  }
  return false;
}

/**
 * Memeriksa status fitur (terbuka vs terkunci)
 */
function isFeatureUnlocked(featureKey) {
  const unlockedFeatures = JSON.parse(localStorage.getItem('tf_pos_unlocked_features') || '{}');
  if (unlockedFeatures[featureKey] !== undefined) {
    return unlockedFeatures[featureKey];
  }
  return APP_CONFIG.FEATURES[featureKey] === true;
}
