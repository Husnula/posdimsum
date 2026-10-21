/**
 * POS TERAS FOODIES - BACKEND GOOGLE APPS SCRIPT
 * Database: Google Sheets (Spreadsheet ID: 1Fl8fT9NJOUq_iktrdp_GkTBatiwY_NyoSPPJm-C6OWo)
 *
 * FITUR:
 * 1. setupDatabase(): Otomatis membuat 6 sheets, format kolom, dan inisialisasi menu riil Teras Foodies
 * 2. doGet(e): API endpoint untuk mengambil menu, pengaturan, rekapan penjualan, dan status koneksi
 * 3. doPost(e): API endpoint untuk menyimpan transaksi, sinkronisasi batch offline, dan pengeluaran
 *
 * CARA INSTALLASI:
 * 1. Buka Google Sheets target
 * 2. Klik Extensions > Apps Script
 * 3. Ganti seluruh isi Code.gs dengan kode ini
 * 4. Pilih fungsi 'setupDatabase' lalu klik tombol 'Run' (Beri izin akses Google jika diminta)
 * 5. Klik tombol 'Deploy' > 'New deployment' > Pilih 'Web app'
 *    - Execute as: 'Me'
 *    - Who has access: 'Anyone'
 * 6. Salin URL Web App yang dihasilkan untuk dimasukkan ke konfigurasi frontend POS
 */

// KONFIGURASI GLOBAL
const SHEET_NAMES = {
  MENU: 'Menu',
  TRANSAKSI: 'Transaksi',
  DETAIL: 'Detail_Transaksi',
  PENGELUARAN: 'Pengeluaran_Operasional',
  SHIFT: 'Shift_Kasir',
  PENGATURAN: 'Pengaturan'
};

const DEVELOPER_WA = '6288228511309';

