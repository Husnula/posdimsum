# Product Requirements Document (PRD)
# POS Teras Foodies - Sistem Kasir & Manajemen Penjualan Dimsum

## 1. Ringkasan Eksekutif & Visi Produk

POS Teras Foodies adalah aplikasi web kasir berbasis Progressive Web App (PWA) modern yang dirancang khusus untuk operasional penjualan kuliner harian Teras Foodies (Dimsum Original, Dimsum Mentai, Dimsum Hot Lava, Wonton Chili Oil, Basreng Chili Oil, Mie Jebew, Minuman, dan Dimsum Birthday).

Aplikasi ini menggunakan Google Sheets sebagai database utama yang dikelola melalui Google Apps Script (GAS) API. Sistem didesain untuk berjalan sangat cepat, memiliki antarmuka responsif ramah layar sentuh (touchscreen smartphone, tablet, maupun PC desktop kasir), mendukung operasional offline saat koneksi internet terputus dengan sinkronisasi otomatis, serta bebas dari notifikasi bawaan browser yang kaku (100% menggunakan notifikasi modern SweetAlert2 dan Toast interaktif).

## 2. Profil Pengguna (User Personas)

### 2.1 Kasir / Front-of-House
- **Kebutuhan**: Input pesanan dalam hitungan detik, ganti varian (4 pcs, 6 pcs, 8 pcs) dengan sekali ketuk, hitung kembalian cepat menggunakan tombol uang pas / pecahan nominal, dan cetak struk thermal 58mm atau kirim struk digital ke WhatsApp pelanggan.
- **Tantangan**: Antrean ramai saat jam sibuk, koneksi internet seluler di gerai kadang tidak stabil, rentan salah hitung kembalian manual.

### 2.2 Tim Dapur / Kitchen
- **Kebutuhan**: Melihat ringkasan pesanan masuk (tiket dapur) yang jelas, varian pcs yang tepat, dan catatan khusus (contoh: tidak pedas, saus dipisah, tulisan keju ulang tahun).
- **Tantangan**: Pesanan tertukar atau varian saus salah racik saat banyak orderan bersamaan.

### 2.3 Pemilik Gerai / Owner (Pak Alfian)
- **Kebutuhan**: Memantau omzet penjualan harian secara real-time langsung di Google Sheets, melihat produk terlaris, mengawasi selisih kas kasir saat pergantian shift, dan mencatat pengeluaran operasional (pembelian bahan baku/kemasan).
- **Tantangan**: Tidak ingin ribet dengan software POS langganan bulanan mahal dan server rumit; menginginkan data tersimpan rapi di Google Sheets miliknya sendiri.

## 3. Sumber Daya & Integrasi Eksternal

- **Google Spreadsheet Database**: `https://docs.google.com/spreadsheets/d/1Fl8fT9NJOUq_iktrdp_GkTBatiwY_NyoSPPJm-C6OWo/edit?usp=sharing`
- **Google Apps Script Project**: ID `1Ov_tOHI-yJNONc57gwMcFSontKBilwmi9aR5iFYzltqxMzyGlgpVuzpg`
- **Repository GitHub**: `https://github.com/Husnula/posdimsum.git`
- **Menu Referensi**: `menu_teras_foodies.md` (Dimsum Ori, Mentai, Hot Lava, Wonton, Basreng, Mie Jebew, Aneka Es, Birthday Dimsum)

## 4. Persyaratan Fungsional (Functional Requirements)

### 4.1 Modul Kasir & Pemesanan Cepat (POS Engine)
1. **Katalog Menu Interaktif**:
   - Tampilan grid produk terorganisir per kategori tab (Semua, Dimsum Ori, Dimsum Mentai, Dimsum Hot Lava, Wonton, Basreng, Mie Jebew, Minuman, Birthday Dimsum).
   - Kartu menu menampilkan foto/ikon produk, nama, badge varian, dan harga jual.
   - Fitur pencarian instan (search filter) berdasarkan nama menu atau kategori.
2. **Pemilihan Varian & Catatan Pesanan**:
   - Dimsum memiliki varian porsi (4 pcs, 6 pcs, 8 pcs) dengan harga otomatis menyesuaikan.
   - Pilihan catatan per item (contoh: saus dipisah, ekstra chili oil, tulisan keju custom max 5 simbol untuk Dimsum Birthday).
3. **Keranjang Pesanan (Active Cart)**:
   - Menampilkan daftar item yang dipilih, varian, qty (tombol tambah/kurang/hapus cepat), subtotal per item.
   - Input diskon (nominal atau persentase) dan biaya tambahan/ongkir jika ada.
   - Pemilihan Tipe Pesanan: Dine-in (Makan di Tempat), Takeaway (Bungkus), ShopeeFood, GoFood, GrabFood, WhatsApp Order.
   - Kalkulasi otomatis: Subtotal, Diskon, Biaya Tambahan, dan Total Akhir (Grand Total).
