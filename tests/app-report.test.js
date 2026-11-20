import { describe, it, expect } from 'vitest';
const { App } = require('../js/app.js');

describe('Filter periode transaksi lokal (rekap)', () => {
  it('semua periode menerima transaksi apa pun', () => {
    expect(App.localTransactionMatchesPeriod({ id: 'TRF-20260101-0001', tanggal: '01/01/2026' }, 'all')).toBe(true);
  });

  it('mencocokkan transaksi berdasarkan tanggal hari ini', () => {
    const today = App.getTodayIndoDate();
    const trx = { id: 'TRF-CUSTOM-1', tanggal: today };

    expect(App.localTransactionMatchesPeriod(trx, 'today')).toBe(true);
  });

  it('mencocokkan transaksi lewat tanggal yang tertanam di ID', () => {
    const trx = { id: 'TRF-20261119-1234', tanggal: '01/01/2026' };

    expect(App.localTransactionMatchesPeriod(trx, 'custom', '19/11/2026')).toBe(true);
  });

  it('menolak transaksi di luar periode', () => {
    const trx = { id: 'TRF-20261118-1234', tanggal: '18/11/2026' };

    expect(App.localTransactionMatchesPeriod(trx, 'custom', '19/11/2026')).toBe(false);
  });

  it('mendukung tanggal dengan awalan apostrof dari Google Sheets', () => {
    const trx = { id: 'TRF-CUSTOM-2', tanggal: "'19/11/2026" };

    expect(App.localTransactionMatchesPeriod(trx, 'custom', '19/11/2026')).toBe(true);
  });
});
