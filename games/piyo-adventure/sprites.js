/**
 * ぴよ氏の冒険 - ハイブリッドスプライトシステム
 * キャラクター/アイテム: 画像ファイル (PixelLab生成)
 * 地形/背景: プロシージャル生成ピクセルアート (SFC 16色パレット)
 */

// ─── 画像スプライト定義 (PNG読み込み) ───
var IMAGE_SPRITES = {
    // プレイヤー (64x64, 右向き, flipHで左向き)
    player_idle: { files: ['images/player_idle_v1.png'] },
    player_walk: { files: [
        'images/player_walk_1.png',
        'images/player_walk_2.png',
        'images/player_walk_3.png',
        'images/player_walk_4.png'
    ]},
    player_jump: { files: ['images/player_jump.png'] },
    player_fall: { files: ['images/player_fall.png'], flip: true },

    // 敵 (左向き固定 - 元画像が右向きのものだけflip:trueで反転)
    chick_walk:        { files: [
        'images/enemy_chick_walk_1.png',
        'images/enemy_chick_walk_2.png',
        'images/enemy_chick_walk_3.png',
        'images/enemy_chick_walk_4.png'
    ], flip: true },
    golden_chick_walk: { files: [
        'images/enemy_golden_chick_walk_1.png',
        'images/enemy_golden_chick_walk_2.png',
        'images/enemy_golden_chick_walk_3.png',
        'images/enemy_golden_chick_walk_4.png'
    ] },
    mama_chick_walk:   { files: [
        'images/enemy_mama_chick_walk_1.png',
        'images/enemy_mama_chick_walk_2.png',
        'images/enemy_mama_chick_walk_3.png',
        'images/enemy_mama_chick_walk_4.png'
    ] },
    flying_chick_fly:  { files: [
        'images/enemy_flying_chick_fly_1.png',
        'images/enemy_flying_chick_fly_2.png',
        'images/enemy_flying_chick_fly_3.png',
        'images/enemy_flying_chick_fly_4.png'
    ] },

    // アイテム
    coin_spin:       { files: ['images/item_coin.png'] },
    powerup_lemon:   { files: ['images/item_lemon.png'] },
    powerup_shield:  { files: ['images/item_shield.png'] },
    powerup_heart:   { files: ['images/item_heart.png'] },
    powerup_energy:  { files: ['images/item_energy.png'] },
    bullet_energy:   { files: ['images/bullet_energy.png'] }
};

// ─── 地形/背景用パレット定義 (SFC 16色) ───
var PALETTES = {
    terrain: [
        'transparent','#90ee90','#32cd32','#228b22','#006400','#c8a060',
        '#a08040','#887030','#e0c880','#556b2f','#7cfc00','#2e8b57',
        '#2e8b57','#8fbc8f','#daa520','#b8860b'
    ],
    cloud: [
        'transparent','#ffffff','#f0f8ff','#dce8f0','#c8d8e8',
        '#000000','#000000','#000000','#000000','#000000',
        '#000000','#000000','#000000','#000000','#000000','#000000'
    ],
    magnet: [
        'transparent','#ff2255','#cc0033','#3366ff','#0044cc',
        '#dddddd','#aaaaaa','#777777','#ffffff','#ff8899',
        '#88aaff','#dd55ff','#ffcc22','#ff4477','#5588ff','#555555'
    ]
};

