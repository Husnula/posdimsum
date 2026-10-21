# Rencana Pengembangan (Plan)
# POS Teras Foodies - Sistem Kasir & Manajemen Penjualan Dimsum PWA

Dokumen ini memuat peta jalan pengembangan terstruktur dan menyeluruh untuk membangun sistem kasir Point of Sale (POS) Teras Foodies berbasis Progressive Web App (PWA) dengan Google Sheets sebagai database melalui Google Apps Script (GAS).

---

## 1. Arsitektur Sistem & Struktur File Proyek

```text
POS DIMSUM/
├── .agents/                    # Rules dan Skills pendukung (Taste Skill & Apps Script)
├── PRD.md                      # Product Requirements Document
├── DESIGN_SISTEM.md            # Desain Sistem, Token Warna, Tipografi & Standar UI
├── plan.md                     # Dokumen Rencana Pengembangan & Eksekusi
├── menu_teras_foodies.md       # Master data menu dan harga riil Teras Foodies
├── Code.gs                     # Backend Google Apps Script (setupDatabase & REST API)
├── index.html                  # Antarmuka Web App Kasir Utama (Responsive POS)
├── css/
│   └── style.css               # Desain Sistem CSS (Tokens, Grid, Responsive, Dark Mode)
├── js/
│   ├── config.js               # Konfigurasi Endpoint Apps Script & Konstanta Toko
│   ├── db.js                   # Manajemen Penyimpanan Lokal & Antrean Offline (IndexedDB)
│   ├── notifications.js        # Modul Notifikasi Modern (SweetAlert2 & Custom Toast)
│   ├── cart.js                 # Logika Keranjang, Diskon, Pajak & Kalkulasi Total
│   ├── receipt.js              # Generator Struk Thermal 58mm/80mm & Struk WhatsApp
│   ├── sync.js                 # Mesin Sinkronisasi Data Transaksi ke Google Sheets
│   └── app.js                  # Controller Utama POS & Inisialisasi Aplikasi
├── manifest.json               # Konfigurasi PWA (Installable Web App)
├── sw.js                       # Service Worker PWA (Offline Asset Caching & Network First)
└── assets/                     # Ikon aplikasi, logo toko, dan visual menu
```

---

## 2. Rincian Database Google Sheets (Spreadsheet ID: 1Fl8fT9NJOUq_iktrdp_GkTBatiwY_NyoSPPJm-C6OWo)

Fungsi `setupDatabase()` di dalam `Code.gs` akan mengotomatisasi pembuatan 6 lembar kerja (sheets) berikut:

### 2.1 Sheet `Menu`
Menyimpan seluruh katalog produk, harga, dan ketersediaan stok:
- Kolom A: `ID_Menu` (contoh: `MNU-001`)
- Kolom B: `Kategori` (Dimsum Ori, Dimsum Mentai, Dimsum Hot Lava, Wonton, Basreng, Mie Jebew, Minuman, Birthday Dimsum)
- Kolom C: `Nama_Menu` (contoh: Dimsum Original)
- Kolom D: `Varian` (4 pcs, 6 pcs, 8 pcs, Standar)
- Kolom E: `Harga_Jual` (contoh: 10000, 15000, 20000)
- Kolom F: `Harga_Modal_HPP` (Estimasi biaya modal)
- Kolom G: `Stok_Tersedia` (Jumlah stok harian atau Unlimited)
- Kolom H: `Status_Aktif` (Aktif / Nonaktif)
- Kolom I: `Gambar_URL` (URL visual produk)
- Kolom J: `Keterangan` (Deskripsi menu)

