// A list of all the files your game needs to work offline
const CACHE_FILES = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'icon-192.png',
  'icon-512.png'
];

const CACHE_NAME = 'blockudoku-cache-v1';

// When the PWA is installed, save all the files to the cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_FILES);
    })
  );
});

// When the browser requests a file, serve it from the cache if available
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});