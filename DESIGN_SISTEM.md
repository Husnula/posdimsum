# DESIGN SISTEM POS TERAS FOODIES
# Panduan Desain, Token Visual, Ergonomi Antarmuka & Notifikasi Modern

> **Design Read**: Reading this as: POS Cashier and Order Management Web App for Teras Foodies F&B stall, with a tactile, appetizing, high-contrast operational language, leaning toward utility-first modern CSS, SweetAlert2 custom styling, and clean responsive split layout.

---

## 1. Konfigurasi Tiga Indikator (The Three Dials)

| Indikator | Nilai (Skala 1 - 10) | Alasan & Penerapan |
|---|---|---|
| **`DESIGN_VARIANCE`** | **3 (Predictable & Structured)** | Kasir POS menuntut tata letak yang konsisten dan terprediksi secara ergonomis. Tombol menu dan keranjang tidak boleh berubah-ubah agar reflek tangan kasir cepat dan minim kesalahan saat jam ramai. |
| **`MOTION_INTENSITY`** | **4 (Tactile & Snappy)** | Animasi berfokus pada umpan balik fisik (haptic feedback visual): tombol ditekan memantul ringan (`scale: 0.97`), panel keranjang meluncur halus, dan toast alert muncul cepat tanpa jeda yang memperlambat transaksi. |
| **`VISUAL_DENSITY`** | **7 (Operational Density)** | Memaksimalkan area pandang kasir agar daftar menu, varian porsi, keranjang belanja, rincian biaya, dan keypad angka terlihat jelas dalam satu layar tanpa perlu scroll berlebihan. |

---

## 2. Palet Warna & Token Semantik (Color Tokens)

Palet dirancang terinspirasi dari identitas kuliner Teras Foodies (Dimsum Chili Oil, Saus Mentai, dan Hot Lava) dengan standar kontras tinggi (WCAG AA min 4.5:1 untuk keterbacaan kasir di area semi-outdoor).

### 2.1 Palet Utama (Brand Identity)
- **Primary Chili Red (`--color-primary`)**: `#E03E1A` (Warna khas cabai chili oil dan saus hot lava; digunakan untuk tombol utama / Bayar / CTA)
- **Primary Hover (`--color-primary-hover`)**: `#C43212`
- **Primary Light Tint (`--color-primary-light`)**: `#FFF1EE` (Latar badge aktif atau highlight baris item)
- **Accent Mentai Amber (`--color-accent`)**: `#D97706` (Warna saus mentai gurih; digunakan untuk badge varian dan status pesanan khusus)
- **Accent Light Tint (`--color-accent-light`)**: `#FEF3C7`

### 2.2 Warna Fungsional & Status
- **Success (`--color-success`)**: `#059669` (Status Transaksi Berhasil, Lunas, Kasir Online)
- **Success Light (`--color-success-light`)**: `#ECFDF5`
- **Warning (`--color-warning`)**: `#D97706` (Status Antrean Belum Sinkron / Offline, Stok Menipis)
- **Danger (`--color-danger`)**: `#DC2626` (Batalkan Transaksi, Hapus Item, Kas Selisih Kurang)
- **Danger Light (`--color-danger-light`)**: `#FEF2F2`
- **Info (`--color-info`)**: `#2563EB` (Shift Buka, Kategori Terpilih)

### 2.3 Netral & Permukaan (Dual-Mode: Light & Dark)
Aplikasi mendukung mode terang dan gelap dengan transisi kontras tajam tanpa warna hitam pekat `#000000` (banned) maupun putih silau tanpa batas.

| Token | Mode Terang (Default Kasir) | Mode Gelap (Kitchen / Malam) |
|---|---|---|
| `--bg-app` | `#F8F9FA` (Soft warm neutral) | `#121316` (Deep charcoal) |
| `--bg-surface` | `#FFFFFF` (Card & panel surface) | `#1A1C22` (Elevated card) |
| `--bg-surface-elevated` | `#F1F3F5` (Input & secondary container) | `#23262F` (Input & chip background) |
| `--border-color` | `#E5E7EB` (Subtle boundary line) | `#2D3139` (Dark border hairline) |
| `--text-primary` | `#0F172A` (Slate 900, tajam dan jelas) | `#F8FAFC` (Slate 50) |
| `--text-secondary` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) |
| `--text-muted` | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) |

