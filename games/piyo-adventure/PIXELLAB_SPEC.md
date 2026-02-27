# PixelLab 画像生成 仕様・指示書

このファイルは、ローカルのClaude Codeセッションで PixelLab API を使って
「ぴよアドベンチャー」用の画像アセットを生成するための仕様書です。

---

## PixelLab API の基本情報

- **API ドキュメント**: https://www.pixellab.ai/docs
- **Base URL**: `https://api.pixellab.ai/v1`
- **認証**: `Authorization: Bearer <API_KEY>` ヘッダー
- **形式**: JSON リクエスト → PNG 画像レスポンス

### API キーの取得

ユーザーが API キーを提供します。環境変数 `PIXELLAB_API_KEY` にセットするか、
直接プロンプトで渡されます。

---

## 生成すべき画像一覧

### カテゴリ A: タイトルショップ背景（5枚）

既存の `title_shop.jpg` をベースに、表情・ポーズ差分を5パターン生成する。

| ファイル名 | 用途 | シーン説明 |
|---|---|---|
| `title_shop01.jpg` | 入店（デフォルト） | 魔女店主がカウンター越しに微笑んで迎えている。ぴよ（黒髪猫耳・黄色ドレスの少女）がカウンター前に立っている。穏やかな雰囲気 |
| `title_shop02.jpg` | 購入成功① | 魔女店主が嬉しそうに商品を差し出している。ぴよが喜んでいる表情。明るい雰囲気 |
| `title_shop03.jpg` | 購入成功② | 02と異なるポーズ。魔女店主がウインクしている。ぴよが受け取ったアイテムを見ている |
| `title_shop04.jpg` | 所持金不足 | 魔女店主が困った表情。ぴよが悲しそうに財布を見ている。少し暗い雰囲気 |
| `title_shop05.jpg` | 退店 | 魔女店主が手を振っている。ぴよが出口に向かっている。「またきてね」の雰囲気 |

**技術仕様:**
- 解像度: 横480px（縦は比率に応じて自動。目安: 480x320 程度）
- フォーマット: JPEG（品質85%程度）
- アートスタイル: ドット絵（ピクセルアート）、アニメ風キャラクター
- 背景: 木造のアイテムショップ内部、棚にポーションや巻物、ランタンの灯り
- **参照画像**: `images/title_shop.jpg` をスタイル参照として使用

**重要なキャラクター設定:**
- **ぴよ（主人公）**: 黒髪ロング・猫耳・黄色いリボン・黄色と黒のフリルドレス・黒いニーハイソックス
- **魔女店主**: 茶髪・青い星柄の大きな帽子・青いローブ・杖を持っている

---

### カテゴリ B: タイトルショップ用スキルアイコン（8個）

タイトルショップで販売する永続アップグレードのアイコン。
ゲームUI内でリスト表示される小さなアイコン。

| ファイル名 | アイテムID | アイテム名 | 説明 | デザイン指示 |
|---|---|---|---|---|
| `icon_coin_master.png` | coin_master | コインマスター | コイン獲得量UP | 金色に光るコインの山。キラキラエフェクト。豪華な印象 |
| `icon_toughness.png` | toughness | タフネス | 初期HP増加 | 赤いハートに金の縁取り。力強くて頑丈な印象。小さな盾マーク付き |
| `icon_stock_expand.png` | stock_expand | ストック拡張 | アイテム枠増加 | 茶色い革のカバン/ポーチ。口が開いていてアイテムが少し見えている |
| `icon_lucky_star.png` | lucky_star | ラッキースター（新規） | レアアイテム出現率UP | 黄金の星が輝いている。四方に小さな光の粒子が散っている |
| `icon_swift_dash.png` | swift_dash | スイフトダッシュ（新規） | 移動速度UP | 青い風のエフェクトを纏った靴/ブーツ。スピード感のある斜め線 |
| `icon_treasure_hunter.png` | treasure_hunter | トレジャーハンター（新規） | ステージ内の宝箱出現 | 開いた宝箱からコインが溢れている。冒険感のあるデザイン |
| `icon_second_wind.png` | second_wind | セカンドウィンド（新規） | 復活能力（旧：復活の羽） | 光り輝く天使の翼。神聖で柔らかい光のエフェクト。復活を象徴 |
| `icon_fever_boost.png` | fever_boost | フィーバーブースト（新規追加候補） | フィーバー持続延長 | 炎のように燃える「F」の文字。赤〜オレンジのグラデーション |

