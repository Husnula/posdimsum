import { describe, it, expect, beforeEach, vi } from 'vitest';
const { Cart, escapeHtml } = require('../js/cart.js');

describe('Modul Cart (Keranjang Kasir POS Dimsum)', () => {
  beforeEach(() => {
    // Reset state keranjang sebelum tiap pengujian
    Cart.clear();
  });

  describe('escapeHtml utility', () => {
    it('harus mengamankan karakter berbahaya (XSS prevention)', () => {
      const input = '<script>alert("XSS & Dimsum")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS &amp; Dimsum&quot;)&lt;/script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('harus mengembalikan string kosong jika input falsy', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('Cart.addItem', () => {
    it('harus berhasil menambahkan menu baru ke keranjang dengan kuantitas 1', () => {
      const menu = {
        id: 'MNU-001',
        nama: 'Dimsum Ori 4 pcs',
        kategori: 'Dimsum Original',
        varian: '4 pcs',
        harga: 10000,
        stok: 50
      };

      Cart.addItem(menu);

      expect(Cart.items).toHaveLength(1);
      expect(Cart.items[0]).toMatchObject({
        id: 'MNU-001',
        nama: 'Dimsum Ori 4 pcs',
        qty: 1,
        harga: 10000,
        subtotal: 10000
      });
      expect(global.Notifications.toast).toHaveBeenCalledWith(
        'Dimsum Ori 4 pcs ditambahkan',
        'success',
        expect.any(Number)
      );
    });

    it('harus menambah qty dan kalkulasi subtotal saat item yang sama ditambahkan lagi', () => {
      const menu = {
        id: 'MNU-001',
        nama: 'Dimsum Ori 4 pcs',
        harga: 10000,
        stok: 10
      };

      Cart.addItem(menu);
      Cart.addItem(menu);

      expect(Cart.items).toHaveLength(1);
      expect(Cart.items[0].qty).toBe(2);
      expect(Cart.items[0].subtotal).toBe(20000);
    });

    it('harus menolak penambahan jika stok menu habis (stok = 0)', () => {
      const menuHabis = {
        id: 'MNU-002',
        nama: 'Dimsum Mentai 6 pcs',
        harga: 20000,
        stok: 0
      };

      Cart.addItem(menuHabis);

      expect(Cart.items).toHaveLength(0);
      expect(global.Notifications.toast).toHaveBeenCalledWith(
        'Menu "Dimsum Mentai 6 pcs" sedang habis!',
        'error',
        expect.any(Number)
      );
    });

    it('harus menolak penambahan jika kuantitas melebihi batas stok', () => {
      const menuStokSedikit = {
        id: 'MNU-003',
        nama: 'Mie Jebew Wonton',
        harga: 12000,
        stok: 1
      };

      Cart.addItem(menuStokSedikit);
      Cart.addItem(menuStokSedikit); // Coba tambah ke-2 padahal stok cuma 1

      expect(Cart.items[0].qty).toBe(1);
      expect(global.Notifications.toast).toHaveBeenCalledWith(
        'Stok "Mie Jebew Wonton" tidak mencukupi (Sisa 1 porsi)',
        'warning',
        expect.any(Number)
      );
    });
  });

  describe('Cart.updateQty & Cart.removeItem', () => {
    it('harus menambah atau mengurangi kuantitas dengan updateQty', () => {
      const menu = { id: 'MNU-010', nama: 'Basreng Pedas', harga: 5000, stok: 'Unlimited' };
      Cart.addItem(menu);

      Cart.updateQty(0, 1);
      expect(Cart.items[0].qty).toBe(2);
      expect(Cart.items[0].subtotal).toBe(10000);

      Cart.updateQty(0, -1);
      expect(Cart.items[0].qty).toBe(1);
      expect(Cart.items[0].subtotal).toBe(5000);
    });

    it('harus otomatis menghapus item jika qty dikurangi hingga 0', () => {
      const menu = { id: 'MNU-010', nama: 'Basreng Pedas', harga: 5000, stok: 'Unlimited' };
      Cart.addItem(menu);

      Cart.updateQty(0, -1);
      expect(Cart.items).toHaveLength(0);
    });

    it('harus menghapus item secara manual dengan removeItem', () => {
      Cart.addItem({ id: 'M-1', nama: 'Item 1', harga: 10000, stok: 'Unlimited' });
      Cart.addItem({ id: 'M-2', nama: 'Item 2', harga: 15000, stok: 'Unlimited' });

      expect(Cart.items).toHaveLength(2);
      Cart.removeItem(0);

      expect(Cart.items).toHaveLength(1);
      expect(Cart.items[0].id).toBe('M-2');
    });
  });

  describe('Perhitungan Subtotal, Diskon & Grand Total', () => {
    it('harus menghitung subtotal dan grand total dengan akurat', () => {
      Cart.addItem({ id: 'A', nama: 'Dimsum Ori', harga: 10000, stok: 10 });
      Cart.addItem({ id: 'A', nama: 'Dimsum Ori', harga: 10000, stok: 10 }); // qty: 2 (20.000)
      Cart.addItem({ id: 'B', nama: 'Es Teh Manis', harga: 4000, stok: 10 });  // qty: 1 (4.000)

      expect(Cart.getSubtotal()).toBe(24000);
      expect(Cart.getGrandTotal()).toBe(24000);

      // Terapkan diskon Rp5.000
      Cart.setDiscount(5000);
      expect(Cart.discountAmount).toBe(5000);
      expect(Cart.getGrandTotal()).toBe(19000);
    });

    it('tidak boleh menghasilkan grand total negatif jika diskon melebihi subtotal', () => {
      Cart.addItem({ id: 'A', nama: 'Air Mineral', harga: 3000, stok: 10 });
      Cart.setDiscount(10000);

      expect(Cart.getSubtotal()).toBe(3000);
      expect(Cart.getGrandTotal()).toBe(0);
    });
  });

  describe('Cart.generateTransactionId', () => {
    it('harus menghasilkan ID transaksi dengan format TRF-YYYYMMDD-XXXX', () => {
      const trxId = Cart.generateTransactionId();
      expect(trxId).toMatch(/^TRF-\d{8}-\d{4}$/);
    });
  });
});

