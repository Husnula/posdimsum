/**
 * MODUL STRUK KASIR & DIGITAL RECEIPT
 * Menghasilkan struk thermal 58mm/80mm untuk printer Bluetooth/USB
 * serta format struk digital untuk WhatsApp pelanggan
 */

const Receipt = {
  /**
   * Menghasilkan teks struk thermal 58mm (lebar 32 karakter)
   */
  generateThermalText(trx) {
    const divider = '================================';
    const singleLine = '--------------------------------';
    const store = APP_CONFIG.STORE_NAME || 'TERAS FOODIES';
    const slogan = APP_CONFIG.STORE_SLOGAN || 'Dimsum & Mie Jebew Lezat';
    const address = APP_CONFIG.STORE_ADDRESS || 'Ds. Kedungrojo, 100m Timur Tugu';
    const phone = APP_CONFIG.STORE_PHONE || '0857-3027-2661';

    let txt = '';
    txt += centerText(store, 32) + '\n';
    txt += centerText(slogan, 32) + '\n';
    txt += centerText(address, 32) + '\n';
    txt += centerText('WA: ' + phone, 32) + '\n';
    txt += divider + '\n';
    txt += `No: ${trx.id}\n`;
    txt += `Tgl: ${trx.tanggal} ${trx.jam}\n`;
    txt += `Kasir: ${trx.kasir || 'Alfian'}\n`;
    txt += `Tipe: ${trx.tipePesanan || 'Dine-in'}\n`;
    txt += singleLine + '\n';

    trx.items.forEach((item) => {
      const lineTotal = `Rp${Number(item.subtotal).toLocaleString('id-ID')}`;
      const itemTitle = `${item.qty}x ${item.nama}`;
      txt += formatTwoCols(itemTitle, lineTotal, 32) + '\n';
      if (item.catatan) {
        txt += `   * ${item.catatan}\n`;
      }
    });

    txt += singleLine + '\n';
    txt += formatTwoCols('Subtotal', `Rp${Number(trx.subtotal).toLocaleString('id-ID')}`, 32) + '\n';
    if (trx.diskon && trx.diskon > 0) {
      txt += formatTwoCols('Diskon', `-Rp${Number(trx.diskon).toLocaleString('id-ID')}`, 32) + '\n';
    }
    txt += singleLine + '\n';
    txt += formatTwoCols('TOTAL AKHIR', `Rp${Number(trx.totalAkhir).toLocaleString('id-ID')}`, 32) + '\n';
    txt += formatTwoCols(`BAYAR (${trx.metodeBayar})`, `Rp${Number(trx.uangDiterima).toLocaleString('id-ID')}`, 32) + '\n';
    txt += formatTwoCols('KEMBALIAN', `Rp${Number(trx.kembalian).toLocaleString('id-ID')}`, 32) + '\n';
    txt += divider + '\n';
    txt += centerText('Terima Kasih Atas Kunjungan Anda', 32) + '\n';
    txt += centerText('Follow IG/TikTok: @terasfoodies2', 32) + '\n';
    txt += divider + '\n\n\n';

    return txt;
  },

  /**
   * Menampilkan preview struk thermal di DOM dan memicu dialog cetak
   */
  printThermal(trx) {
    const printArea = document.getElementById('thermal-receipt-print-area');
    if (!printArea) return;

    let itemsHtml = '';
    trx.items.forEach((item) => {
      itemsHtml += `
        <div class="receipt-item-line">
          <span>${item.qty}x ${escapeHtml(item.nama)}</span>
          <span>Rp${Number(item.subtotal).toLocaleString('id-ID')}</span>
        </div>
        ${item.catatan ? `<div class="receipt-item-note">* ${escapeHtml(item.catatan)}</div>` : ''}
      `;
    });

    printArea.innerHTML = `
      <div class="receipt-paper">
        <div class="receipt-header">
          <h3>${APP_CONFIG.STORE_NAME}</h3>
          <p>${APP_CONFIG.STORE_SLOGAN}</p>
          <p>${APP_CONFIG.STORE_ADDRESS}</p>
          <p>WA: ${APP_CONFIG.STORE_PHONE}</p>
        </div>
        <div class="receipt-divider">================================</div>
        <div class="receipt-meta">
          <div>No: ${trx.id}</div>
          <div>Tgl: ${trx.tanggal} ${trx.jam}</div>
          <div>Kasir: ${trx.kasir || 'Alfian'} | ${trx.tipePesanan || 'Dine-in'}</div>
        </div>
        <div class="receipt-divider">--------------------------------</div>
        <div class="receipt-items">${itemsHtml}</div>
        <div class="receipt-divider">--------------------------------</div>
        <div class="receipt-calc">
          <div class="calc-row"><span>Subtotal</span><span>Rp${Number(trx.subtotal).toLocaleString('id-ID')}</span></div>
          ${trx.diskon > 0 ? `<div class="calc-row"><span>Diskon</span><span>-Rp${Number(trx.diskon).toLocaleString('id-ID')}</span></div>` : ''}
          <div class="calc-row total-bold"><span>TOTAL</span><span>Rp${Number(trx.totalAkhir).toLocaleString('id-ID')}</span></div>
          <div class="calc-row"><span>Bayar (${trx.metodeBayar})</span><span>Rp${Number(trx.uangDiterima).toLocaleString('id-ID')}</span></div>
          <div class="calc-row"><span>Kembalian</span><span>Rp${Number(trx.kembalian).toLocaleString('id-ID')}</span></div>
        </div>
        <div class="receipt-divider">================================</div>
        <div class="receipt-footer">
          <p>Terima Kasih Atas Kunjungan Anda</p>
          <p>IG / TikTok: @terasfoodies2</p>
        </div>
      </div>
    `;

    window.print();
  },

  /**
   * Menghasilkan teks pesan WhatsApp dan membuka link wa.me
   */
  async shareWhatsApp(trx) {
    const targetPhone = await Notifications.prompt(
      'Kirim Struk ke WhatsApp Pelanggan',
      'Masukkan nomor WA (Contoh: 08123456789 atau kosongkan)',
      ''
    );

    if (targetPhone === null) return; // User membatalkan

    let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    let text = `*STRUK PEMBELIAN TERAS FOODIES*\n`;
    text += `_Dimsum & Mie Jebew Lezat_\n`;
    text += `================================\n`;
    text += `No: ${trx.id}\n`;
    text += `Tanggal: ${trx.tanggal} ${trx.jam}\n`;
    text += `Tipe: ${trx.tipePesanan}\n`;
    text += `--------------------------------\n`;

    trx.items.forEach((item) => {
      text += `• *${item.qty}x ${item.nama}* = Rp${Number(item.subtotal).toLocaleString('id-ID')}\n`;
      if (item.catatan) {
        text += `   _(Catatan: ${item.catatan})_\n`;
      }
    });

    text += `--------------------------------\n`;
    text += `*Total Akhir: Rp${Number(trx.totalAkhir).toLocaleString('id-ID')}*\n`;
    text += `Metode Bayar: ${trx.metodeBayar}\n`;
    text += `Uang Diterima: Rp${Number(trx.uangDiterima).toLocaleString('id-ID')}\n`;
    text += `Kembalian: Rp${Number(trx.kembalian).toLocaleString('id-ID')}\n`;
    text += `================================\n`;
    text += `Terima kasih banyak sudah jajan di Teras Foodies! Ditunggu kedatangannya kembali ya Kak.`;

    const encoded = encodeURIComponent(text);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  }
};

/**
 * Format teks dua kolom rata kiri dan kanan untuk lebar thermal mini
 */
function formatTwoCols(left, right, maxLen = 32) {
  const leftStr = String(left);
  const rightStr = String(right);
  const spaceNeeded = maxLen - leftStr.length - rightStr.length;
  if (spaceNeeded > 0) {
    return leftStr + ' '.repeat(spaceNeeded) + rightStr;
  }
  return leftStr.substring(0, maxLen - rightStr.length - 1) + ' ' + rightStr;
}

/**
 * Format teks rata tengah
 */
function centerText(text, maxLen = 32) {
  const str = String(text);
  if (str.length >= maxLen) return str.substring(0, maxLen);
  const leftPad = Math.floor((maxLen - str.length) / 2);
  const rightPad = maxLen - str.length - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}
