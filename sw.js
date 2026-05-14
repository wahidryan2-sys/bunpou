const CACHE_NAME = 'bunpou-pro-v1-cache';
const DYNAMIC_CACHE = 'bunpou-pro-v1-dynamic'; // 💡 Brankas baru khusus untuk file dari internet

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './tailwind.css'
];

// 💡 Daftar server luar yang wajib dicegat dan disimpan ke HP
const externalDomainsToCache = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Menginstal Service Worker dan menyimpan file inti ke Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Bunker Utama dibuka');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // Memaksa update sw.js langsung aktif
});

// Update Service Worker jika ada versi baru, dan hapus brankas lama
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// Mencegat request jaringan!
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Cek apakah request ini menuju ke server luar (Tailwind & Font)
  const isExternalAsset = externalDomainsToCache.some(domain => url.includes(domain));

  if (isExternalAsset) {
    // 💡 STRATEGI DYNAMIC CACHING (Coba ke internet, kalau dapat simpan ke brankas, kalau offline buka brankas)
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            // Berhasil ke internet? Ambil datanya, COPY (clone), lalu masukkan ke brankas dinamis
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => {
            // Gagal ke internet (OFFLINE)? Buka brankas dinamis dan kasih datanya ke layar!
            return cache.match(event.request);
          });
      })
    );
  } else {
    // 💡 STRATEGI NORMAL LOKAL (Cek brankas lokal dulu, kalau nggak ada baru ke internet)
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) return response;
        return fetch(event.request);
      })
    );
  }
});