### 2.2 Sheet `Transaksi`
Menyimpan ringkasan setiap transaksi penjualan yang telah diselesaikan:
- Kolom A: `ID_Transaksi` (format: `TRF-YYYYMMDD-XXXX`)
- Kolom B: `Tanggal` (format: `DD/MM/YYYY`)
- Kolom C: `Jam` (format: `HH:mm:ss`)
- Kolom D: `Kasir` (Nama kasir bertugas)
- Kolom E: `Tipe_Pesanan` (Dine-in, Takeaway, ShopeeFood, GoFood, GrabFood, WhatsApp)
- Kolom F: `Metode_Pembayaran` (Tunai, QRIS, Transfer)
- Kolom G: `Subtotal` (Total harga kotor produk)
- Kolom H: `Diskon` (Nominal potongan harga)
- Kolom I: `Biaya_Lain` (Ongkir / biaya kemasan)
- Kolom J: `Total_Akhir` (Nominal bersih yang dibayar pelanggan)
- Kolom K: `Uang_Diterima` (Uang tunai yang diserahkan pelanggan)
- Kolom L: `Kembalian` (Uang kembalian yang diberikan)
- Kolom M: `Status_Bayar` (Lunas / Menunggu)
- Kolom N: `Status_Sync` (Online / Offline-Synced)
- Kolom O: `Catatan_Transaksi` (Keterangan meja atau catatan khusus)

### 2.3 Sheet `Detail_Transaksi`
Menyimpan rincian item per baris dari setiap transaksi (One-to-Many):
- Kolom A: `ID_Detail` (format: `DTL-YYYYMMDD-XXXX-YY`)
- Kolom B: `ID_Transaksi` (Foreign Key ke Sheet Transaksi)
- Kolom C: `ID_Menu` (Foreign Key ke Sheet Menu)
- Kolom D: `Nama_Menu`
- Kolom E: `Varian`
- Kolom F: `Harga_Satuan`
- Kolom G: `Qty`
- Kolom H: `Subtotal_Item`
- Kolom I: `Catatan_Item` (contoh: saus dipisah, ekstra pedas, tulisan keju custom)

### 2.4 Sheet `Pengeluaran_Operasional`
Mencatat pengeluaran harian kasir:
- Kolom A: `ID_Pengeluaran` (format: `EXP-YYYYMMDD-XXXX`)
- Kolom B: `Tanggal`
- Kolom C: `Jam`
- Kolom D: `Kategori` (Bahan Baku, Kemasan/Plastik, Gas/Listrik, Operasional Toko, Lain-lain)
- Kolom E: `Nominal`
- Kolom F: `Keterangan`
- Kolom G: `Dicatat_Oleh`

### 2.5 Sheet `Shift_Kasir`
Mencatat rekapitulasi shift kasir harian:
- Kolom A: `ID_Shift` (format: `SFT-YYYYMMDD-XX`)
- Kolom B: `Tanggal`
- Kolom C: `Kasir`
- Kolom D: `Jam_Buka`
- Kolom E: `Jam_Tutup`
- Kolom F: `Modal_Awal`
- Kolom G: `Total_Penjualan_Tunai`
- Kolom H: `Total_Penjualan_NonTunai`
- Kolom I: `Total_Pengeluaran_Kas`
- Kolom J: `Kas_Diharapkan` (Modal Awal + Penjualan Tunai - Pengeluaran)
- Kolom K: `Kas_Aktual` (Hitungan fisik uang kas di laci saat tutup)
- Kolom L: `Selisih_Kas` (Kas Aktual - Kas Diharapkan)
- Kolom M: `Status_Shift` (Buka / Tutup)

### 2.6 Sheet `Pengaturan`
Konfigurasi fleksibel gerai Teras Foodies:
- Kolom A: `Kunci_Pengaturan`
- Kolom B: `Nilai`
- Kolom C: `Deskripsi`
- Nilai awal default:
  - `NAMA_TOKO`: Teras Foodies
  - `SLOGAN`: Dimsum & Mie Jebew
  - `ALAMAT`: Jalan Jaya Rengel-Widang, Ds. Kedungrojo, 100 m (Timur Tugu)
  - `WHATSAPP`: 0857-3027-2661
  - `HEADER_STRUK`: Selamat Datang di Teras Foodies
  - `FOOTER_STRUK`: Terima Kasih Atas Kunjungan Anda! IG/TikTok @terasfoodies2
  - `PIN_KASIR`: 1234
  - `PIN_MANAGER`: 8888

