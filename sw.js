const CACHE_NAME = 'sleepsync-v2'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/science.html',
  '/style.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/calculator.js',
  '/js/translations.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
                return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache addAll failed:', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
                return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
          }
        })
      );
    })
  );
});