# Log Konteks & Rencana - Recovery Transaksi 18-19 November 2026

**Nama file**: `logs/log-pos-dimsum-recovery.201126.md`  
**Tanggal catatan**: 20 November 2026  
**Klien**: Pak Alfian - Teras Foodies (Dimsum & Mie Jebew)  
**Developer**: 088228511309 (`6288228511309`)  
**Domain live**: https://posdimsum.pages.dev  
**Repository**: https://github.com/Husnula/posdimsum.git (`main`)  
**Spreadsheet ID**: `1Fl8fT9NJOUq_iktrdp_GkTBatiwY_NyoSPPJm-C6OWo`  
**Apps Script URL**: `https://script.google.com/macros/s/AKfycbwPaWCE4svxuuaimsDHd5rrQq1TTfd3CCnmFjHx6mmsxD45eopyQSviDZjxHiG7BOw3nA/exec`

---

## 1. Ringkasan Insiden

Klien melaporkan rekap penjualan kosong selama 2 hari. Screenshot WhatsApp tanggal 19/11/2026 pukul 20:37 menampilkan:

- Total omzet: Rp0
- Total transaksi: 0 Pesanan
- Tidak ada menu terjual
- Periode: "Hari Ini (19/11/2026)"

Hasil investigasi: **bukan bug tampilan rekap**. Transaksi 18/11 dan 19/11 memang tidak pernah masuk ke Google Sheets. Data kemungkinan masih tersimpan di IndexedDB tablet kasir dan bisa dipulihkan.

---

## 2. Bukti Investigasi

### 2.1 Data server per tanggal

| Tanggal | Transaksi | Omzet | Keterangan |
|---|---:|---:|---|
| 15/11/2026 | 23 | Rp614.000 | Normal |
| 16/11/2026 | 0 | Rp0 | Senin, tutup toko (normal) |
| 17/11/2026 | 13 | Rp337.000 | Normal, transaksi terakhir 20:39:36 |
| **18/11/2026** | **0** | **Rp0** | **Hari jual pertama yang gagal** |
| **19/11/2026** | **0** | **Rp0** | Masih gagal |
| 20/11/2026 | 0 | Rp0 | Belum ada transaksi saat investigasi |

- Transaksi terakhir: `TRF-20261117-4703`, 17/11/2026 20:39:36, Rp20.000, Tunai.
- Total all-time saat investigasi: 285 baris, 281 ID unik, Rp11.230.000.

### 2.2 Pemeriksaan langsung sheet `Transaksi`

- 285 baris data, 281 ID unik.
- 4 ID duplikat (masing-masing 2 baris):
  - `TRF-20261106-6092`
  - `TRF-20261107-5405`
  - `TRF-20261107-7809`
  - `TRF-20261114-4934`
- Tidak ada baris bertanggal 18/11/2026 atau 19/11/2026.
- Tidak ada ID `TRF-20261118-*` atau `TRF-20261119-*`.
- Tidak ada penulisan parsial.

### 2.3 Kesehatan backend

- `action=ping` sukses.
- `action=getMenu` sukses (26 menu).
- `action=getReports` sukses.
- Uji tulis no-op `saveMenu` MNU-001 berhasil, nilai sebelum dan sesudah identik.
- Kesimpulan: izin tulis Apps Script dan proxy Cloudflare normal saat pengujian.

### 2.4 Kode live vs repo

- `js/sync.js` live identik dengan repo sebelum patch (hash sama).
- Aplikasi live adalah v8 (fitur Excel, `js/export.js`, `xlsx.full.min.js`, `EXPORT_REPORTS: true`).
- Repo lokal sudah sinkron v8 setelah pull.
- Update fitur Excel **bukan penyebab**, karena logika pengiriman transaksi tidak berubah.

### 2.5 Screenshot verifikasi klien (20/11/2026)

**`getTransactionIds`**
- `count: 281`
- ID terakhir: `TRF-20261117-4703`
- Tidak ada ID tanggal 18/11 atau 19/11.

**`ping`**
- `version: 2026-11-19-recovery-1`
- Timestamp: `2026-11-20T01:20:54.548Z` (08:20 WIB)
- Artinya patch backend sudah berhasil di-deploy klien.

---

## 3. Analisis Akar Masalah

### 3.1 Kenapa hanya tanggal 18 dan 19?