---

## 3. Rencana Tahapan Eksekusi (Implementation Roadmap)

### Tahap 1: Fondasi Dokumentasi & Konfigurasi Git (Status: Sedang Berjalan)
- Membuat `PRD.md` (Spesifikasi Produk Lengkap).
- Membuat `DESIGN_SISTEM.md` (Panduan UI, Palet Warna, SweetAlert2 Theming, Ergonomi Layar Sentuh).
- Membuat `plan.md` (Peta Jalan Pelaksanaan Komprehensif).
- Inisialisasi Git lokal dan menghubungkan ke remote `https://github.com/Husnula/posdimsum.git`.

### Tahap 2: Pembangunan Backend Google Apps Script (`Code.gs`)
- Mengembangkan fungsi mandiri `setupDatabase()`:
  - Validasi keberadaan 6 sheet utama di spreadsheet target.
  - Pembuatan sheet baru secara otomatis jika belum ada.
  - Pemberian format header (warna, font tebal, baris beku/freeze, lebar kolom).
  - Pemuatan otomatis data awal seluruh menu dari `menu_teras_foodies.md` ke sheet `Menu`.
  - Pemuatan data pengaturan awal ke sheet `Pengaturan`.
- Mengembangkan handler API web:
  - `doGet(e)`: Melayani request data menu (`action=getMenu`), pengaturan toko (`action=getSettings`), laporan ringkas (`action=getSummary`), dan uji koneksi (`action=ping`).
  - `doPost(e)`: Menerima payload transaksi baru (`action=saveTransaction`), sinkronisasi kumpulan transaksi offline (`action=syncBatchTransactions`), buka/tutup shift (`action=manageShift`), dan pencatatan pengeluaran (`action=saveExpense`).
  - Menghindari pembacaan sel satu per satu; wajib menggunakan operasi batch `getValues()` dan `setValues()`.
  - Memanggil `SpreadsheetApp.flush()` sebelum mengembalikan respon JSON untuk menjamin ketepatan data.

### Tahap 3: Pembangunan Fondasi Frontend & CSS Design System
- Membuat `index.html` dengan struktur semantik, modern, responsif, dan bebas elemen kaku.
- Mengembangkan `css/style.css` menerapkan seluruh token dari `DESIGN_SISTEM.md`:
  - Reset CSS bersih, variabel CSS untuk mode terang dan mode gelap.
  - Layout Grid split screen untuk desktop kasir dan adaptasi bottom sheet untuk layar smartphone/tablet.
  - Komponen kartu menu yang menarik dengan badge varian, tombol tambah cepat, dan indikator ketersediaan stok.
  - Komponen keranjang pesanan dengan kalkulasi real-time.
  - Komponen modal pembayaran dengan keypad angka instan dan tombol uang pas.

### Tahap 4: Sistem Notifikasi Modern & Integrasi SweetAlert2
- Mengintegrasikan library SweetAlert2 via CDN resmi.
- Membuat stylesheet kustom SweetAlert2 (`swal2-teras-foodies`) agar serasi dengan nuansa merah cabai dan amber Teras Foodies.
- Membangun modul `notifications.js`:
  - Fungsi `showToast(type, message, duration)` untuk notifikasi mengambang non-intrusif.
  - Fungsi `showConfirmDialog(title, text, confirmText, cancelText)` menggantikan `confirm()`.
  - Fungsi `showSuccessDialog(title, detailsHtml)` untuk notifikasi sukses cetak dan pembayaran.
  - Fungsi `showErrorDialog(title, errorMessage)` menggantikan `alert()`.
  - Fungsi `showPromptDialog(title, inputPlaceholder)` menggantikan `prompt()`.
- Menghapus 100% kemungkinan penggunaan `alert()`, `confirm()`, atau `prompt()` bawaan browser.

