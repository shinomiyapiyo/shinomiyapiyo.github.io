const CACHE_NAME = '14banchi-v051';
const ASSETS = [
  './',
  './index.html',
  './piyo01.png',
  './piyo02.png',
  './piyo03.png',
  './thug.png',
  './creep.png',
  './wizard.png',
  './icon-192.png',
  './icon-512.png',
  './14th Block Title.mp3',
  './14th Block Stage.mp3',
  './14th Block Goal.mp3',
  './14th Block Death.mp3',
  './14th Block Ranking.mp3',
  './go.mp3',
  './miss.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
