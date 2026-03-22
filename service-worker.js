const CACHE_VERSION = 'v1.0.2'; // збільшуйте при зміні статичних файлів
const STATIC_CACHE_NAME = `az-book-static-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = `az-book-images-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `az-book-data-${CACHE_VERSION}`;

const FALLBACK_HTML = '/atlas_Ledneva/index.html';
const FALLBACK_IMAGE = '/az-book-ved/icon-192.png';

// Статичні ресурси (абсолютні шляхи від кореня сайту)
const STATIC_URLS = [
  '/az-book-ved/',
  '/az-book-ved/index.html',
  '/az-book-ved/style.css',
  '/az-book-ved/script.js',
  '/az-book-ved/manifest.json',
  '/az-book-ved/sings.json',
  '/az-book-ved/icon-192.png',
  '/az-book-ved/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js'
];

// Установка – кешуємо статику
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => cache.addAll(STATIC_URLS)),
      caches.open(IMAGES_CACHE_NAME),
      caches.open(DATA_CACHE_NAME)
    ]).then(() => self.skipWaiting())
  );
});

// Активація – видаляємо старі кеші
self.addEventListener('activate', event => {
  const currentCaches = [STATIC_CACHE_NAME, IMAGES_CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!currentCaches.includes(cacheName)) {
              console.log('Видалення старого кешу:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Стратегії кешування
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 1. Зображення (якщо будуть додані) – cache-first
  if (url.pathname.includes('/pictures/')) {
    event.respondWith(
      caches.open(IMAGES_CACHE_NAME).then(cache =>
        cache.match(event.request).then(response => {
          return response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => fetch(event.request))
      )
    );
    return;
  }
  
  // 2. Дані sings.json – network-first з ігноруванням HTTP-кешу
  if (url.pathname.endsWith('sings.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        const responseClone = response.clone();
        caches.open(DATA_CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // 3. Інші запити – cache-first з фоновим оновленням
  event.respondWith(
    caches.match(event.request).then(response => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {});
      return response || fetchPromise;
    })
  );
});

// Обробка повідомлень для отримання версії кешу (опціонально)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});