/**
 * Inisialisasi struktur database Google Sheets secara otomatis
 * WAJIB dijalankan satu kali saat setup awal
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. SETUP SHEET MENU
  let sheetMenu = ss.getSheetByName(SHEET_NAMES.MENU);
  if (!sheetMenu) {
    sheetMenu = ss.insertSheet(SHEET_NAMES.MENU);
  }
  const headersMenu = [
    'ID_Menu', 'Kategori', 'Nama_Menu', 'Varian', 
    'Harga_Jual', 'Harga_Modal', 'Stok_Tersedia', 'Status_Aktif', 
    'Gambar_URL', 'Keterangan'
  ];
  setupSheetHeader(sheetMenu, headersMenu, '#E03E1A');

  // Isi data awal menu riil Teras Foodies jika sheet masih kosong
  if (sheetMenu.getLastRow() <= 1) {
    const initialMenuItems = [
      // Dimsum Original
      ['MNU-001', 'Dimsum Original', 'Dimsum Ori 4 pcs', '4 pcs', 10000, 6000, 999, 'Aktif', '', 'Dimsum kukus gurih lembut isi ayam'],
      ['MNU-002', 'Dimsum Original', 'Dimsum Ori 6 pcs', '6 pcs', 15000, 9000, 999, 'Aktif', '', 'Dimsum kukus gurih lembut isi ayam'],
      ['MNU-003', 'Dimsum Original', 'Dimsum Ori 8 pcs', '8 pcs', 20000, 12000, 999, 'Aktif', '', 'Dimsum kukus gurih lembut isi ayam'],
      
      // Dimsum Mentai
      ['MNU-004', 'Dimsum Mentai', 'Dimsum Mentai 4 pcs', '4 pcs', 12000, 7500, 999, 'Aktif', '', 'Dimsum dengan saus mentai gurih creamy'],
      ['MNU-005', 'Dimsum Mentai', 'Dimsum Mentai 6 pcs', '6 pcs', 20000, 12000, 999, 'Aktif', '', 'Dimsum dengan saus mentai gurih creamy'],
      ['MNU-006', 'Dimsum Mentai', 'Dimsum Mentai 8 pcs', '8 pcs', 24000, 15000, 999, 'Aktif', '', 'Dimsum dengan saus mentai gurih creamy'],
      
      // Dimsum Hot Lava
      ['MNU-007', 'Dimsum Hot Lava', 'Dimsum Hot Lava 4 pcs', '4 pcs', 12000, 7500, 999, 'Aktif', '', 'Dimsum dengan siraman saus lava pedas membara'],
      ['MNU-008', 'Dimsum Hot Lava', 'Dimsum Hot Lava 6 pcs', '6 pcs', 20000, 12000, 999, 'Aktif', '', 'Dimsum dengan siraman saus lava pedas membara'],
      ['MNU-009', 'Dimsum Hot Lava', 'Dimsum Hot Lava 8 pcs', '8 pcs', 24000, 15000, 999, 'Aktif', '', 'Dimsum dengan siraman saus lava pedas membara'],
      
      // Wonton Chili Oil
      ['MNU-010', 'Wonton', 'Wonton Goreng', 'Porsi', 10000, 6000, 999, 'Aktif', '', 'Wonton renyah dengan chili oil spesial'],
      ['MNU-011', 'Wonton', 'Wonton Rebus', 'Porsi', 10000, 6000, 999, 'Aktif', '', 'Wonton kuah lembut berpadu chili oil aromatik'],
      
      // Basreng Chili Oil
      ['MNU-012', 'Basreng', 'Basreng Mini', 'Mini', 5000, 3000, 999, 'Aktif', '', 'Basreng pedas gurih porsi mini'],
      ['MNU-013', 'Basreng', 'Basreng Jumbo', 'Jumbo', 10000, 6000, 999, 'Aktif', '', 'Basreng pedas gurih porsi jumbo mantap'],
      
      // Mie Jebew
      ['MNU-014', 'Mie Jebew', 'Mie Jebew Ori', 'Standar', 8000, 5000, 999, 'Aktif', '', 'Mie pedas jebew gurih pedas khas'],
      ['MNU-015', 'Mie Jebew', 'Mie Jebew Wonton', 'Wonton', 12000, 7500, 999, 'Aktif', '', 'Mie jebew dengan topping wonton gurih'],
      ['MNU-016', 'Mie Jebew', 'Mie Jebew Sosis', 'Sosis', 12000, 7500, 999, 'Aktif', '', 'Mie jebew dengan topping sosis lezat'],
      ['MNU-017', 'Mie Jebew', 'Mie Jebew Bakso', 'Bakso', 13000, 8000, 999, 'Aktif', '', 'Mie jebew dengan topping bakso kenyal'],
      ['MNU-018', 'Mie Jebew', 'Mie Jebew Bakso Jumbo', 'Jumbo', 15000, 9500, 999, 'Aktif', '', 'Mie jebew dengan topping bakso ukuran jumbo'],
      
      // Minuman Segar
      ['MNU-019', 'Minuman', 'Es Teh', 'Gelas', 3000, 1000, 999, 'Aktif', '', 'Es teh manis melati segar dingin'],
      ['MNU-020', 'Minuman', 'Es Nutrisari', 'Gelas', 4000, 1500, 999, 'Aktif', '', 'Es sari jeruk segar nutrisari'],
      ['MNU-021', 'Minuman', 'Es Milo', 'Gelas', 5000, 2500, 999, 'Aktif', '', 'Es susu cokelat milo pekat'],
      ['MNU-022', 'Minuman', 'Es Beng-Beng', 'Gelas', 5000, 2500, 999, 'Aktif', '', 'Es cokelat lezat beng-beng drink'],
      ['MNU-023', 'Minuman', 'Es Jeruk Peras', 'Gelas', 5000, 2000, 999, 'Aktif', '', 'Es jeruk peras alami segar asam manis'],
      ['MNU-024', 'Minuman', 'Es Goodday', 'Gelas', 5000, 2500, 999, 'Aktif', '', 'Es kopi moccacino goodday segar'],
      
      // Birthday Dimsum
      ['MNU-025', 'Birthday Dimsum', 'Dimsum Birthday Isi 6', 'Isi 6', 25000, 15000, 999, 'Aktif', '', 'Dimsum saus mentai, free chili oil, sendok, topping, tissue, paper, tulisan keju max 5 simbol'],
      ['MNU-026', 'Birthday Dimsum', 'Dimsum Birthday Isi 16', 'Isi 16', 65000, 38000, 999, 'Aktif', '', 'Dimsum saus mentai, free chili oil, sendok, topping, tissue, paper, tulisan keju max 5 simbol']
    ];
    sheetMenu.getRange(2, 1, initialMenuItems.length, initialMenuItems[0].length).setValues(initialMenuItems);
  }

  // 2. SETUP SHEET TRANSAKSI
  let sheetTransaksi = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  if (!sheetTransaksi) {
    sheetTransaksi = ss.insertSheet(SHEET_NAMES.TRANSAKSI);
  }
  const headersTransaksi = [
    'ID_Transaksi', 'Tanggal', 'Jam', 'Kasir', 'Tipe_Pesanan', 
    'Metode_Pembayaran', 'Subtotal', 'Diskon', 'Biaya_Lain', 
    'Total_Akhir', 'Uang_Diterima', 'Kembalian', 'Status_Bayar', 
    'Status_Sync', 'Catatan'
  ];
  setupSheetHeader(sheetTransaksi, headersTransaksi, '#1E293B');

  // 3. SETUP SHEET DETAIL TRANSAKSI
  let sheetDetail = ss.getSheetByName(SHEET_NAMES.DETAIL);
  if (!sheetDetail) {
    sheetDetail = ss.insertSheet(SHEET_NAMES.DETAIL);
  }
  const headersDetail = [
    'ID_Detail', 'ID_Transaksi', 'ID_Menu', 'Nama_Menu', 
    'Varian', 'Harga_Satuan', 'Qty', 'Subtotal_Item', 'Catatan_Item'
  ];
  setupSheetHeader(sheetDetail, headersDetail, '#334155');

  // 4. SETUP SHEET PENGELUARAN OPERASIONAL
  let sheetPengeluaran = ss.getSheetByName(SHEET_NAMES.PENGELUARAN);
  if (!sheetPengeluaran) {
    sheetPengeluaran = ss.insertSheet(SHEET_NAMES.PENGELUARAN);
  }
  const headersPengeluaran = [
    'ID_Pengeluaran', 'Tanggal', 'Jam', 'Kategori', 'Nominal', 'Keterangan', 'Dicatat_Oleh'
  ];
  setupSheetHeader(sheetPengeluaran, headersPengeluaran, '#475569');

  // 5. SETUP SHEET SHIFT KASIR
  let sheetShift = ss.getSheetByName(SHEET_NAMES.SHIFT);
  if (!sheetShift) {
    sheetShift = ss.insertSheet(SHEET_NAMES.SHIFT);
  }
  const headersShift = [
    'ID_Shift', 'Tanggal', 'Kasir', 'Jam_Buka', 'Jam_Tutup', 
    'Modal_Awal', 'Penjualan_Tunai', 'Penjualan_NonTunai', 
    'Pengeluaran_Kas', 'Kas_Diharapkan', 'Kas_Aktual', 'Selisih_Kas', 'Status_Shift'
  ];
  setupSheetHeader(sheetShift, headersShift, '#0F766E');

  // 6. SETUP SHEET PENGATURAN
  let sheetPengaturan = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet(SHEET_NAMES.PENGATURAN);
  }
  const headersPengaturan = ['Kunci', 'Nilai', 'Keterangan'];
  setupSheetHeader(sheetPengaturan, headersPengaturan, '#B45309');

  if (sheetPengaturan.getLastRow() <= 1) {
    const defaultSettings = [
      ['NAMA_TOKO', 'Teras Foodies', 'Nama gerai usaha'],
      ['SLOGAN', 'Dimsum & Mie Jebew Lezat', 'Slogan struk'],
      ['ALAMAT', 'Jalan Jaya Rengel-Widang, Ds. Kedungrojo, 100 m Timur Tugu', 'Alamat gerai'],
      ['WHATSAPP_TOKO', '0857-3027-2661', 'Kontak pemesanan'],
      ['WHATSAPP_DEV', DEVELOPER_WA, 'Kontak developer untuk upgrade fitur'],
      ['HEADER_STRUK', 'Selamat Menikmati Kuliner Teras Foodies', 'Teks pembuka struk'],
      ['FOOTER_STRUK', 'Terima Kasih Atas Kunjungan Anda! IG/TikTok: @terasfoodies2', 'Teks penutup struk'],
      ['PIN_KASIR', '1234', 'PIN akses kasir standar'],
      ['PIN_OWNER', '8888', 'PIN akses laporan owner'],
      ['KUNCI_FITUR_PRO', 'TERKUNCI', 'Status fitur tambahan (Shift, Pengeluaran, Export)']
    ];
    sheetPengaturan.getRange(2, 1, defaultSettings.length, defaultSettings[0].length).setValues(defaultSettings);
  }

  SpreadsheetApp.flush();
  Logger.log('Database POS Teras Foodies berhasil disiapkan!');
}

/**
 * Format helper untuk baris header sheet
 */
