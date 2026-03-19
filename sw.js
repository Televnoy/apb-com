const CACHE_NAME = 'apb-judging-v3'; // увеличьте версию при изменении файлов
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-18.png',
  './icons/icon-32.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-120.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

// Установка: кешируем файлы и активируем нового воркера сразу
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // новый воркер активируется немедленно
});

// Активация: чистим старый кеш и захватываем контроль
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim(); // начинаем управлять страницей сразу
    })
  );
});

// Стратегия: сначала сеть, если нет — кеш
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Слушаем сообщения от страницы (для ручного обновления)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
