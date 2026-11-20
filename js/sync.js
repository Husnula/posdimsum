/**
 * MESIN SINKRONISASI TRANSAKSI KE GOOGLE SHEETS
 * Menangani pengiriman data real-time, retry otomatis, dan pemulihan
 * transaksi lokal yang belum masuk ke spreadsheet.
 */

const SyncEngine = {
  isOnline: navigator.onLine,
  isSyncing: false,
  autoSyncTimer: null,
  BATCH_SIZE: 8,
  FETCH_TIMEOUT_MS: 45000,
  AUTO_SYNC_INTERVAL_MS: 60000,

  /**
   * Inisialisasi pendengar event konektivitas internet dan auto-sync.
   */
  init() {
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStatusBadge();
      Notifications.toast('Koneksi internet terhubung kembali.', 'success', 2000);
      this.syncPendingQueue({ silent: true });
      if (typeof App !== 'undefined' && App.updateTodaySalesSummary) {
        App.updateTodaySalesSummary();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatusBadge();
      Notifications.toast('Koneksi terputus. Mode offline aktif, transaksi aman di memori lokal.', 'warning', 3500);
    });

    // PWA/tablet sering melewatkan event 'online' saat aplikasi di-background.
    // Saat aplikasi kembali aktif, paksa cek koneksi dan jalankan antrean.
    window.addEventListener('focus', () => this.handleAppResume());
    window.addEventListener('pageshow', () => this.handleAppResume());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.handleAppResume();
    });

    this.updateStatusBadge();
    this.updateQueueCountBadge();
    this.startAutoSync();

    // Jangan menunggu event online berikutnya: sinkronkan antrean saat aplikasi dibuka.
    if (this.isOnline) {
      this.syncPendingQueue({ silent: true });
    }
  },

  /**
   * Dipanggil saat aplikasi kembali fokus/visible.
   */
  handleAppResume() {
    const wasOffline = !this.isOnline;
    this.isOnline = navigator.onLine;
    this.updateStatusBadge();

    if (!this.isOnline) return;

    this.updateQueueCountBadge();
    this.syncPendingQueue({ silent: true });

    if (wasOffline && typeof App !== 'undefined' && App.updateTodaySalesSummary) {
      App.updateTodaySalesSummary();
    }
  },

  /**
   * Retry periodik selama aplikasi terbuka. Ini mencegah antrean menggantung
   * ketika event 'online' tidak pernah terpicu.
   */
  startAutoSync() {
    if (this.autoSyncTimer) return;
    // Timer tidak diperlukan saat unit test.
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
      return;
    }
    this.autoSyncTimer = setInterval(() => {
      const online = navigator.onLine;
      if (online !== this.isOnline) {
        this.isOnline = online;
        this.updateStatusBadge();
      }
      if (this.isOnline) {
        this.syncPendingQueue({ silent: true });
      }
    }, this.AUTO_SYNC_INTERVAL_MS);
  },

  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  },

  /**
   * Memperbarui indikator status di header.
   */
  updateStatusBadge() {
    const badgeEl = document.getElementById('connection-status-badge');
    const textEl = document.getElementById('connection-status-text');
    if (!badgeEl) return;

    if (this.isOnline) {
      badgeEl.className = 'status-indicator status-online';
      if (textEl) textEl.innerText = 'Online';
    } else {
      badgeEl.className = 'status-indicator status-offline';
      if (textEl) textEl.innerText = 'Offline';
    }
  },

  /**
   * Memperbarui badge jumlah transaksi yang belum disinkronkan.
   */
  async updateQueueCountBadge() {
    const queueBadge = document.getElementById('pending-sync-badge');
    if (!queueBadge) return;

    try {
      const pendingItems = await DB.getOfflineTransactions();
      if (pendingItems.length > 0) {
        queueBadge.innerText = `${pendingItems.length} Pending`;
        queueBadge.style.display = 'inline-flex';
        queueBadge.style.cursor = 'pointer';
        queueBadge.title = 'Klik untuk menyinkronkan transaksi tertunda';
        queueBadge.onclick = () => {
          if (typeof App !== 'undefined' && App.manualSync) App.manualSync();
        };
      } else {
        queueBadge.style.display = 'none';
        queueBadge.onclick = null;
      }
    } catch (e) {
      console.warn('Gagal membaca antrean offline:', e);
    }
  },

  /**
   * Fetch dengan batas waktu agar request tidak menggantung selamanya.
   */
  async fetchWithTimeout(url, options, timeoutMs) {
    const opts = Object.assign({}, options || {});
    if (typeof AbortController === 'undefined') {
      return fetch(url, opts);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || this.FETCH_TIMEOUT_MS);
    opts.signal = controller.signal;

    try {
      return await fetch(url, opts);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error('Waktu koneksi habis. Periksa sinyal internet lalu coba lagi.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * Mengirim transaksi baru ke Google Apps Script.
   */
  async sendTransaction(trx) {
    const apiUrl = getApiUrl();
    const online = navigator.onLine;
    this.isOnline = online;

    // Jika sedang offline atau URL masih placeholder default
    if (!online || apiUrl.includes('AKfycbz_placeholder')) {
      await DB.saveOfflineTransaction(trx);
      await this.updateQueueCountBadge();
      return {
        success: true,
        mode: 'offline',
        message: 'Transaksi disimpan di memori lokal (Antrean Sync).',
        error: !online ? 'Perangkat sedang offline.' : 'URL API belum dikonfigurasi.'
      };
    }

    try {
      const response = await this.fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Apps Script CORS safe payload
        },
        body: JSON.stringify({
          action: 'saveTransaction',
          data: trx
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (parseErr) {
        throw new Error('Respons server bukan JSON yang valid.');
      }

      if (result.status === 'success') {
        return {
          success: true,
          mode: 'online',
          message: 'Transaksi berhasil disimpan ke Google Sheets.'
        };
      } else {
        throw new Error(result.message || 'Gagal menyimpan transaksi ke Sheets.');
      }
    } catch (err) {
      console.warn('Gagal kirim online, dialihkan ke offline queue:', err);
      trx.statusSync = 'Offline-Pending';
      await DB.saveOfflineTransaction(trx);
      await this.updateQueueCountBadge();
      return {
        success: true,
        mode: 'offline',
        message: 'Transaksi disimpan di antrean lokal.',
        error: err.message || 'Koneksi ke Google Sheets gagal.'
      };
    }
  },

  /**
   * Helper untuk mengirim satu batch ke backend.
   */
  async postBatch(items) {
    const apiUrl = getApiUrl();
    if (apiUrl.includes('AKfycbz_placeholder')) {
      throw new Error('URL API belum dikonfigurasi.');
    }

    const response = await this.fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'syncBatchTransactions',
        items: items
      })
    });

    let json;
    try {
      json = await response.json();
    } catch (parseErr) {
      throw new Error('Respons server bukan JSON yang valid.');
    }

    if (!json || json.status !== 'success') {
      throw new Error((json && json.message) || 'Gagal menyimpan batch transaksi.');
    }
    return json;
  },

  /**
   * Menentukan item mana yang benar-benar sudah dikonfirmasi server.
   * Kompatibel dengan backend lama yang hanya mengirim syncedCount.
   */
  normalizeBatchResult(json, batch) {
    const batchIds = batch.map((t) => String(t.id));
    const confirmed = new Set();
    const failed = [];

    if (Array.isArray(json.savedIds)) {
      (json.savedIds || []).forEach((id) => confirmed.add(String(id)));
      (json.duplicateIds || []).forEach((id) => confirmed.add(String(id)));

      (json.failed || []).forEach((f) => {
        if (f && f.id) {
          failed.push({
            id: String(f.id),
            error: f.error || 'Gagal menyimpan transaksi.'
          });
        }
      });

      // Jangan hapus item yang tidak disebut server sama sekali.
      batchIds.forEach((id) => {
        if (!confirmed.has(id) && !failed.some((f) => f.id === id)) {
          failed.push({ id: id, error: 'Tidak dikonfirmasi oleh server.' });
        }
      });

      return { confirmedIds: Array.from(confirmed), failed: failed };
    }

    // Backend lama: hanya aman menghapus jika jumlah sukses sama dengan batch.
    if (Number(json.syncedCount) === batch.length) {
      batchIds.forEach((id) => confirmed.add(id));
      return { confirmedIds: Array.from(confirmed), failed: failed };
    }

    batchIds.forEach((id) => {
      failed.push({
        id: id,
        error: json.message || 'Sinkronisasi parsial: status item tidak diketahui.'
      });
    });
    return { confirmedIds: [], failed: failed };
  },

  /**
   * Menyinkronkan seluruh transaksi yang tertunda ke Google Sheets.
   * Hanya item yang dikonfirmasi server yang dihapus dari IndexedDB.
   */
  async syncPendingQueue(options) {
    const opts = options || {};
    const silent = !!opts.silent;
    const emptyResult = { saved: 0, duplicates: 0, failed: [] };

    if (this.isSyncing) {
      if (!silent) Notifications.toast('Sinkronisasi sedang berjalan. Tunggu sebentar.', 'info', 2000);
      return { ...emptyResult, busy: true };
    }

    const online = navigator.onLine;
    this.isOnline = online;
    this.updateStatusBadge();

    if (!online) {
      if (!silent) Notifications.toast('Perangkat sedang offline. Sambungkan internet lalu coba lagi.', 'warning', 3000);
      return { ...emptyResult, offline: true };
    }

    const apiUrl = getApiUrl();
    if (apiUrl.includes('AKfycbz_placeholder')) {
      if (!silent) Notifications.toast('URL API belum dikonfigurasi.', 'warning', 3000);
      return { ...emptyResult, unconfigured: true };
    }

    let pendingItems = [];
    try {
      pendingItems = await DB.getOfflineTransactions();
    } catch (e) {
      console.warn('Gagal membaca antrean offline:', e);
    }

    if (!pendingItems || pendingItems.length === 0) {
      await this.updateQueueCountBadge();
      if (!silent) Notifications.toast('Tidak ada transaksi tertunda.', 'info', 2200);
      return { ...emptyResult, empty: true };
    }

    this.isSyncing = true;
    if (!silent) {
      Notifications.toast(`Menyinkronkan ${pendingItems.length} transaksi tertunda...`, 'info', 2000);
    }

    let saved = 0;
    let duplicates = 0;
    const failed = [];

    try {
      for (let i = 0; i < pendingItems.length; i += this.BATCH_SIZE) {
        const batch = pendingItems.slice(i, i + this.BATCH_SIZE);
        let json;
        try {
          json = await this.postBatch(batch);
        } catch (batchErr) {
          batch.forEach((t) => failed.push({ id: String(t.id), error: batchErr.message }));
          continue;
        }

        const normalized = this.normalizeBatchResult(json, batch);
        for (const id of normalized.confirmedIds) {
          try {
            await DB.removeOfflineTransaction(id);
          } catch (removeErr) {
            console.warn('Gagal menghapus antrean yang sudah tersinkron:', id, removeErr);
          }
        }

        saved += Array.isArray(json.savedIds) ? json.savedIds.length : (Number(json.syncedCount) || 0);
        duplicates += Array.isArray(json.duplicateIds) ? json.duplicateIds.length : 0;
        failed.push(...normalized.failed);
      }
    } finally {
      this.isSyncing = false;
    }

    await this.updateQueueCountBadge();
    this.refreshAppAfterSync();

    if (!silent) {
      if (failed.length > 0) {
        Notifications.toast(
          `${saved} transaksi tersimpan, ${failed.length} masih tertunda. Sistem akan mencoba lagi otomatis.`,
          'warning',
          4500
        );
      } else if (saved > 0 || duplicates > 0) {
        Notifications.toast(
          `Sinkronisasi selesai. ${saved} tersimpan${duplicates ? `, ${duplicates} duplikat dilewati` : ''}.`,
          'success',
          3500
        );
      }
    }

    return { saved: saved, duplicates: duplicates, failed: failed };
  },

  /**
   * Mengambil seluruh ID transaksi yang sudah ada di Google Sheets.
   * Dipakai oleh alat pemulihan data lokal.
   */
  async fetchServerTransactionIds() {
    const apiUrl = getApiUrl();
    if (apiUrl.includes('AKfycbz_placeholder')) {
      throw new Error('URL API belum dikonfigurasi.');
    }

    const response = await this.fetchWithTimeout(`${apiUrl}?action=getTransactionIds&_=${Date.now()}`, {
      cache: 'no-store'
    });

    let json;
    try {
      json = await response.json();
    } catch (parseErr) {
      throw new Error('Respons server bukan JSON yang valid.');
    }

    if (!json || json.status !== 'success' || !json.data || !Array.isArray(json.data.ids)) {
      throw new Error(
        (json && json.message) ||
        'Backend belum mendukung pengecekan ID transaksi. Deploy ulang Code.gs terbaru.'
      );
    }

    return new Set(json.data.ids.map((id) => String(id)));
  },

  /**
   * Kunci pengurutan transaksi berbasis ID/tanggal + jam.
   */
  transactionSortKey(trx) {
    const t = trx || {};
    let dateKey = '';
    const idMatch = String(t.id || '').match(/(\d{4})(\d{2})(\d{2})/);
    if (idMatch) {
      dateKey = `${idMatch[1]}${idMatch[2]}${idMatch[3]}`;
    } else {
      const tgl = String(t.tanggal || '').replace(/^'+/, '').trim();
      const dateMatch = tgl.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dateMatch) dateKey = `${dateMatch[3]}${dateMatch[2]}${dateMatch[1]}`;
    }
    return `${dateKey}-${String(t.jam || '00:00:00')}`;
  },

  /**
   * Mencari transaksi lokal yang belum ada di server.
   */
  computeMissingTransactions(localTransactions, serverIds) {
    const serverSet = serverIds instanceof Set
      ? serverIds
      : new Set((serverIds || []).map((id) => String(id)));

    const localMap = new Map();
    (localTransactions || []).forEach((t) => {
      if (t && t.id) localMap.set(String(t.id), t);
    });

    return Array.from(localMap.values())
      .filter((t) => !serverSet.has(String(t.id)))
      .sort((a, b) => this.transactionSortKey(a).localeCompare(this.transactionSortKey(b)));
  },

  /**
   * Menggabungkan transaksi lokal yang belum tersinkron ke ringkasan server.
   * Transaksi yang dikirim ke fungsi ini harus sudah dipastikan belum ada di server.
   */
  mergePendingIntoReport(report, pendingTransactions) {
    const base = report
      ? JSON.parse(JSON.stringify(report))
      : {
          tanggal: '',
          totalOmzet: 0,
          totalTransaksi: 0,
          metode: { tunai: 0, qris: 0, transfer: 0 },
          itemsTerjual: [],
          transaksiTerbaru: []
        };

    base.metode = base.metode || { tunai: 0, qris: 0, transfer: 0 };
    base.itemsTerjual = Array.isArray(base.itemsTerjual) ? base.itemsTerjual : [];
    base.transaksiTerbaru = Array.isArray(base.transaksiTerbaru) ? base.transaksiTerbaru : [];

    const itemMap = new Map();
    base.itemsTerjual.forEach((it) => {
      if (it && it.nama) itemMap.set(String(it.nama), { ...it });
    });

    const pendingMap = new Map();
    (pendingTransactions || []).forEach((t) => {
      if (t && t.id) pendingMap.set(String(t.id), t);
    });

    let pendingOmzet = 0;
    const pendingTrx = [];

    pendingMap.forEach((t) => {
      const total = Number(t.totalAkhir) || 0;
      pendingOmzet += total;

      base.totalOmzet = (Number(base.totalOmzet) || 0) + total;
      base.totalTransaksi = (Number(base.totalTransaksi) || 0) + 1;

      const metode = String(t.metodeBayar || '').toLowerCase();
      if (metode === 'tunai' || metode === 'cash') {
        base.metode.tunai = (Number(base.metode.tunai) || 0) + total;
      } else if (metode === 'qris') {
        base.metode.qris = (Number(base.metode.qris) || 0) + total;
      } else {
        base.metode.transfer = (Number(base.metode.transfer) || 0) + total;
      }

      if (Array.isArray(t.items)) {
        t.items.forEach((it) => {
          const name = String(it.nama || '') + (it.varian ? ` (${it.varian})` : '');
          if (!itemMap.has(name)) itemMap.set(name, { nama: name, qty: 0, omzet: 0 });
          const row = itemMap.get(name);
          row.qty += Number(it.qty) || 0;
          row.omzet += Number(it.subtotal) || 0;
        });
      }

      pendingTrx.push({ ...t, _pendingSync: true });
    });

    base.itemsTerjual = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
    base.pendingTransaksi = (Number(base.pendingTransaksi) || 0) + pendingMap.size;
    base.pendingOmzet = (Number(base.pendingOmzet) || 0) + pendingOmzet;

    const trxMap = new Map();
    pendingTrx.forEach((t) => trxMap.set(String(t.id), t));
    base.transaksiTerbaru.forEach((t) => {
      if (t && t.id && !trxMap.has(String(t.id))) trxMap.set(String(t.id), t);
    });
    base.transaksiTerbaru = Array.from(trxMap.values())
      .sort((a, b) => this.transactionSortKey(b).localeCompare(this.transactionSortKey(a)))
      .slice(0, 20);

    return base;
  },

  /**
   * Memulihkan transaksi lokal yang belum ada di server.
   * Mengirim per batch dan hanya menghapus antrean yang dikonfirmasi.
   */
  async recoverMissingTransactions(transactions, onProgress) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { saved: 0, duplicates: 0, failed: [] };
    }

    if (this.isSyncing) {
      throw new Error('Sinkronisasi lain sedang berjalan. Tunggu sebentar lalu coba lagi.');
    }

    if (!navigator.onLine) {
      throw new Error('Perangkat sedang offline. Sambungkan internet lalu coba lagi.');
    }

    this.isOnline = true;
    this.isSyncing = true;

    let saved = 0;
    let duplicates = 0;
    const failed = [];
    const total = transactions.length;

    try {
      for (let i = 0; i < total; i += this.BATCH_SIZE) {
        const batch = transactions.slice(i, i + this.BATCH_SIZE);
        let json;
        try {
          json = await this.postBatch(batch);
        } catch (batchErr) {
          batch.forEach((t) => failed.push({ id: String(t.id), error: batchErr.message }));
          if (onProgress) onProgress(Math.min(i + batch.length, total), total);
          continue;
        }

        const normalized = this.normalizeBatchResult(json, batch);
        for (const id of normalized.confirmedIds) {
          try {
            await DB.removeOfflineTransaction(id);
          } catch (removeErr) {
            console.warn('Gagal menghapus antrean yang sudah dipulihkan:', id, removeErr);
          }
        }

        saved += Array.isArray(json.savedIds) ? json.savedIds.length : (Number(json.syncedCount) || 0);
        duplicates += Array.isArray(json.duplicateIds) ? json.duplicateIds.length : 0;
        failed.push(...normalized.failed);

        if (onProgress) onProgress(Math.min(i + batch.length, total), total);
      }
    } finally {
      this.isSyncing = false;
    }

    await this.updateQueueCountBadge();
    this.refreshAppAfterSync();

    return { saved: saved, duplicates: duplicates, failed: failed };
  },

  /**
   * Refresh tampilan setelah sinkronisasi tanpa menimbulkan error
   * jika modul App belum siap.
   */
  refreshAppAfterSync() {
    if (typeof App === 'undefined') return;
    if (App.updateTodaySalesSummary) App.updateTodaySalesSummary();
    if (App.refreshOpenReports) App.refreshOpenReports();
  }
};

// Export aman untuk unit testing (Vitest/Node.js) tanpa mengganggu browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncEngine };
}
