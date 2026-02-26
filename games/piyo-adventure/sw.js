var CACHE_NAME = 'piyo-adventure-v1.28';
var STATIC_ASSETS = [
    './',
    './index.html',
    './sprites.js',
    './manifest.json',
    './title.mp3',
    './stage.mp3',
    './ranking.mp3',
    './gameover.mp3',
    './boss.mp3',
    './win.mp3',
    './shop.mp3',
    './stage2.mp3',
    './stage3.mp3',
    './images/icon-192.png',
    './images/icon-512.png',
    './images/logo.png',
    './images/nullpo_works_white.png',
    './images/piyo01.jpg',
    './images/piyo02.jpg',
    './images/player_idle_v1.png',
    './images/player_walk_1.png',
    './images/player_walk_2.png',
    './images/player_walk_3.png',
    './images/player_walk_4.png',
    './images/player_jump.png',
    './images/player_fall.png',
    './images/enemy_chick.png',
    './images/enemy_chick_walk_1.png',
    './images/enemy_chick_walk_2.png',
    './images/enemy_chick_walk_3.png',
    './images/enemy_chick_walk_4.png',
    './images/enemy_golden_chick.png',
    './images/enemy_golden_chick_walk_1.png',
    './images/enemy_golden_chick_walk_2.png',
    './images/enemy_golden_chick_walk_3.png',
    './images/enemy_golden_chick_walk_4.png',
    './images/enemy_mama_chick.png',
    './images/enemy_mama_chick_walk_1.png',
    './images/enemy_mama_chick_walk_2.png',
    './images/enemy_mama_chick_walk_3.png',
    './images/enemy_mama_chick_walk_4.png',
    './images/enemy_flying_chick.png',
    './images/enemy_flying_chick_fly_1.png',
    './images/enemy_flying_chick_fly_2.png',
    './images/enemy_flying_chick_fly_3.png',
    './images/enemy_flying_chick_fly_4.png',
    './images/item_coin.png',
    './images/item_lemon.png',
    './images/item_shield.png',
    './images/item_heart.png',
    './images/item_energy.png',
    './images/bullet_energy.png',
    './images/boss_idle.png',
    './images/boss_walk.png',
    './images/boss_rush.png',
    './images/boss_jump.png',
    './images/boss_summon.png',
    './images/boss_damaged.png',
    './images/boss_flame.png',
    './images/shop.png',
    './images/shop01.jpg',
    './images/shop02.jpg',
    './images/shop03.jpg',
    './images/shop04.jpg',
    './images/shop05.jpg',
    './images/title_01.jpg',
    './images/title_02.jpg',
    './images/title_03.jpg',
    './images/title_04.jpg',
    './images/title_05.jpg',
    './images/title_06.jpg',
    './images/title_07.jpg',
    './images/title_08.jpg',
    './images/title_09.jpg',
    './images/title_10.jpg',
    './images/title_11.jpg',
    './images/title_12.jpg',
    './images/title_13.jpg',
    './images/title_14.jpg',
    './images/title_15.jpg',
    './images/title_16.jpg',
    './images/title_17.jpg',
    './images/title_18.jpg',
    './images/title_19.jpg',
    './images/title_20.jpg',
    './images/title_21.jpg',
    './images/title_22.jpg',
    './images/title_23.jpg',
    './images/title_24.jpg',
    './images/title_25.jpg',
    './images/title_26.jpg',
    './images/title_27.jpg',
    './images/title_28.jpg',
    './images/title_29.jpg',
    './images/title_30.jpg',
    './images/title_31.jpg',
    './images/title_32.jpg',
    './images/title_33.jpg'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // Firebase API: network-first
    if (url.hostname.indexOf('firebaseio.com') !== -1 ||
        url.hostname.indexOf('googleapis.com') !== -1 ||
        url.hostname.indexOf('firebase.googleapis.com') !== -1) {
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Static assets: cache-first
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            return cached || fetch(event.request).then(function(response) {
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});