Tanggal bukan penyebab. 18/11 adalah **hari jual pertama setelah kondisi pengiriman berubah**.

- 16/11 Senin tutup (0 wajar).
- 17/11 masih normal sampai 20:39:36.
- Antara 17/11 malam dan 18/11 pagi terjadi perubahan yang membuat semua pengiriman dari tablet gagal.
- Setelah gagal, aplikasi versi lama tidak pernah mengejar ketertinggalan.

### 3.2 Tiga kemungkinan pemicu

| Kemungkinan | Penjelasan | Cara memastikan |
|---|---|---|
| **1. Koneksi tablet tidak bisa keluar internet** (paling umum) | Wi-Fi tersambung tetapi router tidak punya internet, atau tablet pindah jaringan. `navigator.onLine` bisa `true` tetapi `fetch` gagal. | Cek riwayat router / perilaku tablet saat itu |
| **2. URL API di tablet berubah atau menunjuk deployment lama** | Apps Script pernah di-redeploy sehingga URL berubah, sementara tablet menyimpan URL lama di localStorage. | Settings aplikasi di tablet |
| **3. Backend menolak penulisan saat itu** | Redeploy, izin, timeout, atau kuota. | Apps Script → Executions tanggal 18-19/11 |

### 3.3 Kenapa tidak pulih sendiri?

Celah pada versi lama:

1. `SyncEngine.init()` hanya memasang listener `online`/`offline`.
2. Tidak ada `syncPendingQueue()` saat aplikasi dibuka.
3. Tidak ada retry periodik, `focus`, `pageshow`, atau `visibilitychange`.
4. Event `online` sering terlewat pada PWA yang lama terbuka atau di-background.
5. Rekap memakai data server meski `totalTransaksi = 0`, tanpa menggabungkan data lokal.
6. Antrean dihapus semua begitu server membalas `success`, tanpa memeriksa `syncedCount` atau ID yang benar-benar tersimpan.
7. Backend belum idempotent, sehingga retry berisiko membuat baris ganda (terbukti ada 4 ID duplikat lama).

### 3.4 Di mana data 18-19 November berada?

Hanya di perangkat kasir:

- IndexedDB `offline_transactions` (antrean yang belum terkirim).
- IndexedDB `recent_orders` (semua transaksi disimpan sebelum dikirim).

Catatan: `saveRecentOrder()` dipanggil dan di-`await` sebelum transaksi dikirim. Jika penulisan IndexedDB gagal, kode hanya mencatat warning, sehingga ada kemungkinan kecil data lokal juga tidak ada.

---

## 4. Patch yang Dibuat

Commit: **`39e9749`** - `fix(sync): pulihkan transaksi tertahan dan cegah rekap kosong`  
Branch: `main`  
Status: **sudah di-push ke GitHub**, frontend menunggu deploy Cloudflare Pages.

### 4.1 `js/sync.js`

- Auto-sync saat `init()`.
- Auto-sync pada `focus`, `pageshow`, `visibilitychange`.
- Retry periodik setiap 60 detik selama aplikasi terbuka.
- Timeout fetch 45 detik.
- Batch sync 8 transaksi.
- Antrean hanya dihapus untuk ID yang dikonfirmasi server (`savedIds` + `duplicateIds`).
- Fallback aman untuk backend lama: hapus hanya jika `syncedCount` sama dengan jumlah batch.
- Fungsi baru:
  - `fetchServerTransactionIds()`
  - `computeMissingTransactions()`
  - `mergePendingIntoReport()`
  - `recoverMissingTransactions()`
  - `refreshAppAfterSync()`
- Guard `isOnline` diperbarui setiap siklus sync.

### 4.2 `js/app.js`

- Rekap dan dashboard menggabungkan transaksi lokal yang belum ada di server.
- Banner **"N transaksi belum tersinkron"** + tombol **Sinkronkan Sekarang**.
- Tombol **Pulihkan Data Lokal** dengan konfirmasi tanggal/nilai, progres, dan ringkasan hasil.
- Dialog transaksi menampilkan penyebab gagal kirim.
- Helper baru:
  - `localTransactionMatchesPeriod()`
  - `collectLocalTransactions()`
  - `mergeLocalIntoServerReport()`
  - `manualSync()`
  - `refreshOpenReports()`
  - `recoverLocalTransactions()`
- `updateTodaySalesSummary()` tidak lagi memakai `Math.max`; sekarang menggabungkan data server + lokal.
- Export `App` untuk unit test.