---

## 3. Tipografi & Hierarki Teks

Menggunakan kombinasi font modern yang bersih untuk teks naratif dan font monospace untuk data angka finansial (mata uang rupiah dan nomor transaksi).

### 3.1 Font Stack
- **Font Utama (Teks & Antarmuka)**: `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif.
  - Alasan: Font buatan desainer Indonesia dengan proporsi sangat seimbang, keterbacaan tinggi di berbagai ukuran layar kasir.
- **Font Finansial (Harga, Struk, Keypad, Total)**: `JetBrains Mono`, `Roboto Mono`, monospace.
  - Alasan: Karakter tabular angka memiliki lebar sama rata sehingga nominal ribuan dan jutaan rupiah tersusun lurus vertikal tanpa bergeser.

### 3.2 Skala Ukuran Teks (Type Scale)
- **Display Big (Total Akhir Pembayaran)**: `28px - 32px` / Weight 700 / Tabular Numbers
- **Section Heading / Dialog Title**: `20px - 22px` / Weight 600
- **Card Title / Menu Name**: `15px - 16px` / Weight 600
- **Body Regular (Keterangan, Catatan)**: `13px - 14px` / Weight 400
- **Micro Label / Badge**: `11px - 12px` / Weight 600 / Letter Spacing +0.02em
- **Receipt Monospace (58mm)**: `12px - 13px` / Line-height 1.35

---

## 4. Dimensi Ergonomi Layar Sentuh (Touch Metrics)

Kasir bekerja dengan kecepatan tinggi. Seluruh komponen sentuh wajib memenuhi standar ergonomis:
- **Ukuran Target Sentuh Minimal**: `44px x 44px` untuk semua tombol navigasi, tab kategori, dan pengatur qty keranjang.
- **Tombol Keypad Cepat (Quick Cash & Numbers)**: Tinggi minimal `52px - 58px` dengan font ukuran `18px - 20px`.
- **Tombol Eksekusi Bayar Utama (Main Checkout Button)**: Tinggi `56px` melintang penuh (full-width) dengan teks tebal kontras tinggi.
- **Sudut Lengkung Komponen (Border Radius)**:
  - Tombol & Kartu Menu: `12px` (modern soft curved)
  - Pill Kategori & Badge: `9999px` (full pill)
  - Modal & Bottom Sheet: `20px` (top rounded untuk mobile sheet)
  - Input Field: `10px`

---

## 5. Tata Letak Responsif (Responsive Layout Matrix)

### 5.1 Tampilan Desktop & Tablet Landscape (Resolusi >= 992px)
- **Tata Letak Dua Kolom (Two-Column Split POS)**:
  - **Kolom Kiri (65% Lebar Layar)**: Header ringkas, filter tab kategori, kolom pencarian cepat, dan grid kartu menu (3 hingga 4 kolom kartu).
  - **Kolom Kanan (35% Lebar Layar)**: Panel keranjang aktif tetap (sticky order panel) berisi daftar pesanan, pemilih tipe order (Dine-in/Takeaway/Online), ringkasan biaya, dan tombol checkout utama.

### 5.2 Tampilan Smartphone & Tablet Portrait (Resolusi < 992px)
- **Tata Letak Tab Dinamis & Bottom Sheet**:
  - Kolom utama menampilkan katalog menu yang luas dan nyaman disentuh satu tangan.
  - Bagian bawah layar dilengkapi bilah melayang (Floating Cart Bar) yang menampilkan ringkasan jumlah item dan total rupiah.
  - Mengetuk bilah melayang akan membuka Keranjang Pesanan dalam bentuk **Bottom Sheet Modal** yang meluncur mulus ke atas dengan opsi checkout instan.

---

## 6. Desain Notifikasi Modern (Anti-Alert Bawaan)

Sesuai aturan mutlak, dilarang menggunakan `alert()`, `confirm()`, atau `prompt()` bawaan browser.

### 6.1 Desain SweetAlert2 Kustom
SweetAlert2 di-styling melalui CSS khusus agar menyatu dengan identitas visual Teras Foodies:
- **Latar Modal**: Permukaan bersih `#FFFFFF` (dark mode: `#1A1C22`) dengan radius `20px` dan bayangan halus `0 20px 40px rgba(0,0,0,0.18)`.
- **Tombol Konfirmasi**: Berwarna merah cabai Teras Foodies (`#E03E1A`) dengan padding nyaman dan font tebal.
- **Tombol Batal**: Berwarna abu-abu netral (`#E5E7EB` dengan teks `#374151`).
- **Ikon Status**:
  - Sukses: Ikon lingkaran hijau dengan animasi centang pegas lembut.
  - Error: Ikon lingkaran merah dengan animasi silang tegas.
  - Konfirmasi: Ikon tanda tanya oranye amber lembut.

