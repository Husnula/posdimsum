/**
 * APLIKASI UTAMA POS TERAS FOODIES (CONTROLLER)
 * Menghubungkan antarmuka kasir Tablet dengan katalog menu, keranjang,
 * mesin pembayaran, struk, dan rekapan penjualan otomatis
 */

const App = {
  menuItems: [],
  allMenuItems: [],
  activeCategory: 'Semua',
  searchKeyword: '',
  deferredInstallPrompt: null,
  currentTransaction: null,
  paymentCashReceived: 0,
  paymentMethod: 'Tunai',
  currentReportFilter: 'today',
  currentReportCustomDate: '',
  activeStockTab: 'catalog',
  restockChanges: {},
  opnameDiffs: {},
  OWNER_PIN: 'alfian1991',

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

    // Render status kasir & badge kunci akses
    this.renderHeaderInfo();
    this.updateLockBadges();
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
      if (installBtn) installBtn.style.display = 'inline-flex';
      const drawerInstallBtn = document.getElementById('drawer-btn-install');
      if (drawerInstallBtn) drawerInstallBtn.style.display = 'flex';
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) installBtn.style.display = 'none';
      const drawerInstallBtn = document.getElementById('drawer-btn-install');
      if (drawerInstallBtn) drawerInstallBtn.style.display = 'none';
      Notifications.toast('Aplikasi berhasil dipasang di layar Anda!', 'success', 3000);
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
   * Render kartu menu ke dalam Grid sesuai filter kategori dan pencarian,
   * dilengkapi indikator stok pintar (Aman, Menipis, Habis)
   */
  renderMenu() {
    const gridEl = document.getElementById('menu-grid-container');
    if (!gridEl) return;

    // Hanya tampilkan menu yang aktif di katalog kasir
    let filtered = this.menuItems.filter((item) => {
      const st = String(item.status || 'Aktif').toLowerCase();
      return st !== 'nonaktif';
    });

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
      // Hitung status stok persediaan
      const isUnlimited = (item.stok === 'Unlimited');
      const stockNum = isUnlimited ? null : (Number(item.stok) || 0);
      const minStock = Number(item.minStok) || 5;
      const isOutOfStock = (!isUnlimited && stockNum <= 0);
      const isLowStock = (!isUnlimited && stockNum > 0 && stockNum <= minStock);

      let stockBadgeHtml = '';
      if (isOutOfStock) {
        stockBadgeHtml = `<span class="menu-stock-badge stock-out">HABIS</span>`;
      } else if (isLowStock) {
        stockBadgeHtml = `<span class="menu-stock-badge stock-low">⚠️ Sisa ${stockNum}</span>`;
      } else if (!isUnlimited) {
        stockBadgeHtml = `<span class="menu-stock-badge">Stok: ${stockNum}</span>`;
      } else {
        stockBadgeHtml = `<span class="menu-stock-badge" style="opacity:0.8;">Tersedia</span>`;
      }

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

      const cardClass = isOutOfStock ? 'menu-card out-of-stock' : 'menu-card';
      const clickAction = isOutOfStock
        ? `App.notifyOutOfStock('${escapeHtml(item.nama)}')`
        : `Cart.addItem(${JSON.stringify(item).replace(/"/g, '&quot;')})`;

      html += `
        <div class="${cardClass}" onclick="${clickAction}" role="button" tabindex="0">
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
            <button class="btn-add-quick" aria-label="Tambah ${escapeHtml(item.nama)}" ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? '<i class="ph ph-prohibit"></i>' : '<i class="ph ph-plus"></i>'}
            </button>
          </div>

          <div class="menu-card-stock-row">
            ${stockBadgeHtml}
            <span style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">${escapeHtml(item.id)}</span>
          </div>
        </div>
      `;
    });

    gridEl.innerHTML = html;
  },

  /**
   * Peringatan visual instan jika kasir mengklik menu yang stoknya habis
   */
  notifyOutOfStock(namaMenu) {
    Notifications.toast(`Menu "${namaMenu}" sedang HABIS dan tidak dapat ditambahkan ke pesanan.`, 'error', 3000);
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

    // Potong sisa stok lokal seketika agar kasir tidak menjual item yang sudah habis
    if (transaction.items && transaction.items.length > 0) {
      this.deductLocalStock(transaction.items);
    }

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
   * Verifikasi Kunci Keamanan Pemilik (alfian1991)
   * Mengamankan Rekap Penjualan dan Kelola Menu & Stok
   */
  async verifyOwnerSecurityPin(featureName = 'Fitur Pemilik') {
    // Jika sudah diverifikasi dalam sesi aktif
    if (sessionStorage.getItem('tf_owner_unlocked') === 'true') {
      return true;
    }

    if (typeof Swal === 'undefined') {
      const entered = prompt(`🔒 Menu ini diproteksi.\nMasukkan kunci akses pemilik untuk membuka ${featureName}:`);
      if (entered === this.OWNER_PIN) {
        sessionStorage.setItem('tf_owner_unlocked', 'true');
        this.updateLockBadges();
        return true;
      }
      alert('Kunci akses salah! Akses ditolak.');
      return false;
    }

    const result = await Swal.fire({
      title: '🔒 Kunci Keamanan',
      html: `
        <div style="text-align:center; padding: 4px 0;">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px; line-height:1.5;">
            Fitur <strong>${escapeHtml(featureName)}</strong> dilindungi.<br>Masukkan kunci akses untuk membuka:
          </p>
          <input type="password" id="swal-security-pin" class="swal2-input" placeholder="Kunci akses..." autocomplete="off" style="margin:0 auto; width:100%; max-width:260px; height:46px; font-size:16px; text-align:center; letter-spacing:2px; border-radius:10px;">
          <div style="margin-top:14px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:8px; color:var(--text-secondary);">
            <input type="checkbox" id="swal-remember-session" checked style="width:16px; height:16px; cursor:pointer; accent-color:var(--color-primary);">
            <label for="swal-remember-session" style="cursor:pointer; user-select:none;">Ingat kunci selama sesi browser ini</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="ph ph-lock-key-open"></i> Buka Akses',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#E03E1A',
      cancelButtonColor: '#64748B',
      focusConfirm: false,
      didOpen: () => {
        const inputEl = document.getElementById('swal-security-pin');
        if (inputEl) {
          inputEl.focus();
          inputEl.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') Swal.clickConfirm();
          });
        }
      },
      preConfirm: () => {
        const pinInput = document.getElementById('swal-security-pin');
        const val = pinInput ? pinInput.value.trim() : '';
        const remember = document.getElementById('swal-remember-session')?.checked;
        if (!val) {
          Swal.showValidationMessage('Kunci akses wajib diisi!');
          return false;
        }
        if (val !== this.OWNER_PIN) {
          Swal.showValidationMessage('Kunci akses salah! Hanya pemilik yang berhak.');
          return false;
        }
        return { success: true, remember };
      }
    });

    if (result.isConfirmed && result.value && result.value.success) {
      if (result.value.remember) {
        sessionStorage.setItem('tf_owner_unlocked', 'true');
      }
      Notifications.toast('Akses pemilik berhasil dibuka.', 'success', 2000);
      this.updateLockBadges();
      return true;
    }

    return false;
  },

  /**
   * Kunci kembali akses pemilik
   */
  lockOwnerAccess() {
    sessionStorage.removeItem('tf_owner_unlocked');
    this.updateLockBadges();
    Notifications.toast('Fitur pemilik telah dikunci kembali (alfian1991).', 'info', 2000);
  },

  /**
   * Toggle status kunci pemilik (buka / kunci)
   */
  async toggleOwnerLock() {
    const isUnlocked = (sessionStorage.getItem('tf_owner_unlocked') === 'true');
    if (isUnlocked) {
      this.lockOwnerAccess();
    } else {
      await this.verifyOwnerSecurityPin('Fitur Pemilik');
    }
  },

  /**
   * Perbarui indikator ikon gembok pada seluruh tombol menu
   */
  updateLockBadges() {
    const isUnlocked = (sessionStorage.getItem('tf_owner_unlocked') === 'true');
    document.querySelectorAll('.lock-indicator').forEach((el) => {
      el.innerText = isUnlocked ? '🔓' : '🔒';
    });
    const drawerLabel = document.getElementById('drawer-lock-label');
    if (drawerLabel) {
      drawerLabel.innerText = isUnlocked ? 'Status: Akses Terbuka (Ketuk untuk Kunci)' : 'Status: Terkunci (alfian1991)';
    }
  },

  /**
   * Buka / Tutup Drawer Menu di Layar HP
   */
  toggleMobileMenu(forceState = null) {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const panel = document.getElementById('mobile-drawer-panel');
    if (!overlay || !panel) return;

    const isActive = panel.classList.contains('active');
    const targetState = forceState !== null ? forceState : !isActive;

    if (targetState) {
      overlay.classList.add('active');
      panel.classList.add('active');
      this.updateLockBadges();
    } else {
      overlay.classList.remove('active');
      panel.classList.remove('active');
    }
  },

  /**
   * Toggle mode tema Gelap / Terang (dapat dipanggil dari header maupun drawer HP)
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, newTheme);
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.innerHTML = newTheme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    }
    Notifications.toast(`Tema diubah ke Mode ${newTheme === 'dark' ? 'Gelap' : 'Terang'}.`, 'info', 1500);
  },

  /**
   * Buka Modal Rekapan Penjualan Otomatis (Terkunci dengan alfian1991)
   */
  async openReportsModal(period = null, customDate = null) {
    const isAuth = await this.verifyOwnerSecurityPin('Rekap Penjualan');
    if (!isAuth) return;

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
  },

  /**
   * Mengurangi stok lokal secara langsung setelah transaksi sukses
   */
  deductLocalStock(soldItems) {
    if (!this.menuItems || !Array.isArray(this.menuItems)) return;
    soldItems.forEach((sold) => {
      const item = this.menuItems.find((m) => m.id === sold.id);
      if (item && item.stok !== 'Unlimited' && typeof item.stok === 'number') {
        item.stok = Math.max(0, item.stok - (Number(sold.qty) || 1));
      }
      if (this.allMenuItems && Array.isArray(this.allMenuItems)) {
        const allItem = this.allMenuItems.find((m) => m.id === sold.id);
        if (allItem && allItem.stok !== 'Unlimited' && typeof allItem.stok === 'number') {
          allItem.stok = Math.max(0, allItem.stok - (Number(sold.qty) || 1));
        }
      }
    });
    DB.saveMenuCache(this.menuItems).catch(console.warn);
    this.renderMenu();
  },

  /**
   * Buka Modal Kelola Menu & Manajemen Stok (Terkunci dengan alfian1991)
   */
  async openMenuStockModal() {
    const isAuth = await this.verifyOwnerSecurityPin('Kelola Menu & Manajemen Stok');
    if (!isAuth) return;

    const modalEl = document.getElementById('menu-stock-modal');
    if (!modalEl) return;
    modalEl.classList.add('modal-open');

    // Sinkronkan data menu terbaru dari API (termasuk yang nonaktif)
    const apiUrl = getApiUrl();
    if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
      try {
        const response = await fetch(`${apiUrl}?action=getMenu&all=1`);
        const json = await response.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          this.allMenuItems = json.data;
          this.menuItems = json.data;
          await DB.saveMenuCache(this.menuItems);
        }
      } catch (err) {
        console.warn('Gagal sinkron menu dari Apps Script, menggunakan data lokal:', err);
      }
    }

    if (!this.allMenuItems || this.allMenuItems.length === 0) {
      this.allMenuItems = JSON.parse(JSON.stringify(this.menuItems));
    }

    this.restockChanges = {};
    this.opnameDiffs = {};
    this.switchStockTab(this.activeStockTab || 'catalog');
  },

  /**
   * Tutup Modal Kelola Menu & Manajemen Stok
   */
  closeMenuStockModal() {
    const modalEl = document.getElementById('menu-stock-modal');
    if (modalEl) modalEl.classList.remove('modal-open');
    this.renderMenu();
  },

  /**
   * Ganti sub-tab di Modal Manajemen Stok
   */
  switchStockTab(tabName) {
    this.activeStockTab = tabName;
    document.querySelectorAll('.stock-sub-tab').forEach((tab) => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    document.querySelectorAll('.stock-tab-content').forEach((content) => {
      content.classList.remove('active');
    });

    const activeContent = document.getElementById(`stock-tab-${tabName}`);
    if (activeContent) activeContent.classList.add('active');

    if (tabName === 'catalog') {
      this.renderManageMenuTable();
    } else if (tabName === 'restock') {
      this.renderQuickRestockView();
    } else if (tabName === 'opname') {
      this.renderStockOpnameView();
    }
  },

  /**
   * Filter tabel kelola menu berdasarkan pencarian, kategori, dan status
   */
  filterManageMenu() {
    this.renderManageMenuTable();
  },

  /**
   * Render tabel interaktif kelola menu & harga
   */
  renderManageMenuTable() {
    const tbody = document.getElementById('manage-menu-tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('manage-search-input');
    const catFilter = document.getElementById('manage-category-filter');
    const statusFilter = document.getElementById('manage-status-filter');

    const searchQ = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCat = catFilter ? catFilter.value : 'Semua';
    const selectedStatus = statusFilter ? statusFilter.value : 'Semua';

    let list = this.allMenuItems || this.menuItems;

    if (selectedCat !== 'Semua') {
      list = list.filter((m) => m.kategori.toLowerCase().includes(selectedCat.toLowerCase()));
    }

    if (selectedStatus !== 'Semua') {
      list = list.filter((m) => {
        const st = String(m.status || 'Aktif').toLowerCase();
        return selectedStatus.toLowerCase() === st;
      });
    }

    if (searchQ) {
      list = list.filter((m) => 
        m.nama.toLowerCase().includes(searchQ) || 
        m.id.toLowerCase().includes(searchQ) ||
        (m.varian && m.varian.toLowerCase().includes(searchQ))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">
            Tidak ada menu yang sesuai dengan filter.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    list.forEach((item) => {
      const isUnlimited = (item.stok === 'Unlimited');
      const stockNum = isUnlimited ? null : (Number(item.stok) || 0);
      const minStock = Number(item.minStok) || 5;
      const isAktif = (String(item.status || 'Aktif').toLowerCase() !== 'nonaktif');

      let stockBadge = '';
      if (isUnlimited) {
        stockBadge = `<span class="stock-badge-normal">Unlimited</span>`;
      } else if (stockNum <= 0) {
        stockBadge = `<span class="stock-badge-out">0 (Habis)</span>`;
      } else if (stockNum <= minStock) {
        stockBadge = `<span class="stock-badge-low">⚠️ ${stockNum}</span>`;
      } else {
        stockBadge = `<span class="stock-badge-normal">${stockNum} pcs</span>`;
      }

      const hargaJual = Number(item.harga) || 0;
      const hargaModal = Number(item.modal) || 0;
      const margin = hargaJual - hargaModal;
      const marginColor = margin > 0 ? 'var(--color-success)' : 'var(--text-secondary)';

      html += `
        <tr>
          <td><code style="font-family:var(--font-mono); font-size:11px; font-weight:700;">${escapeHtml(item.id)}</code></td>
          <td>
            <strong style="color:var(--text-primary); font-size:13px;">${escapeHtml(item.nama)}</strong>
            <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(item.varian || 'Standar')}</div>
          </td>
          <td><span class="menu-category-badge badge-dimsum" style="font-size:11px;">${escapeHtml(item.kategori)}</span></td>
          <td class="font-mono" style="font-weight:700;">Rp${hargaJual.toLocaleString('id-ID')}</td>
          <td class="font-mono" style="color:var(--text-secondary);">Rp${hargaModal.toLocaleString('id-ID')}</td>
          <td class="font-mono" style="font-weight:700; color:${marginColor};">
            ${margin >= 0 ? '+' : ''}Rp${margin.toLocaleString('id-ID')}
          </td>
          <td>${stockBadge}</td>
          <td>
            <span class="status-pill ${isAktif ? 'active' : 'inactive'}" onclick="App.toggleMenuStatus('${item.id}')" title="Klik untuk ubah status">
              <i class="ph ${isAktif ? 'ph-check-circle' : 'ph-eye-slash'}"></i> ${isAktif ? 'Aktif' : 'Nonaktif'}
            </span>
          </td>
          <td style="text-align:right; white-space:nowrap;">
            <button class="btn-action-icon" title="Edit Data Menu Lengkap" onclick="App.openEditMenuModal('${item.id}')">
              <i class="ph ph-pencil-simple"></i>
            </button>
            <button class="btn-action-icon" title="Ubah Harga Jual Cepat" onclick="App.quickChangePrice('${item.id}')">
              <i class="ph ph-currency-circle-dollar"></i>
            </button>
            <button class="btn-action-icon btn-action-delete" title="Nonaktifkan / Hapus Menu" onclick="App.confirmDeleteMenu('${item.id}')">
              <i class="ph ph-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  /**
   * Buka Modal Form Tambah Menu Baru
   */
  openAddMenuModal() {
    document.getElementById('menu-form-modal-title').innerText = 'Tambah Menu Baru';
    document.getElementById('menu-form-id').value = '';
    document.getElementById('menu-form-nama').value = '';
    document.getElementById('menu-form-kategori').value = 'Dimsum Original';
    document.getElementById('menu-form-varian').value = '';
    document.getElementById('menu-form-harga').value = '';
    document.getElementById('menu-form-modal-val').value = '';
    document.getElementById('menu-form-stok').value = '50';
    document.getElementById('menu-form-min-stok').value = '5';
    document.getElementById('menu-form-keterangan').value = '';
    document.getElementById('menu-form-status').value = 'Aktif';

    const customCatGroup = document.getElementById('menu-form-custom-category-group');
    if (customCatGroup) customCatGroup.style.display = 'none';

    this.setStockMode('tracked');
    document.getElementById('menu-form-modal').classList.add('modal-open');
  },

  /**
   * Buka Modal Form Edit Menu yang Sudah Ada
   */
  openEditMenuModal(id) {
    const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
    if (!item) return;

    document.getElementById('menu-form-modal-title').innerText = `Edit Menu: ${item.nama}`;
    document.getElementById('menu-form-id').value = item.id;
    document.getElementById('menu-form-nama').value = item.nama;

    const catSelect = document.getElementById('menu-form-kategori');
    let catFound = false;
    for (let i = 0; i < catSelect.options.length; i++) {
      if (catSelect.options[i].value === item.kategori) {
        catSelect.selectedIndex = i;
        catFound = true;
        break;
      }
    }
    const customCatGroup = document.getElementById('menu-form-custom-category-group');
    if (!catFound) {
      catSelect.value = '__NEW__';
      if (customCatGroup) {
        customCatGroup.style.display = 'block';
        document.getElementById('menu-form-kategori-custom').value = item.kategori;
      }
    } else {
      if (customCatGroup) customCatGroup.style.display = 'none';
    }

    document.getElementById('menu-form-varian').value = item.varian || '';
    document.getElementById('menu-form-harga').value = item.harga || '';
    document.getElementById('menu-form-modal-val').value = item.modal || '';

    if (item.stok === 'Unlimited') {
      this.setStockMode('unlimited');
    } else {
      this.setStockMode('tracked');
      document.getElementById('menu-form-stok').value = item.stok !== undefined ? item.stok : 50;
      document.getElementById('menu-form-min-stok').value = item.minStok !== undefined ? item.minStok : 5;
    }

    document.getElementById('menu-form-keterangan').value = item.keterangan || '';
    document.getElementById('menu-form-status').value = item.status && item.status.toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif';

    document.getElementById('menu-form-modal').classList.add('modal-open');
  },

  /**
   * Tutup Modal Form Tambah / Edit Menu
   */
  closeMenuFormModal() {
    const modalEl = document.getElementById('menu-form-modal');
    if (modalEl) modalEl.classList.remove('modal-open');
  },

  /**
   * Handle pergantian dropdown kategori pada form menu
   */
  handleFormCategoryChange() {
    const select = document.getElementById('menu-form-kategori');
    const customGroup = document.getElementById('menu-form-custom-category-group');
    if (select && customGroup) {
      customGroup.style.display = select.value === '__NEW__' ? 'block' : 'none';
    }
  },

  /**
   * Atur mode stok pada form (tracked vs unlimited)
   */
  setStockMode(mode) {
    const btnTracked = document.getElementById('btn-stock-mode-tracked');
    const btnUnlimited = document.getElementById('btn-stock-mode-unlimited');
    const fieldsRow = document.getElementById('menu-form-stock-fields');

    if (mode === 'unlimited') {
      if (btnUnlimited) btnUnlimited.classList.add('active');
      if (btnTracked) btnTracked.classList.remove('active');
      if (fieldsRow) fieldsRow.style.display = 'none';
    } else {
      if (btnTracked) btnTracked.classList.add('active');
      if (btnUnlimited) btnUnlimited.classList.remove('active');
      if (fieldsRow) fieldsRow.style.display = 'grid';
    }
  },

  /**
   * Simpan data dari Form Tambah / Edit Menu ke Google Sheets & Cache Lokal
   */
  async submitMenuForm() {
    const menuId = document.getElementById('menu-form-id').value.trim();
    const namaVal = document.getElementById('menu-form-nama').value.trim();
    let kategoriVal = document.getElementById('menu-form-kategori').value;
    if (kategoriVal === '__NEW__') {
      kategoriVal = document.getElementById('menu-form-kategori-custom').value.trim() || 'Menu Tambahan';
    }
    const varianVal = document.getElementById('menu-form-varian').value.trim() || 'Standar';
    const hargaVal = Number(document.getElementById('menu-form-harga').value);
    const modalVal = Number(document.getElementById('menu-form-modal-val').value) || 0;

    const isUnlimited = document.getElementById('btn-stock-mode-unlimited').classList.contains('active');
    const stokVal = isUnlimited ? 'Unlimited' : (Number(document.getElementById('menu-form-stok').value) || 0);
    const minStokVal = Number(document.getElementById('menu-form-min-stok').value) || 5;
    const ketVal = document.getElementById('menu-form-keterangan').value.trim();
    const statusVal = document.getElementById('menu-form-status').value;

    if (!namaVal) {
      Notifications.toast('Nama menu wajib diisi!', 'error', 2500);
      return;
    }
    if (isNaN(hargaVal) || hargaVal <= 0) {
      Notifications.toast('Harga jual harus lebih dari Rp0!', 'error', 2500);
      return;
    }

    const payloadData = {
      id: menuId,
      nama: namaVal,
      kategori: kategoriVal,
      varian: varianVal,
      harga: hargaVal,
      modal: modalVal,
      stok: stokVal,
      status: statusVal,
      keterangan: ketVal,
      minStok: minStokVal,
      operator: Cart.activeCashier
    };

    Notifications.toast('Menyimpan menu...', 'info', 1500);

    const apiUrl = getApiUrl();
    let savedOnline = false;

    if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveMenu', data: payloadData })
        });
        const res = await response.json();
        if (res.status === 'success') {
          savedOnline = true;
          if (res.data && res.data.id) {
            payloadData.id = res.data.id;
          }
        }
      } catch (err) {
        console.warn('Gagal menyimpan menu ke Sheets, disimpan lokal:', err);
      }
    }

    // Update state memori lokal
    if (!payloadData.id) {
      payloadData.id = 'MNU-' + String(this.menuItems.length + 1).padStart(3, '0');
    }

    const existingIdx = this.menuItems.findIndex((m) => m.id === payloadData.id);
    if (existingIdx > -1) {
      this.menuItems[existingIdx] = { ...this.menuItems[existingIdx], ...payloadData };
    } else {
      this.menuItems.push(payloadData);
    }

    const allIdx = (this.allMenuItems || []).findIndex((m) => m.id === payloadData.id);
    if (allIdx > -1) {
      this.allMenuItems[allIdx] = { ...this.allMenuItems[allIdx], ...payloadData };
    } else {
      if (!this.allMenuItems) this.allMenuItems = [];
      this.allMenuItems.push(payloadData);
    }

    await DB.saveMenuCache(this.menuItems);

    this.closeMenuFormModal();
    this.renderManageMenuTable();
    this.renderMenu();

    Notifications.toast(
      savedOnline ? `Menu "${namaVal}" berhasil disimpan ke Google Sheets!` : `Menu "${namaVal}" berhasil disimpan di memori lokal!`,
      'success',
      3000
    );
  },

  /**
   * Popup cepat untuk mengubah harga jual menu seketika
   */
  async quickChangePrice(id) {
    const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
    if (!item) return;

    if (typeof Swal === 'undefined') return;

    const { value: newPrice } = await Swal.fire({
      title: `Ubah Harga: ${item.nama}`,
      input: 'number',
      inputLabel: `Harga saat ini: Rp${Number(item.harga).toLocaleString('id-ID')}`,
      inputValue: item.harga,
      inputAttributes: { min: '500', step: '500' },
      showCancelButton: true,
      confirmButtonText: 'Simpan Harga Baru',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#E03E1A',
      inputValidator: (val) => {
        if (!val || Number(val) <= 0) return 'Masukkan nominal harga yang valid!';
      }
    });

    if (newPrice) {
      item.harga = Number(newPrice);
      const apiUrl = getApiUrl();
      if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveMenu', data: item })
        }).catch(console.warn);
      }
      await DB.saveMenuCache(this.menuItems);
      this.renderManageMenuTable();
      this.renderMenu();
      Notifications.toast(`Harga "${item.nama}" diubah menjadi Rp${Number(newPrice).toLocaleString('id-ID')}`, 'success', 2500);
    }
  },

  /**
   * Toggle status menu antara Aktif dan Nonaktif
   */
  async toggleMenuStatus(id) {
    const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
    if (!item) return;

    const currentStatus = String(item.status || 'Aktif').toLowerCase();
    const newStatus = currentStatus === 'aktif' ? 'Nonaktif' : 'Aktif';
    item.status = newStatus;

    const apiUrl = getApiUrl();
    if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveMenu',
          data: item
        })
      }).catch(console.warn);
    }

    await DB.saveMenuCache(this.menuItems);
    this.renderManageMenuTable();
    this.renderMenu();
    Notifications.toast(`Menu "${item.nama}" disetel menjadi ${newStatus}.`, 'info', 2000);
  },

  /**
   * Konfirmasi penghapusan menu: Pilihan Nonaktifkan (Soft Delete) vs Hapus Permanen (Hard Delete)
   */
  async confirmDeleteMenu(id) {
    const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
    if (!item) return;

    if (typeof Swal === 'undefined') return;

    const result = await Swal.fire({
      icon: 'warning',
      title: `Hapus Menu: ${item.nama}?`,
      text: 'Nonaktifkan menu agar riwayat transaksi masa lalu tetap aman, atau hapus permanen dari Google Sheets.',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Hapus Permanen',
      denyButtonText: 'Nonaktifkan Saja (Aman)',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#DC2626',
      denyButtonColor: '#475569',
      cancelButtonColor: '#CBD5E1'
    });

    if (result.isConfirmed) {
      // Hard Delete
      const apiUrl = getApiUrl();
      if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'deleteMenu', id: item.id, hardDelete: true })
        }).catch(console.warn);
      }
      this.menuItems = this.menuItems.filter((m) => m.id !== id);
      this.allMenuItems = this.allMenuItems.filter((m) => m.id !== id);
      await DB.saveMenuCache(this.menuItems);
      this.renderManageMenuTable();
      this.renderMenu();
      Notifications.toast(`Menu "${item.nama}" dihapus permanen.`, 'success', 2500);
    } else if (result.isDenied) {
      // Soft Delete: Nonaktifkan
      item.status = 'Nonaktif';
      const apiUrl = getApiUrl();
      if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'deleteMenu', id: item.id, hardDelete: false })
        }).catch(console.warn);
      }
      await DB.saveMenuCache(this.menuItems);
      this.renderManageMenuTable();
      this.renderMenu();
      Notifications.toast(`Menu "${item.nama}" dinonaktifkan.`, 'info', 2500);
    }
  },

  /**
   * Render kartu pada Tab 2: Restock Cepat (+5, +10, +20, +50)
   */
  renderQuickRestockView() {
    const container = document.getElementById('restock-items-container');
    if (!container) return;

    const opInput = document.getElementById('restock-operator');
    if (opInput) opInput.value = Cart.activeCashier;

    // Filter menu yang memiliki tracking stok (bukan unlimited)
    const trackedItems = (this.allMenuItems || this.menuItems).filter((m) => m.stok !== 'Unlimited');

    if (trackedItems.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:32px; color:var(--text-muted);">
          Semua menu saat ini berstatus Unlimited (Tanpa Batas Stok).
        </div>
      `;
      return;
    }

    let html = '';
    trackedItems.forEach((item) => {
      const currentStock = Number(item.stok) || 0;
      const changeDelta = Number(this.restockChanges[item.id]) || 0;
      const resultingStock = currentStock + changeDelta;
      const isModified = changeDelta !== 0;

      html += `
        <div class="restock-card ${isModified ? 'modified' : ''}" id="restock-card-${item.id}">
          <div class="restock-card-header">
            <div>
              <div class="restock-item-name">${escapeHtml(item.nama)}</div>
              <div class="restock-item-meta">${escapeHtml(item.kategori)} • ${escapeHtml(item.varian || 'Standar')}</div>
            </div>
            <span class="stock-badge-normal" style="font-size:11px;">Sisa: ${currentStock}</span>
          </div>

          <div class="restock-quick-btns">
            <button type="button" class="quick-qty-btn" onclick="App.applyQuickRestock('${item.id}', 5)">+5</button>
            <button type="button" class="quick-qty-btn" onclick="App.applyQuickRestock('${item.id}', 10)">+10</button>
            <button type="button" class="quick-qty-btn" onclick="App.applyQuickRestock('${item.id}', 20)">+20</button>
            <button type="button" class="quick-qty-btn" onclick="App.applyQuickRestock('${item.id}', 50)">+50</button>
            <button type="button" class="quick-qty-btn" style="color:var(--color-danger);" onclick="App.resetItemRestock('${item.id}')" title="Reset">✕</button>
          </div>

          <div class="restock-input-row">
            <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">Tambah:</span>
            <input type="number" class="restock-qty-input" value="${changeDelta}" min="0" onchange="App.setCustomRestock('${item.id}', this.value)">
            <span class="restock-preview-badge">
              ➜ Total: <strong>${resultingStock}</strong> ${changeDelta > 0 ? `(+${changeDelta})` : ''}
            </span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    this.updateRestockSummary();
  },

  /**
   * Tambahkan angka cepat pada item restock (+5, +10, etc.)
   */
  applyQuickRestock(id, qtyDelta) {
    const current = Number(this.restockChanges[id]) || 0;
    this.restockChanges[id] = current + qtyDelta;
    this.renderQuickRestockView();
  },

  /**
   * Input manual kuantitas penambahan restock
   */
  setCustomRestock(id, customQty) {
    const qty = Math.max(0, Number(customQty) || 0);
    this.restockChanges[id] = qty;
    this.renderQuickRestockView();
  },

  /**
   * Reset perubahan restock untuk satu item
   */
  resetItemRestock(id) {
    delete this.restockChanges[id];
    this.renderQuickRestockView();
  },

  /**
   * Perbarui teks ringkasan tombol restock
   */
  updateRestockSummary() {
    const summaryEl = document.getElementById('restock-summary-text');
    const changedIds = Object.keys(this.restockChanges).filter((id) => Number(this.restockChanges[id]) > 0);
    const totalAdded = changedIds.reduce((sum, id) => sum + Number(this.restockChanges[id]), 0);

    if (summaryEl) {
      if (changedIds.length === 0) {
        summaryEl.innerText = '0 item diubah';
      } else {
        summaryEl.innerText = `${changedIds.length} menu akan ditambah total +${totalAdded} porsi`;
      }
    }
  },

  /**
   * Simpan penambahan stok batch ke Google Sheets dan log Mutasi_Stok
   */
  async submitQuickRestock() {
    const changedIds = Object.keys(this.restockChanges).filter((id) => Number(this.restockChanges[id]) > 0);
    if (changedIds.length === 0) {
      Notifications.toast('Belum ada kuantitas stok yang ditambahkan.', 'warning', 2500);
      return;
    }

    const opInput = document.getElementById('restock-operator');
    const noteInput = document.getElementById('restock-notes');
    const operator = opInput ? opInput.value.trim() : Cart.activeCashier;
    const keterangan = noteInput ? noteInput.value.trim() : 'Restock Cepat Harian';

    const itemsToUpdate = [];
    changedIds.forEach((id) => {
      const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
      if (item) {
        const delta = Number(this.restockChanges[id]);
        const currentStock = Number(item.stok) || 0;
        const newStock = currentStock + delta;
        itemsToUpdate.push({
          id: item.id,
          nama: item.nama,
          qtyMutasi: delta,
          stokBaru: newStock
        });
      }
    });

    Notifications.toast('Menyimpan penambahan stok...', 'info', 2000);

    const apiUrl = getApiUrl();
    let savedOnline = false;

    if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateStockBatch',
            tipeMutasi: 'RESTOCK_MASUK',
            operator: operator,
            keterangan: keterangan,
            items: itemsToUpdate
          })
        });
        const json = await res.json();
        if (json.status === 'success') savedOnline = true;
      } catch (err) {
        console.warn('Gagal sinkron restock ke Sheets, disimpan lokal:', err);
      }
    }

    // Terapkan ke state lokal
    itemsToUpdate.forEach((up) => {
      const item = (this.allMenuItems || this.menuItems).find((m) => m.id === up.id);
      if (item) item.stok = up.stokBaru;
    });

    await DB.saveMenuCache(this.menuItems);
    this.restockChanges = {};
    this.renderQuickRestockView();
    this.renderMenu();

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Restock Berhasil Disimpan!',
        text: `${itemsToUpdate.length} item menu telah diperbarui stoknya ${savedOnline ? 'dan tercatat di sheet Mutasi_Stok Google Sheets.' : 'di memori lokal.'}`,
        confirmButtonColor: '#E03E1A'
      });
    }
  },

  /**
   * Render tabel pada Tab 3: Stok Opname Shift (Audit Fisik Akhir Shift)
   */
  renderStockOpnameView() {
    const tbody = document.getElementById('opname-tbody');
    if (!tbody) return;

    const opInput = document.getElementById('opname-operator');
    if (opInput) opInput.value = Cart.activeCashier;

    const trackedItems = (this.allMenuItems || this.menuItems).filter((m) => m.stok !== 'Unlimited');

    if (trackedItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">
            Semua menu berstatus Unlimited. Tidak ada stok fisik yang perlu di-opname.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    trackedItems.forEach((item) => {
      const currentStock = Number(item.stok) || 0;
      const opData = this.opnameDiffs[item.id] || { physical: currentStock, diff: 0, reason: '' };

      let diffClass = 'zero';
      let diffSign = '';
      if (opData.diff < 0) {
        diffClass = 'minus';
        diffSign = '';
      } else if (opData.diff > 0) {
        diffClass = 'plus';
        diffSign = '+';
      }

      html += `
        <tr>
          <td>
            <strong>${escapeHtml(item.nama)}</strong>
            <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(item.kategori)} • ${escapeHtml(item.varian || 'Standar')}</div>
          </td>
          <td class="font-mono" style="font-weight:700; font-size:14px;">
            ${currentStock} pcs
          </td>
          <td style="width:120px;">
            <input type="number" class="meta-input font-mono" style="width:90px; text-align:center; font-weight:700;" value="${opData.physical}" min="0" onchange="App.onOpnameInputChange('${item.id}', this.value)">
          </td>
          <td>
            <span class="opname-diff-pill ${diffClass}" id="opname-diff-badge-${item.id}">
              ${diffSign}${opData.diff}
            </span>
          </td>
          <td>
            <select class="meta-input" style="font-size:12px; height:36px;" id="opname-reason-${item.id}" onchange="App.onOpnameReasonChange('${item.id}', this.value)">
              <option value="Sesuai">Sesuai / Pas</option>
              <option value="Basi / Kukus Rusak">Basi / Kukus Rusak</option>
              <option value="Bonus Pelanggan">Bonus Pelanggan</option>
              <option value="Selisih Hitung">Selisih Hitung / Lupa Catat</option>
              <option value="Konsumsi Sendiri">Konsumsi Sendiri / Kru</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    this.updateOpnameSummary();
  },

  /**
   * Handle perubahan input fisik aktual di stok opname
   */
  onOpnameInputChange(id, physicalValue) {
    const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
    if (!item) return;

    const currentStock = Number(item.stok) || 0;
    const physical = Math.max(0, Number(physicalValue) || 0);
    const diff = physical - currentStock;

    if (!this.opnameDiffs[id]) {
      this.opnameDiffs[id] = { physical, diff, reason: 'Sesuai' };
    } else {
      this.opnameDiffs[id].physical = physical;
      this.opnameDiffs[id].diff = diff;
    }

    const badgeEl = document.getElementById(`opname-diff-badge-${id}`);
    if (badgeEl) {
      badgeEl.className = 'opname-diff-pill ' + (diff === 0 ? 'zero' : diff < 0 ? 'minus' : 'plus');
      badgeEl.innerText = (diff > 0 ? '+' : '') + diff;
    }

    this.updateOpnameSummary();
  },

  /**
   * Handle pilihan alasan selisih opname
   */
  onOpnameReasonChange(id, reasonVal) {
    if (!this.opnameDiffs[id]) {
      const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
      const currentStock = item ? (Number(item.stok) || 0) : 0;
      this.opnameDiffs[id] = { physical: currentStock, diff: 0, reason: reasonVal };
    } else {
      this.opnameDiffs[id].reason = reasonVal;
    }
  },

  /**
   * Perbarui teks ringkasan tombol eksekusi opname
   */
  updateOpnameSummary() {
    const summaryEl = document.getElementById('opname-summary-text');
    const itemsWithDiff = Object.keys(this.opnameDiffs).filter((id) => this.opnameDiffs[id].diff !== 0);

    if (summaryEl) {
      if (itemsWithDiff.length === 0) {
        summaryEl.innerText = 'Semua stok fisik cocok dengan sistem.';
      } else {
        summaryEl.innerText = `Terdeteksi ${itemsWithDiff.length} menu dengan selisih stok fisik.`;
      }
    }
  },

  /**
   * Eksekusi penyesuaian stok opname shift ke Google Sheets
   */
  async submitStockOpname() {
    const itemsWithDiff = Object.keys(this.opnameDiffs).filter((id) => this.opnameDiffs[id].diff !== 0);
    if (itemsWithDiff.length === 0) {
      Notifications.toast('Seluruh stok fisik sudah sesuai dengan angka sistem.', 'info', 2500);
      return;
    }

    const opInput = document.getElementById('opname-operator');
    const noteInput = document.getElementById('opname-notes');
    const operator = opInput ? opInput.value.trim() : Cart.activeCashier;
    const keterangan = noteInput ? noteInput.value.trim() : 'Stok Opname Shift Kasir';

    const itemsToUpdate = [];
    itemsWithDiff.forEach((id) => {
      const item = (this.allMenuItems || this.menuItems).find((m) => m.id === id);
      if (item) {
        const op = this.opnameDiffs[id];
        itemsToUpdate.push({
          id: item.id,
          nama: item.nama,
          stokBaru: op.physical,
          qtyMutasi: op.diff,
          alasan: op.reason || 'Selisih Opname'
        });
      }
    });

    Notifications.toast('Menyesuaikan stok opname...', 'info', 2000);

    const apiUrl = getApiUrl();
    let savedOnline = false;

    if (navigator.onLine && !apiUrl.includes('AKfycbz_placeholder')) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateStockBatch',
            tipeMutasi: 'OPNAME_PENYESUAIAN',
            operator: operator,
            keterangan: keterangan,
            items: itemsToUpdate
          })
        });
        const json = await res.json();
        if (json.status === 'success') savedOnline = true;
      } catch (err) {
        console.warn('Gagal sinkron opname ke Sheets, disimpan lokal:', err);
      }
    }

    // Terapkan ke state lokal
    itemsToUpdate.forEach((up) => {
      const item = (this.allMenuItems || this.menuItems).find((m) => m.id === up.id);
      if (item) item.stok = up.stokBaru;
    });

    await DB.saveMenuCache(this.menuItems);
    this.opnameDiffs = {};
    this.renderStockOpnameView();
    this.renderMenu();

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Stok Opname Berhasil Disesuaikan!',
        text: `${itemsToUpdate.length} item telah dikoreksi stoknya ${savedOnline ? 'dan dicatat ke riwayat Mutasi_Stok.' : 'di memori lokal.'}`,
        confirmButtonColor: '#E03E1A'
      });
    }
  }
};

// Mulai aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