// ─── 地形/背景 プロシージャル生成 ───
(function() {
    function G(w, h) {
        var g = [];
        for (var y = 0; y < h; y++) { g[y] = []; for (var x = 0; x < w; x++) g[y][x] = 0; }
        return g;
    }
    function R(g, x, y, w, h, c) {
        for (var dy = 0; dy < h; dy++) for (var dx = 0; dx < w; dx++) {
            var py = y + dy, px = x + dx;
            if (py >= 0 && py < g.length && px >= 0 && px < g[0].length) g[py][px] = c;
        }
    }
    function E(g, cx, cy, rx, ry, c) {
        for (var dy = -ry; dy <= ry; dy++) for (var dx = -rx; dx <= rx; dx++) {
            if ((dx * dx) / (rx * rx + 0.01) + (dy * dy) / (ry * ry + 0.01) <= 1) {
                var py = cy + dy, px = cx + dx;
                if (py >= 0 && py < g.length && px >= 0 && px < g[0].length) g[py][px] = c;
            }
        }
    }
    function P(g, x, y, c) {
        if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
    }

    // ─── 地形タイル (32x32) ───

    function buildGrassTop() {
        var g = G(32, 32);
        R(g, 0, 10, 32, 22, 5); R(g, 0, 12, 32, 20, 6);
        R(g, 0, 6, 32, 6, 1); R(g, 0, 4, 32, 3, 2);
        for (var i = 0; i < 32; i += 4) {
            R(g, i, 2, 2, 3, 2); R(g, i + 1, 1, 1, 2, 10); R(g, i + 2, 3, 1, 2, 1);
        }
        for (var j = 0; j < 32; j += 6) { P(g, j, 5, 10); P(g, j + 2, 4, 3); P(g, j + 4, 6, 4); }
        for (var k = 0; k < 32; k += 7) { P(g, k, 15, 7); P(g, k + 3, 18, 8); P(g, k + 5, 22, 7); }
        P(g, 10, 20, 14); P(g, 22, 16, 14); P(g, 5, 25, 15);
        return g;
    }

    function buildDirt() {
        var g = G(32, 32);
        R(g, 0, 0, 32, 32, 5); R(g, 0, 2, 32, 28, 6);
        for (var i = 0; i < 32; i += 5) for (var j = 0; j < 32; j += 6) { P(g, i, j, 7); P(g, i + 2, j + 3, 8); }
        P(g, 8, 10, 14); P(g, 20, 20, 15); P(g, 4, 24, 14); P(g, 26, 8, 15);
        return g;
    }

    function buildElevatedTop() {
        var g = G(32, 32);
        R(g, 0, 10, 32, 22, 11); R(g, 0, 12, 32, 20, 12);
        R(g, 0, 6, 32, 6, 11); R(g, 0, 4, 32, 3, 3);
        for (var i = 0; i < 32; i += 4) { R(g, i, 2, 2, 3, 3); R(g, i + 1, 1, 1, 2, 4); R(g, i + 2, 3, 1, 2, 11); }
        for (var j = 0; j < 32; j += 6) { P(g, j, 5, 4); P(g, j + 3, 4, 9); }
        for (var k = 0; k < 32; k += 7) { P(g, k, 16, 7); P(g, k + 4, 22, 8); }
        return g;
    }

    function buildCloudPlatform() {
        var g = G(32, 32);
        E(g, 16, 16, 14, 10, 1);
        E(g, 10, 12, 8, 7, 1); E(g, 22, 12, 8, 7, 1);
        E(g, 16, 10, 6, 5, 2); E(g, 16, 16, 12, 8, 2);
        E(g, 12, 10, 3, 2, 1); P(g, 10, 9, 1);
        R(g, 6, 22, 20, 4, 3); R(g, 8, 24, 16, 3, 4);
        return g;
    }

    function buildGroundPlatform() {
        var g = G(32, 32);
        R(g, 0, 2, 32, 28, 5); R(g, 0, 0, 32, 4, 8); R(g, 0, 28, 32, 4, 7);
        for (var y = 4; y < 28; y += 6) { R(g, 0, y, 32, 1, 8); R(g, 0, y + 1, 32, 4, 6); R(g, 0, y + 5, 32, 1, 7); }
        P(g, 2, 2, 7); P(g, 29, 2, 7); P(g, 2, 29, 7); P(g, 29, 29, 7);
        return g;
    }

    // ─── 背景 ───

    function buildBgCloud() {
        var g = G(32, 16);
        E(g, 16, 10, 14, 5, 1); E(g, 10, 8, 7, 5, 1); E(g, 22, 7, 7, 5, 1);
        E(g, 16, 6, 5, 4, 2); E(g, 8, 9, 5, 3, 2);
        return g;
    }

    function buildBgMountain() {
        var g = G(64, 40);
        for (var y = 0; y < 40; y++) {
            var w = Math.floor(y * 32 / 40);
            R(g, 32 - w, y, w * 2, 1, y < 8 ? 13 : y < 20 ? 11 : 3);
        }
        for (var sy = 0; sy < 6; sy++) {
            var sw = Math.floor(sy * 32 / 40);
            R(g, 32 - sw, sy, sw * 2, 1, 1);
        }
        for (var y2 = 15; y2 < 40; y2++) {
            var w2 = Math.floor((y2 - 15) * 20 / 25);
            R(g, 48 - w2, y2, w2 * 2, 1, y2 < 25 ? 13 : 9);
        }
        return g;
    }

    // ─── アイテム: マグネット (32x32) ───
    function buildMagnet() {
        var g = G(32, 32);
        // 上部バー (銀色の接続部)
        R(g, 8, 3, 16, 3, 7);  // 外枠 (暗い銀)
        R(g, 9, 4, 14, 2, 6);  // 中間 (銀)
        R(g, 10, 4, 12, 1, 5); // ハイライト (明るい銀)
        R(g, 8, 6, 16, 3, 6);  // 接続帯
        R(g, 9, 7, 14, 1, 5);
        // 左プロング (赤 = N極)
        R(g, 7, 6, 8, 19, 2);   // 暗い赤ベース
        R(g, 8, 7, 6, 17, 1);   // 明るい赤
        R(g, 9, 8, 4, 15, 9);   // ハイライト (ピンク)
        P(g, 9, 8, 8);          // 白いきらめき
        // 右プロング (青 = S極)
        R(g, 17, 6, 8, 19, 4);  // 暗い青ベース
        R(g, 18, 7, 6, 17, 3);  // 明るい青
        R(g, 19, 8, 4, 15, 10); // ハイライト (水色)
        P(g, 22, 8, 8);         // 白いきらめき
        // 底部 (丸み)
        R(g, 8, 25, 6, 2, 1);   // 赤の底
        R(g, 18, 25, 6, 2, 3);  // 青の底
        P(g, 7, 24, 2); P(g, 24, 24, 4);  // 角丸
        // 上部のバー上書き (銀色を維持)
        R(g, 9, 3, 14, 3, 6);
        R(g, 10, 4, 12, 1, 5);
        R(g, 11, 3, 10, 1, 8);  // 上端ハイライト
        // 磁力線エフェクト (紫の光)
        P(g, 5, 10, 11); P(g, 4, 15, 11); P(g, 5, 20, 11);
        P(g, 26, 11, 11); P(g, 27, 16, 11); P(g, 26, 21, 11);
        // 黄金スパーク
        P(g, 3, 5, 12); P(g, 28, 4, 12); P(g, 15, 1, 12);
        P(g, 2, 18, 12); P(g, 29, 19, 12);
        return g;
    }

    function buildBgTrees() {
        var g = G(32, 48);
        R(g, 13, 30, 6, 18, 7); R(g, 14, 30, 4, 18, 6);
        for (var ly = 0; ly < 20; ly++) {
            var lw = Math.floor(ly * 14 / 20);
            R(g, 16 - lw, 8 + ly, lw * 2, 1, ly < 6 ? 2 : ly < 12 ? 3 : 4);
        }
        E(g, 13, 14, 3, 3, 1); E(g, 18, 10, 2, 2, 10);
        R(g, 24, 38, 3, 10, 7);
        for (var ry = 0; ry < 10; ry++) {
            var rw = Math.floor(ry * 5 / 10);
            R(g, 25 - rw, 30 + ry, rw * 2 + 1, 1, ry < 4 ? 2 : 3);
        }
        return g;
    }

    // ─── SPRITE_DATA 構築 (地形/背景のみ) ───
    window.SPRITE_DATA = {
        // 地形タイル (32x32)
        terrain_grass_top:    { w: 32, h: 32, palette: 'terrain', frames: [buildGrassTop()] },
        terrain_dirt:         { w: 32, h: 32, palette: 'terrain', frames: [buildDirt()] },
        terrain_elevated_top: { w: 32, h: 32, palette: 'terrain', frames: [buildElevatedTop()] },

        // アイテム (プロシージャル)
        powerup_magnet: { w: 32, h: 32, palette: 'magnet', frames: [buildMagnet()] },

        platform_cloud:  { w: 32, h: 32, palette: 'cloud', frames: [buildCloudPlatform()] },
        platform_ground: { w: 32, h: 32, palette: 'terrain', frames: [buildGroundPlatform()] },

        // 背景
        bg_cloud:    { w: 32, h: 16, palette: 'cloud', frames: [buildBgCloud()] },
        bg_mountain: { w: 64, h: 40, palette: 'terrain', frames: [buildBgMountain()] },
        bg_trees:    { w: 32, h: 48, palette: 'terrain', frames: [buildBgTrees()] }
    };

    // バイオーム用: ビルド関数群をエクスポート
    window.TERRAIN_BUILDERS = {
        buildGrassTop: buildGrassTop,
        buildDirt: buildDirt,
        buildElevatedTop: buildElevatedTop,
        buildGroundPlatform: buildGroundPlatform,
        buildBgMountain: buildBgMountain,
        buildBgTrees: buildBgTrees
    };
})();
