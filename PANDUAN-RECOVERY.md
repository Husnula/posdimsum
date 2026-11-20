# Panduan Deploy & Pemulihan Data Penjualan

**Kasus:** Rekap penjualan 18–19 November 2026 kosong (Rp0) karena transaksi tertahan di perangkat kasir dan belum terkirim ke Google Sheets.

**Status patch:** sudah siap di repo lokal. Belum di-deploy.

---

## 1. Ringkasan Perbaikan

| Masalah | Perbaikan |
|---|---|
| Antrean transaksi tidak pernah dicoba ulang otomatis | Sync otomatis saat aplikasi dibuka, saat aplikasi kembali aktif, dan retry tiap 60 detik |
| Rekap menampilkan Rp0 saat server kosong | Rekap & dashboard menggabungkan transaksi lokal yang belum tersinkron |
| Antrean dihapus semua meski hanya sebagian tersimpan | Hanya item yang dikonfirmasi server yang dihapus |
| Retry berisiko membuat baris ganda | Backend menolak ID transaksi yang sudah ada (idempotent) |
| Tidak ada cara memulihkan data lama | Tombol **Pulihkan Data Lokal** di modal rekap |
| Error pengiriman tidak terlihat | Dialog transaksi menampilkan penyebab gagal kirim |

---

## 2. Deploy Backend (WAJIB lebih dulu)

1. Buka Google Sheets database POS.
2. Menu **Extensions → Apps Script**.
3. Ganti seluruh isi `Code.gs` dengan file `Code.gs` dari repo ini.
4. Klik **Deploy → Manage deployments**.
5. Pada deployment Web App yang dipakai, klik ikon **Edit (pensil)**.
6. Pilih **Version: New version**, lalu klik **Deploy**.
7. Pastikan URL deployment **tidak berubah**. Jika berubah, perbarui URL di aplikasi kasir (Settings → URL API).

Verifikasi backend:

```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?action=ping
```

Respons harus memuat:

```json
{ "status": "success", "version": "2026-11-19-recovery-1", ... }
```

Lalu cek daftar ID:

```text
.../exec?action=getTransactionIds
```

Respons harus berisi `data.ids` dan `data.count`.

> Tanpa langkah ini, tombol **Pulihkan Data Lokal** akan menampilkan pesan "Backend Belum Diperbarui".

---

## 3. Deploy Frontend

Upload/perbarui file berikut ke Cloudflare Pages:

- `index.html`
- `config.js`
- `js/app.js`
- `js/sync.js`
- `css/style.css`
- `sw.js`

Service worker sudah dinaikkan ke cache **v9**, dan semua aset memakai query `?v=20261119-01`, sehingga perangkat akan mengambil versi baru.

Setelah deploy, buka aplikasi di tablet kasir, lalu **tutup dan buka kembali** aplikasi (atau reload dua kali) agar service worker baru aktif.

---

## 4. Pemulihan Data 18–19 November (di TABLET KASIR)

Penting: data yang tertahan hanya ada di perangkat yang dipakai berjualan. Jalankan langkah ini **di tablet kasir**, bukan di HP owner.

1. Sambungkan tablet ke internet.
2. Buka aplikasi POS.
3. Buka **Rekap Penjualan** (masukkan PIN owner).
4. Perhatikan banner kuning **"N transaksi belum tersinkron"**.
   - Jika ada, klik **Sinkronkan Sekarang**.
   - Jika tidak ada, klik **Pulihkan Data Lokal**.
5. Konfirmasi jumlah transaksi, tanggal, dan total nilai yang ditampilkan.
6. Tunggu hingga muncul ringkasan **Pemulihan Selesai**.
7. Buka Google Sheets dan pastikan baris tanggal 18/11/2026 dan 19/11/2026 sudah muncul.
8. Buka ulang rekap di aplikasi dan cocokkan angkanya.

Jika hasilnya 0 transaksi ditemukan, artinya data lokal di tablet tersebut sudah tidak ada. Data tidak bisa dipulihkan dari server karena memang tidak pernah terkirim.

---

## 5. Pemeriksaan Setelah Deploy

- Header aplikasi menampilkan **Online**.
- Badge **Pending** hanya muncul jika benar-benar ada antrean.
- Lakukan satu transaksi uji Rp1.000, lalu cek baris baru di sheet `Transaksi`.
- Matikan Wi-Fi, lakukan transaksi, nyalakan Wi-Fi, dan pastikan transaksi otomatis masuk tanpa menekan tombol apa pun.
- Buka rekap saat ada antrean: angka harus tetap menampilkan transaksi lokal dan memberi tanda belum tersinkron.

---

## 6. Catatan Teknis

- Transaksi tetap disimpan ganda di IndexedDB: `offline_transactions` (antrean) dan `recent_orders` (riwayat lokal).
- Pemulihan memakai `recent_orders` sebagai sumber cadangan, lalu mencocokkan ID dengan sheet `Transaksi` agar tidak terjadi duplikasi.
- Pengiriman dilakukan per batch 8 transaksi untuk menghindari timeout Apps Script.
- Jangan menyarankan kasir melakukan **Clear Site Data** atau uninstall PWA sebelum data 18–19 November berhasil dipulihkan.