function setupSheetHeader(sheet, headers, hexColor) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setBackground(hexColor);
  sheet.setFrozenRows(1);
  for (let c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
}

/**
 * Handler GET HTTP Request (REST API)
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || 'ping';

    if (action === 'ping') {
      return createJsonResponse({
        status: 'success',
        message: 'POS Teras Foodies API Online',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getMenu') {
      return handleGetMenu();
    }

    if (action === 'getSettings') {
      return handleGetSettings();
    }

    if (action === 'getReports') {
      const dateFilter = params.date || getTodayFormatted();
      return handleGetReports(dateFilter);
    }

    return createJsonResponse({
      status: 'error',
      message: 'Action tidak dikenal: ' + action
    });
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Handler POST HTTP Request (Simpan Transaksi, Batch Sync, dll)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Payload data POST kosong.');
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'saveTransaction';

    if (action === 'saveTransaction') {
      return handleSaveTransaction(payload.data);
    }

    if (action === 'syncBatchTransactions') {
      return handleSyncBatchTransactions(payload.items);
    }

    if (action === 'saveExpense') {
      return handleSaveExpense(payload.data);
    }

    return createJsonResponse({
      status: 'error',
      message: 'Action POST tidak dikenal: ' + action
    });
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Mengambil daftar menu aktif dari sheet Menu
 */
function handleGetMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  if (!sheet) {
    throw new Error('Sheet Menu belum dibuat. Jalankan setupDatabase() dahulu.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: 'success', data: [] });
  }

  const rawData = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const menuList = [];

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const statusAktif = String(row[7]).trim().toLowerCase();
    
    // Hanya masukkan menu yang aktif
    if (statusAktif === 'aktif' || statusAktif === 'true' || statusAktif === '') {
      menuList.push({
        id: String(row[0]),
        kategori: String(row[1]),
        nama: String(row[2]),
        varian: String(row[3]),
        harga: Number(row[4]) || 0,
        modal: Number(row[5]) || 0,
        stok: row[6] === 'Unlimited' ? 999 : Number(row[6]) || 0,
        gambar: String(row[8] || ''),
        keterangan: String(row[9] || '')
      });
    }
  }

  return createJsonResponse({
    status: 'success',
    total: menuList.length,
    data: menuList
  });
}

/**
 * Mengambil pengaturan gerai
 */
function handleGetSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  if (!sheet) {
    return createJsonResponse({ status: 'success', data: {} });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: 'success', data: {} });
  }

  const rawData = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const settings = {};

  for (let i = 0; i < rawData.length; i++) {
    const key = String(rawData[i][0]).trim();
    const val = String(rawData[i][1]).trim();
    if (key) {
      settings[key] = val;
    }
  }

  return createJsonResponse({
    status: 'success',
    data: settings
  });
}