**技術仕様:**
- 解像度: **32x32px**（ゲーム内Canvas描画サイズ）
- フォーマット: PNG（透過背景）
- アートスタイル: 既存スプライトと統一したドット絵スタイル
- 色使い: 鮮やかでゲーム画面上で視認しやすいこと
- **参照画像**: `images/item_coin.png`, `images/item_shield.png`, `images/item_lemon.png` のスタイルに合わせる

---

### カテゴリ C: ステージショップ用アイテムアイコン（6個）

ゲーム中のステージショップで表示されるアイテムアイコン。
現在は絵文字で代替しているが、ドット絵アイコンに置き換える。

| ファイル名 | アイテムID | アイテム名 | 現在の絵文字 | デザイン指示 |
|---|---|---|---|---|
| `icon_heal.png` | heal | キズぐすり | 🧪 | 赤い液体が入ったガラスの試験管/フラスコ。泡が出ている |
| `icon_heal_stock.png` | heal_stock | 回復キット | ❤️ | 白い箱に赤い十字マーク。救急箱のイメージ |
| `icon_barrier.png` | barrier | バリアの盾 | 🛡️ | 青く光る魔法の盾。中央に星の紋章。半透明のエフェクト |
| `icon_lemon_special.png` | lemon_special | レモンスペシャル | 🍋 | 輝くレモン。切り口が見えて果汁が光っている。爽やかな印象 |
| `icon_full_charge.png` | full_charge | フルチャージ | ⭐ | 虹色に輝く大きな星。四方にパワーの波動。最強感 |
| `icon_revive_potion.png` | revive_potion | 復活のポーション | 💊 | 紫色に光る魔法の薬。瓶の中に渦巻くエフェクト。神秘的 |

**技術仕様:**
- 解像度: **32x32px**
- フォーマット: PNG（透過背景）
- アートスタイル: カテゴリBと同一スタイル
- **参照画像**: カテゴリBと同じ参照画像

---

### カテゴリ D: HUDスキルアイコン（ランタイム表示用）

ゲームプレイ中のHUD（画面上部）に小さく表示される、
アクティブスキルの状態を示すアイコン。カテゴリBのアイコンを
そのまま縮小表示するため、**別途生成は不要**。
カテゴリBの32x32アイコンをCanvas上で24x24〜16x16にスケールして使用。

---

## アートスタイル統一ガイドライン

### 全体の方針
- **ジャンル**: 2Dサイドスクロール・ランアクションゲーム
- **テイスト**: かわいい系・ファンタジーRPG風
- **ピクセル密度**: 低〜中（16x16 or 32x32ベースのドット絵）
- **パレット**: 明るく鮮やか。黒アウトライン使用

### キャラクターデザイン基準
- **主人公ぴよ**: 64x64pxスプライト → 48x48で描画
  - 黒髪ロング、赤いリボン、猫耳
  - 黄色いフリルワンピース（黒の縁取り）
  - 黒ニーハイソックス、茶色い靴
  - 大きな目、小柄な体型

### 色の参考値（既存スプライトから抽出）
- コイン: #FFD700（ゴールド）, #FFA500（オレンジ影）
- シールド: #4FC3F7（水色）, #1976D2（青影）
- レモン: #FFEB3B（黄色）, #F9A825（影）
- ハート: #FF4081（ピンク）, #D50000（赤影）
- エネルギー: #76FF03（黄緑）, #33691E（緑影）

---

## PixelLab API 使用手順

### 1. アイコン生成（32x32 ドット絵）

```bash
curl -X POST "https://api.pixellab.ai/v1/generate" \
  -H "Authorization: Bearer $PIXELLAB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "<アイテムの説明>",
    "image_size": {"width": 32, "height": 32},
    "style": "pixel-art",
    "no_background": true,
    "negative_description": "blurry, realistic, 3D, text, watermark"
  }' \
  --output "images/<ファイル名>.png"
```

