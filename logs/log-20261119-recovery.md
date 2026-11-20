# Log Insiden & Patch - Rekap Penjualan Kosong (18-19 November 2026)

**Klien**: Pak Alfian (Teras Foodies)  
**Tanggal investigasi**: 19 November 2026  
**Status**: Patch selesai di repo, belum di-deploy

---

## 1. Laporan Klien

Screenshot WhatsApp 19/11/2026 20:37 menunjukkan rekap "Hari Ini (19/11/2026)":

- Total omzet: Rp0
- Total transaksi: 0 Pesanan
- Tidak ada menu terjual

Klien menyebut rekap tidak muncul selama 2 hari.

---

## 2. Bukti Investigasi

### Data server (Google Sheets)

| Tanggal | Transaksi | Omzet |
|---|---:|---:|
| 15/11/2026 | 23 | Rp614.000 |
| 16/11/2026 | 0 | Rp0 (Senin, tutup) |
| 17/11/2026 | 13 | Rp337.000 |
| 18/11/2026 | 0 | Rp0 |
| 19/11/2026 | 0 | Rp0 |

- Transaksi terakhir: `TRF-20261117-4703`, 17/11/2026 20:39:36, Rp20.000, Tunai.
- Total all-time: 285 transaksi, Rp11.230.000.
- Sheet `Transaksi` dan `Detail_Transaksi` tidak memiliki baris tanggal 18/11 atau 19/11.
- Tidak ada penulisan parsial (`TRF-20261118-*` / `TRF-20261119-*`).

### Kesehatan backend

- `action=ping`, `getMenu`, `getReports` merespons normal.
- Uji tulis no-op `saveMenu` MNU-001 berhasil, nilai menu sebelum dan sesudah identik.
- Artinya izin tulis Apps Script dan proxy Cloudflare normal saat pengujian.

### Kode

- `js/sync.js` live identik dengan repo sebelum patch (hash sama).
- Tidak ada regresi pada logika pengiriman.

---

## 3. Akar Masalah

1. `SyncEngine.init()` hanya memasang listener `online`/`offline`. Tidak ada sinkronisasi saat aplikasi dibuka, saat aplikasi kembali aktif, atau retry periodik.
2. Jika tablet sempat offline dan event `online` terlewat (umum pada PWA yang lama terbuka), `SyncEngine.isOnline` tetap `false` dan semua transaksi masuk antrean lokal.
3. Rekap memakai data server jika respons sukses meski `totalTransaksi = 0`, tanpa menggabungkan antrean lokal.
4. Sinkronisasi menghapus seluruh antrean begitu server membalas `success`, tanpa memeriksa `syncedCount` atau daftar ID yang benar-benar tersimpan.

---

## 4. Patch yang Dibuat

### Frontend

- `js/sync.js`
  - Auto-sync saat init, `focus`, `pageshow`, `visibilitychange`, dan interval 60 detik.
  - Timeout fetch 45 detik.
  - Batch 8 transaksi.
  - Hanya menghapus antrean yang dikonfirmasi server (`savedIds` + `duplicateIds`).
  - Fallback aman untuk backend lama (hapus hanya jika `syncedCount` sama dengan jumlah batch).
  - Fungsi pemulihan: `fetchServerTransactionIds()`, `computeMissingTransactions()`, `mergePendingIntoReport()`, `recoverMissingTransactions()`.
- `js/app.js`
  - Rekap dan dashboard menggabungkan transaksi lokal yang belum ada di server.
  - Banner "N transaksi belum tersinkron" + tombol Sinkronkan Sekarang.
  - Tombol "Pulihkan Data Lokal" dengan konfirmasi, progres, dan ringkasan hasil.
  - Dialog transaksi menampilkan penyebab gagal kirim.
- `css/style.css`
  - Styling banner antrean.
- `index.html`
  - Versi aset dinaikkan ke `?v=20261119-01`.
- `sw.js`
  - Cache dinaikkan ke `teras-foodies-pos-v9`.

### Backend (`Code.gs`)

- `API_VERSION = '2026-11-19-recovery-1'` dan versi pada `ping`.
- `getTransactionIdSet()` dan `saveTransactionRecord()`.
- `handleSaveTransaction()` idempotent: ID yang sudah ada dilewati.
- `handleSyncBatchTransactions()` mengembalikan `savedIds`, `duplicateIds`, `failed`, `failedCount`.
- Endpoint baru `GET ?action=getTransactionIds`.
- Rollback baris header jika penulisan detail gagal.

---

## 5. Pemulihan Data

Sumber data cadangan di tablet: IndexedDB `recent_orders` (semua transaksi pernah disimpan lokal) dan `offline_transactions` (antrean yang belum terkirim).

Alur:

1. Deploy `Code.gs` baru.
2. Deploy frontend.
3. Buka rekap di tablet kasir.
4. Klik Sinkronkan Sekarang atau Pulihkan Data Lokal.
5. Cocokkan hasil dengan sheet.

Panduan langkah demi langkah: lihat `PANDUAN-RECOVERY.md`.

---

## 6. Verifikasi Teknis

- `node --check` untuk `Code.gs`, `js/app.js`, `js/sync.js`: lolos.
- Unit test: 27 test lulus (3 file).
  - `tests/cart.test.js`
  - `tests/sync.test.js`
  - `tests/app-report.test.js`

---

## 7. Catatan

- Data 18-19 November hanya bisa dipulihkan jika masih ada di IndexedDB tablet kasir.
- Jangan menyarankan Clear Site Data atau uninstall PWA sebelum pemulihan selesai.
- URL deployment Apps Script harus tetap sama setelah redeploy. Jika berubah, perbarui URL API di Settings aplikasi.
