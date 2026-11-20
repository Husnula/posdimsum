import { describe, it, expect } from 'vitest';
const { SyncEngine } = require('../js/sync.js');

describe('Modul Sinkronisasi (SyncEngine)', () => {
  describe('normalizeBatchResult', () => {
    it('hanya mengonfirmasi ID yang disebut server (tersimpan/duplikat)', () => {
      const batch = [{ id: 'TRF-A' }, { id: 'TRF-B' }, { id: 'TRF-C' }];
      const json = {
        status: 'success',
        savedIds: ['TRF-A'],
        duplicateIds: ['TRF-B'],
        failed: [{ id: 'TRF-C', error: 'Stok gagal.' }]
      };

      const result = SyncEngine.normalizeBatchResult(json, batch);

      expect(result.confirmedIds.sort()).toEqual(['TRF-A', 'TRF-B']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('TRF-C');
    });

    it('menandai item yang tidak disebut server sebagai gagal (tidak boleh dihapus)', () => {
      const batch = [{ id: 'TRF-A' }, { id: 'TRF-B' }];
      const json = { status: 'success', savedIds: ['TRF-A'] };

      const result = SyncEngine.normalizeBatchResult(json, batch);

      expect(result.confirmedIds).toEqual(['TRF-A']);
      expect(result.failed.map((f) => f.id)).toEqual(['TRF-B']);
    });

    it('kompatibel dengan backend lama: semua dikonfirmasi jika syncedCount penuh', () => {
      const batch = [{ id: 'TRF-A' }, { id: 'TRF-B' }];
      const result = SyncEngine.normalizeBatchResult({ status: 'success', syncedCount: 2 }, batch);

      expect(result.confirmedIds.sort()).toEqual(['TRF-A', 'TRF-B']);
      expect(result.failed).toHaveLength(0);
    });

    it('backend lama dengan syncedCount parsial tidak menghapus antrean apa pun', () => {
      const batch = [{ id: 'TRF-A' }, { id: 'TRF-B' }, { id: 'TRF-C' }];
      const result = SyncEngine.normalizeBatchResult({ status: 'success', syncedCount: 2 }, batch);

      expect(result.confirmedIds).toHaveLength(0);
      expect(result.failed).toHaveLength(3);
    });
  });

  describe('computeMissingTransactions', () => {
    it('hanya mengembalikan transaksi lokal yang belum ada di server', () => {
      const local = [
        { id: 'TRF-20261118-0001', tanggal: '18/11/2026', jam: '10:00:00' },
        { id: 'TRF-20261119-0001', tanggal: '19/11/2026', jam: '11:00:00' },
        { id: 'TRF-20261119-0002', tanggal: '19/11/2026', jam: '12:00:00' }
      ];
      const serverIds = new Set(['TRF-20261119-0002']);

      const missing = SyncEngine.computeMissingTransactions(local, serverIds);

      expect(missing.map((t) => t.id)).toEqual([
        'TRF-20261118-0001',
        'TRF-20261119-0001'
      ]);
    });

    it('menghapus duplikasi ID lokal', () => {
      const local = [
        { id: 'TRF-20261119-0001', jam: '10:00:00' },
        { id: 'TRF-20261119-0001', jam: '10:00:00' }
      ];

      const missing = SyncEngine.computeMissingTransactions(local, new Set());

      expect(missing).toHaveLength(1);
    });
  });

  describe('mergePendingIntoReport', () => {
    it('menambahkan nilai transaksi lokal ke ringkasan server', () => {
      const report = {
        tanggal: 'Hari Ini (19/11/2026)',
        totalOmzet: 100000,
        totalTransaksi: 2,
        metode: { tunai: 100000, qris: 0, transfer: 0 },
        itemsTerjual: [{ nama: 'Dimsum Ori', qty: 4, omzet: 40000 }],
        transaksiTerbaru: [{ id: 'TRF-20261119-0001', totalAkhir: 50000 }]
      };
      const pending = [
        {
          id: 'TRF-20261119-0002',
          tanggal: '19/11/2026',
          jam: '20:00:00',
          metodeBayar: 'Tunai',
          totalAkhir: 30000,
          items: [{ nama: 'Dimsum Ori', qty: 3, subtotal: 30000 }]
        }
      ];

      const merged = SyncEngine.mergePendingIntoReport(report, pending);

      expect(merged.totalOmzet).toBe(130000);
      expect(merged.totalTransaksi).toBe(3);
      expect(merged.metode.tunai).toBe(130000);
      expect(merged.pendingTransaksi).toBe(1);
      expect(merged.pendingOmzet).toBe(30000);
      expect(merged.itemsTerjual.find((i) => i.nama === 'Dimsum Ori').qty).toBe(7);
      expect(merged.transaksiTerbaru[0].id).toBe('TRF-20261119-0002');
    });

    it('tidak mengubah objek laporan asli', () => {
      const report = {
        totalOmzet: 1000,
        totalTransaksi: 1,
        metode: { tunai: 1000, qris: 0, transfer: 0 },
        itemsTerjual: [],
        transaksiTerbaru: []
      };

      SyncEngine.mergePendingIntoReport(report, [
        { id: 'TRF-X', totalAkhir: 500, metodeBayar: 'Tunai', items: [] }
      ]);

      expect(report.totalOmzet).toBe(1000);
    });
  });

  describe('transactionSortKey', () => {
    it('mengurutkan berdasarkan tanggal di ID lalu jam', () => {
      const a = SyncEngine.transactionSortKey({ id: 'TRF-20261118-0001', jam: '09:00:00' });
      const b = SyncEngine.transactionSortKey({ id: 'TRF-20261119-0001', jam: '08:00:00' });

      expect(a.localeCompare(b)).toBeLessThan(0);
    });

    it('memakai properti tanggal jika ID tidak memuat tanggal', () => {
      const key = SyncEngine.transactionSortKey({ id: 'CUSTOM-1', tanggal: '19/11/2026', jam: '10:30:00' });
      expect(key).toBe('20261119-10:30:00');
    });
  });
});