### 2. ショップ背景生成（480px）

```bash
curl -X POST "https://api.pixellab.ai/v1/generate" \
  -H "Authorization: Bearer $PIXELLAB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "<シーンの説明>",
    "image_size": {"width": 480, "height": 320},
    "style": "pixel-art",
    "no_background": false,
    "negative_description": "blurry, realistic, 3D, text, watermark"
  }' \
  --output "images/<ファイル名>.jpg"
```

### 3. スタイル参照付き生成（既存画像のスタイルを維持）

PixelLabの `reference_image` パラメータを使用して、
既存画像のスタイルを参照しながら差分を生成する。

```bash
# まず参照画像をbase64エンコード
REF_IMG=$(base64 -i images/title_shop.jpg)

curl -X POST "https://api.pixellab.ai/v1/generate" \
  -H "Authorization: Bearer $PIXELLAB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "<差分シーンの説明>",
    "image_size": {"width": 480, "height": 320},
    "style": "pixel-art",
    "reference_image": "data:image/jpeg;base64,'"$REF_IMG"'",
    "reference_image_strength": 0.7,
    "no_background": false,
    "negative_description": "blurry, realistic, 3D, text, watermark, different art style"
  }' \
  --output "images/<ファイル名>.jpg"
```

> **注意**: PixelLab APIのパラメータは公式ドキュメント（https://www.pixellab.ai/docs）で
> 最新仕様を確認してください。上記はサンプルです。

---

## 生成優先度

1. **最優先**: カテゴリ B（タイトルショップ用スキルアイコン 8個）
   - ゲームのスキルシステム改修に必須
2. **高**: カテゴリ A（タイトルショップ背景 5枚）
   - 現在暫定1枚で動作中。差分があると演出が豊かになる
3. **中**: カテゴリ C（ステージショップ用アイテムアイコン 6個）
   - 現在は絵文字で代替しており動作に問題なし

---

## 生成後のファイル配置

すべての画像は以下のディレクトリに配置：
```
games/piyo-adventure/images/
```

### 命名規則
- アイコン: `icon_<item_id>.png`（32x32、透過PNG）
- ショップ背景: `title_shop0X.jpg`（480px幅、JPEG）

### ゲームへの組み込み（Claude Codeへの指示）

画像生成後、`games/piyo-adventure/index.html` の以下を更新する必要があります：

1. **TITLE_SHOP_UPGRADES 配列**（行2121付近）に `iconImg` プロパティを追加
2. **STAGE_SHOP_ITEMS 配列**（行2068付近）に `iconImg` プロパティを追加
3. **renderTitleShopItem()** と **renderStageShopItem()** を
   絵文字の代わりに `<img>` または Canvas描画に変更
4. **タイトルショップ背景切替**を実装（ステージショップの `setShopBg()` を参考に）

---

## 既存画像ファイル一覧（参考）

```
images/
├── player_idle_v1.png    (64x64, キャラクター基準スタイル)
├── player_walk_1〜4.png  (64x64, 歩行アニメーション)
├── player_jump.png       (64x64)
├── player_fall.png       (64x64)
├── item_coin.png         (32x32, コイン ← アイコンスタイル参照)
├── item_shield.png       (32x32, シールド ← アイコンスタイル参照)
├── item_lemon.png        (32x32, レモン ← アイコンスタイル参照)
├── item_energy.png       (32x32, エネルギー)
├── item_heart.png        (32x32, ハート)
├── shop.png              (700x508, ステージショップ建物外観)
├── shop01〜05.jpg        (ステージショップ背景差分 ← 背景スタイル参照)
├── title_shop.jpg        (タイトルショップ背景・暫定版)
├── boss_*.png            (128x128, ボススプライト)
├── enemy_*.png           (各種敵スプライト)
├── title_01〜33.jpg      (タイトル画面スライドショー)
├── logo.png              (ゲームロゴ)
└── piyo01.jpg, piyo02.jpg (キャラクターイラスト)
```
