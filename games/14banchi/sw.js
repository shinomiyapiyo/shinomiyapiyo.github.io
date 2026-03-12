const CACHE_NAME = '14banchi-v0937';
const ASSETS = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './images/characters/piyo_title.webp',
  './images/characters/piyo_death.webp',
  './images/characters/piyo_clear.webp',
  './images/characters/piyo_ranking.webp',
  './images/characters/piyo_settings.webp',
  './images/characters/piyo_hints.webp',
  './images/sprites/player_walk1.webp',
  './images/sprites/player_walk2.webp',
  './images/sprites/player_stand.webp',
  './images/sprites/thug.webp',
  './images/sprites/creep.webp',
  './images/sprites/wizard.webp',
  './images/sprites/alien.webp',
  './audio/bgm/title.mp3',
  './audio/bgm/stage1.mp3',
  './audio/bgm/stage2.mp3',
  './audio/bgm/stage3.mp3',
  './audio/bgm/stage4.mp3',
  './audio/bgm/stage5.mp3',
  './audio/bgm/stage6.mp3',
  './audio/bgm/stage7.mp3',
  './audio/bgm/stage8.mp3',
  './audio/bgm/stage9.mp3',
  './audio/bgm/stage10.mp3',
  './audio/bgm/goal.mp3',
  './audio/bgm/death.mp3',
  './audio/bgm/ranking.mp3',
  './audio/bgm/settings.mp3',
  './audio/se/go.mp3',
  './audio/se/miss.mp3',
  './audio/se/quake.mp3',
  './audio/se/heart.mp3',
  './images/icon_back.webp',
  './images/icon_celebrate.webp',
  './images/icon_door.webp',
  './images/icon_heal.webp',
  './images/icon_home.webp',
  './images/icon_lives.webp',
  './images/icon_play.webp',
  './images/icon_retry.webp',
  './images/icon_settings.webp',
  './images/icon_skull.webp',
  './images/icon_sound.webp',
  './images/icon_trophy.webp',
  './images/icon_warning.webp',
  './images/icon_crown.webp',
  './images/icon_book.webp',
  './images/icon_bulb.webp',
  './images/icon_globe.webp',
  './images/icon_save.webp',
  './images/icon_document.webp',
  './images/icon_scroll.webp',
  './images/icon_arrow_left.webp',
  './images/icon_search.webp',
  './images/icon_torii_next.webp',
  './images/icon_torii_back.webp',
  './images/icon_text_next.webp',
  './images/icon_text_back.webp',
  './images/icon_sign_frame.webp',
  './images/icon_text_dead.webp',
  './images/icon_text_pause.webp',
  './images/icon_pause_frame.webp',
  './images/icon_text_clear.webp',
  './images/icon_title_logo.webp',
  './images/icon_eye_open.webp',
  './images/icon_eye_half.webp',
  './images/icon_eye_closed.webp',
  './images/icon_buga_sphere.webp',
  './images/title_bg_night.webp',
  './images/clear_bg.webp',
  './images/complete_bg.webp',
  './images/challenge_bg.webp'
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