### 4.3 `Code.gs`

- `API_VERSION = '2026-11-19-recovery-1'`, ditampilkan pada `ping`.
- `getTransactionIdSet()` dan `saveTransactionRecord()`.
- `handleSaveTransaction()` idempotent: ID yang sudah ada dilewati.
- `handleSyncBatchTransactions()` mengembalikan `savedIds`, `duplicateIds`, `failed`, `failedCount`.
- Endpoint baru `GET ?action=getTransactionIds`.
- Rollback baris header jika penulisan detail gagal.
- Tetap memotong stok dan mencatat `Mutasi_Stok`.

### 4.4 Aset dan PWA

- `sw.js`: cache `teras-foodies-pos-v8` menjadi `teras-foodies-pos-v9`.
- `index.html`: seluruh aset memakai `?v=20261119-01`.
- `css/style.css`: styling banner transaksi pending.

### 4.5 Dokumentasi dan test

- `PANDUAN-RECOVERY.md`: panduan deploy dan pemulihan.
- `logs/log-20261119-recovery.md`: log investigasi awal.
- Unit test Vitest: **27 test lulus** di 3 file.
  - `tests/cart.test.js`
  - `tests/sync.test.js`
  - `tests/app-report.test.js`
- `node --check` lolos untuk `Code.gs`, `js/app.js`, `js/sync.js`.

---

## 5. Status Deployment

| Komponen | Status | Bukti |
|---|---|---|
| Backend `Code.gs` | **Sudah live** | `ping` mengembalikan `2026-11-19-recovery-1` |
| `getTransactionIds` | **Sudah live** | `count: 281` |
| Frontend | **Belum terdeploy saat pengecekan** | `sw.js` live masih v8, `index.html` masih `?v=20261110-01` |
| Commit GitHub | **Sudah** | `39e9749` di `main` |

Catatan: pengecekan live dilakukan tepat setelah push. Cloudflare Pages butuh 1-3 menit atau perlu trigger deployment manual dari dashboard.

---

## 6. Rencana Pemulihan Data

### 6.1 Lokasi eksekusi

**Wajib di tablet kasir**, bukan komputer atau HP owner. IndexedDB terikat pada perangkat dan origin `posdimsum.pages.dev`.

### 6.2 Jalur utama (setelah frontend terdeploy)

1. Pastikan tablet terhubung internet.
2. Tutup dan buka aplikasi POS dua kali agar service worker v9 aktif.
3. Buka **Rekap Penjualan** (PIN owner).
4. Klik **Pulihkan Data Lokal**.
5. Dialog akan menampilkan jumlah transaksi, tanggal, dan total nilai.
   - Jika muncul 18/11 dan 19/11: lanjut **Ya, Kirim Sekarang**.
   - Jika 0 transaksi: data lokal sudah tidak ada.
6. Tunggu ringkasan **Pemulihan Selesai**.
7. Verifikasi baris 18/11 dan 19/11 di sheet `Transaksi`.
8. Cocokkan ulang angka di aplikasi.

### 6.3 Diagnostik read-only (jika frontend belum terdeploy)

Jalankan di console tablet melalui Chrome remote debugging (`chrome://inspect`):

```js
(async () => {
  const fmt = t => ({
    id: t.id, tanggal: t.tanggal, jam: t.jam,
    total: t.totalAkhir, metode: t.metodeBayar, status: t.statusSync
  });
  const pending = await DB.getOfflineTransactions();
  const recent = await DB.getRecentOrders();
  const target = ['18/11/2026', '19/11/2026'];
  const match = t =>
    target.includes(String(t.tanggal || '').replace(/^'+/, '').trim()) ||
    /TRF-202611(18|19)/.test(String(t.id || ''));

  console.log('Pending total:', pending.length, '| Recent total:', recent.length);
  console.table(pending.filter(match).map(fmt));
  console.table(recent.filter(match).map(fmt));

  const map = new Map();
  [...recent, ...pending].forEach(t => { if (t && t.id) map.set(t.id, t); });
  const all = [...map.values()].filter(match);
  console.log('Transaksi 18-19 Nov:', all.length,
    '| Nilai: Rp' + all.reduce((s, t) => s + (Number(t.totalAkhir) || 0), 0).toLocaleString('id-ID'));
})();
```

Script hanya membaca, tidak menghapus.

