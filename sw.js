/**
 * Service Worker POS Teras Foodies
 * Mendukung instalasi PWA di Tablet / Smartphone & akses offline
 */

const CACHE_NAME = 'teras-foodies-pos-v1';
const STATIC_ASSETS = [
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
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://unpkg.com/@phosphor-icons/web@2.1.1'
];

// Install: Cache seluruh aset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Sebagian aset gagal dicache saat install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Bersihkan cache versi lama
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

// Fetch: Network First dengan Fallback ke Cache untuk API, Cache First untuk Aset Statis
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Jangan cache request non-GET (seperti POST ke Google Apps Script)
  if (event.request.method !== 'GET') {
    return;
  }

  // Request ke Google Apps Script: Network First, fallback to cached JSON if exists
  if (requestUrl.hostname.includes('script.google.com') || requestUrl.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Aset lokal & CDN: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return networkResponse;
      }).catch(() => {
        // Jika offline dan tidak ada di cache
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
