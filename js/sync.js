/**
 * MESIN SINKRONISASI TRANSAKSI KE GOOGLE SHEETS
 * Menangani pengiriman data real-time dan sinkronisasi antrean offline
 */

const SyncEngine = {
  isOnline: navigator.onLine,
  isSyncing: false,

  /**
   * Inisialisasi pendengar event konektivitas internet
   */
  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStatusBadge();
      Notifications.toast('Koneksi internet terhubung kembali.', 'success', 2000);
      this.syncPendingQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatusBadge();
      Notifications.toast('Koneksi terputus. Mode offline aktif, transaksi aman di memori lokal.', 'warning', 3500);
    });

    this.updateStatusBadge();
    this.updateQueueCountBadge();
  },

  /**
   * Memperbarui indikator status di header
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
   * Memperbarui badge jumlah transaksi yang belum disinkronkan
   */
  async updateQueueCountBadge() {
    const queueBadge = document.getElementById('pending-sync-badge');
    if (!queueBadge) return;

    try {
      const pendingItems = await DB.getOfflineTransactions();
      if (pendingItems.length > 0) {
        queueBadge.innerText = `${pendingItems.length} Pending`;
        queueBadge.style.display = 'inline-flex';
      } else {
        queueBadge.style.display = 'none';
      }
    } catch (e) {
      console.warn('Gagal membaca antrean offline:', e);
    }
  },

  /**
   * Mengirim transaksi baru ke Google Apps Script
   */
  async sendTransaction(trx) {
    const apiUrl = getApiUrl();

    // Jika sedang offline atau URL masih placeholder default
    if (!this.isOnline || apiUrl.includes('AKfycbz_placeholder')) {
      await DB.saveOfflineTransaction(trx);
      await this.updateQueueCountBadge();
      return {
        success: true,
        mode: 'offline',
        message: 'Transaksi disimpan di memori lokal (Antrean Sync).'
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Apps Script CORS safe payload
        },
        body: JSON.stringify({
          action: 'saveTransaction',
          data: trx
        })
      });

      const result = await response.json();
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
        message: 'Koneksi lambat, transaksi dialihkan ke antrean lokal.'
      };
    }
  },

  /**
   * Menyinkronkan seluruh transaksi yang tertunda ke Google Sheets
   */
  async syncPendingQueue() {
    if (this.isSyncing || !this.isOnline) return;

    const apiUrl = getApiUrl();
    if (apiUrl.includes('AKfycbz_placeholder')) {
      return; // Belum dikonfigurasi URL Apps Script
    }

    const pendingItems = await DB.getOfflineTransactions();
    if (pendingItems.length === 0) return;

    this.isSyncing = true;
    Notifications.toast(`Menyinkronkan ${pendingItems.length} transaksi tertunda...`, 'info', 2000);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncBatchTransactions',
          items: pendingItems
        })
      });

      const res = await response.json();
      if (res.status === 'success') {
        // Hapus dari IndexedDB
        for (const item of pendingItems) {
          await DB.removeOfflineTransaction(item.id);
        }
        await this.updateQueueCountBadge();
        Notifications.toast(`Sukses! ${res.syncedCount} transaksi berhasil masuk ke Google Sheets.`, 'success', 3000);
      }
    } catch (e) {
      console.error('Gagal sinkronisasi antrean:', e);
      Notifications.toast('Gagal sinkronisasi antrean. Akan dicoba lagi nanti.', 'warning', 3000);
    } finally {
      this.isSyncing = false;
    }
  }
};
