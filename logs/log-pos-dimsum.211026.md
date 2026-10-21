# LOG PENGEMBANGAN POS TERAS FOODIES
**Tanggal**: 21 Oktober 2026 (211026)  
**Klien**: Pak Alfian (Teras Foodies)  
**Developer WhatsApp**: 088228511309 (`6288228511309`)  
**Domain Live**: [https://posdimsum.pages.dev](https://posdimsum.pages.dev)  
**Repository GitHub**: [https://github.com/Husnula/posdimsum.git](https://github.com/Husnula/posdimsum.git)  
**Google Spreadsheet Database**: [https://docs.google.com/spreadsheets/d/1Fl8fT9NJOUq_iktrdp_GkTBatiwY_NyoSPPJm-C6OWo/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1Fl8fT9NJOUq_iktrdp_GkTBatiwY_NyoSPPJm-C6OWo/edit?usp=sharing)  
**Apps Script Deployment**: `https://script.google.com/macros/s/AKfycbwPaWCE4svxuuaimsDHd5rrQq1TTfd3CCnmFjHx6mmsxD45eopyQSviDZjxHiG7BOw3nA/exec`

---

## 1. Konteks Bisnis & Permintaan Klien

Berdasarkan diskusi dengan klien (Pak Alfian):
- *"Iy jadikan Apk sing penting iso diakses Nggawe Tab"*
- *"Dari rekap penjualan gak catat manual"*

### Visi & Solusi:
1. **Fokus Tablet POS (PWA)**: Kasir mengoperasikan aplikasi lewat Tablet di meja kasir gerai. Tampilan dirancang khusus ramah layar sentuh, tombol besar (44px - 56px), dan dapat dipasang langsung (Add to Home Screen) sehingga berjalan mandiri berasa seperti APK Android native tanpa bilah URL browser.
2. **Rekapan Penjualan Otomatis**: Menghapus beban hitung nota manual di malam hari. Setiap pesanan kasir otomatis tersimpan ke Google Sheets. Menu Rekap Penjualan menyajikan omzet hari ini, perbandingan Tunai vs QRIS, dan total porsi setiap menu yang laku terjual.
3. **Strategi Monetisasi (Freemium & Upsell)**:
   - **Fitur Terbuka (Paket Inti Klien)**: POS kasir cepat, varian 4/6/8 pcs, catatan item, tombol uang pas, kembalian otomatis, cetak struk thermal 58mm/80mm, kirim struk WhatsApp, rekapan penjualan harian otomatis, dan ketahanan offline.
   - **Fitur Terkunci (Label 🔒 Pro)**: Manajemen Shift Kasir & Rekonsiliasi Kas laci, Catat Pengeluaran Operasional & Estimasi Laba Bersih, Multi-Saluran Ojek Online Markup, Master Data Menu Editor di Web, dan Ekspor Laporan Excel/PDF. Saat diklik, muncul modal SweetAlert2 elegan dengan tombol langsung mengarah ke WhatsApp Developer `088228511309`.

---

## 2. Arsitektur Teknis Sistem

```text
[ Tablet / Smartphone Kasir ]
            │
            ▼  (PWA Standalone / Browser)
[ Cloudflare Pages: posdimsum.pages.dev ]
            │
            ▼  (Advanced Mode: _worker.js)
    ┌───────────────────────────────┐
    │  API Gateway & Reverse Proxy  │
    │  - Bypass CORS                │
    │  - Follow 302 Redirect        │
    │  - Serve Static Assets (PWA)  │
    └───────────────────────────────┘
            │
            ▼  (JSON REST API)
[ Google Apps Script Web App: Code.gs ]
            │
            ▼  (Batch getValues / setValues)
[ Google Sheets Database (1Fl8fT9NJOUq_iktrdp_GkTBatiwY_NyoSPPJm-C6OWo) ]
  ├── 1. Sheet 'Menu' (26 item menu riil Teras Foodies)
  ├── 2. Sheet 'Transaksi' (Header transaksi, total, metode bayar)
  ├── 3. Sheet 'Detail_Transaksi' (Item breakdown per pesanan)
  ├── 4. Sheet 'Pengeluaran_Operasional' (Bahan baku, gas, kemasan)
  ├── 5. Sheet 'Shift_Kasir' (Rekonsiliasi kas awal vs kas laci)
  └── 6. Sheet 'Pengaturan' (Profil toko, slogan, nomor WA)
```

---

## 3. Struktur Berkas yang Terbentuk

1. **`PRD.md`**: Product Requirements Document lengkap, personas kasir, dapur, dan owner.
2. **`DESIGN_SISTEM.md`**: Desain sistem, Three Dials (`DESIGN_VARIANCE: 3`, `MOTION_INTENSITY: 4`, `VISUAL_DENSITY: 7`), palet warna kuliner Chili Red `#E03E1A`, tipografi Plus Jakarta Sans & JetBrains Mono, target sentuh minimal 44px, dan template struk thermal 58mm.
3. **`plan.md`**: Rencana pengembangan bertahap dari tahap 1 hingga tahap 9.
4. **`Code.gs`**: Kode Google Apps Script dengan fungsi `setupDatabase()`, `doGet()`, `doPost()`, batch processing, dan `SpreadsheetApp.flush()`.
5. **`config.js` & `js/config.js`**: Konfigurasi toko, URL proxy `/api`, URL Google Apps Script live, nomor WA developer `088228511309`, dan pemetaan fitur terkunci/terbuka.
6. **`_worker.js`**: Cloudflare Pages Worker untuk reverse proxy API dan serving aset statis PWA.
7. **`index.html`**: Antarmuka kasir Tablet modern bebas data dummy statis (100% memuat data riil dari Google Sheets).
8. **`css/style.css`**: Stylesheet responsif Tablet (Portrait & Landscape split screen), scroll mandiri antar panel, Dark Mode, dan styling cetak struk printer thermal `@media print`.
9. **`js/notifications.js`**: Modul notifikasi modern anti-alert bawaan browser menggunakan SweetAlert2 dan Floating Toast kustom.
10. **`js/db.js`**: Modul IndexedDB untuk caching katalog menu dan antrean transaksi offline.
11. **`js/cart.js`**: Mesin keranjang belanja, varian pcs, kalkulasi subtotal, diskon, dan grand total.
12. **`js/receipt.js`**: Generator cetak thermal 58mm/80mm dan generator struk teks WhatsApp digital.
13. **`js/sync.js`**: Mesin sinkronisasi online/offline dengan pengiriman otomatis saat koneksi internet kembali tersambung.
14. **`js/app.js`**: Controller utama kasir, filter kategori, pencarian, checkout modal, modal rekapan penjualan otomatis, dan modal fitur terkunci.
15. **`manifest.json` & `sw.js`**: Konfigurasi PWA dan Service Worker untuk instalasi Tablet dan caching offline.
16. **`assets/icon-192.svg` & `assets/icon-512.svg`**: Ikon kukusan dimsum Teras Foodies.

---

## 4. Evolusi & Perbaikan Ergonomi Tablet

### Masalah Awal:
- Pada resolusi iPad Mini Portrait (768 x 1024 px), tampilan sebelumnya beralih ke layout smartphone satu kolom di mana keranjang kasir tersembunyi di bilah bawah (*floating bar*) sehingga kasir harus repot membuka dan menutup keranjang.
- Saat daftar item belanja banyak, seluruh halaman luar ikut ter-scroll sehingga tombol bayar terdorong ke bawah.

### Solusi yang Diimplementasikan:
1. **Split Screen Permanen di Tablet (Portrait & Landscape)**:
   - Breakpoint mobile diubah menjadi `< 768px`.
   - Semua tablet (`>= 768px`, baik orientasi tegak maupun mendatar) selalu menampilkan dua kolom berdampingan.
2. **Scroll Mandiri (Independent Dual Scroll)**:
   - Header atas terkunci permanen (`overflow: hidden` pada body).
   - Panel kiri (Etalase Produk) melakukan scroll mandiri pada kartu-kartu menu, dengan pencarian dan tab kategori tetap diam di atas.
   - Panel kanan (Pesanan Aktif) melakukan scroll mandiri pada baris item belanja pelanggan, sementara rincian Subtotal, Diskon, TOTAL AKHIR, dan tombol besar **PROSES PEMBAYARAN** selalu terkunci permanen di bagian bawah, siap ditekan kapan saja dalam satu ketukan tanpa harus mencari ke bawah.

---

## 5. Hasil Verifikasi & Pengujian

- **Uji Endpoint API**:
  - `GET https://posdimsum.pages.dev/api?action=ping` -> Respon sukses online (`200 OK`).
  - `GET https://posdimsum.pages.dev/api?action=getMenu` -> Memuat 26 menu riil langsung dari database Google Sheets.
- **Uji Transaksi Kasir**:
  - Simulasi transaksi pesanan Dimsum Ori 4 pcs + Dimsum Mentai 6 pcs (Total Rp30.000).
  - Pembayaran tunai Rp50.000 -> Kalkulasi kembalian otomatis Rp20.000.
  - Dialog SweetAlert2 sukses menampilkan opsi Cetak Struk Thermal dan Kirim Struk WhatsApp.
  - Transaksi berhasil tercatat dengan nomor `TRF-20261021-6334`.
- **Uji Modal Rekapan Penjualan**:
  - Menampilkan omzet harian, jumlah pesanan selesai, rekap uang fisik laci (Tunai) vs uang rekening (QRIS), dan daftar menu yang laku terjual hari ini.
- **Uji Fitur Terkunci (Upsell Pro)**:
  - Tombol Shift 🔒 dan Biaya 🔒 menampilkan modal eksklusif dengan tombol hubungi WhatsApp Developer `088228511309`.
- **Uji Kepatuhan Aturan**:
  - Nol em-dash (`—`) di seluruh antarmuka dan berkas kode (digantikan tanda hubung reguler `-`).
  - Nol alert/confirm bawaan browser (100% SweetAlert2 dan Custom Toast).

---

## 6. Riwayat Commit Git

1. `5e93418`: `docs: inisialisasi PRD, Design System, dan Plan pengembangan POS Dimsum Teras Foodies`
2. `d41da02`: `feat: aplikasi POS Dimsum Teras Foodies PWA dengan Google Sheets backend, rekapan otomatis, dan fitur pro terkunci`
3. `cbd037f`: `feat(cloudflare): tambahkan _worker.js proxy dan config.js root untuk Cloudflare Pages`
4. `b46c185`: `fix(config): pasang URL Apps Script live Teras Foodies ke _worker.js dan config.js`
5. `1a3e097`: `style: optimasi tampilan tablet portrait dan landscape dengan split screen dan scroll mandiri`

Seluruh kode tersimpan aman di repositori lokal dan tersinkronisasi di GitHub **[Husnula/posdimsum](https://github.com/Husnula/posdimsum.git)**.
