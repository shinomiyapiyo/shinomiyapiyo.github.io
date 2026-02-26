# ショップシステム 実装仕様書

> **対象ファイル**: `games/piyo-adventure/index.html`（全コードがこの1ファイルに集約されている）
> **バージョン**: 1.0（2026-02-26 作成）
> **前提**: 現在のコードベースにショップ機能は一切存在しない。ゼロから追加する。

---

## 目次

1. [概要](#1-概要)
2. [用語定義](#2-用語定義)
3. [通貨システム](#3-通貨システム)
4. [ステージショップ](#4-ステージショップ)
5. [タイトルショップ](#5-タイトルショップ)
6. [ストック（持ち物）システム](#6-ストック持ち物システム)
7. [データ永続化](#7-データ永続化)
8. [UI/HTML 実装詳細](#8-uihtml-実装詳細)
9. [CSS スタイリング](#9-css-スタイリング)
10. [JavaScript ロジック](#10-javascript-ロジック)
11. [ゲームフロー変更点](#11-ゲームフロー変更点)
12. [音響・演出](#12-音響演出)
13. [多言語対応](#13-多言語対応)
14. [将来の課金システム拡張](#14-将来の課金システム拡張)
15. [実装チェックリスト](#15-実装チェックリスト)

---

## 1. 概要

### 1.1 ショップは2種類

| | ステージショップ | タイトルショップ |
|--|--|--|
| **場所** | ボス戦の100m手前（ゲームプレイ中） | タイトル画面のボタンから |
| **通貨** | そのプレイのスコア（円） | 貯金（永続コイン） |
| **商品の寿命** | そのボス戦1回限り（消耗品） | 永続（恒久アップグレード） |
| **出現頻度** | 毎ラウンドのボス前に1回 | いつでもアクセス可能 |
| **目的** | 目前のボス戦に備える短期戦術 | 長期的な強化・カスタマイズ |
| **演出** | ゲーム一時停止→ショップUI表示 | タイトル画面のフルスクリーンオーバーレイ |

### 1.2 設計の核心 ─ 「スコアの3択ジレンマ」

プレイヤーはステージショップで毎ラウンド以下の判断を迫られる：

1. **ストック消耗品を買う** → ボス戦を楽にする（スコア消費）
2. **預金する** → 将来のタイトルショップ強化に回す（スコア50%を貯金に変換）
3. **何も買わない** → スコアをそのままランキングに残す

---

## 2. 用語定義

| 用語 | 意味 | 英語キー |
|------|------|----------|
| スコア（円） | 1回のプレイで稼いだ合計得点。コイン取得・敵撃破・ボス撃破で加算。プレイ終了でリセット | `score` |
| 貯金 | ステージショップの「預金」で変換した永続通貨。localStorage に保存 | `savings` |
| ストック | ボス戦で使える消耗品アイテムの持ち物枠。初期上限3個 | `stock` |
| 恒久アップグレード | タイトルショップで購入する永続的な強化。レベル制で段階的に強くなる | `upgrades` |

---

## 3. 通貨システム

### 3.1 スコア（円）─ 揮発性通貨

**既存のスコアシステムをそのまま使う。** 新しい変数は不要。

- ソース: `gameState.score`（既存、`index.html:1599`）
- 加算元:
  - コイン取得: +100円
  - 地上敵撃破: +200円 × コンボ倍率
  - 飛行敵撃破: +300円 × コンボ倍率
  - パワーアップ取得: +500円
  - ボス撃破: +5,000円
- ライフサイクル: ゲーム開始時に0、ゲーム終了（ゲームオーバー or リタイア）まで加算し続ける
- ランキング: ゲーム終了時のスコアがランキング対象（ショップでの消費後の値）

### 3.2 貯金（savings）─ 永続通貨

**新しく追加する永続通貨。**

```javascript
// gameSettings に追加（localStorage で永続化）
gameSettings.savings = 0;  // 初期値: 0
```

- 入手方法: ステージショップの「預金する」で `floor(現在スコア × 0.5)` を貯金に変換
- 消費場所: タイトルショップでの購入
- 保存先: `localStorage` の `piyo_settings` キー内（既存の設定と同じ場所）

---

## 4. ステージショップ

### 4.1 出現条件

ボスが出現する `BOSS_TRIGGER_DISTANCE × gameRound` の **100m手前**でショップが開く。

```javascript
// 新しい定数
var SHOP_TRIGGER_OFFSET = 100;  // ボス出現の100m前

// checkBossTrigger() の手前に新しいチェック関数を追加
function checkShopTrigger() {
    if (shopState.visited || shopState.active) return;
    var bossDistance = BOSS_TRIGGER_DISTANCE * gameRound;
    if (gameState.distance >= bossDistance - SHOP_TRIGGER_OFFSET) {
        openStageShop();
    }
}
```

**注意**: 既存の `checkBossTrigger()` は `index.html:3017` にある。ショップのチェックはこの関数の**直前**にゲームループ内で呼ぶ。

### 4.2 ショップ状態管理

```javascript
var shopState = {
    active: false,       // ショップ画面が開いているか
    visited: false,      // このラウンドで既に訪問したか（重複防止）
    deposited: false     // このラウンドで既に預金したか
};
```

`resetGame()` 内でリセット:

```javascript
shopState = { active: false, visited: false, deposited: false };
```

`bossState.phase === 5`（ラウンド移行完了時）でも `visited` と `deposited` をリセット:

```javascript
shopState.visited = false;
shopState.deposited = false;
```

### 4.3 ショップを開く処理

```javascript
function openStageShop() {
    shopState.active = true;
    shopState.visited = true;

    // ゲームを一時停止（ポーズとは別のフラグ）
    gameState.gamePaused = true;

    // ショップ用BGMを再生（shop.mp3 が必要。なければ stage.mp3 を流し続ける）
    // if (soundManager) soundManager.playBGM('shop');

    // ショップUIを表示
    showStageShopScreen();
}
```

### 4.4 商品ラインナップ

| ID | 商品名 | 効果 | 価格（円） | 購入上限 | アイコン |
|----|--------|------|-----------|---------|---------|
| `heal` | 回復薬 | ライフ+2（`gameState.lives += 2`、上限10） | 1,500 | 2個/来店 | 🧪 |
| `barrier` | バリア | ボス戦開始時に10秒間完全無敵（`600フレーム`） | 2,000 | 2個/来店 | 🛡️ |
| `lemon_special` | レモンスペシャル | ボス戦開始時にジャンプ強化20秒（`1200フレーム`） | 1,200 | 2個/来店 | 🍋 |
| `full_charge` | フルチャージ | ボス戦開始時に全パワーアップ15秒同時発動 | 3,000 | 1個/来店 | ⭐ |
| `deposit` | 預金する | スコアの50%を貯金に変換。スコアは50%になる | - | 1回/来店 | 💰 |

### 4.5 商品データ構造

```javascript
var STAGE_SHOP_ITEMS = [
    {
        id: 'heal',
        nameKey: 'shop_item_heal',           // i18n キー
        descKey: 'shop_item_heal_desc',
        icon: '\u{1F9EA}',                   // 🧪
        price: 1500,
        maxPerVisit: 2,
        effect: function() {
            gameState.lives = Math.min(gameState.lives + 2, 10);
        }
    },
    {
        id: 'barrier',
        nameKey: 'shop_item_barrier',
        descKey: 'shop_item_barrier_desc',
        icon: '\u{1F6E1}\u{FE0F}',          // 🛡️
        price: 2000,
        maxPerVisit: 2,
        stockItem: true,                     // ストックに入る
        stockEffect: function() {
            gameState.puShield = 600;         // 10秒
            gameState.isInvincible = true;
            gameState.invincibleTimer = 600;
        }
    },
    {
        id: 'lemon_special',
        nameKey: 'shop_item_lemon',
        descKey: 'shop_item_lemon_desc',
        icon: '\u{1F34B}',                   // 🍋
        price: 1200,
        maxPerVisit: 2,
        stockItem: true,
        stockEffect: function() {
            gameState.puLemon = 1200;         // 20秒
        }
    },
    {
        id: 'full_charge',
        nameKey: 'shop_item_fullcharge',
        descKey: 'shop_item_fullcharge_desc',
        icon: '\u{2B50}',                    // ⭐
        price: 3000,
        maxPerVisit: 1,
        stockItem: true,
        stockEffect: function() {
            gameState.puLemon = 900;          // 15秒
            gameState.puShield = 900;
            gameState.puEnergy = 900;
            gameState.puMagnet = 900;
        }
    }
];
```

### 4.6 購入処理

```javascript
function buyStageItem(itemId) {
    var item = STAGE_SHOP_ITEMS.find(function(i) { return i.id === itemId; });
    if (!item) return false;

    // 残金チェック
    if (gameState.score < item.price) {
        if (soundManager) soundManager.playDamage();  // 購入失敗SE
        return false;
    }

    // 購入回数チェック
    var bought = shopState.purchaseCounts[itemId] || 0;
    if (bought >= item.maxPerVisit) {
        if (soundManager) soundManager.playDamage();
        return false;
    }

    // スコア消費
    gameState.score -= item.price;

    // 購入回数加算
    shopState.purchaseCounts[itemId] = bought + 1;

    if (item.stockItem) {
        // ストックに追加
        if (!addToStock(itemId)) {
            // ストック枠がいっぱい → 返金
            gameState.score += item.price;
            shopState.purchaseCounts[itemId] = bought;
            return false;
        }
    } else {
        // 即時効果（回復薬など）
        item.effect();
    }

    if (soundManager) soundManager.playItem();  // 購入成功SE
    updateStageShopUI();  // UI更新
    return true;
}
```

### 4.7 預金処理

```javascript
function depositScore() {
    if (shopState.deposited) return false;
    if (gameState.score <= 0) return false;

    var depositAmount = Math.floor(gameState.score * 0.5);
    gameSettings.savings += depositAmount;
    gameState.score = gameState.score - depositAmount;  // 残り50%
    shopState.deposited = true;

    saveSettings();  // localStorage に保存
    if (soundManager) soundManager.playCoin();  // 預金SE
    updateStageShopUI();
    return true;
}
```

### 4.8 ショップを閉じる処理

```javascript
function closeStageShop() {
    shopState.active = false;
    gameState.gamePaused = false;

    // ショップUIを非表示
    hideStageShopScreen();

    // 通常BGM に戻す（shop BGM があれば）
    // if (soundManager) soundManager.playBGM('stage');
}
```

閉じた後、ゲームは通常通り進行し、100m先でボスが出現する。

---

## 5. タイトルショップ

### 5.1 アクセス方法

タイトル画面の `#titleButtons`（`index.html:580-586`）に新しいボタンを追加:

```html
<button class="game-button" id="shopButton">🛒 SHOP</button>
```

既存ボタンの並び順:
1. ⚙️ SETTING
2. 🏆 RANKING
3. **🛒 SHOP** ← 新規追加

### 5.2 アップグレードデータ構造

```javascript
var TITLE_SHOP_UPGRADES = [
    {
        id: 'coin_master',
        nameKey: 'tshop_coin_master',
        descKey: 'tshop_coin_master_desc',
        icon: '\u{1F4B0}',                   // 💰
        maxLevel: 3,
        prices: [5000, 15000, 30000],         // Lv1, Lv2, Lv3 の価格
        effectDesc: ['+10%', '+20%', '+30%']  // 各レベルの効果説明
    },
    {
        id: 'toughness',
        nameKey: 'tshop_toughness',
        descKey: 'tshop_toughness_desc',
        icon: '\u{1F496}',                   // 💖
        maxLevel: 3,
        prices: [8000, 20000, 40000],
        effectDesc: ['+1', '+2', '+3']
    },
    {
        id: 'stock_expand',
        nameKey: 'tshop_stock_expand',
        descKey: 'tshop_stock_expand_desc',
        icon: '\u{1F392}',                   // 🎒
        maxLevel: 2,
        prices: [10000, 25000],
        effectDesc: ['4枠', '5枠']
    },
    {
        id: 'magnet_boost',
        nameKey: 'tshop_magnet_boost',
        descKey: 'tshop_magnet_boost_desc',
        icon: '\u{1F9F2}',                   // 🧲
        maxLevel: 2,
        prices: [6000, 18000],
        effectDesc: ['+50%', '+100%']
    },
    {
        id: 'combo_master',
        nameKey: 'tshop_combo_master',
        descKey: 'tshop_combo_master_desc',
        icon: '\u{23F1}\u{FE0F}',            // ⏱️
        maxLevel: 1,
        prices: [12000],
        effectDesc: ['1.5秒']
    }
];
```

### 5.3 アップグレード効果の適用

各アップグレードの効果は **ゲーム開始時（`startGame()` 内）** に適用する。

```javascript
function applyUpgrades() {
    var ups = gameSettings.upgrades || {};

    // 💰 コインマスター: コイン獲得ボーナス倍率
    var coinLv = ups.coin_master || 0;
    gameState.coinBonus = 1.0 + coinLv * 0.1;  // 1.0, 1.1, 1.2, 1.3

    // 💖 タフネス: 初期ライフ追加
    var toughLv = ups.toughness || 0;
    gameState.lives = 5 + toughLv;  // 5, 6, 7, 8

    // 🎒 ストック拡張: ストック上限
    var stockLv = ups.stock_expand || 0;
    stockState.maxSlots = 3 + stockLv;  // 3, 4, 5

    // 🧲 マグネット強化: マグネット効果範囲
    var magnetLv = ups.magnet_boost || 0;
    gameState.magnetRange = 200 * (1 + magnetLv * 0.5);  // 200, 300, 400

    // ⏱️ コンボマスター: コンボ受付時間
    var comboLv = ups.combo_master || 0;
    gameState.comboTimeout = 60 + comboLv * 30;  // 60, 90 (フレーム)
}
```

**適用タイミング**: `startGame()` 関数（`index.html:1853`）の中で `gameState.gameStarted = true;` の直前に呼ぶ。

### 5.4 コイン獲得ボーナスの反映箇所

コイン取得時にボーナス倍率を適用する。既存のコイン取得処理（`updateCoins()` 内、コイン取得で `gameState.score += 100` している箇所）を修正:

```javascript
// 修正前
gameState.score += 100;

// 修正後
gameState.score += Math.floor(100 * (gameState.coinBonus || 1));
```

### 5.5 マグネット効果範囲の反映箇所

既存のマグネット処理で吸引範囲 `200` がハードコードされている箇所を `gameState.magnetRange || 200` に変更。

### 5.6 コンボタイムアウトの反映箇所

既存のコンボタイマー判定（`comboTimer` のリセット条件）で `60` がハードコードされている箇所を `gameState.comboTimeout || 60` に変更。

### 5.7 購入処理

```javascript
function buyTitleUpgrade(upgradeId) {
    var upgrade = TITLE_SHOP_UPGRADES.find(function(u) { return u.id === upgradeId; });
    if (!upgrade) return false;

    var currentLevel = (gameSettings.upgrades || {})[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;  // MAX

    var price = upgrade.prices[currentLevel];
    if (gameSettings.savings < price) {
        if (soundManager) soundManager.playDamage();
        return false;
    }

    // 貯金消費
    gameSettings.savings -= price;

    // レベルアップ
    if (!gameSettings.upgrades) gameSettings.upgrades = {};
    gameSettings.upgrades[upgradeId] = currentLevel + 1;

    saveSettings();
    if (soundManager) soundManager.playLevelUp();  // レベルアップSE
    updateTitleShopUI();
    return true;
}
```

---

## 6. ストック（持ち物）システム

### 6.1 ストック状態

```javascript
var stockState = {
    maxSlots: 3,         // 初期上限3（タイトルショップの「ストック拡張」で増加）
    items: []            // [{id: 'barrier', ...}, {id: 'lemon_special', ...}]
};
```

### 6.2 ストック操作

```javascript
function addToStock(itemId) {
    if (stockState.items.length >= stockState.maxSlots) return false;
    stockState.items.push({ id: itemId });
    return true;
}

function useStockItem(index) {
    if (index < 0 || index >= stockState.items.length) return false;
    var item = stockState.items[index];
    var shopItem = STAGE_SHOP_ITEMS.find(function(s) { return s.id === item.id; });
    if (!shopItem || !shopItem.stockEffect) return false;

    shopItem.stockEffect();  // 効果発動
    stockState.items.splice(index, 1);  // 消費

    if (soundManager) soundManager.playItem();
    updateStockUI();
    return true;
}
```

### 6.3 ストックの使用タイミング

ストックアイテムは **ボス戦中にいつでも使える**。

ボス戦中（`bossState.phase === 3`）に画面上にストックスロットを表示し、タップで発動する。

### 6.4 ストックUI（ボス戦中）

画面右上（ポーズボタンの下）にストックスロットを表示:

```
┌──┐ ┌──┐ ┌──┐
│🛡️│ │🍋│ │  │  ← 3枠（空きは灰色）
└──┘ └──┘ └──┘
```

- 各スロットは 44×44px のタップ可能な領域
- タップで即時発動
- 空スロットはタップ不可
- ボス戦以外では非表示

### 6.5 ストックのリセット

ストックは **ゲーム終了時（ゲームオーバー or リタイア）にリセット**。ラウンド間では保持。

```javascript
// resetGame() 内に追加
stockState = { maxSlots: 3, items: [] };
```

---

## 7. データ永続化

### 7.1 localStorage の拡張

既存の `piyo_settings` キーを拡張する。

**現在の構造** (`index.html:1007`):
```javascript
{ soundEnabled: true, language: 'ja', adFree: false }
```

**拡張後の構造**:
```javascript
{
    soundEnabled: true,
    language: 'ja',
    adFree: false,
    savings: 0,              // 貯金（永続通貨）
    upgrades: {              // タイトルショップの購入状況
        coin_master: 0,      // 0-3
        toughness: 0,        // 0-3
        stock_expand: 0,     // 0-2
        magnet_boost: 0,     // 0-2
        combo_master: 0      // 0-1
    }
}
```

### 7.2 loadSettings の修正

`index.html:1008-1017` の `loadSettings` IIFE を修正:

```javascript
(function loadSettings() {
    try {
        var saved = localStorage.getItem('piyo_settings');
        if (saved) {
            var parsed = JSON.parse(saved);
            if (typeof parsed.soundEnabled === 'boolean') gameSettings.soundEnabled = parsed.soundEnabled;
            if (parsed.language === 'ja' || parsed.language === 'en') gameSettings.language = parsed.language;
            if (typeof parsed.adFree === 'boolean') gameSettings.adFree = parsed.adFree;
            // ── ショップ関連 追加 ──
            if (typeof parsed.savings === 'number') gameSettings.savings = parsed.savings;
            if (parsed.upgrades && typeof parsed.upgrades === 'object') {
                gameSettings.upgrades = parsed.upgrades;
            }
        }
    } catch (_) {}
})();
```

### 7.3 saveSettings

既存の `saveSettings()`（`index.html:1019-1021`）は `JSON.stringify(gameSettings)` しているので、
`gameSettings` に `savings` と `upgrades` を追加するだけで自動的に保存される。**修正不要。**

---

## 8. UI/HTML 実装詳細

### 8.1 追加する HTML 要素

以下の要素を `index.html` の適切な位置に追加する。

#### 8.1.1 ステージショップ画面

`#gameOverScreen`（`index.html:742`）の**直前**に挿入:

```html
<!-- ステージショップ画面 -->
<div id="stageShopScreen" class="hidden" style="
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    display: none; flex-direction: column;
    justify-content: center; align-items: center;
    z-index: 30;">
    <div style="
        background: linear-gradient(160deg, rgba(30,20,50,0.95), rgba(15,10,30,0.95));
        border: 2px solid rgba(255,215,0,0.4);
        border-radius: 18px; padding: 16px 20px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(255,215,0,0.1);
        text-align: center; max-width: 95vw; width: 85vw;
        position: relative; overflow: hidden;">
        <!-- ゴールドのトップライン -->
        <div style="position: absolute; top: -1px; left: 15%; right: 15%; height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent);"></div>

        <!-- タイトル行 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span id="stageShopTitle" style="color: #ffd700; font-size: 3.5vw; font-weight: 800;
                font-family: 'M PLUS Rounded 1c', sans-serif;
                text-shadow: 0 0 12px rgba(255,215,0,0.4);" data-i18n="shop_stage_title">🏪 ショップ</span>
            <span id="stageShopScore" style="color: #fff; font-size: 2.5vw;
                font-family: 'M PLUS Rounded 1c', sans-serif;
                background: rgba(255,255,255,0.08); padding: 4px 12px; border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.1);">💴 0円</span>
        </div>

        <!-- 商品リスト -->
        <div id="stageShopItems" style="
            display: flex; flex-direction: column; gap: 6px;
            max-height: 50vh; overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: 4px 0;"></div>

        <!-- 預金ボタン -->
        <div id="stageShopDeposit" style="
            margin-top: 8px; padding: 8px;
            background: rgba(255,215,0,0.08); border-radius: 10px;
            border: 1px solid rgba(255,215,0,0.2);">
            <button id="depositBtn" class="game-button" style="
                min-width: 60%; padding: 8px 16px; font-size: 2.5vw;
                background: linear-gradient(180deg, #ffd700, #daa520);
                color: #333; font-weight: 800;">💰 預金する（スコアの50%）</button>
            <div id="depositInfo" style="color: rgba(255,255,255,0.6); font-size: 1.8vw; margin-top: 4px;
                font-family: 'M PLUS Rounded 1c', sans-serif;"></div>
        </div>

        <!-- 閉じるボタン -->
        <button id="stageShopCloseBtn" class="game-button" style="
            margin-top: 10px; min-width: 40%; padding: 8px 16px; font-size: 2.8vw;
            background: linear-gradient(180deg, #888, #555);
            border-bottom-color: rgba(0,0,0,0.4);" data-i18n="shop_close">▶️ ボスへ向かう</button>
    </div>
</div>
```

#### 8.1.2 タイトルショップ画面

`#settingsScreen`（`index.html:671`）の**直前**に挿入:

```html
<!-- タイトルショップ画面 -->
<div id="titleShopScreen" class="hidden" style="
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    box-sizing: border-box;
    background: rgba(0,0,0,0.9);
    display: none; flex-direction: column;
    justify-content: flex-start; align-items: center;
    z-index: 9999; padding: 2vh 10px;
    overflow: hidden;">
    <div style="display: flex; justify-content: space-between; align-items: center; width: 90vw; max-width: 500px; flex-shrink: 0;">
        <span data-i18n="tshop_title" style="color: #ffd700; font-size: 4vw; font-weight: 800;
            font-family: 'M PLUS Rounded 1c', sans-serif;
            text-shadow: 0 0 12px rgba(255,215,0,0.4), 0 2px 6px rgba(0,0,0,0.8);
            letter-spacing: 0.08em;">🛒 ショップ</span>
        <span id="titleShopSavings" style="color: #ffd700; font-size: 2.8vw; font-weight: 700;
            font-family: 'M PLUS Rounded 1c', sans-serif;
            background: rgba(255,215,0,0.1); padding: 4px 12px; border-radius: 8px;
            border: 1px solid rgba(255,215,0,0.3);">🏦 0</span>
    </div>
    <div id="titleShopList" style="
        background: linear-gradient(180deg, rgba(15,5,30,0.9), rgba(5,0,15,0.95));
        border: 2px solid rgba(255,105,180,0.4);
        border-radius: 14px; padding: 10px;
        width: 90vw; max-width: 500px; flex: 1; min-height: 0;
        overflow-y: auto; overflow-x: hidden;
        color: #fff; font-size: 2.2vw;
        font-family: 'M PLUS Rounded 1c', sans-serif;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y; overscroll-behavior: contain;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
        margin-top: 1vh;"></div>
    <button class="game-button" data-i18n="btn_back" onclick="hideTitleShop()" style="
        margin-top: 1vh; flex-shrink: 0; z-index: 31; font-size: 3vw; padding: 8px 20px;">🔙 戻る</button>
</div>
```

#### 8.1.3 ストックスロット（ボス戦用）

`#pauseButton`（`index.html:840`）の**直後**に挿入:

```html
<!-- ストックスロット（ボス戦中に表示） -->
<div id="stockSlots" style="
    position: absolute; top: 50px; right: calc(10px + env(safe-area-inset-right, 0px));
    display: none; flex-direction: column; gap: 4px;
    z-index: 100;">
</div>
```

#### 8.1.4 タイトル画面にショップボタン追加

既存の `#titleButtons`（`index.html:580-586`）に1行追加:

```html
<button class="game-button" id="shopButton">🛒 SHOP</button>
```

### 8.2 各商品行の HTML テンプレート（JavaScript で動的生成）

#### ステージショップの商品行:

```javascript
function renderStageShopItem(item, purchaseCount) {
    var canBuy = gameState.score >= item.price && purchaseCount < item.maxPerVisit;
    var soldOut = purchaseCount >= item.maxPerVisit;
    var opacity = canBuy ? '1' : '0.5';

    return '<div style="display:flex; align-items:center; justify-content:space-between;' +
        'padding:8px 10px; background:rgba(255,255,255,0.05); border-radius:10px;' +
        'border:1px solid rgba(255,255,255,' + (canBuy ? '0.15' : '0.05') + ');' +
        'opacity:' + opacity + ';">' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
            '<span style="font-size:3.5vw;">' + item.icon + '</span>' +
            '<div>' +
                '<div style="color:#fff; font-size:2.2vw; font-weight:700;">' + escapeHtml(t(item.nameKey)) + '</div>' +
                '<div style="color:rgba(255,255,255,0.6); font-size:1.6vw;">' + escapeHtml(t(item.descKey)) + '</div>' +
            '</div>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="color:#ffd700; font-size:2vw; font-weight:700;">' +
                (soldOut ? escapeHtml(t('shop_sold_out')) : item.price + escapeHtml(t('ranking_unit_score'))) +
            '</span>' +
            '<button class="game-button" onclick="buyStageItem(\'' + item.id + '\')" ' +
                (canBuy ? '' : 'disabled') +
                ' style="min-width:auto; padding:6px 12px; font-size:2vw; min-height:36px;' +
                (canBuy ? '' : 'opacity:0.5; pointer-events:none;') + '">' +
                escapeHtml(t('shop_buy')) +
            '</button>' +
        '</div>' +
    '</div>';
}
```

#### タイトルショップのアップグレード行:

```javascript
function renderTitleShopItem(upgrade) {
    var currentLevel = (gameSettings.upgrades || {})[upgrade.id] || 0;
    var isMax = currentLevel >= upgrade.maxLevel;
    var price = isMax ? 0 : upgrade.prices[currentLevel];
    var canBuy = !isMax && gameSettings.savings >= price;

    // レベルインジケーター: ●●○ のような表示
    var levelDots = '';
    for (var i = 0; i < upgrade.maxLevel; i++) {
        levelDots += i < currentLevel ? '●' : '○';
    }

    return '<div style="display:flex; align-items:center; justify-content:space-between;' +
        'padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">' +
        '<div style="display:flex; align-items:center; gap:8px; flex:1;">' +
            '<span style="font-size:3.5vw;">' + upgrade.icon + '</span>' +
            '<div>' +
                '<div style="color:#fff; font-size:2.4vw; font-weight:700;">' +
                    escapeHtml(t(upgrade.nameKey)) +
                    ' <span style="color:#ffd700; font-size:1.8vw;">' + levelDots + '</span>' +
                '</div>' +
                '<div style="color:rgba(255,255,255,0.6); font-size:1.6vw;">' +
                    escapeHtml(t(upgrade.descKey)) +
                    (isMax ? '' : ' → ' + upgrade.effectDesc[currentLevel]) +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:6px;">' +
            (isMax
                ? '<span style="color:#4CAF50; font-size:2.2vw; font-weight:800;">MAX</span>'
                : '<span style="color:#ffd700; font-size:2vw; font-weight:700;">' + price + '</span>' +
                  '<button class="game-button" onclick="buyTitleUpgrade(\'' + upgrade.id + '\')" ' +
                    (canBuy ? '' : 'disabled style="opacity:0.5; pointer-events:none;"') +
                    ' style="min-width:auto; padding:6px 12px; font-size:2vw; min-height:36px;">' +
                    escapeHtml(t('shop_buy')) +
                  '</button>'
            ) +
        '</div>' +
    '</div>';
}
```

---

## 9. CSS スタイリング

### 9.1 追加 CSS（`<style>` 内に追記）

既存のCSS（`index.html:24-503`）の末尾、`</style>` の直前に追加:

```css
/* ── ショップ共通 ── */
#stageShopScreen .game-button:disabled,
#titleShopScreen .game-button:disabled {
    opacity: 0.5;
    pointer-events: none;
    filter: grayscale(0.5);
}

/* ストックスロット */
.stock-slot {
    width: 44px; height: 44px;
    border-radius: 10px;
    border: 2px solid rgba(255,215,0,0.4);
    background: linear-gradient(135deg, rgba(30,15,50,0.85), rgba(15,5,30,0.85));
    display: flex; align-items: center; justify-content: center;
    font-size: 24px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s ease;
}

.stock-slot:active {
    transform: scale(0.9);
}

.stock-slot-empty {
    border-color: rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.05);
    pointer-events: none;
}
```

---

## 10. JavaScript ロジック

### 10.1 新規変数の宣言位置

`index.html` の `var bossState = {...};`（行1630-1636）の直後に追加:

```javascript
// ─── ショップシステム ───
var SHOP_TRIGGER_OFFSET = 100;

var shopState = {
    active: false,
    visited: false,
    deposited: false,
    purchaseCounts: {}    // { itemId: count }
};

var stockState = {
    maxSlots: 3,
    items: []
};

var STAGE_SHOP_ITEMS = [ /* 4.5 節の定義をここに */ ];
var TITLE_SHOP_UPGRADES = [ /* 5.2 節の定義をここに */ ];
```

### 10.2 ゲームループへの統合

既存のゲームループ（`index.html:5010-5041`）内、`updateGameSpeed()` の直後、`checkBossTrigger()` の直前に追加:

```javascript
// 既存: updateGameSpeed();
checkShopTrigger();      // ← 追加
// 既存: checkBossTrigger();
```

### 10.3 ステージショップ表示/非表示関数

```javascript
function showStageShopScreen() {
    shopState.purchaseCounts = {};
    var el = document.getElementById('stageShopScreen');
    el.classList.remove('hidden');
    el.style.display = 'flex';
    history.pushState({ screen: 'stageShop' }, '');
    updateStageShopUI();
}

function hideStageShopScreen() {
    var el = document.getElementById('stageShopScreen');
    el.classList.add('hidden');
    el.style.display = 'none';
}

function updateStageShopUI() {
    // スコア表示
    document.getElementById('stageShopScore').textContent =
        '\u{1F4B4} ' + gameState.score + t('ranking_unit_score');

    // 商品リスト再描画
    var container = document.getElementById('stageShopItems');
    var html = '';
    for (var i = 0; i < STAGE_SHOP_ITEMS.length; i++) {
        var item = STAGE_SHOP_ITEMS[i];
        var count = shopState.purchaseCounts[item.id] || 0;
        html += renderStageShopItem(item, count);
    }
    container.innerHTML = html;

    // 預金ボタン
    var depositBtn = document.getElementById('depositBtn');
    var depositInfo = document.getElementById('depositInfo');
    if (shopState.deposited) {
        depositBtn.disabled = true;
        depositBtn.style.opacity = '0.5';
        depositBtn.style.pointerEvents = 'none';
        depositInfo.textContent = t('shop_deposited');
    } else {
        var amount = Math.floor(gameState.score * 0.5);
        depositBtn.disabled = amount <= 0;
        depositBtn.style.opacity = amount > 0 ? '1' : '0.5';
        depositBtn.style.pointerEvents = amount > 0 ? 'auto' : 'none';
        depositInfo.textContent = t('shop_deposit_amount').replace('{amount}', amount) +
            ' | ' + t('shop_current_savings').replace('{savings}', gameSettings.savings);
    }
}
```

### 10.4 タイトルショップ表示/非表示関数

```javascript
function showTitleShop() {
    var el = document.getElementById('titleShopScreen');
    el.classList.remove('hidden');
    el.style.display = 'flex';
    history.pushState({ screen: 'titleShop' }, '');
    updateTitleShopUI();
}

function hideTitleShop() {
    var el = document.getElementById('titleShopScreen');
    el.classList.add('hidden');
    el.style.display = 'none';
}

function updateTitleShopUI() {
    // 貯金表示
    document.getElementById('titleShopSavings').textContent =
        '\u{1F3E6} ' + gameSettings.savings;

    // アップグレードリスト再描画
    var container = document.getElementById('titleShopList');
    var html = '';
    for (var i = 0; i < TITLE_SHOP_UPGRADES.length; i++) {
        html += renderTitleShopItem(TITLE_SHOP_UPGRADES[i]);
    }
    container.innerHTML = html;
}
```

### 10.5 ストックUI関数

```javascript
function updateStockUI() {
    var container = document.getElementById('stockSlots');
    if (!bossState.active || bossState.phase < 3) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    var html = '';
    for (var i = 0; i < stockState.maxSlots; i++) {
        if (i < stockState.items.length) {
            var item = stockState.items[i];
            var shopItem = STAGE_SHOP_ITEMS.find(function(s) { return s.id === item.id; });
            html += '<div class="stock-slot" onclick="useStockItem(' + i + ')">' +
                (shopItem ? shopItem.icon : '?') + '</div>';
        } else {
            html += '<div class="stock-slot stock-slot-empty"></div>';
        }
    }
    container.innerHTML = html;
}
```

### 10.6 popstate ハンドラの修正

既存の `popstate` ハンドラ（`index.html:5481` 付近）に、ショップ画面の閉じ処理を追加:

```javascript
// 既存の popstate ハンドラ内に追加
// ステージショップが開いている場合
if (shopState.active) {
    closeStageShop();
    return;
}
// タイトルショップが開いている場合
var titleShop = document.getElementById('titleShopScreen');
if (titleShop && titleShop.style.display !== 'none') {
    hideTitleShop();
    return;
}
```

### 10.7 resetGame の修正

`resetGame()`（`index.html:1888`）内に追加:

```javascript
// ── ショップリセット ──
shopState = { active: false, visited: false, deposited: false, purchaseCounts: {} };
stockState.items = [];
// maxSlots は applyUpgrades() で再設定される
```

### 10.8 イベントリスナーの追加

既存のイベントリスナー設定箇所（ファイル末尾付近、他のボタンの `addEventListener` と同じ場所）に追加:

```javascript
// ショップボタン（タイトル画面）
document.getElementById('shopButton').addEventListener('click', function(e) {
    e.stopPropagation();
    showTitleShop();
});
document.getElementById('shopButton').addEventListener('touchend', function(e) {
    e.stopPropagation();
    e.preventDefault();
    showTitleShop();
});

// ステージショップ閉じるボタン
document.getElementById('stageShopCloseBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    closeStageShop();
});
document.getElementById('stageShopCloseBtn').addEventListener('touchend', function(e) {
    e.stopPropagation();
    e.preventDefault();
    closeStageShop();
});

// 預金ボタン
document.getElementById('depositBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    depositScore();
});
document.getElementById('depositBtn').addEventListener('touchend', function(e) {
    e.stopPropagation();
    e.preventDefault();
    depositScore();
});
```

---

## 11. ゲームフロー変更点

### 11.1 変更前のフロー

```
タイトル → ゲーム開始 → 2400m到達 → ボス警告 → ボス戦 → 撃破 → ラウンド移行 → 繰り返し
```

### 11.2 変更後のフロー

```
タイトル [🛒ショップ] → ゲーム開始(applyUpgrades適用)
  → 2300m到達 → ★ステージショップ★ → 閉じる
  → 2400m到達 → ボス警告 → ボス戦 [ストック使用可能]
  → 撃破 → ラウンド移行
  → 4700m到達 → ★ステージショップ★ → 閉じる
  → 4800m到達 → ボス警告 → ボス戦 [ストック使用可能]
  → ...繰り返し
```

### 11.3 変更が必要な既存関数一覧

| 関数名 | 行番号 | 変更内容 |
|--------|--------|----------|
| `resetGame()` | 1888 | `shopState`, `stockState.items` のリセット追加 |
| `startGame()` | 1853 | `applyUpgrades()` 呼び出し追加 |
| `gameLoop()` 内の update 部分 | 5023付近 | `checkShopTrigger()` 呼び出し追加 |
| ボス撃破後ラウンド移行 (phase 5) | 3167 | `shopState.visited = false` リセット |
| コイン取得処理 | （updateCoins内） | `coinBonus` 倍率の適用 |
| マグネット吸引処理 | （updateCoins内） | `magnetRange` の適用 |
| コンボタイマー判定 | （updateEnemies内） | `comboTimeout` の適用 |
| `popstate` ハンドラ | 5481付近 | ショップ画面の閉じ処理追加 |
| `loadSettings()` | 1008 | `savings`, `upgrades` の読み込み追加 |
| ボス戦開始時 (`setupBossArena`) | 3028 | `updateStockUI()` 呼び出し |

### 11.4 ステージショップの出現タイミング詳細

```
ラウンド1: ボス出現 2400m → ショップ出現 2300m
ラウンド2: ボス出現 4800m → ショップ出現 4700m
ラウンド3: ボス出現 7200m → ショップ出現 7100m
...
一般式: ショップ出現 = BOSS_TRIGGER_DISTANCE × gameRound - SHOP_TRIGGER_OFFSET
```

### 11.5 ボス戦中のストックUI表示制御

ボス戦の各フェーズでストックUIの表示/非表示を制御:

- **Phase 1（WARNING）**: 非表示
- **Phase 2（入場）**: 非表示
- **Phase 3（戦闘）**: **表示** → `updateStockUI()` を呼ぶ
- **Phase 4（撃破演出）**: 表示を維持（使用は不可にする）
- **Phase 5（ラウンド移行）**: 非表示

`updateBoss()` の `case 3:` の先頭で `updateStockUI()` を毎フレーム呼ぶのはコストが高いため、
ボス戦フェーズ3に移行した瞬間に1回だけ `updateStockUI()` を呼び、
`useStockItem()` の後にも呼ぶ。

---

## 12. 音響・演出

### 12.1 ショップBGM

**shop.mp3** を新規追加するのが理想的だが、初期実装では **stage.mp3 を鳴らし続ける**（BGM切り替えなし）。

将来的に追加する場合:

```javascript
// SoundManager に追加
this.shopBGM = this._createBGM('shop.mp3', 0.5);
```

### 12.2 ショップSE

既存のSEを流用:

| アクション | SE | 既存関数 |
|-----------|-----|---------|
| 商品購入成功 | アイテム取得音 | `soundManager.playItem()` |
| 購入失敗（残金不足） | ダメージ音 | `soundManager.playDamage()` |
| 預金成功 | コイン音 | `soundManager.playCoin()` |
| アップグレード購入 | レベルアップ音 | `soundManager.playLevelUp()` |
| ストック使用 | アイテム取得音 | `soundManager.playItem()` |
| ショップを閉じる | （なし） | - |

### 12.3 ショップ出現演出

ステージショップが出現する際の演出:

1. ゲーム速度を徐々に0にする（30フレームかけて減速）
2. 画面が少し暗くなる（半透明の黒オーバーレイ）
3. ショップUIがフェードイン

```javascript
function openStageShop() {
    shopState.active = true;
    shopState.visited = true;

    // 速度を一時保存して0に
    shopState.savedGameSpeed = gameState.gameSpeed;
    gameState.gameSpeed = 0;
    gameState.gamePaused = true;

    showStageShopScreen();
}

function closeStageShop() {
    shopState.active = false;
    gameState.gamePaused = false;

    // 速度を復帰
    gameState.gameSpeed = shopState.savedGameSpeed || gameState.gameSpeed;

    hideStageShopScreen();
}
```

---

## 13. 多言語対応

### 13.1 日本語テキスト追加

既存の `LANG.ja`（`index.html:1025`）に追加:

```javascript
// ── ステージショップ ──
shop_stage_title: '🏪 ショップ',
shop_buy: '購入',
shop_sold_out: '売切',
shop_close: '▶️ ボスへ向かう',
shop_deposit_btn: '💰 預金する（スコアの50%）',
shop_deposit_amount: '預入額: {amount}円',
shop_current_savings: '現在の貯金: {savings}',
shop_deposited: '✅ 預金済み',
shop_stock_full: 'ストックがいっぱいです',
shop_not_enough: '残金が足りません',

// ステージショップ商品
shop_item_heal: '回復薬',
shop_item_heal_desc: 'ライフ+2（上限10）',
shop_item_barrier: 'バリア',
shop_item_barrier_desc: '10秒間完全無敵',
shop_item_lemon: 'レモンスペシャル',
shop_item_lemon_desc: 'ジャンプ強化20秒',
shop_item_fullcharge: 'フルチャージ',
shop_item_fullcharge_desc: '全パワーアップ15秒同時発動',

// ── タイトルショップ ──
tshop_title: '🛒 ショップ',
tshop_coin_master: 'コインマスター',
tshop_coin_master_desc: 'コイン獲得量UP',
tshop_toughness: 'タフネス',
tshop_toughness_desc: '初期ライフ増加',
tshop_stock_expand: 'ストック拡張',
tshop_stock_expand_desc: 'ストック枠を増やす',
tshop_magnet_boost: 'マグネット強化',
tshop_magnet_boost_desc: 'マグネットの吸引範囲UP',
tshop_combo_master: 'コンボマスター',
tshop_combo_master_desc: 'コンボ受付時間を延長',
```

### 13.2 英語テキスト追加

既存の `LANG.en` に追加:

```javascript
// ── Stage Shop ──
shop_stage_title: '🏪 Shop',
shop_buy: 'Buy',
shop_sold_out: 'Sold',
shop_close: '▶️ Face the Boss',
shop_deposit_btn: '💰 Deposit (50% of score)',
shop_deposit_amount: 'Deposit: {amount}',
shop_current_savings: 'Savings: {savings}',
shop_deposited: '✅ Deposited',
shop_stock_full: 'Stock is full',
shop_not_enough: 'Not enough funds',

// Stage Shop Items
shop_item_heal: 'Healing Potion',
shop_item_heal_desc: 'Life +2 (max 10)',
shop_item_barrier: 'Barrier',
shop_item_barrier_desc: '10s full invincibility',
shop_item_lemon: 'Lemon Special',
shop_item_lemon_desc: 'Jump boost for 20s',
shop_item_fullcharge: 'Full Charge',
shop_item_fullcharge_desc: 'All power-ups for 15s',

// ── Title Shop ──
tshop_title: '🛒 Shop',
tshop_coin_master: 'Coin Master',
tshop_coin_master_desc: 'Coin gain boost',
tshop_toughness: 'Toughness',
tshop_toughness_desc: 'Starting life increase',
tshop_stock_expand: 'Stock Expand',
tshop_stock_expand_desc: 'More stock slots',
tshop_magnet_boost: 'Magnet Boost',
tshop_magnet_boost_desc: 'Magnet range increase',
tshop_combo_master: 'Combo Master',
tshop_combo_master_desc: 'Longer combo window',
```

---

## 14. 将来の課金システム拡張

### 14.1 課金導線の設計

現在の設計は将来の課金に自然に繋がる構造になっている。

```
タイトルショップ
├── 📦 通常タブ（現在実装するもの。貯金で購入）
└── 💎 プレミアムタブ（将来追加。リアルマネーで購入）
```

### 14.2 課金で販売可能な商品カテゴリ

| カテゴリ | 例 | ランキング影響 |
|----------|-----|-------------|
| **コンビニエンス** | 貯金ブースト（預金利率50%→70%）、貯金の直接購入 | 間接的 |
| **コスメティック** | ぴよ氏のスキン変更、BGM変更、エフェクト変更 | なし |
| **機能解放** | 広告非表示（既存の `adFreeRow` を活用） | なし |
| **ゲームプレイ** | 速度上昇緩和（速度上昇率を段階的に軽減） | 間接的 |

### 14.3 速度緩和アイテムの設計方針

ユーザーが要望している「スクロール上限速度250%」のようなアイテムは、
ランキングの公平性を保つため **「速度上昇率の緩和」** として段階的に実装する。

```javascript
// タイトルショップ（貯金で購入可能な範囲）
{ id: 'speed_ease', maxLevel: 3, prices: [20000, 50000, 100000] }
// Lv1: 速度上昇率 -10%（SPEED_UP_RATE: 0.20 → 0.18）
// Lv2: 速度上昇率 -20%（SPEED_UP_RATE: 0.20 → 0.16）
// Lv3: 速度上昇率 -30%（SPEED_UP_RATE: 0.20 → 0.14）

// 課金ショップ（💎で購入。将来実装）
{ id: 'speed_ease_max', price: 500 }  // 💎500
// MAX: 速度上昇率 -50%（SPEED_UP_RATE: 0.20 → 0.10）
```

### 14.4 アカウント連携（将来）

スマホアカウント（Google Play / Apple ID）との連携は、
Capacitor プラグイン（`@capgo/capacitor-purchases` 等）で実装予定。

購入データはストアアカウントに紐づくため:
- 機種変更しても復元可能
- 同一アカウントなら別端末でも有効
- `Non-Consumable` 型のアプリ内課金として扱う

現在の `window.showAd`（`index.html:1001`）のスタブ構造と同様に、
課金APIもスタブとして先に用意し、Capacitor導入時に差し替える設計。

### 14.5 既存の広告非表示枠の活用

`index.html:727-737` にある `#adFreeRow`（`display: none`）は、
タイトルショップの「プレミアムタブ」内の商品として統合する。

設定画面の広告非表示行は「ショップで購入→」というリンクに変更可能。

---

## 15. 実装チェックリスト

### Phase 1: データ基盤（最初に実装）

- [ ] `gameSettings` に `savings: 0` と `upgrades: {}` を追加
- [ ] `loadSettings()` に `savings` と `upgrades` の読み込みを追加
- [ ] `gameState` に `coinBonus`, `magnetRange`, `comboTimeout` を追加
- [ ] `shopState` 変数を宣言
- [ ] `stockState` 変数を宣言
- [ ] `STAGE_SHOP_ITEMS` 配列を定義
- [ ] `TITLE_SHOP_UPGRADES` 配列を定義

### Phase 2: タイトルショップ（タイトル画面側から実装）

- [ ] タイトル画面に `#shopButton` を追加
- [ ] `#titleShopScreen` の HTML を追加
- [ ] `showTitleShop()` / `hideTitleShop()` / `updateTitleShopUI()` を実装
- [ ] `renderTitleShopItem()` を実装
- [ ] `buyTitleUpgrade()` を実装
- [ ] `applyUpgrades()` を実装し `startGame()` 内で呼ぶ
- [ ] コイン獲得に `coinBonus` を反映
- [ ] マグネット範囲に `magnetRange` を反映
- [ ] コンボタイムアウトに `comboTimeout` を反映
- [ ] ライフ初期値に `toughness` を反映
- [ ] イベントリスナーを追加
- [ ] `popstate` ハンドラにタイトルショップの閉じ処理を追加

### Phase 3: ステージショップ

- [ ] `#stageShopScreen` の HTML を追加
- [ ] `checkShopTrigger()` を実装
- [ ] ゲームループに `checkShopTrigger()` 呼び出しを追加
- [ ] `openStageShop()` / `closeStageShop()` を実装
- [ ] `showStageShopScreen()` / `hideStageShopScreen()` / `updateStageShopUI()` を実装
- [ ] `renderStageShopItem()` を実装
- [ ] `buyStageItem()` を実装
- [ ] `depositScore()` を実装
- [ ] イベントリスナーを追加
- [ ] `popstate` ハンドラにステージショップの閉じ処理を追加
- [ ] `resetGame()` に `shopState` リセットを追加
- [ ] ラウンド移行（phase 5）で `shopState.visited = false` を追加

### Phase 4: ストックシステム

- [ ] `#stockSlots` の HTML を追加
- [ ] ストック用 CSS を追加
- [ ] `addToStock()` を実装
- [ ] `useStockItem()` を実装
- [ ] `updateStockUI()` を実装
- [ ] ボス戦 phase 3 開始時に `updateStockUI()` を呼ぶ
- [ ] ボス戦終了時にストックUIを非表示に
- [ ] `resetGame()` に `stockState.items = []` を追加
- [ ] ストック枠上限を `stock_expand` アップグレードで変動

### Phase 5: 多言語・SE

- [ ] `LANG.ja` にショップ関連テキストを追加
- [ ] `LANG.en` にショップ関連テキストを追加
- [ ] SE の動作確認（購入成功、失敗、預金、レベルアップ）

### Phase 6: テスト・調整

- [ ] ステージショップが正しいタイミング（ボス100m前）で開くことを確認
- [ ] 購入でスコアが正しく減少することを確認
- [ ] 預金で貯金が正しく増加し、スコアが50%になることを確認
- [ ] タイトルショップの購入が永続化されることを確認（リロード後）
- [ ] ストックアイテムがボス戦中に正しく発動することを確認
- [ ] 全アップグレードの効果が正しく適用されることを確認
- [ ] ゲームオーバー後のリトライ/タイトルでショップ状態が正しくリセットされることを確認
- [ ] ランキング登録されるスコアがショップ消費後の値であることを確認
- [ ] 各画面の戻るボタン/ブラウザバック（popstate）で正しく画面が閉じることを確認
- [ ] デバッグモード（10連タップ）でショップが正常に動作することを確認
- [ ] 商品価格のバランステスト（実プレイでの検証）

---

## 付録A: ファイル変更箇所マップ

```
index.html (5510行)
│
├── 行24-503: <style> ─── ショップ用CSS追加（末尾）
│
├── 行555-612: #startScreen ─── #shopButton を #titleButtons 内に追加
│
├── 行633前: ─── #titleShopScreen HTML 挿入
│
├── 行671前: （タイトルショップHTMLの場所、上記と同じ付近）
│
├── 行742前: ─── #stageShopScreen HTML 挿入
│
├── 行840後: ─── #stockSlots HTML 挿入
│
├── 行1007: gameSettings ─── savings, upgrades プロパティ追加
│
├── 行1008-1017: loadSettings ─── savings, upgrades 読み込み追加
│
├── 行1025-1110: LANG.ja ─── ショップテキスト追加
│
├── 行1110-1200付近: LANG.en ─── ショップテキスト追加
│
├── 行1599-1616: gameState ─── coinBonus, magnetRange, comboTimeout 追加
│
├── 行1636後: ─── shopState, stockState, STAGE_SHOP_ITEMS, TITLE_SHOP_UPGRADES 宣言
│
├── 行1853: startGame() ─── applyUpgrades() 呼び出し追加
│
├── 行1888: resetGame() ─── shopState, stockState リセット追加
│
├── 行3017前: ─── checkShopTrigger() 関数定義
│
├── 行3167-3187: ボスphase 5 ─── shopState.visited リセット追加
│
├── 行5023付近: ゲームループ ─── checkShopTrigger() 呼び出し追加
│
├── 行5481付近: popstate ─── ショップ画面閉じ処理追加
│
└── ファイル末尾付近: ─── 全ショップ関数定義 + イベントリスナー追加
```

---

## 付録B: 新規アセット一覧

| ファイル | 種類 | 用途 | 優先度 |
|----------|------|------|--------|
| `shop.mp3` | BGM | ステージショップBGM | 低（初期はstage.mp3を流用） |
| `images/shop_bg.png` | 背景 | ショップ背景画像 | 低（CSSグラデーションで代用可） |

**注意**: 初期実装では新規アセットは不要。全てCSS + 既存SE で対応可能。

---

## 付録C: 価格バランスの根拠

### ステージショップ

1プレイで稼げるスコアの目安:
- 初心者（500m到達）: 約3,000〜5,000円
- 中級者（2000m到達）: 約15,000〜25,000円
- 上級者（5000m到達）: 約50,000〜80,000円

ステージショップはボス出現時（2400m地点）で利用するため、
その時点で約15,000〜20,000円程度のスコアを想定。

- 回復薬（1,500円）: スコアの約10%。気軽に買える
- バリア（2,000円）: スコアの約13%。少し悩む
- レモンスペシャル（1,200円）: スコアの約8%。お買い得感
- フルチャージ（3,000円）: スコアの約20%。ここぞという時の投資

### タイトルショップ

預金で得られる貯金の目安（1プレイあたり）:
- 預金すると現在スコアの50%が貯金に → 約7,500〜10,000貯金/回

恒久アップグレードの価格帯:
- Lv1（5,000〜10,000）: 1回の預金で到達可能
- Lv2（15,000〜25,000）: 2〜3回の預金で到達
- Lv3（30,000〜40,000）: 4〜5回の預金で到達
- MAX全解放: 約30〜40回の預金（15〜20プレイ相当）

この設計により、**10〜20回のプレイで大部分の強化が揃う**バランスを目指す。
