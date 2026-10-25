/**
 * APLIKASI UTAMA POS TERAS FOODIES (CONTROLLER)
 * Menghubungkan antarmuka kasir Tablet dengan katalog menu, keranjang,
 * mesin pembayaran, struk, dan rekapan penjualan otomatis
 */

const App = {
  menuItems: [],
  activeCategory: 'Semua',
  searchKeyword: '',
  deferredInstallPrompt: null,
  currentTransaction: null,
  paymentCashReceived: 0,
  paymentMethod: 'Tunai',
  currentReportFilter: 'today',
  currentReportCustomDate: '',

  /**
   * Inisialisasi awal aplikasi saat dokumen selesai dimuat
   */
  async init() {
    console.log('Memulai POS Teras Foodies...');
    
    // Inisialisasi IndexedDB dan Mesin Sinkronisasi
    try {
      await DB.init();
    } catch (e) {
      console.warn('Inisialisasi IndexedDB gagal, menggunakan fallback LocalStorage:', e);
    }

    SyncEngine.init();
    Cart.render();

    // Setup PWA Service Worker & Install Prompt
    this.setupPWA();

    // Muat data menu real-time dari Google Sheets
    await this.loadMenu();

    // Daftarkan event listener UI
    this.bindEvents();

    // Render status kasir
    this.renderHeaderInfo();
  },

  /**
   * Mendaftarkan Service Worker dan menangkap prompt install PWA Tablet
   */
  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker terdaftar:', reg.scope))
        .catch((err) => console.warn('Gagal daftar Service Worker:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) {
        installBtn.style.display = 'inline-flex';
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) installBtn.style.display = 'none';
      Notifications.toast('Aplikasi berhasil dipasang di layar Tablet Anda!', 'success', 3000);
    });
  },

  /**
   * Memuat data menu dari Google Sheets API (dengan fallback cache lokal)
   */
  async loadMenu() {
    const gridEl = document.getElementById('menu-grid-container');
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="menu-loading-state">
          <div class="tf-spinner"></div>
          <p>Memuat menu riil dari Google Sheets...</p>
        </div>
      `;
    }

    const apiUrl = getApiUrl();
    let loadedFromApi = false;

    // Coba ambil dari Google Apps Script jika URL sudah diset
    if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
      try {
        const fetchUrl = `${apiUrl}?action=getMenu`;
        const response = await fetch(fetchUrl);
        const json = await response.json();

        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          this.menuItems = json.data;
          await DB.saveMenuCache(this.menuItems);
          loadedFromApi = true;
          console.log(`Berhasil memuat ${this.menuItems.length} menu langsung dari Google Sheets!`);
        }
      } catch (err) {
        console.warn('Gagal memuat langsung dari Apps Script, mencoba cache lokal:', err);
      }
    }

    // Jika gagal atau offline, ambil dari cache IndexedDB
    if (!loadedFromApi) {
      try {
        const cached = await DB.getMenuCache();
        if (cached && cached.length > 0) {
          this.menuItems = cached;
          console.log(`Memuat ${this.menuItems.length} menu dari cache lokal.`);
        } else {
          // Inisialisasi awal dari master menu riil Teras Foodies
          this.menuItems = this.getFallbackRealMenu();
          await DB.saveMenuCache(this.menuItems);
        }
      } catch (e) {
        this.menuItems = this.getFallbackRealMenu();
      }
    }

    this.renderMenu();
  },

  /**
   * Data master menu riil Teras Foodies (sesuai menu_teras_foodies.md)
   * Digunakan sebagai baseline saat database pertama kali dibuka
   */
  getFallbackRealMenu() {
    return [
      { id: 'MNU-001', kategori: 'Dimsum Original', nama: 'Dimsum Ori 4 pcs', varian: '4 pcs', harga: 10000, stok: 999, keterangan: 'Dimsum kukus gurih lembut isi ayam' },
      { id: 'MNU-002', kategori: 'Dimsum Original', nama: 'Dimsum Ori 6 pcs', varian: '6 pcs', harga: 15000, stok: 999, keterangan: 'Dimsum kukus gurih lembut isi ayam' },
      { id: 'MNU-003', kategori: 'Dimsum Original', nama: 'Dimsum Ori 8 pcs', varian: '8 pcs', harga: 20000, stok: 999, keterangan: 'Dimsum kukus gurih lembut isi ayam' },
      { id: 'MNU-004', kategori: 'Dimsum Mentai', nama: 'Dimsum Mentai 4 pcs', varian: '4 pcs', harga: 12000, stok: 999, keterangan: 'Dimsum dengan saus mentai gurih creamy' },
      { id: 'MNU-005', kategori: 'Dimsum Mentai', nama: 'Dimsum Mentai 6 pcs', varian: '6 pcs', harga: 20000, stok: 999, keterangan: 'Dimsum dengan saus mentai gurih creamy' },
      { id: 'MNU-006', kategori: 'Dimsum Mentai', nama: 'Dimsum Mentai 8 pcs', varian: '8 pcs', harga: 24000, stok: 999, keterangan: 'Dimsum dengan saus mentai gurih creamy' },
      { id: 'MNU-007', kategori: 'Dimsum Hot Lava', nama: 'Dimsum Hot Lava 4 pcs', varian: '4 pcs', harga: 12000, stok: 999, keterangan: 'Dimsum dengan siraman saus lava pedas membara' },
      { id: 'MNU-008', kategori: 'Dimsum Hot Lava', nama: 'Dimsum Hot Lava 6 pcs', varian: '6 pcs', harga: 20000, stok: 999, keterangan: 'Dimsum dengan siraman saus lava pedas membara' },
      { id: 'MNU-009', kategori: 'Dimsum Hot Lava', nama: 'Dimsum Hot Lava 8 pcs', varian: '8 pcs', harga: 24000, stok: 999, keterangan: 'Dimsum dengan siraman saus lava pedas membara' },
      { id: 'MNU-010', kategori: 'Wonton', nama: 'Wonton Goreng', varian: 'Porsi', harga: 10000, stok: 999, keterangan: 'Wonton renyah dengan chili oil spesial' },
      { id: 'MNU-011', kategori: 'Wonton', nama: 'Wonton Rebus', varian: 'Porsi', harga: 10000, stok: 999, keterangan: 'Wonton kuah lembut berpadu chili oil aromatik' },
      { id: 'MNU-012', kategori: 'Basreng', nama: 'Basreng Mini', varian: 'Mini', harga: 5000, stok: 999, keterangan: 'Basreng pedas gurih porsi mini' },
      { id: 'MNU-013', kategori: 'Basreng', nama: 'Basreng Jumbo', varian: 'Jumbo', harga: 10000, stok: 999, keterangan: 'Basreng pedas gurih porsi jumbo' },
      { id: 'MNU-014', kategori: 'Mie Jebew', nama: 'Mie Jebew Ori', varian: 'Standar', harga: 8000, stok: 999, keterangan: 'Mie pedas jebew gurih pedas khas' },
      { id: 'MNU-015', kategori: 'Mie Jebew', nama: 'Mie Jebew Wonton', varian: 'Wonton', harga: 12000, stok: 999, keterangan: 'Mie jebew dengan topping wonton gurih' },
      { id: 'MNU-016', kategori: 'Mie Jebew', nama: 'Mie Jebew Sosis', varian: 'Sosis', harga: 12000, stok: 999, keterangan: 'Mie jebew dengan topping sosis lezat' },
      { id: 'MNU-017', kategori: 'Mie Jebew', nama: 'Mie Jebew Bakso', varian: 'Bakso', harga: 13000, stok: 999, keterangan: 'Mie jebew dengan topping bakso kenyal' },
      { id: 'MNU-018', kategori: 'Mie Jebew', nama: 'Mie Jebew Bakso Jumbo', varian: 'Jumbo', harga: 15000, stok: 999, keterangan: 'Mie jebew dengan topping bakso ukuran jumbo' },
      { id: 'MNU-019', kategori: 'Minuman', nama: 'Es Teh', varian: 'Gelas', harga: 3000, stok: 999, keterangan: 'Es teh manis melati segar dingin' },
      { id: 'MNU-020', kategori: 'Minuman', nama: 'Es Nutrisari', varian: 'Gelas', harga: 4000, stok: 999, keterangan: 'Es sari jeruk segar nutrisari' },
      { id: 'MNU-021', kategori: 'Minuman', nama: 'Es Milo', varian: 'Gelas', harga: 5000, stok: 999, keterangan: 'Es susu cokelat milo pekat' },
      { id: 'MNU-022', kategori: 'Minuman', nama: 'Es Beng-Beng', varian: 'Gelas', harga: 5000, stok: 999, keterangan: 'Es cokelat lezat beng-beng drink' },
      { id: 'MNU-023', kategori: 'Minuman', nama: 'Es Jeruk Peras', varian: 'Gelas', harga: 5000, stok: 999, keterangan: 'Es jeruk peras alami segar asam manis' },
      { id: 'MNU-024', kategori: 'Minuman', nama: 'Es Goodday', varian: 'Gelas', harga: 5000, stok: 999, keterangan: 'Es kopi moccacino goodday segar' },
      { id: 'MNU-027', kategori: 'Minuman', nama: 'Es Chocolatos', varian: 'Gelas', harga: 5000, stok: 999, keterangan: 'Es cokelat chocolatos lezat dingin segar' },
      { id: 'MNU-025', kategori: 'Birthday Dimsum', nama: 'Dimsum Birthday Isi 6', varian: 'Isi 6', harga: 25000, stok: 999, keterangan: 'Saus mentai, free chili oil, sendok, topping, tissue, tulisan keju' },
      { id: 'MNU-026', kategori: 'Birthday Dimsum', nama: 'Dimsum Birthday Isi 16', varian: 'Isi 16', harga: 65000, stok: 999, keterangan: 'Saus mentai, free chili oil, sendok, topping, tissue, tulisan keju' }
    ];
  },

  /**
   * Render kartu menu ke dalam Grid sesuai filter kategori dan pencarian
   */
  renderMenu() {
    const gridEl = document.getElementById('menu-grid-container');
    if (!gridEl) return;

    let filtered = this.menuItems;

    // Filter Kategori
    if (this.activeCategory !== 'Semua') {
      filtered = filtered.filter((item) => {
        if (this.activeCategory === 'Dimsum Ori') return item.kategori === 'Dimsum Original';
        if (this.activeCategory === 'Dimsum Mentai') return item.kategori === 'Dimsum Mentai';
        if (this.activeCategory === 'Dimsum Hot Lava') return item.kategori === 'Dimsum Hot Lava';
        return item.kategori.toLowerCase().includes(this.activeCategory.toLowerCase());
      });
    }

    // Filter Pencarian
    if (this.searchKeyword.trim() !== '') {
      const q = this.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter((item) => 
        item.nama.toLowerCase().includes(q) || 
        item.kategori.toLowerCase().includes(q) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="menu-empty-state">
          <i class="ph ph-magnifying-glass" style="font-size:36px; color:#94A3B8;"></i>
          <p>Tidak ada menu yang sesuai dengan pencarian "${escapeHtml(this.searchKeyword)}"</p>
          <button class="btn-secondary" onclick="App.resetSearch()">Tampilkan Semua</button>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach((item) => {
      // Pilih icon sesuai kategori
      let categoryBadgeClass = 'badge-dimsum';
      let iconName = 'ph-bowl-food';
      if (item.kategori.includes('Minuman')) {
        categoryBadgeClass = 'badge-drink';
        iconName = 'ph-brandy';
      } else if (item.kategori.includes('Mie')) {
        categoryBadgeClass = 'badge-noodle';
        iconName = 'ph-bowl-food';
      } else if (item.kategori.includes('Birthday')) {
        categoryBadgeClass = 'badge-birthday';
        iconName = 'ph-cake';
      } else if (item.kategori.includes('Wonton') || item.kategori.includes('Basreng')) {
        categoryBadgeClass = 'badge-snack';
        iconName = 'ph-fire';
      }

      html += `
        <div class="menu-card" onclick="Cart.addItem(${JSON.stringify(item).replace(/"/g, '&quot;')})" role="button" tabindex="0">
          <div class="menu-card-header">
            <span class="menu-category-badge ${categoryBadgeClass}">${escapeHtml(item.kategori)}</span>
            <span class="menu-variant-badge">${escapeHtml(item.varian)}</span>
          </div>
          
          <div class="menu-card-body">
            <div class="menu-card-icon">
              <i class="ph ${iconName}"></i>
            </div>
            <h4 class="menu-card-title">${escapeHtml(item.nama)}</h4>
            ${item.keterangan ? `<p class="menu-card-desc">${escapeHtml(item.keterangan)}</p>` : ''}
          </div>

          <div class="menu-card-footer">
            <div class="menu-card-price">Rp${Number(item.harga).toLocaleString('id-ID')}</div>
            <button class="btn-add-quick" aria-label="Tambah ${escapeHtml(item.nama)}">
              <i class="ph ph-plus"></i>
            </button>
          </div>
        </div>
      `;
    });

    gridEl.innerHTML = html;
  },

  /**
   * Reset filter pencarian
   */
  resetSearch() {
    this.searchKeyword = '';
    const searchInput = document.getElementById('search-menu-input');
    if (searchInput) searchInput.value = '';
    this.activeCategory = 'Semua';
    this.updateCategoryTabsUI();
    this.renderMenu();
  },

  /**
   * Mengatur tab kategori aktif
   */
  setCategory(categoryName) {
    this.activeCategory = categoryName;
    this.updateCategoryTabsUI();
    this.renderMenu();
  },

  updateCategoryTabsUI() {
    document.querySelectorAll('.cat-tab-btn').forEach((btn) => {
      if (btn.dataset.category === this.activeCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  /**
   * Menampilkan info kasir dan nama toko di header
   */
  renderHeaderInfo() {
    const storeNameEl = document.getElementById('header-store-name');
    const cashierNameEl = document.getElementById('header-cashier-name');
    
    const savedCashier = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_CASHIER) || 'Alfian';
    Cart.activeCashier = savedCashier;

    if (storeNameEl) storeNameEl.innerText = APP_CONFIG.STORE_NAME;
    if (cashierNameEl) cashierNameEl.innerText = savedCashier;
  },

  /**
   * Buka Modal Pembayaran (Checkout)
   */
  openCheckoutModal() {
    if (Cart.items.length === 0) {
      Notifications.toast('Keranjang masih kosong.', 'warning');
      return;
    }

    const modal = document.getElementById('checkout-modal');
    const grandTotal = Cart.getGrandTotal();
    
    this.paymentCashReceived = grandTotal; // Default uang pas
    this.paymentMethod = 'Tunai';

    document.getElementById('checkout-grand-total').innerText = `Rp${grandTotal.toLocaleString('id-ID')}`;
    document.getElementById('input-cash-amount').value = grandTotal;
    
    this.updatePaymentMethodTabsUI();
    this.updateChangeCalculation();

    if (modal) {
      modal.classList.add('modal-open');
    }
  },

  closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('modal-open');
  },

  setPaymentMethod(method) {
    this.paymentMethod = method;
    this.updatePaymentMethodTabsUI();

    const cashPanel = document.getElementById('payment-cash-panel');
    const qrisPanel = document.getElementById('payment-qris-panel');

    if (method === 'Tunai') {
      if (cashPanel) cashPanel.style.display = 'block';
      if (qrisPanel) qrisPanel.style.display = 'none';
      this.updateChangeCalculation();
    } else {
      if (cashPanel) cashPanel.style.display = 'none';
      if (qrisPanel) qrisPanel.style.display = 'block';
      this.paymentCashReceived = Cart.getGrandTotal();
      document.getElementById('checkout-change-amount').innerText = 'Rp0';
    }
  },

  updatePaymentMethodTabsUI() {
    document.querySelectorAll('.pay-method-btn').forEach((btn) => {
      if (btn.dataset.method === this.paymentMethod) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  /**
   * Tombol instan nominal cash (Uang Pas, 10k, 20k, 50k, 100k)
   */
  setQuickCash(amount) {
    if (amount === 'pas') {
      this.paymentCashReceived = Cart.getGrandTotal();
    } else {
      this.paymentCashReceived = Number(amount);
    }
    document.getElementById('input-cash-amount').value = this.paymentCashReceived;
    this.updateChangeCalculation();
  },

  /**
   * Menghitung kembalian uang tunai
   */
  updateChangeCalculation() {
    const grandTotal = Cart.getGrandTotal();
    const inputVal = Number(document.getElementById('input-cash-amount').value) || 0;
    this.paymentCashReceived = inputVal;

    const changeEl = document.getElementById('checkout-change-amount');
    const btnSubmit = document.getElementById('btn-submit-payment');

    const change = this.paymentCashReceived - grandTotal;

    if (changeEl) {
      if (change < 0) {
        changeEl.innerText = `Kurang Rp${Math.abs(change).toLocaleString('id-ID')}`;
        changeEl.style.color = '#DC2626';
        if (btnSubmit) btnSubmit.disabled = true;
      } else {
        changeEl.innerText = `Rp${change.toLocaleString('id-ID')}`;
        changeEl.style.color = '#059669';
        if (btnSubmit) btnSubmit.disabled = false;
      }
    }
  },

  /**
   * Eksekusi Selesaikan Pembayaran Transaksi
   */
  async submitPayment() {
    const grandTotal = Cart.getGrandTotal();
    const change = Math.max(0, this.paymentCashReceived - grandTotal);

    if (this.paymentMethod === 'Tunai' && this.paymentCashReceived < grandTotal) {
      Notifications.error('Uang Diterima Kurang', `Total tagihan Rp${grandTotal.toLocaleString('id-ID')}, uang diterima baru Rp${this.paymentCashReceived.toLocaleString('id-ID')}`);
      return;
    }

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const transaction = {
      id: Cart.generateTransactionId(),
      tanggal: dateFormatted,
      jam: timeFormatted,
      kasir: Cart.activeCashier,
      tipePesanan: Cart.orderType,
      metodeBayar: this.paymentMethod,
      subtotal: Cart.getSubtotal(),
      diskon: Cart.discountAmount,
      biayaLain: Cart.otherFeeAmount,
      totalAkhir: grandTotal,
      uangDiterima: this.paymentCashReceived,
      kembalian: change,
      statusBayar: 'Lunas',
      statusSync: 'Online',
      items: JSON.parse(JSON.stringify(Cart.items))
    };

    this.currentTransaction = transaction;

    // Tutup modal checkout
    this.closeCheckoutModal();

    // Kirim ke Google Apps Script (atau antrean offline jika koneksi lambat)
    Notifications.toast('Memproses transaksi...', 'info', 1500);
    const syncRes = await SyncEngine.sendTransaction(transaction);

    // Kosongkan keranjang
    Cart.clear();

    // Tampilkan SweetAlert2 dialog sukses dengan opsi cetak struk / kirim WA
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Transaksi Berhasil!',
        html: `
          <div style="text-align:center; padding:10px 0;">
            <p style="font-size:16px; margin:0 0 4px 0; color:#64748B;">Kembalian Pelanggan:</p>
            <h2 style="font-size:32px; color:#059669; font-weight:800; font-family:'JetBrains Mono', monospace; margin:0 0 16px 0;">
              Rp${change.toLocaleString('id-ID')}
            </h2>
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; font-size:13px; text-align:left;">
              <div><strong>No Transaksi:</strong> ${transaction.id}</div>
              <div><strong>Tipe:</strong> ${transaction.tipePesanan} | <strong>Metode:</strong> ${transaction.metodeBayar}</div>
              <div><strong>Status Data:</strong> ${syncRes.mode === 'online' ? '<span style="color:#059669">Tersimpan di Google Sheets</span>' : '<span style="color:#D97706">Tersimpan di Memori Lokal</span>'}</div>
            </div>
          </div>
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Cetak Struk Thermal',
        denyButtonText: 'Kirim Struk WhatsApp',
        cancelButtonText: 'Transaksi Baru',
        confirmButtonColor: '#E03E1A',
        denyButtonColor: '#25D366',
        cancelButtonColor: '#64748B',
        customClass: {
          popup: 'swal2-tf-popup',
          confirmButton: 'swal2-tf-btn-primary',
          denyButton: 'swal2-tf-btn-whatsapp',
          cancelButton: 'swal2-tf-btn-secondary'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          Receipt.printThermal(transaction);
        } else if (result.isDenied) {
          Receipt.shareWhatsApp(transaction);
        }
      });
    }
  },

  /**
   * Helper format tanggal untuk filter laporan
   */
  getTodayIsoDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  getTodayIndoDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  },

  isoToIndoDate(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  indoToIsoDate(indo) {
    if (!indo) return '';
    const parts = indo.split('/');
    if (parts.length !== 3) return indo;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  },

  /**
   * Buka Modal Rekapan Penjualan Otomatis (Solusi anti-catat manual)
   */
  async openReportsModal(period = null, customDate = null) {
    const modal = document.getElementById('reports-modal');
    if (!modal) return;

    if (period) {
      this.currentReportFilter = period;
    }
    if (customDate !== null) {
      this.currentReportCustomDate = customDate;
    } else if (!this.currentReportCustomDate) {
      this.currentReportCustomDate = this.getTodayIsoDate();
    }

    modal.classList.add('modal-open');
    await this.fetchAndRenderReports();
  },

  closeReportsModal() {
    const modal = document.getElementById('reports-modal');
    if (modal) modal.classList.remove('modal-open');
  },

  async changeReportPeriod(period) {
    this.currentReportFilter = period;
    if (period === 'custom' && !this.currentReportCustomDate) {
      this.currentReportCustomDate = this.getTodayIsoDate();
    }
    await this.fetchAndRenderReports();
  },

  async onCustomDateChange(dateValue) {
    if (!dateValue) return;
    this.currentReportCustomDate = dateValue;
    this.currentReportFilter = 'custom';
    await this.fetchAndRenderReports();
  },

  async refreshCurrentReport() {
    await this.fetchAndRenderReports();
  },

  renderReportFilterBarHtml() {
    const isToday = this.currentReportFilter === 'today';
    const isAll = this.currentReportFilter === 'all';
    const isCustom = this.currentReportFilter === 'custom';
    const pickerVal = this.currentReportCustomDate || this.getTodayIsoDate();

    return `
      <div class="recap-filter-bar">
        <div class="recap-filter-group">
          <button type="button" class="recap-filter-pill ${isToday ? 'active' : ''}" onclick="App.changeReportPeriod('today')">
            <i class="ph ph-calendar"></i> Hari Ini
          </button>
          <button type="button" class="recap-filter-pill ${isAll ? 'active' : ''}" onclick="App.changeReportPeriod('all')">
            <i class="ph ph-database"></i> Semua Penjualan
          </button>
          <button type="button" class="recap-filter-pill ${isCustom ? 'active' : ''}" onclick="App.changeReportPeriod('custom')">
            <i class="ph ph-calendar-plus"></i> Pilih Tanggal
          </button>
        </div>
        ${isCustom ? `
          <div class="recap-custom-date">
            <input type="date" class="recap-date-input" value="${pickerVal}" onchange="App.onCustomDateChange(this.value)" />
          </div>
        ` : ''}
        <button type="button" class="recap-refresh-btn" onclick="App.refreshCurrentReport()" title="Segarkan Data Rekap">
          <i class="ph ph-arrows-clockwise"></i>
        </button>
      </div>
    `;
  },

  async buildLocalReportFallback(filterParam) {
    let offlineList = [];
    try {
      if (typeof DB !== 'undefined' && DB.getOfflineTransactions) {
        offlineList = await DB.getOfflineTransactions();
      }
    } catch (e) {
      console.warn('Gagal ambil transaksi offline:', e);
    }

    const allLocal = [...offlineList];
    if (this.currentTransaction && !allLocal.some(t => t.id === this.currentTransaction.id)) {
      allLocal.push(this.currentTransaction);
    }

    const todayStr = this.getTodayIndoDate();
    const customStr = this.isoToIndoDate(this.currentReportCustomDate);

    const filtered = allLocal.filter(t => {
      const tgl = String(t.tanggal || '').trim();
      if (filterParam === 'all') return true;
      if (filterParam === 'custom') return tgl === customStr;
      return tgl === todayStr;
    });

    let totalOmzet = 0;
    let totalTunai = 0;
    let totalQris = 0;
    let totalTransfer = 0;
    const itemMap = {};

    filtered.forEach(t => {
      const total = Number(t.totalAkhir) || 0;
      totalOmzet += total;
      const metode = String(t.metodeBayar || '').toLowerCase();
      if (metode === 'tunai' || metode === 'cash') totalTunai += total;
      else if (metode === 'qris') totalQris += total;
      else totalTransfer += total;

      if (Array.isArray(t.items)) {
        t.items.forEach(it => {
          const name = it.nama;
          if (!itemMap[name]) itemMap[name] = { nama: name, qty: 0, omzet: 0 };
          itemMap[name].qty += (Number(it.qty) || 0);
          itemMap[name].omzet += (Number(it.subtotal) || 0);
        });
      }
    });

    let label = `Hari Ini (${todayStr})`;
    if (filterParam === 'all') label = 'Semua Penjualan (All-Time)';
    else if (filterParam === 'custom') label = customStr || 'Tanggal Pilihan';

    return {
      tanggal: label,
      totalOmzet,
      totalTransaksi: filtered.length,
      metode: { tunai: totalTunai, qris: totalQris, transfer: totalTransfer },
      itemsTerjual: Object.values(itemMap).sort((a, b) => b.qty - a.qty),
      transaksiTerbaru: filtered.slice(-10).reverse()
    };
  },

  async fetchAndRenderReports() {
    const contentEl = document.getElementById('reports-content-area');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="recap-dashboard">
        ${this.renderReportFilterBarHtml()}
        <div class="recap-loading-state">
          <div class="tf-spinner"></div>
          <p>Memuat ringkasan penjualan...</p>
        </div>
      </div>
    `;

    const apiUrl = getApiUrl();
    let reportData = null;

    let filterParam = this.currentReportFilter;
    let queryStr = '?action=getReports';

    if (filterParam === 'all') {
      queryStr = '?action=getReports&period=all&date=all';
    } else if (filterParam === 'custom') {
      const indoDate = this.isoToIndoDate(this.currentReportCustomDate);
      queryStr = `?action=getReports&period=custom&date=${encodeURIComponent(indoDate)}`;
    } else {
      queryStr = `?action=getReports&period=today&date=${encodeURIComponent(this.getTodayIndoDate())}`;
    }

    if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
      try {
        const res = await fetch(`${apiUrl}${queryStr}`);
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          reportData = json.data;
        }
      } catch (e) {
        console.warn('Gagal ambil laporan online:', e);
      }
    }

    if (!reportData) {
      reportData = await this.buildLocalReportFallback(filterParam);
    }

    this.renderReportsView(reportData);
  },

  renderReportsView(data) {
    const contentEl = document.getElementById('reports-content-area');
    if (!contentEl) return;

    let itemsHtml = '';
    if (data.itemsTerjual && data.itemsTerjual.length > 0) {
      data.itemsTerjual.forEach((it) => {
        itemsHtml += `
          <div class="recap-item-row">
            <span class="recap-item-name">${escapeHtml(it.nama)}</span>
            <span class="recap-item-qty">${it.qty} porsi</span>
            <span class="recap-item-omzet">Rp${Number(it.omzet).toLocaleString('id-ID')}</span>
          </div>
        `;
      });
    } else {
      let emptyMsg = 'Belum ada menu terjual pada periode ini.';
      if (this.currentReportFilter === 'today') {
        emptyMsg = 'Belum ada menu terjual hari ini. Pesanan baru kasir akan otomatis terakumulasi di sini.';
      } else if (this.currentReportFilter === 'all') {
        emptyMsg = 'Belum ada riwayat transaksi penjualan yang tercatat di database.';
      } else if (this.currentReportFilter === 'custom') {
        emptyMsg = `Tidak ada catatan transaksi penjualan pada tanggal ${escapeHtml(data.tanggal || '')}.`;
      }
      itemsHtml = `<p class="text-muted" style="text-align:center; padding:18px 12px; margin:0; font-size:13px;">${emptyMsg}</p>`;
    }

    const cashSubLabel = this.currentReportFilter === 'today' ? 'Wajib cocok dengan fisik laci' : 'Total pemasukan uang tunai';

    contentEl.innerHTML = `
      <div class="recap-dashboard">
        ${this.renderReportFilterBarHtml()}

        <!-- Kartu Ringkasan Finansial -->
        <div class="recap-stat-grid">
          <div class="stat-card">
            <span class="stat-label">Total Omzet Penjualan</span>
            <span class="stat-value font-mono">Rp${Number(data.totalOmzet || 0).toLocaleString('id-ID')}</span>
            <span class="stat-sub">Periode: ${escapeHtml(data.tanggal || '')}</span>
          </div>

          <div class="stat-card">
            <span class="stat-label">Total Transaksi Selesai</span>
            <span class="stat-value font-mono">${data.totalTransaksi || 0} Pesanan</span>
            <span class="stat-sub">Semua saluran pesanan</span>
          </div>

          <div class="stat-card">
            <span class="stat-label">Uang Kas Tunai (Laci)</span>
            <span class="stat-value font-mono" style="color:#059669;">Rp${Number((data.metode && data.metode.tunai) || 0).toLocaleString('id-ID')}</span>
            <span class="stat-sub">${cashSubLabel}</span>
          </div>

          <div class="stat-card">
            <span class="stat-label">Uang Non-Tunai (QRIS)</span>
            <span class="stat-value font-mono" style="color:#2563EB;">Rp${Number((data.metode && data.metode.qris) || 0).toLocaleString('id-ID')}</span>
            <span class="stat-sub">Masuk rekening digital</span>
          </div>
        </div>

        <!-- Rincian Produk Terlaris -->
        <div class="recap-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 class="recap-section-title" style="margin-bottom:0;"><i class="ph ph-chart-bar"></i> Rincian Menu Terjual</h4>
            <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">${(data.itemsTerjual && data.itemsTerjual.length) || 0} varian</span>
          </div>
          <div class="recap-table-container">
            ${itemsHtml}
          </div>
        </div>

        <!-- Tombol Aksi Tambahan -->
        <div class="recap-footer-actions">
          <button class="btn-secondary" onclick="App.triggerLockedFeature('Ekspor Laporan Excel/PDF', 'Unduh laporan rekapan lengkap dalam bentuk spreadsheet Excel atau format cetak PDF resmi untuk pembukuan bulanan.')">
            <i class="ph ph-file-arrow-down"></i> Ekspor Excel / PDF 🔒
          </button>
          <button class="btn-primary" onclick="App.closeReportsModal()">Selesai Melihat Rekap</button>
        </div>
      </div>
    `;
  },

  /**
   * Handler untuk memicu modal fitur terkunci (Upsell Pro)
   */
  triggerLockedFeature(featureName, featureDescription) {
    Notifications.showUpgradeModal(featureName, featureDescription);
  },

  /**
   * Buka Modal Pengaturan Toko & Koneksi Apps Script
   */
  openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const inputUrl = document.getElementById('setting-api-url');
    const inputCashier = document.getElementById('setting-cashier-name');

    if (inputUrl) inputUrl.value = getApiUrl();
    if (inputCashier) inputCashier.value = Cart.activeCashier;

    modal.classList.add('modal-open');
  },

  closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('modal-open');
  },

  async saveSettings() {
    const inputUrl = document.getElementById('setting-api-url').value;
    const inputCashier = document.getElementById('setting-cashier-name').value;

    if (inputUrl && inputUrl.trim()) {
      saveApiUrl(inputUrl.trim());
    }

    if (inputCashier && inputCashier.trim()) {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_CASHIER, inputCashier.trim());
      Cart.activeCashier = inputCashier.trim();
      this.renderHeaderInfo();
    }

    this.closeSettingsModal();
    Notifications.toast('Pengaturan berhasil disimpan!', 'success', 2000);

    // Refresh menu jika URL berubah
    await this.loadMenu();
  },

  /**
   * Uji koneksi ke endpoint Apps Script Web App
   */
  async testApiConnection() {
    const apiUrl = getApiUrl();
    if (apiUrl.includes('AKfycbz_placeholder')) {
      Notifications.error('URL Belum Disetel', 'Silakan masukkan URL Web App Google Apps Script Anda terlebih dahulu.');
      return;
    }

    Notifications.toast('Menguji koneksi ke Google Sheets...', 'info', 2000);
    try {
      const res = await fetch(`${apiUrl}?action=ping`);
      const json = await res.json();
      if (json.status === 'success') {
        Notifications.success('Koneksi Berhasil!', `Terhubung ke Google Sheets Database Teras Foodies.<br><small style="color:#64748B;">Timestamp: ${json.timestamp}</small>`);
      } else {
        throw new Error(json.message);
      }
    } catch (e) {
      Notifications.error('Koneksi Gagal', 'Tidak dapat menghubungi Apps Script. Pastikan Web App sudah di-deploy dengan akses "Anyone".');
    }
  },

  /**
   * Trigger PWA Install Prompt
   */
  async triggerPWAInstall() {
    if (!this.deferredInstallPrompt) {
      Notifications.toast('Aplikasi sudah terpasang atau browser Anda tidak mendukung prompt otomatis.', 'info');
      return;
    }

    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    this.deferredInstallPrompt = null;

    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) installBtn.style.display = 'none';
  },

  /**
   * Pasang semua Event Listener UI
   */
  bindEvents() {
    // Search input
    const searchInput = document.getElementById('search-menu-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchKeyword = e.target.value;
        this.renderMenu();
      });
    }

    // Input nominal cash di modal checkout
    const cashInput = document.getElementById('input-cash-amount');
    if (cashInput) {
      cashInput.addEventListener('input', () => this.updateChangeCalculation());
    }

    // Toggle tipe pesanan di keranjang
    document.querySelectorAll('.order-type-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.order-type-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        Cart.setOrderType(chip.dataset.type);
      });
    });

    // Mobile Bottom Sheet Cart trigger
    const floatingCartBar = document.getElementById('floating-cart-bar');
    const cartSidebar = document.getElementById('pos-cart-panel');
    const closeMobileCartBtn = document.getElementById('btn-close-mobile-cart');

    if (floatingCartBar && cartSidebar) {
      floatingCartBar.addEventListener('click', () => {
        cartSidebar.classList.add('mobile-cart-open');
      });
    }

    if (closeMobileCartBtn && cartSidebar) {
      closeMobileCartBtn.addEventListener('click', () => {
        cartSidebar.classList.remove('mobile-cart-open');
      });
    }

    // Theme Toggle (Dark / Light)
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, newTheme);
        themeBtn.innerHTML = newTheme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
      });

      // Restore saved theme
      const savedTheme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    }
  }
};

// Mulai aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
