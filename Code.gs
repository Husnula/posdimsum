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
  PENGATURAN: 'Pengaturan',
  MUTASI: 'Mutasi_Stok'
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
    'Gambar_URL', 'Keterangan', 'Min_Stok_Alert'
  ];
  setupSheetHeader(sheetMenu, headersMenu, '#E03E1A');

  // Jika kolom Min_Stok_Alert belum ada di sheet yang sudah ada datanya, tambahkan
  if (sheetMenu.getLastRow() > 1 && sheetMenu.getLastColumn() < 11) {
    sheetMenu.getRange(1, 11).setValue('Min_Stok_Alert').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#E03E1A');
    const existingRows = sheetMenu.getLastRow() - 1;
    const defaultMinAlerts = [];
    for (let r = 0; r < existingRows; r++) {
      defaultMinAlerts.push([5]);
    }
    sheetMenu.getRange(2, 11, existingRows, 1).setValues(defaultMinAlerts);
  }

  // Isi data awal menu riil Teras Foodies jika sheet masih kosong
  if (sheetMenu.getLastRow() <= 1) {
    const initialMenuItems = [
      // Dimsum Original
      ['MNU-001', 'Dimsum Original', 'Dimsum Ori 4 pcs', '4 pcs', 10000, 6000, 999, 'Aktif', '', 'Dimsum kukus gurih lembut isi ayam', 5],
      ['MNU-002', 'Dimsum Original', 'Dimsum Ori 6 pcs', '6 pcs', 15000, 9000, 999, 'Aktif', '', 'Dimsum kukus gurih lembut isi ayam', 5],
      ['MNU-003', 'Dimsum Original', 'Dimsum Ori 8 pcs', '8 pcs', 20000, 12000, 999, 'Aktif', '', 'Dimsum kukus gurih lembut isi ayam', 5],
      
      // Dimsum Mentai
      ['MNU-004', 'Dimsum Mentai', 'Dimsum Mentai 4 pcs', '4 pcs', 12000, 7500, 999, 'Aktif', '', 'Dimsum dengan saus mentai gurih creamy', 5],
      ['MNU-005', 'Dimsum Mentai', 'Dimsum Mentai 6 pcs', '6 pcs', 20000, 12000, 999, 'Aktif', '', 'Dimsum dengan saus mentai gurih creamy', 5],
      ['MNU-006', 'Dimsum Mentai', 'Dimsum Mentai 8 pcs', '8 pcs', 24000, 15000, 999, 'Aktif', '', 'Dimsum dengan saus mentai gurih creamy', 5],
      
      // Dimsum Hot Lava
      ['MNU-007', 'Dimsum Hot Lava', 'Dimsum Hot Lava 4 pcs', '4 pcs', 12000, 7500, 999, 'Aktif', '', 'Dimsum dengan siraman saus lava pedas membara', 5],
      ['MNU-008', 'Dimsum Hot Lava', 'Dimsum Hot Lava 6 pcs', '6 pcs', 20000, 12000, 999, 'Aktif', '', 'Dimsum dengan siraman saus lava pedas membara', 5],
      ['MNU-009', 'Dimsum Hot Lava', 'Dimsum Hot Lava 8 pcs', '8 pcs', 24000, 15000, 999, 'Aktif', '', 'Dimsum dengan siraman saus lava pedas membara', 5],
      
      // Wonton Chili Oil
      ['MNU-010', 'Wonton', 'Wonton Goreng', 'Porsi', 10000, 6000, 999, 'Aktif', '', 'Wonton renyah dengan chili oil spesial', 5],
      ['MNU-011', 'Wonton', 'Wonton Rebus', 'Porsi', 10000, 6000, 999, 'Aktif', '', 'Wonton kuah lembut berpadu chili oil aromatik', 5],
      
      // Basreng Chili Oil
      ['MNU-012', 'Basreng', 'Basreng Mini', 'Mini', 5000, 3000, 999, 'Aktif', '', 'Basreng pedas gurih porsi mini', 5],
      ['MNU-013', 'Basreng', 'Basreng Jumbo', 'Jumbo', 10000, 6000, 999, 'Aktif', '', 'Basreng pedas gurih porsi jumbo mantap', 5],
      
      // Mie Jebew
      ['MNU-014', 'Mie Jebew', 'Mie Jebew Ori', 'Standar', 8000, 5000, 999, 'Aktif', '', 'Mie pedas jebew gurih pedas khas', 5],
      ['MNU-015', 'Mie Jebew', 'Mie Jebew Wonton', 'Wonton', 12000, 7500, 999, 'Aktif', '', 'Mie jebew dengan topping wonton gurih', 5],
      ['MNU-016', 'Mie Jebew', 'Mie Jebew Sosis', 'Sosis', 12000, 7500, 999, 'Aktif', '', 'Mie jebew dengan topping sosis lezat', 5],
      ['MNU-017', 'Mie Jebew', 'Mie Jebew Bakso', 'Bakso', 13000, 8000, 999, 'Aktif', '', 'Mie jebew dengan topping bakso kenyal', 5],
      ['MNU-018', 'Mie Jebew', 'Mie Jebew Bakso Jumbo', 'Jumbo', 15000, 9500, 999, 'Aktif', '', 'Mie jebew dengan topping bakso ukuran jumbo', 5],
      
      // Minuman Segar
      ['MNU-019', 'Minuman', 'Es Teh', 'Gelas', 3000, 1000, 999, 'Aktif', '', 'Es teh manis melati segar dingin', 5],
      ['MNU-020', 'Minuman', 'Es Nutrisari', 'Gelas', 4000, 1500, 999, 'Aktif', '', 'Es sari jeruk segar nutrisari', 5],
      ['MNU-021', 'Minuman', 'Es Milo', 'Gelas', 5000, 2500, 999, 'Aktif', '', 'Es susu cokelat milo pekat', 5],
      ['MNU-022', 'Minuman', 'Es Beng-Beng', 'Gelas', 5000, 2500, 999, 'Aktif', '', 'Es cokelat lezat beng-beng drink', 5],
      ['MNU-023', 'Minuman', 'Es Jeruk Peras', 'Gelas', 5000, 2000, 999, 'Aktif', '', 'Es jeruk peras alami segar asam manis', 5],
      ['MNU-024', 'Minuman', 'Es Goodday', 'Gelas', 5000, 2500, 999, 'Aktif', '', 'Es kopi moccacino goodday segar', 5],
      ['MNU-027', 'Minuman', 'Es Chocolatos', 'Gelas', 5000, 2500, 999, 'Aktif', '', 'Es cokelat chocolatos lezat dingin segar', 5],
      
      // Birthday Dimsum
      ['MNU-025', 'Birthday Dimsum', 'Dimsum Birthday Isi 6', 'Isi 6', 25000, 15000, 999, 'Aktif', '', 'Dimsum saus mentai, free chili oil, sendok, topping, tissue, paper, tulisan keju max 5 simbol', 5],
      ['MNU-026', 'Birthday Dimsum', 'Dimsum Birthday Isi 16', 'Isi 16', 65000, 38000, 999, 'Aktif', '', 'Dimsum saus mentai, free chili oil, sendok, topping, tissue, paper, tulisan keju max 5 simbol', 5]
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
      ['PIN_OWNER', 'alfian1991', 'PIN akses laporan owner'],
      ['KUNCI_FITUR_PRO', 'TERKUNCI', 'Status fitur tambahan (Shift, Pengeluaran, Export)']
    ];
    sheetPengaturan.getRange(2, 1, defaultSettings.length, defaultSettings[0].length).setValues(defaultSettings);
  }

  // 7. SETUP SHEET MUTASI STOK (Buku Besar Keluar-Masuk & Opname Bahan)
  let sheetMutasi = ss.getSheetByName(SHEET_NAMES.MUTASI);
  if (!sheetMutasi) {
    sheetMutasi = ss.insertSheet(SHEET_NAMES.MUTASI);
  }
  const headersMutasi = [
    'ID_Mutasi', 'Tanggal', 'Jam', 'ID_Menu', 'Nama_Menu', 
    'Tipe_Mutasi', 'Qty_Mutasi', 'Stok_Sebelum', 'Stok_Sesudah', 
    'Keterangan', 'Operator'
  ];
  setupSheetHeader(sheetMutasi, headersMutasi, '#4F46E5');

  SpreadsheetApp.flush();
  Logger.log('Database POS Teras Foodies berhasil disiapkan lengkap dengan Mutasi Stok!');
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
      const includeAll = (params.all === '1' || params.all === 'true' || params.status === 'all');
      return handleGetMenu(includeAll);
    }

    if (action === 'getSettings') {
      return handleGetSettings();
    }

    if (action === 'getReports') {
      let filter = (params.date || params.period || '').toString().trim();
      if (!filter || filter.toLowerCase() === 'today') {
        filter = getTodayFormatted();
      } else if (filter.toLowerCase() === 'all' || filter.toLowerCase() === 'semua') {
        filter = 'all';
      }
      return handleGetReports(filter);
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
 * Handler POST HTTP Request (Simpan Transaksi, Batch Sync, CRUD Menu, Manajemen Stok)
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

    if (action === 'saveMenu') {
      return handleSaveMenu(payload.data);
    }

    if (action === 'deleteMenu') {
      return handleDeleteMenu(payload.id, payload.hardDelete);
    }

    if (action === 'updateStockBatch') {
      return handleUpdateStockBatch(payload);
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
 * Mengambil daftar menu dari sheet Menu
 * @param {boolean} includeAll - Jika true, sertakan menu yang berstatus Nonaktif
 */
function handleGetMenu(includeAll) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  if (!sheet) {
    throw new Error('Sheet Menu belum dibuat. Jalankan setupDatabase() dahulu.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: 'success', data: [] });
  }

  const numCols = Math.max(11, sheet.getLastColumn());
  const rawData = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  const menuList = [];

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const statusAktif = String(row[7] || '').trim().toLowerCase();
    const isAktif = (statusAktif === 'aktif' || statusAktif === 'true' || statusAktif === '');
    
    // Hanya masukkan menu yang aktif, kecuali jika includeAll diminta (untuk Kelola Menu)
    if (includeAll || isAktif) {
      const stokVal = row[6];
      menuList.push({
        id: String(row[0] || ''),
        kategori: String(row[1] || 'Dimsum Original'),
        nama: String(row[2] || ''),
        varian: String(row[3] || 'Standar'),
        harga: Number(row[4]) || 0,
        modal: Number(row[5]) || 0,
        stok: stokVal === 'Unlimited' ? 'Unlimited' : (isNaN(Number(stokVal)) ? 999 : Number(stokVal)),
        status: isAktif ? 'Aktif' : 'Nonaktif',
        gambar: String(row[8] || ''),
        keterangan: String(row[9] || ''),
        minStok: (row[10] !== undefined && row[10] !== '') ? (Number(row[10]) || 5) : 5
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
 * Menyimpan menu baru atau mengupdate menu yang sudah ada (CRUD)
 */
function handleSaveMenu(data) {
  if (!data || !data.nama || data.harga === undefined) {
    throw new Error('Nama menu dan harga jual wajib diisi.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  }

  const lastRow = sheet.getLastRow();
  let rowIndex = -1;
  let menuId = data.id ? String(data.id).trim() : '';

  if (lastRow > 1) {
    const idList = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    if (menuId) {
      for (let i = 0; i < idList.length; i++) {
        if (String(idList[i][0]).trim().toUpperCase() === menuId.toUpperCase()) {
          rowIndex = i + 2; // Baris 1 adalah header
          break;
        }
      }
    }
  }

  // Jika ID belum ada, generate otomatis (MNU-xxx)
  if (rowIndex === -1) {
    if (!menuId || menuId.startsWith('NEW') || menuId === '') {
      let maxNum = 27;
      if (lastRow > 1) {
        const idList = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < idList.length; i++) {
          const match = String(idList[i][0]).match(/MNU-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      menuId = 'MNU-' + String(maxNum + 1).padStart(3, '0');
    }
  }

  const stokVal = data.stok === 'Unlimited' ? 'Unlimited' : (data.stok !== undefined && !isNaN(Number(data.stok)) ? Number(data.stok) : 999);
  const minStokVal = (data.minStok !== undefined && !isNaN(Number(data.minStok))) ? Number(data.minStok) : 5;
  const statusVal = data.status && data.status.toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif';

  const rowValues = [
    menuId,
    data.kategori || 'Dimsum Original',
    data.nama,
    data.varian || 'Standar',
    Number(data.harga) || 0,
    Number(data.modal) || 0,
    stokVal,
    statusVal,
    data.gambar || '',
    data.keterangan || '',
    minStokVal
  ];

  let isNew = false;
  let prevStock = 0;

  if (rowIndex > 1) {
    // Update data baris yang ada
    const oldRow = sheet.getRange(rowIndex, 1, 1, 11).getValues()[0];
    prevStock = oldRow[6] === 'Unlimited' ? 'Unlimited' : (Number(oldRow[6]) || 0);
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    // Append baris baru
    isNew = true;
    sheet.appendRow(rowValues);
    rowIndex = sheet.getLastRow();
  }

  // Catat riwayat perubahan stok di sheet Mutasi_Stok
  if (stokVal !== 'Unlimited' && typeof stokVal === 'number') {
    if (isNew && stokVal > 0) {
      logMutasiStok(menuId, `${data.nama} (${data.varian || 'Standar'})`, 'RESTOCK_MASUK', stokVal, 0, stokVal, 'Stok awal menu baru', data.operator || 'Kasir/Owner');
    } else if (!isNew && prevStock !== 'Unlimited' && prevStock !== stokVal) {
      const diff = stokVal - Number(prevStock);
      logMutasiStok(menuId, `${data.nama} (${data.varian || 'Standar'})`, diff > 0 ? 'RESTOCK_MASUK' : 'OPNAME_PENYESUAIAN', diff, prevStock, stokVal, 'Penyesuaian form menu', data.operator || 'Kasir/Owner');
    }
  }

  SpreadsheetApp.flush();

  return createJsonResponse({
    status: 'success',
    message: isNew ? `Menu "${data.nama}" berhasil ditambahkan.` : `Menu "${data.nama}" berhasil diperbarui.`,
    data: {
      id: menuId,
      kategori: rowValues[1],
      nama: rowValues[2],
      varian: rowValues[3],
      harga: rowValues[4],
      modal: rowValues[5],
      stok: rowValues[6],
      status: rowValues[7],
      gambar: rowValues[8],
      keterangan: rowValues[9],
      minStok: rowValues[10]
    }
  });
}

/**
 * Menghapus atau menonaktifkan menu (Soft Delete / Hard Delete)
 */
function handleDeleteMenu(id, hardDelete) {
  if (!id) {
    throw new Error('ID menu wajib disertakan.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  if (!sheet) {
    throw new Error('Sheet Menu tidak ditemukan.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    throw new Error('Sheet Menu masih kosong.');
  }

  const idList = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < idList.length; i++) {
    if (String(idList[i][0]).trim().toUpperCase() === String(id).trim().toUpperCase()) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error('Menu dengan ID ' + id + ' tidak ditemukan.');
  }

  const menuName = sheet.getRange(rowIndex, 3).getValue();

  if (hardDelete === true) {
    sheet.deleteRow(rowIndex);
    SpreadsheetApp.flush();
    return createJsonResponse({
      status: 'success',
      message: `Menu ${menuName} (${id}) berhasil dihapus permanen.`
    });
  } else {
    // Soft delete: Ubah status menjadi 'Nonaktif'
    sheet.getRange(rowIndex, 8).setValue('Nonaktif');
    SpreadsheetApp.flush();
    return createJsonResponse({
      status: 'success',
      message: `Menu ${menuName} (${id}) dinonaktifkan.`
    });
  }
}

/**
 * Memperbarui stok multi-item dalam satu batch (Restock Cepat & Stok Opname)
 */
function handleUpdateStockBatch(payload) {
  if (!payload || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('Data items pembaruan stok tidak boleh kosong.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetMenu = ss.getSheetByName(SHEET_NAMES.MENU);
  if (!sheetMenu) {
    throw new Error('Sheet Menu tidak ditemukan.');
  }

  const lastRow = sheetMenu.getLastRow();
  if (lastRow <= 1) {
    throw new Error('Sheet Menu kosong.');
  }

  const numCols = Math.max(10, sheetMenu.getLastColumn());
  const rawMenu = sheetMenu.getRange(2, 1, lastRow - 1, numCols).getValues();
  const idToRowMap = {};
  for (let i = 0; i < rawMenu.length; i++) {
    const mId = String(rawMenu[i][0]).trim().toUpperCase();
    idToRowMap[mId] = {
      rowIndex: i + 2,
      nama: String(rawMenu[i][2]),
      varian: String(rawMenu[i][3]),
      stok: rawMenu[i][6]
    };
  }

  const tipeMutasi = payload.tipeMutasi || 'RESTOCK_MASUK';
  const operator = payload.operator || 'Kasir';
  const keterangan = payload.keterangan || (tipeMutasi === 'RESTOCK_MASUK' ? 'Restock Cepat' : 'Stok Opname Shift');
  const now = new Date();

  const mutasiRows = [];
  const updatedItems = [];

  for (let j = 0; j < payload.items.length; j++) {
    const item = payload.items[j];
    const mId = String(item.id || '').trim().toUpperCase();
    if (idToRowMap[mId]) {
      const info = idToRowMap[mId];
      const stokSebelum = info.stok === 'Unlimited' ? 'Unlimited' : (Number(info.stok) || 0);
      let stokBaru = item.stokBaru;
      let qtyMutasi = item.qtyMutasi;

      if (stokBaru === undefined && qtyMutasi !== undefined && stokSebelum !== 'Unlimited') {
        stokBaru = Math.max(0, Number(stokSebelum) + Number(qtyMutasi));
      } else if (stokBaru !== undefined && qtyMutasi === undefined && stokSebelum !== 'Unlimited') {
        qtyMutasi = Number(stokBaru) - Number(stokSebelum);
      }

      // Update stok di Sheet Menu
      sheetMenu.getRange(info.rowIndex, 7).setValue(stokBaru);

      // Siapkan baris log Mutasi
      const mutasiId = 'STK-' + Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd-HHmmss') + '-' + String(j + 1).padStart(2, '0');
      const itemKeterangan = item.alasan ? `${keterangan} (${item.alasan})` : keterangan;

      mutasiRows.push([
        mutasiId,
        formatDateIndo(now),
        formatTimeIndo(now),
        item.id,
        `${info.nama} (${info.varian})`,
        tipeMutasi,
        Number(qtyMutasi) || 0,
        stokSebelum,
        stokBaru,
        itemKeterangan,
        operator
      ]);

      updatedItems.push({
        id: item.id,
        stokSebelum: stokSebelum,
        stokBaru: stokBaru,
        qtyMutasi: qtyMutasi
      });
    }
  }

  // Simpan mutasi rows ke Sheet Mutasi_Stok
  if (mutasiRows.length > 0) {
    let sheetMutasi = ss.getSheetByName(SHEET_NAMES.MUTASI);
    if (!sheetMutasi) {
      sheetMutasi = ss.insertSheet(SHEET_NAMES.MUTASI);
      const headersMutasi = [
        'ID_Mutasi', 'Tanggal', 'Jam', 'ID_Menu', 'Nama_Menu', 
        'Tipe_Mutasi', 'Qty_Mutasi', 'Stok_Sebelum', 'Stok_Sesudah', 
        'Keterangan', 'Operator'
      ];
      setupSheetHeader(sheetMutasi, headersMutasi, '#4F46E5');
    }
    const nextRow = sheetMutasi.getLastRow() + 1;
    sheetMutasi.getRange(nextRow, 1, mutasiRows.length, mutasiRows[0].length).setValues(mutasiRows);
  }

  SpreadsheetApp.flush();

  return createJsonResponse({
    status: 'success',
    message: `${updatedItems.length} stok menu berhasil diperbarui.`,
    data: updatedItems
  });
}

/**
 * Mencatat satu entri riwayat mutasi stok
 */
function logMutasiStok(idMenu, namaMenu, tipeMutasi, qtyMutasi, stokSebelum, stokSesudah, keterangan, operator) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetMutasi = ss.getSheetByName(SHEET_NAMES.MUTASI);
    if (!sheetMutasi) {
      sheetMutasi = ss.insertSheet(SHEET_NAMES.MUTASI);
      const headersMutasi = [
        'ID_Mutasi', 'Tanggal', 'Jam', 'ID_Menu', 'Nama_Menu', 
        'Tipe_Mutasi', 'Qty_Mutasi', 'Stok_Sebelum', 'Stok_Sesudah', 
        'Keterangan', 'Operator'
      ];
      setupSheetHeader(sheetMutasi, headersMutasi, '#4F46E5');
    }

    const now = new Date();
    const mutasiId = 'STK-' + Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd-HHmmss') + '-' + Math.floor(10 + Math.random() * 90);

    sheetMutasi.appendRow([
      mutasiId,
      formatDateIndo(now),
      formatTimeIndo(now),
      idMenu,
      namaMenu,
      tipeMutasi,
      Number(qtyMutasi) || 0,
      stokSebelum,
      stokSesudah,
      keterangan || '',
      operator || 'Kasir'
    ]);
  } catch (err) {
    Logger.log('Gagal mencatat mutasi stok: ' + err.message);
  }
}

/**
 * Menyimpan satu transaksi penjualan beserta item detailnya,
 * dan OTOMATIS memotong stok menu di sheet Menu serta mencatat di Mutasi_Stok
 */
function handleSaveTransaction(trx) {
  if (!trx || !trx.id || !trx.items || trx.items.length === 0) {
    throw new Error('Data transaksi tidak lengkap.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTrx = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  const sheetDetail = ss.getSheetByName(SHEET_NAMES.DETAIL);
  const sheetMenu = ss.getSheetByName(SHEET_NAMES.MENU);

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

  // 3. Potong stok otomatis di sheet Menu & catat di Mutasi_Stok
  if (sheetMenu && trx.items && trx.items.length > 0) {
    try {
      const menuLastRow = sheetMenu.getLastRow();
      if (menuLastRow > 1) {
        const rawMenuData = sheetMenu.getRange(2, 1, menuLastRow - 1, 8).getValues();
        const mutasiRows = [];
        
        for (let i = 0; i < trx.items.length; i++) {
          const item = trx.items[i];
          const mId = String(item.id || '').trim().toUpperCase();
          const itemQty = Number(item.qty) || 1;

          for (let m = 0; m < rawMenuData.length; m++) {
            const rowMenuId = String(rawMenuData[m][0]).trim().toUpperCase();
            if (rowMenuId === mId) {
              const currentStock = rawMenuData[m][6];
              if (currentStock !== 'Unlimited' && !isNaN(Number(currentStock))) {
                const stokSebelum = Number(currentStock);
                const stokSesudah = Math.max(0, stokSebelum - itemQty);
                // Update nilai di cell sheet Menu
                sheetMenu.getRange(m + 2, 7).setValue(stokSesudah);
                rawMenuData[m][6] = stokSesudah; // Update memori lokal loop

                // Siapkan mutasi
                const mutasiId = 'STK-' + Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd-HHmmss') + '-' + String(i + 1).padStart(2, '0');
                mutasiRows.push([
                  mutasiId,
                  tgl,
                  jam,
                  item.id,
                  `${item.nama} (${item.varian || 'Standar'})`,
                  'PENJUALAN',
                  -itemQty,
                  stokSebelum,
                  stokSesudah,
                  'Transaksi ' + trx.id,
                  trx.kasir || 'Kasir'
                ]);
              }
              break;
            }
          }
        }

        if (mutasiRows.length > 0) {
          let sheetMutasi = ss.getSheetByName(SHEET_NAMES.MUTASI);
          if (!sheetMutasi) {
            sheetMutasi = ss.insertSheet(SHEET_NAMES.MUTASI);
            const headersMutasi = [
              'ID_Mutasi', 'Tanggal', 'Jam', 'ID_Menu', 'Nama_Menu', 
              'Tipe_Mutasi', 'Qty_Mutasi', 'Stok_Sebelum', 'Stok_Sesudah', 
              'Keterangan', 'Operator'
            ];
            setupSheetHeader(sheetMutasi, headersMutasi, '#4F46E5');
          }
          const nextRow = sheetMutasi.getLastRow() + 1;
          sheetMutasi.getRange(nextRow, 1, mutasiRows.length, mutasiRows[0].length).setValues(mutasiRows);
        }
      }
    } catch (stockErr) {
      Logger.log('Peringatan pemotongan stok: ' + stockErr.message);
    }
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
 * Mengambil ringkasan rekapan penjualan (harian / custom / all-time)
 */
function handleGetReports(dateFilter) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const isAll = (!dateFilter || dateFilter === 'all');
  const todayStr = getTodayFormatted();
  let labelPeriode = isAll ? 'Semua Penjualan (All-Time)' : dateFilter;
  if (dateFilter === todayStr) {
    labelPeriode = `Hari Ini (${todayStr})`;
  }

  const sheetTrx = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  const sheetDetail = ss.getSheetByName(SHEET_NAMES.DETAIL);

  if (!sheetTrx) {
    return createJsonResponse({ status: 'success', data: getEmptyReport(labelPeriode) });
  }

  const lastRow = sheetTrx.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: 'success', data: getEmptyReport(labelPeriode) });
  }

  const rawTrx = sheetTrx.getRange(2, 1, lastRow - 1, 15).getValues();
  
  let totalOmzet = 0;
  let totalTransaksi = 0;
  let totalTunai = 0;
  let totalQris = 0;
  let totalTransfer = 0;
  const listTrx = [];

  for (let i = 0; i < rawTrx.length; i++) {
    const row = rawTrx[i];
    let tgl = row[1];
    if (tgl instanceof Date) {
      tgl = formatDateIndo(tgl);
    } else {
      tgl = String(tgl || '').trim();
    }

    // Cocokkan tanggal
    if (isAll || tgl === dateFilter) {
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

      listTrx.push({
        id: String(row[0]),
        tanggal: tgl,
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
    const validTrxIds = new Set(listTrx.map(t => t.id));

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
      tanggal: labelPeriode,
      filter: dateFilter,
      totalOmzet: totalOmzet,
      totalTransaksi: totalTransaksi,
      metode: {
        tunai: totalTunai,
        qris: totalQris,
        transfer: totalTransfer
      },
      itemsTerjual: itemsTerjual,
      transaksiTerbaru: listTrx.reverse().slice(0, 20)
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
 * FUNGSI HELPER: Tambah Menu Otomatis via Apps Script Editor
 * Jalankan fungsi ini langsung dari editor Apps Script (pilih fungsi lalu klik Run)
 */
function tambahMenuChocolatos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  if (!sheet) {
    throw new Error('Sheet Menu tidak ditemukan.');
  }

  // Cek apakah MNU-027 sudah ada agar tidak duplikat
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'MNU-027' || String(data[i][2]).toLowerCase() === 'es chocolatos') {
      Logger.log('Menu Es Chocolatos sudah ada di baris ke-' + (i + 1));
      return 'Menu sudah ada';
    }
  }

  // Data: ID_Menu, Kategori, Nama_Menu, Varian, Harga_Jual, Harga_Modal, Stok_Tersedia, Status_Aktif, Gambar_URL, Keterangan
  const itemBaru = [
    'MNU-027',
    'Minuman',
    'Es Chocolatos',
    'Gelas',
    5000,
    2500,
    999,
    'Aktif',
    '',
    'Es cokelat chocolatos lezat dingin segar'
  ];

  sheet.appendRow(itemBaru);
  Logger.log('Sukses! Menu Es Chocolatos berhasil ditambahkan ke sheet Menu.');
  return 'Sukses ditambahkan';
}

/**
 * Membentuk respon JSON dengan header CORS agar bisa dipanggil dari PWA
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