4. **Modal Pembayaran Cepat (Quick Checkout)**:
   - Pilihan metode pembayaran: Tunai (Cash), QRIS, Transfer Bank.
   - Tombol nominal instan (Uang Pas, Rp10.000, Rp20.000, Rp50.000, Rp100.000).
   - Keypad angka sentuh (touch numeric keypad) untuk input manual nominal bayar.
   - Kalkulasi kembalian otomatis dengan validasi uang tidak boleh kurang dari total belanja jika metode tunai.

### 4.2 Manajemen Struk & Notifikasi Pesanan
1. **Cetak Struk Thermal (ESC/POS & Web Print)**:
   - Format struk standar 58mm / 80mm yang rapi dan proporsional.
   - Memuat: Nama Toko (Teras Foodies), Alamat, Nomor Kontak WhatsApp, ID Transaksi, Waktu & Tanggal, Kasir, Tipe Pesanan, Rincian Item + Varian, Total, Metode Bayar, Uang Diterima, Kembalian, dan Pesan Penutup / Footer.
   - Mendukung dialog cetak browser langsung (Ctrl+P / Web Print API) dengan stylesheet `@media print` khusus struk thermal.
2. **Kirim Struk WhatsApp (Digital Receipt)**:
   - Satu tombol untuk membuka WhatsApp Web atau aplikasi WhatsApp dengan teks pesan struk yang diformat elegan dan rapi secara otomatis.
3. **Tiket Dapur (Kitchen Slip)**:
   - Tampilan ringkas untuk bagian dapur yang memprioritaskan nama menu, varian porsi, dan instruksi catatan khusus.

### 4.3 PWA & Ketahanan Offline (Offline-First Resiliency)
1. **Dukungan Progressive Web App (PWA)**:
   - File `manifest.json` lengkap (nama aplikasi, icon berbagai resolusi, theme-color `#E03E1A`, display standalone).
   - Service Worker (`sw.js`) untuk caching aset statis (HTML, CSS, JS, icon, library CDN).
   - Prompt instalasi otomatis ("Tambahkan ke Layar Utama") untuk pengalaman seperti aplikasi native di Android/iOS/Desktop.
2. **Antrean Transaksi Offline (Offline Queue via IndexedDB / LocalStorage)**:
   - Indikator status konektivitas di header (Online: hijau, Offline: kuning/oranye).
   - Jika koneksi internet terputus saat transaksi diselesaikan:
     - Transaksi tetap berhasil diproses secara lokal.
     - Struk tetap dapat dicetak atau ditampilkan.
     - Data transaksi masuk ke antrean lokal ("Pending Sync").
     - Badge notifikasi antrean menampilkan jumlah transaksi yang belum tersinkronisasi.
     - Saat koneksi online kembali, sistem secara otomatis (atau manual via tombol) menyinkronkan seluruh antrean transaksi ke Google Sheets.

### 4.4 Standar Notifikasi Modern (Anti-Alert Bawaan)
1. **Larangan Keras**:
   - Tidak ada penggunaan `alert()`, `confirm()`, atau `prompt()` bawaan browser di seluruh kode aplikasi.
2. **Implementasi SweetAlert2**:
   - Notifikasi sukses transaksi dengan animasi centang modern dan rincian kembalian.
   - Dialog konfirmasi pembatalan pesanan atau penghapusan data dengan tombol aksi estetik (Ya, Lanjutkan / Batal).
   - Dialog peringatan kesalahan (stok habis, nominal uang kurang, koneksi error).
3. **Sistem Toast Melayang (Floating Toast Notification)**:
   - Toast interaktif di pojok layar untuk aksi ringan: item ditambahkan ke keranjang, status jaringan berubah, atau item berhasil dihapus.

### 4.5 Backend & Database Google Apps Script (`Code.gs`)
1. **Otomatisasi Database (`setupDatabase`)**:
   - Fungsi mandiri `setupDatabase()` wajib ada di `Code.gs`.
   - Otomatis membuat 6 lembar kerja (sheets) jika belum ada:
     - `Menu`: Daftar produk, kategori, varian, harga jual, status aktif, gambar URL, deskripsi.
     - `Transaksi`: ID Transaksi, Timestamp, Kasir, Tipe Pesanan, Metode Bayar, Subtotal, Diskon, Biaya, Total Akhir, Uang Bayar, Kembalian, Status Sync, Catatan.
     - `Detail_Transaksi`: ID Detail, ID Transaksi, ID Menu, Nama Menu, Varian, Harga Satuan, Qty, Subtotal Item, Catatan Item.
     - `Pengeluaran_Operasional`: ID Pengeluaran, Tanggal, Jam, Kategori, Nominal, Keterangan, Dicatat Oleh.
     - `Shift_Kasir`: ID Shift, Tanggal, Kasir, Jam Buka, Jam Tutup, Modal Awal, Penjualan Tunai, Penjualan Non-Tunai, Kas Aktual, Selisih, Status Shift.
     - `Pengaturan`: Konfigurasi gerai, alamat, nomor WhatsApp, header struk, footer struk, PIN akses kasir dan manager.
   - Otomatis mengisi data awal menu Teras Foodies dari `menu_teras_foodies.md` sehingga gerai langsung siap pakai.