### Tahap 5: Logika Kasir Real-time & Penghapusan Data Dummy
- Membangun `js/config.js`, `js/cart.js`, dan `js/app.js`:
  - Aplikasi memuat data menu secara real-time dari Google Sheets via Apps Script API saat pertama kali dibuka.
  - Menyimpan cache menu lokal di IndexedDB/LocalStorage agar saat offline menu tetap dapat ditampilkan.
  - Memastikan TIDAK ADA data dummy statis di dalam kode HTML. Seluruh kartu menu dihasilkan secara dinamis dari database.
  - Logika pemilihan varian (4 pcs, 6 pcs, 8 pcs) yang otomatis mengubah harga di keranjang.
  - Logika penghitungan kembalian otomatis saat nominal tunai dimasukkan.

### Tahap 6: Generator Struk Thermal 58mm & Struk WhatsApp
- Membangun `js/receipt.js`:
  - Format cetak thermal 58mm / 80mm dengan CSS `@media print` terisolasi (menyembunyikan UI kasir, hanya mencetak struk).
  - Tombol cetak langsung membuka dialog cetak browser (mendukung printer thermal Bluetooth / USB / WiFi).
  - Generator teks struk digital WhatsApp yang rapi dengan link otomatis `https://wa.me/{nomor}?text={encodedReceipt}`.
  - Format tiket dapur khusus (kitchen order slip) untuk juru masak.

### Tahap 7: PWA, Service Worker & Mesin Sinkronisasi Offline
- Membuat `manifest.json` lengkap dengan nama aplikasi, warna tema `#E03E1A`, ikon resolusi 192x192 dan 512x512, serta mode tampilan `standalone`.
- Membuat `sw.js` (Service Worker) yang melakukan precaching aset inti (HTML, CSS, JS, icon, CDN SweetAlert2).
- Membangun `js/db.js` dan `js/sync.js`:
  - Menyimpan transaksi ke IndexedDB saat status koneksi offline.
  - Menampilkan badge "Menunggu Sinkronisasi" di antarmuka kasir.
  - Mendeteksi kembalinya koneksi internet (event listener `online`) dan secara otomatis mengirim antrean transaksi ke fungsi `syncBatchTransactions` di Apps Script.
  - Menampilkan notifikasi sukses sinkronisasi setelah seluruh antrean berhasil masuk ke Google Sheets.

### Tahap 8: Modul Manajemen Shift, Pengeluaran & Laporan
- Antarmuka buka shift dan tutup shift dengan rekonsiliasi kas riil.
- Formulir input pengeluaran operasional cepat dari meja kasir.
- Modal laporan ringkas harian (omzet hari ini, produk paling laku, rasio pembayaran QRIS vs Tunai).

### Tahap 9: Pengujian, Audit Taste Skill & Git Push
- Melakukan audit ketat terhadap aturan taste skill:
  - Pengecekan nol em-dash (`—`) di seluruh berkas.
  - Verifikasi kontras tombol dan teks (WCAG AA).
  - Pengujian responsivitas pada perangkat mobile dan desktop.
  - Pengujian alur transaksi offline ke online.
- Melakukan commit terstruktur dan push ke repositori GitHub: `https://github.com/Husnula/posdimsum.git`.
- Memberikan panduan penerapan (deployment guide) Apps Script ke Google Sheets user.

---

## 4. Kebijakan Kualitas & Larangan Ketat (Zero-Tolerance Rules)

1. **Dilarang Keras Menggunakan Alert Bawaan**: Seluruh interaksi wajib melalui SweetAlert2 atau Toast kustom.
2. **Dilarang Menggunakan Data Dummy Setelah Tahap 3**: Seluruh data menu dan transaksi wajib bersumber langsung dari Google Sheets.
3. **Wajib Memiliki Fungsi `setupDatabase()`**: Harus tersedia di `Code.gs` dan dapat dieksekusi satu kali untuk mengonfigurasi sheet secara otomatis.
4. **Bebas dari Em-Dash (`—`)**: Seluruh teks antarmuka dan kode menggunakan tanda hubung biasa `-`.
5. **Operasi Batch di Apps Script**: Tidak boleh membaca/menulis per sel dalam perulangan (loop).
