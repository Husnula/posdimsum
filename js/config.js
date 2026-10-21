/**
 * Konfigurasi Utama Aplikasi POS Teras Foodies
 */

const APP_CONFIG = {
  // Informasi Toko
  STORE_NAME: 'Teras Foodies',
  STORE_SLOGAN: 'Dimsum & Mie Jebew Lezat',
  STORE_ADDRESS: 'Jalan Jaya Rengel-Widang, Ds. Kedungrojo, 100 m Timur Tugu',
  STORE_PHONE: '0857-3027-2661',
  STORE_IG: '@terasfoodies2',

  // Kontak Developer untuk Upgrade Fitur Pro
  DEVELOPER_WA: '6288228511309',

  // Endpoint API Google Apps Script (Bisa diupdate kasir/owner lewat modal pengaturan)
  // Default URL deployment atau diambil dari localStorage
  DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfycbz_placeholder/exec',

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
 * Mendapatkan URL API Apps Script aktif
 */
function getApiUrl() {
  const customUrl = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.API_URL);
  if (customUrl && customUrl.trim() !== '') {
    return customUrl.trim();
  }
  return APP_CONFIG.DEFAULT_API_URL;
}

/**
 * Menyimpan URL API Apps Script baru
 */
function saveApiUrl(url) {
  if (url && url.trim() !== '') {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.API_URL, url.trim());
    return true;
  }
  return false;
}

/**
 * Memeriksa apakah suatu fitur terbuka atau terkunci
 */
function isFeatureUnlocked(featureKey) {
  // Cek apakah ada override di localStorage (misal setelah upgrade aktivasi)
  const unlockedFeatures = JSON.parse(localStorage.getItem('tf_pos_unlocked_features') || '{}');
  if (unlockedFeatures[featureKey] !== undefined) {
    return unlockedFeatures[featureKey];
  }
  return APP_CONFIG.FEATURES[featureKey] === true;
}
