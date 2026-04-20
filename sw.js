const CACHE_NAME = 'gravador-midi-v1';

// Recursos essenciais para funcionamento offline
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './libs/tailwind.css',
  './libs/soundfont-player.min.js',
  './libs/midi-writer.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

// Instalação: faz cache dos recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para assets locais, network-first para soundfonts (arquivos grandes)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições que não sejam GET
  if (event.request.method !== 'GET') return;

  // Ignora requisições de extensões do browser ou de origens externas não esperadas
  if (!url.protocol.startsWith('http')) return;

  // Para os soundfonts, usa network-first com fallback para cache
  if (url.pathname.includes('/soundfonts/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Para demais recursos, usa cache-first com fallback para rede
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return networkResponse;
      });
    })
  );
});