### 6.2 Desain Toast Notifikasi Melayang (Custom Toast Component)
- **Posisi**: Pojok kanan atas pada desktop, atau melayang di bagian tengah atas pada mobile.
- **Format**: Pill melayang dengan efek kaca halus (glassmorphism: `backdrop-filter: blur(10px)`), ikon status di kiri, teks aksi di tengah, dan tombol tutup silang di kanan.
- **Durasi Tampil**: 2.5 detik lalu menghilang dengan transisi fade out dan geser ke atas.
- **Trigger**:
  - Tambah menu ke keranjang ("Dimsum Mentai 6 pcs ditambahkan")
  - Item dihapus dari keranjang
  - Status koneksi ("Mode Offline aktif. Transaksi akan disimpan di memori lokal")
  - Status sinkronisasi ("3 transaksi offline berhasil disinkronkan ke Google Sheets")

---

## 7. Desain Struk Pembayaran (Thermal Receipt 58mm / 80mm)

Struk didesain untuk terbaca sangat jelas pada kertas thermal mini kasir:

```text
================================
         TERAS FOODIES
     Dimsum & Mie Jebew Lezat
 Ds. Kedungrojo, 100m Timur Tugu
       WA: 0857-3027-2661
================================
No: TRF-20261021-0001
Tgl: 21/10/2026 12:45
Kasir: Alfian
Pesanan: DINE-IN (Meja 03)
--------------------------------
1x Dimsum Mentai (6 pcs)
   @Rp20.000            Rp20.000
   * Extra chili oil
1x Wonton Goreng
   @Rp10.000            Rp10.000
2x Es Teh
   @Rp3.000              Rp6.000
--------------------------------
Subtotal                Rp36.000
Diskon                     Rp0
--------------------------------
TOTAL AKHIR             Rp36.000
BAYAR (Tunai)           Rp50.000
KEMBALIAN               Rp14.000
================================
   Terima Kasih Atas Kunjungan Anda
   Follow IG/TikTok: @terasfoodies2
================================
```

---

## 8. Panduan Anti-Slop & Protokol Kualitas Desain

1. **Kebijakan Nol Em-Dash**:
   - Dilarang keras menggunakan karakter em-dash (`—`) atau en-dash (`–`) di seluruh elemen antarmuka, judul, tombol, maupun cetak struk. Gunakan tanda hubung biasa `-`.
2. **Tanpa Gradient AI Murahan**:
   - Dilarang menggunakan gradient ungu/pink buatan AI pada latar belakang utama atau tombol. Gunakan warna solid berbobot atau tinted neutral yang nyaman di mata.
3. **Tanpa Data Palsu yang Mengada-ada**:
   - Semua produk, harga, dan varian mengacu 100% pada data nyata `menu_teras_foodies.md`.
4. **Indikator Status Bermakna**:
   - Titik status (status dot) hanya digunakan untuk status nyata: Hijau (Tersambung / Online), Kuning (Offline / Pending Sync), Merah (Terputus).
5. **Aksesibilitas Label Input**:
   - Setiap kolom input formulir (nama kasir, modal kas, catatan) memiliki label di atas input field, bukan hanya mengandalkan teks placeholder.