### 6.4 Peringatan

- Jangan **Clear Site Data**, uninstall PWA, atau reset browser tablet sebelum pemulihan.
- Jangan menjalankan pemulihan di komputer yang pernah dipakai testing, karena transaksi uji yang belum tersimpan bisa ikut terkirim.
- Jika perangkat sudah di-clear, data tidak bisa dipulihkan dari mana pun.

---

## 7. Apakah Update Mencegah Kejadian Serupa?

### 7.1 Yang sudah diselesaikan

| Masalah lama | Perbaikan |
|---|---|
| Event `online` terlewat | Sync saat init, focus, pageshow, visibilitychange, dan retry 60 detik |
| Antrean tidak terlihat | Badge Pending + banner rekap + error asli di dialog |
| Rekap Rp0 padahal ada data lokal | Rekap & dashboard menggabungkan data lokal |
| Antrean terhapus saat sync parsial | Hanya ID terkonfirmasi yang dihapus |
| Retry membuat duplikat | Backend idempotent |
| Tidak ada alat pemulihan | Tombol Pulihkan Data Lokal |

### 7.2 Keterbatasan yang masih ada

- Internet mati total tetap membuat transaksi mengantre, tetapi tidak hilang dan otomatis terkirim saat online.
- URL API yang salah tetap perlu diperbaiki manual; sekarang langsung terlihat dari badge dan pesan error.
- Data yang sudah tidak ada di perangkat tidak bisa dipulihkan.
- Clear Site Data / uninstall PWA tetap menghilangkan data lokal.
- Jika IndexedDB gagal menulis, transaksi tidak tersimpan lokal. Kasus ini langka.
- Duplikat lama (4 ID) belum dibersihkan. Patch mencegah duplikat baru, bukan menghapus yang lama.

---

## 8. Pemeriksaan untuk Menutup Akar Penyebab

1. **Apps Script → Executions**, filter 18-19 November 2026.
   - Tidak ada `doPost` sama sekali: tablet tidak pernah mengirim (jaringan/URL).
   - Ada `doPost` error: backend menolak; screenshot pesan error diperlukan.
2. **Tablet → Settings → URL API**.
   - Seharusnya `https://posdimsum.pages.dev/api` atau URL `/exec` deployment aktif.
   - URL lama/berbeda adalah kandidat penyebab kuat.
3. Tanyakan ke klien: saat 18-19 November, rekap di tablet menampilkan angka atau Rp0?
   - Menampilkan angka: data lokal ada, tinggal dipulihkan.
   - Rp0 juga: perlu cek apakah GET rekap berhasil (berarti backend terbaca) atau fallback lokal juga kosong.

---

## 9. Langkah Berikutnya

1. Tunggu / trigger deploy Cloudflare Pages untuk commit `39e9749`.
2. Verifikasi live:
   - `sw.js` berisi `teras-foodies-pos-v9`.
   - `index.html` memakai `?v=20261119-01`.
   - `js/sync.js` memuat `fetchServerTransactionIds` dan `recoverMissingTransactions`.
3. Jalankan pemulihan di tablet kasir.
4. Verifikasi sheet dan rekap.
5. Cek Apps Script Executions dan URL API tablet untuk memastikan pemicu.
6. Opsional:
   - Bersihkan 4 ID duplikat lama beserta baris detailnya.
   - Tambahkan peringatan harian jika tidak ada transaksi sampai jam tutup.
   - Tambahkan indikator versi aplikasi di Settings untuk memudahkan audit.

---

## 10. Catatan Teknis Penting

- Format ID transaksi: `TRF-YYYYMMDD-XXXX` (4 digit acak).
- Rekap memakai tanggal `DD/MM/YYYY`; backend dan frontend memiliki penanganan locale.
- Parser tanggal di rekap juga membaca tanggal dari ID (`TRF-YYYYMMDD`).
- `getTransactionIds` mengembalikan ID unik (281), sementara sheet berisi 285 baris karena 4 duplikat lama.
- Sinkronisasi batch mengirim maksimal 8 transaksi per request untuk menghindari timeout Apps Script.
- Backend melakukan `SpreadsheetApp.flush()` setelah penulisan.
- Pemulihan memakai `recent_orders` sebagai sumber cadangan dan `getTransactionIds` untuk deduplikasi.
- Jangan deploy frontend sebelum backend jika ingin tombol pemulihan berfungsi.
