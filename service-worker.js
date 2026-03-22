const CACHE_VERSION = 'v1.1.3'; // Збільште при зміні статичних файлів!
const STATIC_CACHE_NAME = `az-book-static-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = `az-book-images-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `az-book-data-${CACHE_VERSION}`;

const FALLBACK_HTML = '/az-book-ved/index.html';

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

// INSTALL – кешуємо статику з детальним логуванням
self.addEventListener('install', event => {
  console.log('[SW] Install event – початок кешування');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('[SW] Кешуємо:', STATIC_URLS);
      return cache.addAll(STATIC_URLS);
    }).then(() => {
      console.log('[SW] Усі статичні ресурси закешовано');
      return self.skipWaiting(); // активуємо одразу після встановлення
    }).catch(err => {
      console.error('[SW] Помилка кешування:', err);
    })
  );
});

// ACTIVATE – видаляємо старі кеші та отримуємо контроль
self.addEventListener('activate', event => {
  console.log('[SW] Activate event – видалення старих кешів');
  const currentCaches = [STATIC_CACHE_NAME, IMAGES_CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Видаляємо старий кеш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Старі кеші видалено, claim клієнтів');
      return self.clients.claim(); // одразу беремо під контроль
    })
  );
});

// FETCH – стратегії кешування з логуванням
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  console.log('[SW] Fetch:', event.request.method, url.pathname);
  
  // 1. Зображення з папки /pictures/ (якщо будуть)
  if (url.pathname.includes('/pictures/')) {
    event.respondWith(
      caches.open(IMAGES_CACHE_NAME).then(cache =>
        cache.match(event.request).then(response => {
          console.log('[SW] Зображення з кешу:', response ? 'знайдено' : 'не знайдено');
          return response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => fetch(event.request))
      )
    );
    return;
  }
  
  // 2. Дані sings.json – network-first з ігноруванням кешу HTTP
  if (url.pathname.endsWith('sings.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        console.log('[SW] sings.json отримано з мережі');
        const responseClone = response.clone();
        caches.open(DATA_CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        console.log('[SW] sings.json – мережа недоступна, беру з кешу');
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // 3. Інші запити (включаючи навігацію) – cache-first з фоновим оновленням і резервним fallback
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        console.log('[SW] Відповідь з кешу:', url.pathname);
        // Фонове оновлення (stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            caches.open(STATIC_CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              console.log('[SW] Оновлено кеш для:', url.pathname);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      // Якщо немає в кеші – пробуємо мережу
      console.log('[SW] Немає в кеші, запит до мережі:', url.pathname);
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Якщо мережа недоступна – повертаємо головну сторінку як fallback
        console.log('[SW] Мережа недоступна, повертаємо index.html з кешу');
        return caches.match(FALLBACK_HTML);
      });
    })
  );
});

// Повідомлення про версію (для налагодження)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});