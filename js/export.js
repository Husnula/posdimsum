/**
 * EXPORT.JS - Modul Ekspor Rekapan Penjualan Lengkap ke Microsoft Excel (.xlsx)
 * POS Teras Foodies - Solusi Pembukuan Komprehensif
 *
 * Fitur:
 * 1. Menghasilkan file Excel (.xlsx) murni multi-sheet menggunakan SheetJS.
 * 2. 4 Lembar Kerja Lengkap:
 *    - Sheet 1: Ringkasan Eksekutif (KPI Omzet, Kas Laci, Non-Tunai, Saluran Pesanan)
 *    - Sheet 2: Daftar Transaksi Lengkap (Nota, Waktu, Kasir, Nilai, Kembalian)
 *    - Sheet 3: Performa Menu Terjual (Ranking Menu, Porsi Terjual, Kontribusi %)
 *    - Sheet 4: Rincian Detail Item (Itemized Breakdown per Transaksi)
 * 3. Tahan-Gagal (Fault-Tolerant): Bekerja online via Google Sheets API & offline via IndexedDB.
 */

const ReportsExport = {
  /**
   * Helper format tanggal ke DD/MM/YYYY
   */
  formatDateIndo(dateObj) {
    if (!dateObj) return '';
    const d = ('0' + dateObj.getDate()).slice(-2);
    const m = ('0' + (dateObj.getMonth() + 1)).slice(-2);
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
  },

  /**
   * Helper format tanggal ISO YYYY-MM-DD
   */
  formatDateIso(dateObj) {
    if (!dateObj) return '';
    const d = ('0' + dateObj.getDate()).slice(-2);
    const m = ('0' + (dateObj.getMonth() + 1)).slice(-2);
    const y = dateObj.getFullYear();
    return `${y}-${m}-${d}`;
  },

  /**
   * Normalisasi tanggal ke format YYYY-MM-DD untuk komparasi rentang
   */
  toIsoDateString(val, trxId) {
    if (trxId) {
      const idMatch = String(trxId).match(/(?:TRF|TRX|INV)-?(\d{4})(\d{2})(\d{2})/i);
      if (idMatch) {
        return `${idMatch[1]}-${idMatch[2]}-${idMatch[3]}`;
      }
    }
    if (!val) return '';
    if (val instanceof Date) {
      return this.formatDateIso(val);
    }
    const cleanStr = String(val).replace(/^'+/, '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const d = ('0' + dmyMatch[1]).slice(-2);
      const m = ('0' + dmyMatch[2]).slice(-2);
      const y = dmyMatch[3];
      return `${y}-${m}-${d}`;
    }
    return cleanStr;
  },

  /**
   * Mengambil data rekapan penjualan komprehensif (online dengan fallback lokal)
   */
  async fetchReportData(options = {}) {
    const period = options.period || 'today';
    const customDate = options.customDate || '';
    const startDate = options.startDate || '';
    const endDate = options.endDate || '';

    const now = new Date();
    const todayIso = this.formatDateIso(now);
    const apiUrl = typeof getApiUrl === 'function' ? getApiUrl() : '';

    let remoteData = null;

    // 1. Coba ambil dari Google Apps Script jika online
    if (navigator.onLine && apiUrl && !apiUrl.includes('AKfycbz_placeholder')) {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('action', 'getExportReport');
        queryParams.set('period', period);

        if (period === 'custom' && customDate) {
          queryParams.set('date', customDate);
        } else if (period === 'range' && startDate && endDate) {
          queryParams.set('startDate', startDate);
          queryParams.set('endDate', endDate);
        }

        const res = await fetch(`${apiUrl}?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            remoteData = json.data;
          }
        }
      } catch (err) {
        console.warn('Gagal mengambil getExportReport dari backend:', err);
      }
    }

    // 2. Ambil transaksi offline lokal yang mungkin belum disinkronkan ke server
    let localPending = [];
    let localRecent = [];
    try {
      if (typeof DB !== 'undefined') {
        if (DB.getOfflineTransactions) localPending = await DB.getOfflineTransactions();
        if (DB.getRecentOrders) localRecent = await DB.getRecentOrders();
      }
    } catch (e) {
      console.warn('Gagal membaca data lokal IndexedDB:', e);
    }

    // Jika server berhasil mengembalikan data lengkap, gabungkan transaksi offline lokal yang belum ada
    if (remoteData && Array.isArray(remoteData.transaksi)) {
      const existingIds = new Set(remoteData.transaksi.map(t => t.id));
      const pendingToAdd = localPending.filter(t => t && t.id && !existingIds.has(t.id));

      if (pendingToAdd.length > 0) {
        pendingToAdd.forEach(tx => {
          const txIso = this.toIsoDateString(tx.tanggal, tx.id);
          let match = false;
          if (remoteData.periode.startDate && remoteData.periode.endDate) {
            match = (txIso >= remoteData.periode.startDate && txIso <= remoteData.periode.endDate);
          } else if (remoteData.periode.filter === 'all') {
            match = true;
          } else if (remoteData.periode.startDate) {
            match = (txIso === remoteData.periode.startDate);
          }

          if (match) {
            remoteData.transaksi.push({
              id: tx.id,
              tanggal: tx.tanggal || this.formatDateIndo(now),
              jam: tx.jam || '00:00:00',
              kasir: tx.kasir || 'Kasir',
              tipePesanan: tx.tipePesanan || 'Dine-in',
              metodeBayar: tx.metodeBayar || 'Tunai',
              subtotal: Number(tx.subtotal) || Number(tx.totalAkhir) || 0,
              diskon: Number(tx.diskon) || 0,
              biayaLain: Number(tx.biayaLain) || 0,
              totalAkhir: Number(tx.totalAkhir) || 0,
              uangDiterima: Number(tx.uangDiterima) || 0,
              kembalian: Number(tx.kembalian) || 0,
              statusBayar: tx.statusBayar || 'Lunas',
              statusSync: 'Pending Offline',
              catatan: tx.catatan || '',
              totalItem: Array.isArray(tx.items) ? tx.items.reduce((s, it) => s + (Number(it.qty) || 0), 0) : 0,
              ringkasanPesanan: Array.isArray(tx.items) ? tx.items.map(it => `${it.qty}x ${it.nama}`).join('; ') : ''
            });

            // Masukkan juga detail item
            if (Array.isArray(tx.items)) {
              tx.items.forEach((it, idx) => {
                remoteData.detailItem.push({
                  idDetail: `${tx.id}-${idx + 1}`,
                  idTransaksi: tx.id,
                  tanggal: tx.tanggal || this.formatDateIndo(now),
                  jam: tx.jam || '00:00:00',
                  kasir: tx.kasir || 'Kasir',
                  tipePesanan: tx.tipePesanan || 'Dine-in',
                  kategori: it.kategori || 'Menu',
                  namaMenu: it.nama,
                  varian: it.varian || '',
                  hargaSatuan: Number(it.harga) || 0,
                  qty: Number(it.qty) || 1,
                  subtotal: Number(it.subtotal) || ((Number(it.harga) || 0) * (Number(it.qty) || 1)),
                  catatan: it.catatan || ''
                });
              });
            }
          }
        });
      }

      return remoteData;
    }

    // 3. Fallback: Rakit data laporan komprehensif dari penyimpanan lokal
    return this.buildComprehensiveLocalData(options, localRecent, localPending);
  },

  /**
   * Merakit dataset komprehensif dari data lokal (IndexedDB)
   */
  buildComprehensiveLocalData(options, localRecent, localPending) {
    const mergedMap = new Map();
    (localRecent || []).forEach(t => { if (t && t.id) mergedMap.set(t.id, t); });
    (localPending || []).forEach(t => { if (t && t.id) mergedMap.set(t.id, t); });

    if (typeof App !== 'undefined' && App.currentTransaction && App.currentTransaction.id) {
      mergedMap.set(App.currentTransaction.id, App.currentTransaction);
    }

    const allTrx = Array.from(mergedMap.values());
    const now = new Date();
    const todayIso = this.formatDateIso(now);
    const period = options.period || 'today';

    let startIso = '';
    let endIso = '';
    let labelPeriode = '';

    if (period === 'all') {
      labelPeriode = 'Semua Penjualan (All-Time)';
    } else if (period === 'yesterday') {
      const yDate = new Date(now.getTime() - 86400000);
      startIso = this.formatDateIso(yDate);
      endIso = startIso;
      labelPeriode = `Kemarin (${this.formatDateIndo(yDate)})`;
    } else if (period === 'last_7_days') {
      const pastDate = new Date(now.getTime() - 6 * 86400000);
      startIso = this.formatDateIso(pastDate);
      endIso = todayIso;
      labelPeriode = `7 Hari Terakhir (${this.formatDateIndo(pastDate)} - ${this.formatDateIndo(now)})`;
    } else if (period === 'this_month') {
      const ym = todayIso.substring(0, 7);
      startIso = `${ym}-01`;
      endIso = `${ym}-31`;
      labelPeriode = `Bulan Ini (${ym})`;
    } else if (period === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ym = this.formatDateIso(prevMonth).substring(0, 7);
      startIso = `${ym}-01`;
      endIso = `${ym}-31`;
      labelPeriode = `Bulan Lalu (${ym})`;
    } else if (period === 'range' && options.startDate && options.endDate) {
      startIso = this.toIsoDateString(options.startDate);
      endIso = this.toIsoDateString(options.endDate);
      labelPeriode = `Rentang (${options.startDate} s/d ${options.endDate})`;
    } else if (period === 'custom' && options.customDate) {
      startIso = this.toIsoDateString(options.customDate);
      endIso = startIso;
      labelPeriode = `Tanggal ${options.customDate}`;
    } else {
      startIso = todayIso;
      endIso = todayIso;
      labelPeriode = `Hari Ini (${this.formatDateIndo(now)})`;
    }

    const matchedTrxList = [];
    const matchedDetailList = [];
    const itemSummaryMap = {};

    let totalOmzetKotor = 0;
    let totalDiskon = 0;
    let totalBiayaLain = 0;
    let totalOmzet = 0;
    let totalQtyItem = 0;

    const paymentBreakdown = {
      tunai: { label: 'Tunai (Cash di Laci)', count: 0, total: 0 },
      qris: { label: 'Non-Tunai QRIS', count: 0, total: 0 },
      transfer: { label: 'Transfer Bank', count: 0, total: 0 }
    };
    const orderTypeBreakdown = {};

    allTrx.forEach(t => {
      const txIso = this.toIsoDateString(t.tanggal, t.id);
      let match = false;
      if (!startIso && !endIso) match = true;
      else if (startIso && endIso) match = (txIso >= startIso && txIso <= endIso);
      else if (startIso) match = (txIso >= startIso);

      if (match) {
        const subtotal = Number(t.subtotal) || Number(t.totalAkhir) || 0;
        const diskon = Number(t.diskon) || 0;
        const biaya = Number(t.biayaLain) || 0;
        const total = Number(t.totalAkhir) || 0;
        const tipe = t.tipePesanan || 'Dine-in';
        const metode = t.metodeBayar || 'Tunai';

        totalOmzetKotor += subtotal;
        totalDiskon += diskon;
        totalBiayaLain += biaya;
        totalOmzet += total;

        const metLower = metode.toLowerCase();
        if (metLower === 'tunai' || metLower === 'cash') {
          paymentBreakdown.tunai.count++;
          paymentBreakdown.tunai.total += total;
        } else if (metLower === 'qris') {
          paymentBreakdown.qris.count++;
          paymentBreakdown.qris.total += total;
        } else {
          paymentBreakdown.transfer.count++;
          paymentBreakdown.transfer.total += total;
        }

        if (!orderTypeBreakdown[tipe]) {
          orderTypeBreakdown[tipe] = { label: tipe, count: 0, total: 0 };
        }
        orderTypeBreakdown[tipe].count++;
        orderTypeBreakdown[tipe].total += total;

        let totalItemInTrx = 0;
        const ringkasanArr = [];

        if (Array.isArray(t.items)) {
          t.items.forEach((it, idx) => {
            const qty = Number(it.qty) || 1;
            const itemPrice = Number(it.harga) || 0;
            const itemSub = Number(it.subtotal) || (itemPrice * qty);
            const varian = it.varian || '';
            const nama = it.nama || 'Item';
            const kategori = it.kategori || 'Menu';

            totalItemInTrx += qty;
            totalQtyItem += qty;
            ringkasanArr.push(`${qty}x ${nama}${varian ? ' (' + varian + ')' : ''}`);

            matchedDetailList.push({
              idDetail: `${t.id}-${idx + 1}`,
              idTransaksi: t.id,
              tanggal: t.tanggal || this.formatDateIndo(now),
              jam: t.jam || '00:00:00',
              kasir: t.kasir || 'Kasir',
              tipePesanan: tipe,
              kategori: kategori,
              namaMenu: nama,
              varian: varian,
              hargaSatuan: itemPrice,
              qty: qty,
              subtotal: itemSub,
              catatan: it.catatan || ''
            });

            const groupKey = `${nama}||${varian}`;
            if (!itemSummaryMap[groupKey]) {
              itemSummaryMap[groupKey] = {
                kategori: kategori,
                namaMenu: nama,
                varian: varian,
                hargaSatuan: itemPrice,
                qty: 0,
                omzet: 0
              };
            }
            itemSummaryMap[groupKey].qty += qty;
            itemSummaryMap[groupKey].omzet += itemSub;
          });
        }

        matchedTrxList.push({
          id: t.id,
          tanggal: t.tanggal || this.formatDateIndo(now),
          tanggalIso: txIso,
          jam: t.jam || '00:00:00',
          kasir: t.kasir || 'Kasir',
          tipePesanan: tipe,
          metodeBayar: metode,
          subtotal: subtotal,
          diskon: diskon,
          biayaLain: biaya,
          totalAkhir: total,
          uangDiterima: Number(t.uangDiterima) || 0,
          kembalian: Number(t.kembalian) || 0,
          statusBayar: t.statusBayar || 'Lunas',
          statusSync: t.statusSync || 'Online',
          catatan: t.catatan || '',
          totalItem: totalItemInTrx,
          ringkasanPesanan: ringkasanArr.join('; ')
        });
      }
    });

    const itemsTerjual = Object.values(itemSummaryMap).sort((a, b) => b.qty - a.qty);
    itemsTerjual.forEach(itm => {
      itm.kontribusiPersen = totalOmzet > 0 ? ((itm.omzet / totalOmzet) * 100).toFixed(2) + '%' : '0.00%';
    });

    const totalTransaksi = matchedTrxList.length;
    const aov = totalTransaksi > 0 ? Math.round(totalOmzet / totalTransaksi) : 0;

    return {
      periode: {
        label: labelPeriode,
        filter: period,
        startDate: startIso,
        endDate: endIso,
        generatedAt: `${this.formatDateIndo(now)} ${now.toTimeString().substring(0, 8)} WIB`
      },
      summary: {
        totalOmzetKotor,
        totalDiskon,
        totalBiayaLain,
        totalOmzet,
        totalTransaksi,
        totalQtyItem,
        rataRataTransaksi: aov,
        metode: paymentBreakdown,
        tipePesanan: orderTypeBreakdown
      },
      itemsTerjual,
      transaksi: matchedTrxList,
      detailItem: matchedDetailList
    };
  },

  /**
   * Membangun workbook Excel (.xlsx) dengan 4 sheet komprehensif
   */
  generateWorkbook(data) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Library SheetJS (XLSX) belum dimuat.');
    }

    const wb = XLSX.utils.book_new();
    const summary = data.summary || {};
    const periode = data.periode || {};
    const storeName = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORE_NAME) ? APP_CONFIG.STORE_NAME : 'Teras Foodies';
    const activeCashier = (typeof Cart !== 'undefined' && Cart.activeCashier) ? Cart.activeCashier : 'Admin';

    // ==========================================
    // LEMBAR 1: RINGKASAN EKSEKUTIF (EXECUTIVE DASHBOARD)
    // ==========================================
    const ws1Rows = [
      [`${storeName.toUpperCase()} - LAPORAN REKAPITULASI PENJUALAN KOMPREHENSIF`],
      ['Sistem POS & Kasir Terintegrasi Google Sheets'],
      [''],
      ['INFORMASI LAPORAN', '', '', ''],
      ['Periode Rekapan', periode.label || 'Hari Ini', '', ''],
      ['Tanggal & Waktu Unduh', periode.generatedAt || new Date().toLocaleString('id-ID'), '', ''],
      ['Diunduh Oleh', `${activeCashier} (Owner / Admin)`, '', ''],
      ['Status Database', 'Google Sheets POS Cloud & Sinkronisasi Lokal', '', ''],
      [''],
      ['RINGKASAN UTAMA (KEY PERFORMANCE INDICATORS)', 'NILAI', 'SATUAN', 'KETERANGAN'],
      ['Total Omzet Kotor', Number(summary.totalOmzetKotor || 0), 'Rupiah (Rp)', 'Total penjualan sebelum potongan diskon'],
      ['Total Potongan Diskon', Number(summary.totalDiskon || 0), 'Rupiah (Rp)', 'Akumulasi diskon promosi yang diberikan'],
      ['Total Biaya Lain / Ongkir', Number(summary.totalBiayaLain || 0), 'Rupiah (Rp)', 'Biaya kemasan atau ongkos kirim'],
      ['TOTAL OMZET BERSIH', Number(summary.totalOmzet || 0), 'Rupiah (Rp)', 'Total penerimaan kas bersih riil yang masuk'],
      ['Total Transaksi Selesai', Number(summary.totalTransaksi || 0), 'Pesanan', 'Jumlah nota transaksi penjualan berhasil'],
      ['Rata-rata Nilai Belanja (AOV)', Number(summary.rataRataTransaksi || 0), 'Rp / Pesanan', 'Rata-rata omzet per transaksi'],
      ['Total Menu Terjual', Number(summary.totalQtyItem || 0), 'Porsi / Pcs', 'Akumulasi seluruh item menu yang laku'],
      [''],
      ['RINCIAN METODE PEMBAYARAN', 'JUMLAH TRANSAKSI', 'TOTAL NOMINAL (Rp)', 'PROPORSI OMZET (%)']
    ];

    const met = summary.metode || {};
    const tunaiVal = met.tunai ? Number(met.tunai.total) : 0;
    const qrisVal = met.qris ? Number(met.qris.total) : 0;
    const trfVal = met.transfer ? Number(met.transfer.total) : 0;
    const totOmzet = Number(summary.totalOmzet || 0);

    const calcPct = (val) => totOmzet > 0 ? ((val / totOmzet) * 100).toFixed(2) + '%' : '0.00%';

    ws1Rows.push([
      'Tunai (Uang Kas Fisik di Laci)',
      met.tunai ? Number(met.tunai.count) : 0,
      tunaiVal,
      calcPct(tunaiVal)
    ]);
    ws1Rows.push([
      'Non-Tunai QRIS (Merchant)',
      met.qris ? Number(met.qris.count) : 0,
      qrisVal,
      calcPct(qrisVal)
    ]);
    ws1Rows.push([
      'Transfer Bank',
      met.transfer ? Number(met.transfer.count) : 0,
      trfVal,
      calcPct(trfVal)
    ]);
    ws1Rows.push([
      'TOTAL PENERIMAAN KAS',
      Number(summary.totalTransaksi || 0),
      totOmzet,
      '100.00%'
    ]);

    ws1Rows.push(['']);
    ws1Rows.push(['RINCIAN SALURAN / TIPE PESANAN', 'JUMLAH TRANSAKSI', 'TOTAL OMZET (Rp)', 'PROPORSI OMZET (%)']);

    const orderTypes = summary.tipePesanan || {};
    const orderTypeKeys = Object.keys(orderTypes);
    if (orderTypeKeys.length > 0) {
      orderTypeKeys.forEach(k => {
        const item = orderTypes[k];
        ws1Rows.push([
          item.label || k,
          Number(item.count || 0),
          Number(item.total || 0),
          calcPct(Number(item.total || 0))
        ]);
      });
    } else {
      ws1Rows.push(['Makan di Tempat (Dine-in)', Number(summary.totalTransaksi || 0), totOmzet, '100.00%']);
    }

    const ws1 = XLSX.utils.aoa_to_sheet(ws1Rows);
    ws1['!cols'] = [
      { wch: 34 },
      { wch: 22 },
      { wch: 26 },
      { wch: 42 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Eksekutif');

    // ==========================================
    // LEMBAR 2: DAFTAR TRANSAKSI LENGKAP
    // ==========================================
    const ws2Rows = [
      [
        'No',
        'ID Transaksi',
        'Tanggal',
        'Jam',
        'Kasir',
        'Tipe Pesanan',
        'Metode Bayar',
        'Total Item (Porsi)',
        'Ringkasan Pesanan',
        'Subtotal (Rp)',
        'Diskon (Rp)',
        'Biaya Lain (Rp)',
        'Total Akhir (Rp)',
        'Uang Diterima (Rp)',
        'Kembalian (Rp)',
        'Status Bayar',
        'Status Sync',
        'Catatan Transaksi'
      ]
    ];

    let sumSubtotal = 0;
    let sumDiskon = 0;
    let sumBiaya = 0;
    let sumTotal = 0;
    let sumBayar = 0;
    let sumKembalian = 0;
    let sumTotalItem = 0;

    const trxList = data.transaksi || [];
    trxList.forEach((t, i) => {
      const sub = Number(t.subtotal) || 0;
      const dis = Number(t.diskon) || 0;
      const bia = Number(t.biayaLain) || 0;
      const tot = Number(t.totalAkhir) || 0;
      const ter = Number(t.uangDiterima) || 0;
      const kem = Number(t.kembalian) || 0;
      const itmCount = Number(t.totalItem) || 0;

      sumSubtotal += sub;
      sumDiskon += dis;
      sumBiaya += bia;
      sumTotal += tot;
      sumBayar += ter;
      sumKembalian += kem;
      sumTotalItem += itmCount;

      ws2Rows.push([
        i + 1,
        t.id,
        t.tanggal,
        t.jam,
        t.kasir,
        t.tipePesanan,
        t.metodeBayar,
        itmCount,
        t.ringkasanPesanan || '',
        sub,
        dis,
        bia,
        tot,
        ter,
        kem,
        t.statusBayar,
        t.statusSync,
        t.catatan || ''
      ]);
    });

    // Baris Total
    ws2Rows.push([
      'TOTAL',
      `${trxList.length} Transaksi`,
      '',
      '',
      '',
      '',
      '',
      sumTotalItem,
      '',
      sumSubtotal,
      sumDiskon,
      sumBiaya,
      sumTotal,
      sumBayar,
      sumKembalian,
      '',
      '',
      ''
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet(ws2Rows);
    ws2['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 13 },
      { wch: 11 },
      { wch: 14 },
      { wch: 16 },
      { wch: 15 },
      { wch: 18 },
      { wch: 38 },
      { wch: 15 },
      { wch: 13 },
      { wch: 15 },
      { wch: 16 },
      { wch: 17 },
      { wch: 15 },
      { wch: 13 },
      { wch: 14 },
      { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Daftar Transaksi');

    // ==========================================
    // LEMBAR 3: PERFORMA MENU TERJUAL
    // ==========================================
    const ws3Rows = [
      [
        'No',
        'Kategori Menu',
        'Nama Produk',
        'Varian Porsi',
        'Harga Satuan (Rp)',
        'Jumlah Terjual (Porsi)',
        'Total Omzet (Rp)',
        'Kontribusi Omzet (%)'
      ]
    ];

    let sumQtyMenu = 0;
    let sumOmzetMenu = 0;

    const itemsTerjual = data.itemsTerjual || [];
    itemsTerjual.forEach((it, i) => {
      const q = Number(it.qty) || 0;
      const omz = Number(it.omzet) || 0;
      sumQtyMenu += q;
      sumOmzetMenu += omz;

      ws3Rows.push([
        i + 1,
        it.kategori || 'Menu',
        it.namaMenu || it.nama || '',
        it.varian || '',
        Number(it.hargaSatuan) || (q > 0 ? Math.round(omz / q) : 0),
        q,
        omz,
        it.kontribusiPersen || calcPct(omz)
      ]);
    });

    ws3Rows.push([
      'TOTAL',
      '',
      `${itemsTerjual.length} Varian Menu`,
      '',
      '',
      sumQtyMenu,
      sumOmzetMenu,
      '100.00%'
    ]);

    const ws3 = XLSX.utils.aoa_to_sheet(ws3Rows);
    ws3['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 28 },
      { wch: 15 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Performa Menu Terjual');

    // ==========================================
    // LEMBAR 4: RINCIAN DETAIL ITEM PER TRANSAKSI
    // ==========================================
    const ws4Rows = [
      [
        'No',
        'ID Detail',
        'ID Transaksi',
        'Tanggal',
        'Jam',
        'Kasir',
        'Tipe Pesanan',
        'Kategori Menu',
        'Nama Menu',
        'Varian',
        'Harga Satuan (Rp)',
        'Qty Porsi',
        'Subtotal Item (Rp)',
        'Catatan Khusus Item'
      ]
    ];

    let sumDetailQty = 0;
    let sumDetailSub = 0;

    const detailList = data.detailItem || [];
    detailList.forEach((d, i) => {
      const q = Number(d.qty) || 0;
      const sub = Number(d.subtotal) || 0;
      sumDetailQty += q;
      sumDetailSub += sub;

      ws4Rows.push([
        i + 1,
        d.idDetail || `${d.idTransaksi}-${i + 1}`,
        d.idTransaksi,
        d.tanggal,
        d.jam,
        d.kasir,
        d.tipePesanan,
        d.kategori || 'Menu',
        d.namaMenu,
        d.varian || '',
        Number(d.hargaSatuan) || 0,
        q,
        sub,
        d.catatan || ''
      ]);
    });

    ws4Rows.push([
      'TOTAL',
      '',
      `${detailList.length} Baris Item`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      sumDetailQty,
      sumDetailSub,
      ''
    ]);

    const ws4 = XLSX.utils.aoa_to_sheet(ws4Rows);
    ws4['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 22 },
      { wch: 13 },
      { wch: 11 },
      { wch: 13 },
      { wch: 15 },
      { wch: 18 },
      { wch: 28 },
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(wb, ws4, 'Rincian Detail Item');

    return wb;
  },

  /**
   * Menghasilkan nama file yang deskriptif dan ramah sistem berkas
   */
  generateFilename(options, data) {
    const period = options.period || 'today';
    const now = new Date();
    const dateStamp = this.formatDateIso(now).replace(/-/g, '');

    let periodTag = 'HariIni';
    if (period === 'all') {
      periodTag = 'SemuaPenjualan';
    } else if (period === 'yesterday') {
      periodTag = 'Kemarin';
    } else if (period === 'last_7_days') {
      periodTag = '7HariTerakhir';
    } else if (period === 'this_month') {
      periodTag = `Bulan_${this.formatDateIso(now).substring(0, 7).replace('-', '_')}`;
    } else if (period === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodTag = `Bulan_${this.formatDateIso(prev).substring(0, 7).replace('-', '_')}`;
    } else if (period === 'custom' && options.customDate) {
      periodTag = `Tanggal_${options.customDate.replace(/[\/\-]/g, '')}`;
    } else if (period === 'range' && options.startDate && options.endDate) {
      periodTag = `${options.startDate.replace(/[\/\-]/g, '')}_sd_${options.endDate.replace(/[\/\-]/g, '')}`;
    }

    return `Rekap_Penjualan_Teras_Foodies_${periodTag}_${dateStamp}.xlsx`;
  },

  /**
   * Eksekusi unduh rekapan penjualan ke file Excel
   */
  async exportReport(options = {}) {
    if (typeof XLSX === 'undefined') {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memuat Excel Generator',
          text: 'Pustaka SheetJS belum selesai diinisialisasi. Silakan refresh halaman dan coba lagi.',
          confirmButtonColor: '#E03E1A'
        });
      } else {
        alert('Library SheetJS belum siap.');
      }
      return false;
    }

    // Tampilkan SweetAlert Loading
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Menyiapkan Rekap Penjualan...',
        html: `
          <div style="text-align:center; padding:12px 0;">
            <div class="tf-spinner" style="margin:0 auto 14px auto;"></div>
            <p style="font-size:13px; color:var(--text-secondary); margin:0;">
              Mengambil seluruh transaksi dan merakit 4 lembar kerja Excel...
            </p>
          </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false
      });
    }

    try {
      const data = await this.fetchReportData(options);
      const wb = this.generateWorkbook(data);
      const filename = this.generateFilename(options, data);

      // Tulis dan unduh file Excel
      XLSX.writeFile(wb, filename);

      const trxCount = (data.transaksi && data.transaksi.length) || 0;
      const omzetTotal = (data.summary && Number(data.summary.totalOmzet || 0)) || 0;
      const omzetFormatted = 'Rp' + omzetTotal.toLocaleString('id-ID');

      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'File Excel Berhasil Diunduh!',
          html: `
            <div style="text-align:left; background:var(--bg-surface-elevated, #F8FAFC); padding:14px 16px; border-radius:12px; border:1px solid var(--border-color, #E2E8F0); margin-top:8px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <i class="ph ph-file-xls" style="font-size:24px; color:#10B981;"></i>
                <strong style="font-size:13px; word-break:break-all;">${filename}</strong>
              </div>
              <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.6;">
                <div><strong>Periode:</strong> ${data.periode.label || options.period}</div>
                <div><strong>Total Omzet:</strong> <span style="color:#059669; font-weight:700;">${omzetFormatted}</span> (${trxCount} transaksi)</div>
                <div><strong>Lembar Kerja:</strong> 4 Sheet (Ringkasan Eksekutif, Transaksi, Performa Menu, Detail Item)</div>
              </div>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin-top:12px; text-align:center;">
              File kompatibel dengan Microsoft Excel, Google Sheets, WPS Office, dan aplikasi ponsel.
            </p>
          `,
          confirmButtonText: '<i class="ph ph-check"></i> Selesai',
          confirmButtonColor: '#10B981',
          customClass: {
            confirmButton: 'swal2-tf-btn-primary'
          }
        });
      }

      return true;
    } catch (err) {
      console.error('Gagal mengekspor laporan ke Excel:', err);
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengunduh Excel',
          text: err.message || 'Terjadi kesalahan saat memproses data rekapan.',
          confirmButtonColor: '#E03E1A'
        });
      }
      return false;
    }
  }
};

if (typeof window !== 'undefined') {
  window.ReportsExport = ReportsExport;
}