/**
 * Menyimpan satu transaksi penjualan beserta item detailnya
 */
function handleSaveTransaction(trx) {
  if (!trx || !trx.id || !trx.items || trx.items.length === 0) {
    throw new Error('Data transaksi tidak lengkap.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTrx = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  const sheetDetail = ss.getSheetByName(SHEET_NAMES.DETAIL);

  if (!sheetTrx || !sheetDetail) {
    throw new Error('Sheet Transaksi atau Detail belum tersedia.');
  }

  const now = new Date();
  const tgl = trx.tanggal || formatDateIndo(now);
  const jam = trx.jam || formatTimeIndo(now);

  // 1. Simpan baris header transaksi
  const rowTrx = [
    trx.id,
    tgl,
    jam,
    trx.kasir || 'Kasir',
    trx.tipePesanan || 'Dine-in',
    trx.metodeBayar || 'Tunai',
    Number(trx.subtotal) || 0,
    Number(trx.diskon) || 0,
    Number(trx.biayaLain) || 0,
    Number(trx.totalAkhir) || 0,
    Number(trx.uangDiterima) || 0,
    Number(trx.kembalian) || 0,
    trx.statusBayar || 'Lunas',
    trx.statusSync || 'Online',
    trx.catatan || ''
  ];
  sheetTrx.appendRow(rowTrx);

  // 2. Simpan baris rincian detail item secara batch
  const detailRows = [];
  for (let i = 0; i < trx.items.length; i++) {
    const item = trx.items[i];
    const detailId = trx.id + '-' + (i + 1);
    detailRows.push([
      detailId,
      trx.id,
      item.id || '',
      item.nama || '',
      item.varian || '',
      Number(item.harga) || 0,
      Number(item.qty) || 1,
      Number(item.subtotal) || (Number(item.harga) * Number(item.qty)),
      item.catatan || ''
    ]);
  }

  if (detailRows.length > 0) {
    const nextRow = sheetDetail.getLastRow() + 1;
    sheetDetail.getRange(nextRow, 1, detailRows.length, detailRows[0].length).setValues(detailRows);
  }

  SpreadsheetApp.flush();

  return createJsonResponse({
    status: 'success',
    message: 'Transaksi ' + trx.id + ' berhasil disimpan.',
    id: trx.id
  });
}

/**
 * Sinkronisasi kumpulan transaksi offline yang tertunda
 */
function handleSyncBatchTransactions(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return createJsonResponse({
      status: 'success',
      message: 'Tidak ada item antrean yang perlu disinkronkan.',
      syncedCount: 0
    });
  }

  let successCount = 0;
  for (let i = 0; i < items.length; i++) {
    try {
      items[i].statusSync = 'Offline-Synced';
      handleSaveTransaction(items[i]);
      successCount++;
    } catch (e) {
      Logger.log('Gagal sync item ' + items[i].id + ': ' + e.message);
    }
  }

  return createJsonResponse({
    status: 'success',
    message: successCount + ' transaksi offline berhasil disinkronkan.',
    syncedCount: successCount
  });
}

/**
 * Mengambil ringkasan rekapan penjualan harian
 */
function handleGetReports(dateFilter) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTrx = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  const sheetDetail = ss.getSheetByName(SHEET_NAMES.DETAIL);

  if (!sheetTrx) {
    return createJsonResponse({ status: 'success', data: getEmptyReport(dateFilter) });
  }

  const lastRow = sheetTrx.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: 'success', data: getEmptyReport(dateFilter) });
  }

  const rawTrx = sheetTrx.getRange(2, 1, lastRow - 1, 15).getValues();
  
  let totalOmzet = 0;
  let totalTransaksi = 0;
  let totalTunai = 0;
  let totalQris = 0;
  let totalTransfer = 0;
  const listTrxHariIni = [];

  for (let i = 0; i < rawTrx.length; i++) {
    const row = rawTrx[i];
    const tgl = String(row[1]).trim();

    // Cocokkan tanggal
    if (!dateFilter || tgl === dateFilter) {
      const totalAkhir = Number(row[9]) || 0;
      const metode = String(row[5]).trim().toLowerCase();

      totalOmzet += totalAkhir;
      totalTransaksi++;

      if (metode === 'tunai' || metode === 'cash') {
        totalTunai += totalAkhir;
      } else if (metode === 'qris') {
        totalQris += totalAkhir;
      } else {
        totalTransfer += totalAkhir;
      }

      listTrxHariIni.push({
        id: String(row[0]),
        jam: String(row[2]),
        kasir: String(row[3]),
        tipe: String(row[4]),
        metode: String(row[5]),
        total: totalAkhir,
        status: String(row[12])
      });
    }
  }

  // Agregasi item menu terjual dari sheet Detail
  const itemCounts = {};
  if (sheetDetail && sheetDetail.getLastRow() > 1) {
    const rawDetail = sheetDetail.getRange(2, 1, sheetDetail.getLastRow() - 1, 9).getValues();
    const validTrxIds = new Set(listTrxHariIni.map(t => t.id));

    for (let j = 0; j < rawDetail.length; j++) {
      const dRow = rawDetail[j];
      const trxId = String(dRow[1]);
      if (validTrxIds.has(trxId)) {
        const nama = String(dRow[3]) + (dRow[4] ? ' (' + dRow[4] + ')' : '');
        const qty = Number(dRow[6]) || 0;
        const subtotal = Number(dRow[7]) || 0;

        if (!itemCounts[nama]) {
          itemCounts[nama] = { nama: nama, qty: 0, omzet: 0 };
        }
        itemCounts[nama].qty += qty;
        itemCounts[nama].omzet += subtotal;
      }
    }
  }

  const itemsTerjual = Object.values(itemCounts).sort((a, b) => b.qty - a.qty);

  return createJsonResponse({
    status: 'success',
    data: {
      tanggal: dateFilter,
      totalOmzet: totalOmzet,
      totalTransaksi: totalTransaksi,
      metode: {
        tunai: totalTunai,
        qris: totalQris,
        transfer: totalTransfer
      },
      itemsTerjual: itemsTerjual,
      transaksiTerbaru: listTrxHariIni.reverse().slice(0, 20)
    }
  });
}

