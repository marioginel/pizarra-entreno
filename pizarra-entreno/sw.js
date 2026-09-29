// Permite abrir la app sin conexión (los datos los guarda Firestore en el propio móvil).
// Si cambias la app, sube el número de versión para forzar la actualización.
const CACHE = 'pizarra-v2';
const SHELL = ['/', '/index.html', '/config.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
 
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  const save = res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; };
  if (url.origin === location.origin) {
    // Primero la red (para tener siempre la última versión); si no hay conexión, la copia guardada
    e.respondWith(fetch(e.request).then(save).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
  } else if (['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(save)));
  }
});
 
