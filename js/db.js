/**
 * Modul Penyimpanan Lokal & Antrean Offline (IndexedDB)
 * Menjamin transaksi kasir tetap dapat diproses meskipun internet mati
 */

const DB_NAME = 'TerasFoodiesPOS_DB';
const DB_VERSION = 1;

const DB = {
  dbInstance: null,

  /**
   * Inisialisasi IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store untuk antrean transaksi offline
        if (!db.objectStoreNames.contains('offline_transactions')) {
          db.createObjectStore('offline_transactions', { keyPath: 'id' });
        }

        // Store untuk cache katalog menu
        if (!db.objectStoreNames.contains('menu_cache')) {
          db.createObjectStore('menu_cache', { keyPath: 'id' });
        }

        // Store untuk cache riwayat transaksi lokal
        if (!db.objectStoreNames.contains('recent_orders')) {
          db.createObjectStore('recent_orders', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.dbInstance = event.target.result;
        resolve(this.dbInstance);
      };

      request.onerror = (event) => {
        console.error('IndexedDB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  /**
   * Menyimpan transaksi ke antrean offline jika jaringan terputus
   */
  async saveOfflineTransaction(transaction) {
    if (!this.dbInstance) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction('offline_transactions', 'readwrite');
      const store = tx.objectStore('offline_transactions');
      const req = store.put(transaction);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Mengambil semua transaksi offline yang belum disinkronkan
   */
  async getOfflineTransactions() {
    if (!this.dbInstance) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction('offline_transactions', 'readonly');
      const store = tx.objectStore('offline_transactions');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Menghapus transaksi yang sudah berhasil disinkronkan
   */
  async removeOfflineTransaction(id) {
    if (!this.dbInstance) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction('offline_transactions', 'readwrite');
      const store = tx.objectStore('offline_transactions');
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Menyimpan cache katalog menu dari Google Sheets
   */
  async saveMenuCache(menuItems) {
    if (!this.dbInstance) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction('menu_cache', 'readwrite');
      const store = tx.objectStore('menu_cache');
      store.clear(); // Hapus cache lama

      menuItems.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Mengambil cache katalog menu saat offline
   */
  async getMenuCache() {
    if (!this.dbInstance) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.dbInstance.transaction('menu_cache', 'readonly');
      const store = tx.objectStore('menu_cache');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
};
