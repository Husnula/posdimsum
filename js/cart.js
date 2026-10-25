/**
 * MODUL KERANJANG BELANJA (CART ENGINE)
 * Menangani penambahan item, kalkulasi subtotal, diskon, dan grand total
 */

const Cart = {
  items: [],
  orderType: 'Dine-in', // Dine-in, Takeaway, WhatsApp
  discountAmount: 0,
  otherFeeAmount: 0,
  activeCashier: 'Kasir',

  /**
   * Menambahkan item menu ke dalam keranjang dengan validasi ketersediaan stok
   */
  addItem(menuItem) {
    if (!menuItem) return;

    // Validasi jika stok habis
    if (menuItem.stok !== 'Unlimited' && typeof menuItem.stok === 'number') {
      if (menuItem.stok <= 0) {
        Notifications.toast(`Menu "${menuItem.nama}" sedang habis!`, 'error', 2500);
        return;
      }
    }

    // Cek apakah item dengan ID yang sama persis sudah ada di keranjang
    const existingIndex = this.items.findIndex((i) => i.id === menuItem.id);

    if (existingIndex > -1) {
      if (menuItem.stok !== 'Unlimited' && typeof menuItem.stok === 'number') {
        if (this.items[existingIndex].qty + 1 > menuItem.stok) {
          Notifications.toast(`Stok "${menuItem.nama}" tidak mencukupi (Sisa ${menuItem.stok} porsi)`, 'warning', 2500);
          return;
        }
      }
      this.items[existingIndex].qty += 1;
      this.items[existingIndex].subtotal = this.items[existingIndex].qty * this.items[existingIndex].harga;
    } else {
      this.items.push({
        id: menuItem.id,
        nama: menuItem.nama,
        kategori: menuItem.kategori,
        varian: menuItem.varian || 'Standar',
        harga: Number(menuItem.harga) || 0,
        qty: 1,
        subtotal: Number(menuItem.harga) || 0,
        catatan: ''
      });
    }

    this.render();
    Notifications.toast(`${menuItem.nama} ditambahkan`, 'success', 1800);
  },

  /**
   * Mengubah jumlah kuantitas item (+1 atau -1) dengan validasi batas stok
   */
  updateQty(index, delta) {
    if (this.items[index]) {
      if (delta > 0 && typeof App !== 'undefined' && App.menuItems) {
        const itemInfo = this.items[index];
        const menuItem = App.menuItems.find((m) => m.id === itemInfo.id);
        if (menuItem && menuItem.stok !== 'Unlimited' && typeof menuItem.stok === 'number') {
          if (itemInfo.qty + delta > menuItem.stok) {
            Notifications.toast(`Stok "${itemInfo.nama}" tidak mencukupi (Sisa ${menuItem.stok} porsi)`, 'warning', 2500);
            return;
          }
        }
      }

      this.items[index].qty += delta;
      if (this.items[index].qty <= 0) {
        this.removeItem(index);
        return;
      }
      this.items[index].subtotal = this.items[index].qty * this.items[index].harga;
      this.render();
    }
  },

  /**
   * Menghapus item dari keranjang
   */
  removeItem(index) {
    if (this.items[index]) {
      const removedName = this.items[index].nama;
      this.items.splice(index, 1);
      this.render();
      Notifications.toast(`${removedName} dihapus`, 'info', 1500);
    }
  },

  /**
   * Menambahkan catatan khusus untuk satu item (contoh: saus dipisah)
   */
  updateNote(index, note) {
    if (this.items[index]) {
      this.items[index].catatan = note || '';
      this.render();
    }
  },

  /**
   * Mengatur tipe pesanan
   */
  setOrderType(type) {
    this.orderType = type || 'Dine-in';
    this.renderSummary();
  },

  /**
   * Mengatur nilai diskon nominal
   */
  setDiscount(amount) {
    this.discountAmount = Math.max(0, Number(amount) || 0);
    this.renderSummary();
  },

  /**
   * Menghitung subtotal kotor
   */
  getSubtotal() {
    return this.items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  },

  /**
   * Menghitung total akhir setelah diskon
   */
  getGrandTotal() {
    const subtotal = this.getSubtotal();
    const total = subtotal - this.discountAmount + this.otherFeeAmount;
    return Math.max(0, total);
  },

  /**
   * Mengosongkan keranjang setelah transaksi selesai
   */
  clear() {
    this.items = [];
    this.discountAmount = 0;
    this.otherFeeAmount = 0;
    this.render();
  },

  /**
   * Menghasilkan ID Transaksi unik berbasis tanggal & timestamp
   * Format: TRF-YYYYMMDD-XXXX
   */
  generateTransactionId() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `TRF-${yyyy}${mm}${dd}-${randomSuffix}`;
  },

  /**
   * Render daftar item di DOM keranjang kasir
   */
  render() {
    const cartListEl = document.getElementById('cart-items-list');
    const cartBadgeEl = document.getElementById('cart-total-badge');
    const cartFloatingCount = document.getElementById('floating-cart-count');
    const cartFloatingTotal = document.getElementById('floating-cart-total');

    if (!cartListEl) return;

    if (this.items.length === 0) {
      cartListEl.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-icon">🛒</div>
          <p class="empty-title">Keranjang Masih Kosong</p>
          <span class="empty-desc">Ketuk menu di samping untuk menambahkan pesanan</span>
        </div>
      `;
    } else {
      let html = '';
      this.items.forEach((item, index) => {
        html += `
          <div class="cart-item-row" data-index="${index}">
            <div class="cart-item-info">
              <div class="cart-item-title">${escapeHtml(item.nama)}</div>
              <div class="cart-item-meta">
                <span class="cart-item-variant">${escapeHtml(item.varian)}</span>
                <span class="cart-item-price">@Rp${Number(item.harga).toLocaleString('id-ID')}</span>
              </div>
              ${item.catatan ? `<div class="cart-item-note">📝 ${escapeHtml(item.catatan)}</div>` : ''}
            </div>

            <div class="cart-item-actions">
              <div class="cart-qty-control">
                <button class="btn-qty" onclick="Cart.updateQty(${index}, -1)" aria-label="Kurang">-</button>
                <span class="qty-number">${item.qty}</span>
                <button class="btn-qty" onclick="Cart.updateQty(${index}, 1)" aria-label="Tambah">+</button>
              </div>
              <div class="cart-item-subtotal">Rp${Number(item.subtotal).toLocaleString('id-ID')}</div>
              <button class="btn-item-note" onclick="Cart.promptItemNote(${index})" title="Tambah Catatan">
                <i class="ph ph-note-pencil"></i>
              </button>
            </div>
          </div>
        `;
      });
      cartListEl.innerHTML = html;
    }

    const totalQty = this.items.reduce((acc, i) => acc + i.qty, 0);
    const grandTotal = this.getGrandTotal();

    if (cartBadgeEl) cartBadgeEl.innerText = totalQty;
    if (cartFloatingCount) cartFloatingCount.innerText = `${totalQty} Item`;
    if (cartFloatingTotal) cartFloatingTotal.innerText = `Rp${grandTotal.toLocaleString('id-ID')}`;

    this.renderSummary();
  },

  /**
   * Render ringkasan total biaya
   */
  renderSummary() {
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const discountEl = document.getElementById('cart-discount-val');
    const grandTotalEl = document.getElementById('cart-grand-total-val');
    const btnCheckoutEl = document.getElementById('btn-checkout-action');

    const subtotal = this.getSubtotal();
    const grandTotal = this.getGrandTotal();

    if (subtotalEl) subtotalEl.innerText = `Rp${subtotal.toLocaleString('id-ID')}`;
    if (discountEl) discountEl.innerText = `Rp${this.discountAmount.toLocaleString('id-ID')}`;
    if (grandTotalEl) grandTotalEl.innerText = `Rp${grandTotal.toLocaleString('id-ID')}`;

    if (btnCheckoutEl) {
      btnCheckoutEl.disabled = this.items.length === 0;
    }
  },

  /**
   * Prompt input catatan per item menggunakan SweetAlert2
   */
  async promptItemNote(index) {
    if (!this.items[index]) return;
    const currentNote = this.items[index].catatan || '';
    const newNote = await Notifications.prompt(
      `Catatan: ${this.items[index].nama}`,
      'Contoh: Saus dipisah / extra chili oil / pedas dikit',
      currentNote
    );
    if (newNote !== null) {
      this.updateNote(index, newNote);
    }
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