2. **Operasi Batch Cepat**:
   - Membaca dan menulis data menggunakan `getValues()` dan `setValues()` secara massal (batch operation) untuk menjamin respon kilat di bawah 1 detik.
   - Pemanggilan `SpreadsheetApp.flush()` sebelum return data.
3. **Endpoint API Terpadu (`doGet` & `doPost`)**:
   - Menerima permintaan JSON dari frontend PWA dengan format terstruktur.
   - `action=getMenu`: Mengambil seluruh menu aktif beserta varian.
   - `action=saveTransaction`: Menyimpan transaksi utama dan rincian detail pesanan secara atomik.
   - `action=syncBatchTransactions`: Menerima kumpulan transaksi offline sekaligus untuk disinkronkan.
   - `action=getReports`: Mengambil agregasi omzet harian, mingguan, dan produk terlaris.
   - `action=manageShift`: Buka dan tutup shift kasir.
   - `action=saveExpense`: Mencatat biaya pengeluaran operasional.
   - `action=updateMenu`: Mengubah harga, status ketersediaan stok, atau menambah menu baru.

### 4.6 Manajemen Shift & Rekonsiliasi Kasir
1. **Buka Shift**:
   - Kasir memasukkan nama kasir dan modal kas awal (uang kembalian di laci kas).
2. **Tutup Shift**:
   - Sistem merangkum total penjualan tunai dan non-tunai selama shift berlangsung.
   - Kasir memasukkan hitungan fisik uang kas aktual di laci.
   - Sistem menghitung selisih kas (tepat / surplus / minus) dan mencatatnya ke sheet `Shift_Kasir`.

### 4.7 Pelaporan & Analitik Ringkas
1. **Dashboard Ringkasan Harian**:
   - Total omzet hari ini.
   - Total transaksi selesai.
   - Pembagian metode bayar (Tunai vs QRIS vs Transfer).
   - Pembagian saluran pesanan (Dine-in, Takeaway, Online Food).
2. **Peringkat Menu Terlaris (Top Selling)**:
   - Daftar 5 menu paling banyak terjual hari ini dan minggu ini.
3. **Log Pengeluaran Operasional**:
   - Pencatatan pembelian es batu, gas elpiji, bahan mentah darurat, atau kantong plastik dengan bukti nominal langsung mengurangi kas bersih.

## 5. Persyaratan Non-Fungsional (Non-Functional Requirements)

1. **Kecepatan & Performa**:
   - Waktu buka awal aplikasi (First Contentful Paint) < 1.5 detik.
   - Latensi interaksi klik item menu ke keranjang < 50 milidetik.
   - Ukuran bundle ringan tanpa framework berat yang memperlambat perangkat kasir.
2. **Kesesuaian Ergonomi Layar Sentuh**:
   - Target sentuh (touch target) minimal 44 x 44 piksel pada semua tombol dan baris menu.
   - Jarak antar tombol yang memadai guna mencegah salah sentuh (accidental click).
3. **Konsistensi Tampilan & Tema**:
   - Menggunakan palette warna khas kuliner dimsum (Chili Red, Warm Amber, Charcoal Dark, Cream White).
   - Desain kontras tinggi (WCAG AA compliant) agar teks menu dan nominal harga tetap terbaca jelas di kondisi pencahayaan luar ruangan (outdoor food stall).
4. **Keamanan & Integritas Data**:
   - Validasi data di sisi client dan server Apps Script.
   - Pembatasan akses pengaturan menu dan pembatalan transaksi dengan validasi PIN Manager.
5. **Kebijakan Nol Em-Dash (Zero Em-Dash Protocol)**:
   - Seluruh teks, label antarmuka, struk, dan dokumentasi dilarang menggunakan karakter em-dash (`—`) sesuai pedoman taste skill, digantikan tanda hubung reguler `-` atau pemisah bersih lainnya.

## 6. Milestone Pengembangan

- **Tahap 1**: Penyusunan Dokumen Perencanaan (plan.md, PRD.md, DESIGN_SISTEM.md).
- **Tahap 2**: Pembuatan Backend Apps Script (`Code.gs`) dengan fungsi `setupDatabase()`, endpoint `doGet`/`doPost`, dan struktur 6 sheet.
- **Tahap 3**: Pembangunan Antarmuka Frontend Kasir (HTML, CSS Design System, JS POS Core) terhubung 100% ke Google Sheets tanpa data dummy statis.
- **Tahap 4**: Integrasi Sistem Notifikasi Modern (SweetAlert2 & Custom Toast) dan Mesin Cetak Struk (Thermal & WhatsApp).
- **Tahap 5**: Konfigurasi PWA (manifest, service worker, caching, offline transaction queue & auto-sync).
- **Tahap 6**: Modul Shift Kasir, Pengeluaran, dan Dashboard Laporan.
- **Tahap 7**: Pengujian Lengkap, Audit Taste Skill, dan Deployment ke GitHub Repository.
