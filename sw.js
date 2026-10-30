/**
 * Service Worker POS Teras Foodies (v3)
 * Mendukung instalasi PWA lintas platform (Desktop, Android, iOS/iPadOS) & akses offline penuh
 */

const CACHE_NAME = 'teras-foodies-pos-v3';

// Aset inti lokal yang wajib tersedia saat offline
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './config.js',
  './js/config.js',
  './js/notifications.js',
  './js/db.js',
  './js/cart.js',
  './js/receipt.js',
  './js/sync.js',
  './js/app.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
];

// Aset CDN eksternal (dicache secara terpisah agar kegagalan CDN tidak membatalkan cache aset lokal)
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// Install: Cache aset inti lokal dan aset CDN secara tahan-gagal (fault-tolerant)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache setiap aset lokal satu per satu agar jika 1 gagal, yang lain tetap tersimpan
      await Promise.allSettled(
        CORE_ASSETS.map(async (url) => {
          try {
            const req = new Request(url, { cache: 'reload' });
            const res = await fetch(req);
            if (res && res.ok) {
              await cache.put(url, res);
            }
          } catch (err) {
            console.warn('[SW] Gagal pre-cache aset lokal:', url, err);
          }
        })
      );

      // Cache aset CDN secara best-effort
      await Promise.allSettled(
        CDN_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { mode: 'cors' });
            if (res && res.ok) {
              await cache.put(url, res);
            }
          } catch (err) {
            console.warn('[SW] Lewati pre-cache CDN:', url);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Bersihkan cache versi lama & langsung klaim kontrol atas semua tab/window
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Dukung pesan skipWaiting dari halaman utama
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Strategi hibrida (Network-First untuk API & Navigasi HTML, Stale-While-Revalidate untuk Aset Statis)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Abaikan skema non-HTTP/HTTPS (seperti chrome-extension://)
  if (!requestUrl.protocol.startsWith('http')) {
    return;
  }

  // 1. Request API (Cloudflare Pages Proxy /api maupun Google Apps Script langsung):
  //    Selalu gunakan Network-First agar data menu, stok, dan rekap selalu segar saat online
  const isApiRequest =
    requestUrl.pathname === '/api' ||
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.searchParams.has('action') ||
    requestUrl.hostname.includes('script.google.com') ||
    requestUrl.hostname.includes('script.googleusercontent.com');

  if (isApiRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. Navigasi Halaman Utama (HTML): Network-First dengan fallback ke ./index.html di cache
  const isNavigation =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
              cache.put('./index.html', response.clone());
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedPage =
            (await caches.match(event.request, { ignoreSearch: true })) ||
            (await caches.match('./index.html')) ||
            (await caches.match('./'));
          return cachedPage;
        })
    );
    return;
  }

  // 3. Aset Statis Lokal & CDN (CSS, JS, Font, Ikon): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
