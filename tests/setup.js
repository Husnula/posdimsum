import { vi, beforeEach } from 'vitest';

// Mock Notifikasi SweetAlert2 / Toast global agar modul cart/app bisa berjalan tanpa error di test
global.Notifications = {
  toast: vi.fn(),
  prompt: vi.fn(),
  confirm: vi.fn(),
  alert: vi.fn()
};

// Reset DOM dan mock sebelum setiap tes
beforeEach(() => {
  vi.clearAllMocks();
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