/**
 * Mencatat pengeluaran operasional
 */
function handleSaveExpense(data) {
  if (!data || !data.nominal) {
    throw new Error('Data pengeluaran tidak valid.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PENGELUARAN);
  if (!sheet) {
    throw new Error('Sheet Pengeluaran belum dibuat.');
  }

  const now = new Date();
  const expId = 'EXP-' + Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd-HHmmss');
  
  sheet.appendRow([
    expId,
    formatDateIndo(now),
    formatTimeIndo(now),
    data.kategori || 'Bahan Baku',
    Number(data.nominal) || 0,
    data.keterangan || '',
    data.dicatatOleh || 'Kasir'
  ]);

  SpreadsheetApp.flush();

  return createJsonResponse({
    status: 'success',
    message: 'Pengeluaran sebesar Rp' + Number(data.nominal).toLocaleString('id-ID') + ' berhasil dicatat.'
  });
}

/**
 * Format tanggal Indonesia: DD/MM/YYYY
 */
function formatDateIndo(date) {
  return Utilities.formatDate(date, 'Asia/Jakarta', 'dd/MM/yyyy');
}

/**
 * Format jam Indonesia: HH:mm:ss
 */
function formatTimeIndo(date) {
  return Utilities.formatDate(date, 'Asia/Jakarta', 'HH:mm:ss');
}

function getTodayFormatted() {
  return formatDateIndo(new Date());
}

function getEmptyReport(date) {
  return {
    tanggal: date,
    totalOmzet: 0,
    totalTransaksi: 0,
    metode: { tunai: 0, qris: 0, transfer: 0 },
    itemsTerjual: [],
    transaksiTerbaru: []
  };
}

/**
 * Membentuk respon JSON dengan header CORS agar bisa dipanggil dari PWA
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
