# 引き継ぎ指示書 — 2体目ボス（空中型）の追加 ＋ Gemini画像生成

> このファイルは「ローカルに移行したClaude Codeセッション」が、この機能をゼロから自律実行するための指示書です。
> **最初に必ず `CLAUDE.md`（プロジェクトルール）を読み、本書はその次に読むこと。** ルールが衝突した場合は `CLAUDE.md` を優先する。
> 作成日: 2026-06-24 / 作成時点バージョン: Ver.1.280

---

## 0. このタスクのゴール（一言で）

現状ボスは1体（地上・踏みつけ型の「闇の巨大ニワトリ」）が無限ラウンドで出続けるだけで味気ない。
**2体目として「空中型ボス」を追加し、ラウンドごとに地上ボスと交互に出す。** 画像は Gemini API で生成する。

- **奇数ラウンド（R1, R3, R5…）＝ 既存の地上ボス（rooster）**
- **偶数ラウンド（R2, R4, R6…）＝ 新規の空中ボス（hawk）**

ユーザー（shinomiyapiyo）が承認済みの方針:
- 2体目は **空中型（滞空・ダイブ・弾）**
- 画像は **新規生成**（Geminiで）
- 既存ボスとの差は「踏む」→「撃って落とす」立ち回りの違いで出す

---

## 1. 前提環境（ローカル）

ローカルセッション開始時に以下を確認すること:

- [ ] `GEMINI_API_KEY` が環境変数に設定されている（画像生成に必須）
- [ ] Node.js が使える（`node --check` で構文チェック、画像後処理スクリプトにも使用）
- [ ] ローカルWebサーバーでゲームを開ける（PWA/Service Workerは `file://` では動かない。`npx serve` 等）
- [ ] 作業対象は **`games/piyo-adventure/` のみ**（`CLAUDE.md` の操作範囲制限に従う）

> ユーザーは過去に Gemini API でボス画像を生成した実績がある（当時は初代 Nano Banana = `gemini-2.5-flash-image`）。
> **今回は Nano Banana 2（= Gemini 3 Pro Image 系）を使う。** 正確なmodel IDは Google AI Studio / 公式docsで最新を確認すること。
> 初代では「同じキャラで別ポーズ」の一貫性に苦労した経緯あり。改善のため **§3の手順（参照画像＋1枚生成）を必ず守ること。**

---

## 2. 画像生成（Gemini）— 一貫性を出すための手順

> **生成スクリプトは用意済み: `games/piyo-adventure/tools/generate-boss2.mjs`**
> ローカルでは `cd tools && npm install && export GEMINI_API_KEY=... && node generate-boss2.mjs` を実行するだけで、
> 下記の手順（参照画像＋idle先行生成＋128透過後処理）を自動で行い `images/boss2_*.png` を出力する。
> 詳細は `tools/README.md`。モデルIDは Nano Banana 2（Gemini 3 Pro Image系）を想定。正確なIDは要確認。

初代Nano Bananaで失敗した「ポーズ間で絵が揃わない」問題を避けるため、**やり方が最重要**。

1. **既存ボスを参照画像として渡す。** `images/boss_idle.png` 等を入力に含め、「この巨大な闇の鳥と"同じ画風・同じ世界観"の、別キャラの空中型ボス」として生成させる（完全な別個体だが、画風・解像感・色調を揃える）。
2. **全ポーズを1枚にまとめて生成する。** idle/flap/dive/shoot/damaged を1枚の「ポーズシート」として1回の生成で出す → 後でスライス。別々に生成すると体型・色がブレるため必ず1枚で。
3. **プロンプトの型を固定。** 「背景透過 / 左向き / ドット絵寄り / 1キャラ / 同一画風」を毎回同じ文言で指定。
4. **後処理で既存ボスに馴染ませる。** 生成画像を 128×128 にダウンスケール＋減色（Node なら `sharp`、Python なら `Pillow`）。透過PNGで書き出す。既存 `boss_*.png` と並べて違和感がないか確認。
5. 生成 → スライス → 後処理は**スクリプト化**して `scratchpad` 等に置き、再生成しやすくする（コミットはしない／`images/` の最終PNGのみコミット）。

> APIキーは絶対にコード/コミットに含めない。環境変数からのみ読む。

---

## 3. 必要な画像ファイル（最終成果物）

- 置き場所: `games/piyo-adventure/images/`
- 仕様: **128×128px / 背景透過PNG / 左向き**（エンジンが右向きへ自動反転する）

| ファイル名 | ポーズ | 用途（フレーム番号） |
|---|---|---|
| `boss2_idle.png`    | 滞空（翼を広げて静止） | 0: HAWK_FRAME_IDLE |
| `boss2_flap.png`    | 羽ばたき（idleと交互で浮遊アニメ） | 1: HAWK_FRAME_FLAP |
| `boss2_dive.png`    | 急降下（翼をたたんで突っ込む） | 2: HAWK_FRAME_DIVE |
| `boss2_shoot.png`   | 弾発射（羽根を放つ） | 3: HAWK_FRAME_SHOOT |
| `boss2_damaged.png` | 被弾（のけぞり） | 4: HAWK_FRAME_DAMAGED |

> 余裕があれば `boss2_charge.png`（ダイブ前の溜め）を追加すると迫力が出るが、無ければ idle で代用してよい。

---

## 4. 空中ボス（hawk）の挙動仕様

既存の地上ボス（`updateBossAI_mama`）が「突進・ジャンプ叩きつけ・炎ブレス・閃光・雑魚召喚」なのに対し、空中ボスは**空中に居続ける**のが肝。

### 攻撃パターン
| 攻撃 | 動き | プレイヤーの対応 |
|---|---|---|
| **滞空** | 画面上部（地面から高め）を左右に漂い、プレイヤーのX座標を緩く追う | 真下に入らない位置取り |
| **ダイブ爆撃** | プレイヤーの真上に来て急降下→地面付近で**短い硬直**→上昇して滞空に戻る | 横に避ける。**硬直中は踏める＝主要ダメージ源** |
| **羽根弾ばらまき** | 滞空位置から扇状に弾を下方へ発射（**既存の `bossState.eggs` システムを流用**、`isFlame:false` の通常弾扱い） | 弾の隙間を縫って回避 |
| **急襲（HP低下時）** | phase3でダイブが速く・連続化（既存の `isAngry` / 怒りモードを流用） | 落ち着いて回避＋エナジー弾 |

### ダメージの与え方（地上ボスとの最大の差）
- **主軸: エナジー弾で削る** → ショップで「エナジー」を買う意味が生まれる（既存の弾→ボスHP減少の判定を流用）
- **補助: ダイブ着地後の硬直を踏む** → 攻めるプレイヤーへのご褒美
- 通常の滞空中は高すぎて踏めない設計にする（踏みゲーにしない）

### HP・スケーリング
- 既存と同じ `bossState.maxHp`（`BOSS_MAX_HP + Math.max(0, gameRound-3)*3`）を流用してよい。
- 体当たり・ダイブ・羽根弾は **HP-1**。**シールド中は全攻撃を無効**（`isPlayerProtected()` を必ず使う。過去にシールド判定漏れバグが多発したため）。

---

## 5. コード実装手順（ファイル別）

> 行番号は Ver.1.280 時点の目安。ズレている場合は記載の**関数名・文字列でgrep**して特定すること。

### 5-1. `sprites.js` — 空中ボスのスプライト登録
`boss_rooster`（56行目付近）の直後に `boss_hawk` を追加:
```js
boss_hawk: { files: [
    'images/boss2_idle.png',
    'images/boss2_flap.png',
    'images/boss2_dive.png',
    'images/boss2_shoot.png',
    'images/boss2_damaged.png'
] }
```

### 5-2. `sw.js` — STATIC_ASSETS に追加
`./images/boss_flame.png` の近くに `boss2_*.png` 5枚を追加（**CLAUDE.mdルール: jsやアセット追加時はSW登録必須**）。

### 5-3. `index.html` — フレーム定数
`BOSS_FRAME_*`（5324行目付近）の近くに hawk 用フレーム定数を追加:
```js
var HAWK_FRAME_IDLE = 0, HAWK_FRAME_FLAP = 1, HAWK_FRAME_DIVE = 2,
    HAWK_FRAME_SHOOT = 3, HAWK_FRAME_DAMAGED = 4;
```

### 5-4. `index.html` — ボスに種類を持たせる（`setupBossArena`, 5110行目付近）
ボス生成時に `kind` を付与。`bossState.boss = { ... }` に追加:
```js
kind: (gameRound % 2 === 1) ? 'rooster' : 'hawk',
```
空中ボスは初期Yを地面より高くする（滞空）。`kind === 'hawk'` のとき登場・初期位置・アリーナ足場を空中戦向けに調整（足場は踏み台として残してよい）。

### 5-5. `index.html` — AIディスパッチャ（`updateBossAI`, 5332行目）
既に種類分岐の口がある。ここを拡張:
```js
function updateBossAI(b) {
    if (b.kind === 'hawk') { updateBossAI_hawk(b); }
    else { updateBossAI_mama(b); }
}
```
`updateBossAI_hawk(b)` を新規実装（§4の仕様）。`updateBossAI_mama` は**触らない**（既存挙動を壊さない）。

### 5-6. `index.html` — 登場演出（`updateBoss` case 2, 5194行目付近）
`kind === 'hawk'` のときは「右から飛んで滞空位置へ」に分岐（地上歩行アニメではなく flap）。

### 5-7. `index.html` — 描画（`drawBoss`, 6881行目／6898行目で `'boss_rooster'` をハードコード）
スプライトシート名を kind で切り替え:
```js
var sheet = (b.kind === 'hawk') ? 'boss_hawk' : 'boss_rooster';
spriteManager.draw(ctx, sheet, b.spriteFrame, b.x, drawY, b.width, b.height, flipH);
```
影は地上ボス前提（`GROUND_Y` 直下に楕円）なので、空中ボスは影を薄く/真下に出すか省略する。怒り赤オーバーレイ等は流用可。

### 5-8. `index.html` — 当たり判定（`updateBossCollision`, 5515行目）
空中ボスは「踏める＝ダイブ硬直中のみ」になるよう調整。滞空中の本体踏みつけは無効（または高くて届かない）。羽根弾・ダイブの被弾は `isPlayerProtected()` チェックを必ず通す。

### 5-9. 撃破・ラウンド移行は共通でOK
`updateBoss` の case 4（撃破演出・全敵消去・5241行目〜）と case 5（`gameRound++`・5294行目〜）は kind 非依存なので**そのまま流用**。撃破時の「画面の敵を全消し」も共通で動く。

---

## 6. バージョン・キャッシュ・コミット規約（CLAUDE.md準拠）

- `index.html` を1行でも変えたら **バージョン +0.001**（2箇所: `content: "Ver.X.XXX"` と画面表示の `Ver.X.XXX`）。
- **同時に `sw.js` の `CACHE_NAME`（`piyo-adventure-vX.XXX`）も必ず更新。**
- 段階的にコミット推奨:
  1. 画像生成＋`images/`追加＋`sprites.js`/`sw.js`登録（まだ未使用でも可）
  2. `updateBossAI_hawk` 等ロジック実装＋交互出現
  3. バージョン更新
- 開発ブランチ: `claude/clear-enemies-on-boss-defeat-L7Oj6`（無ければ作成）。`git push -u origin <branch>`。
- **PRの自動作成はしない**（ユーザーが明示要求した時のみ）。push後はユーザーにマージ手順を具体的に案内する。

---

## 7. 検証チェックリスト（実機/ローカルサーバーで）

- [ ] R1で地上ボス（rooster）が今まで通り出る（挙動・見た目に変化なし）
- [ ] R1撃破後、R2で**空中ボス（hawk）**が飛んで登場し、滞空する
- [ ] hawkはダイブ・羽根弾で攻撃してくる
- [ ] hawkはエナジー弾でHPが減る／ダイブ着地硬直中に踏める
- [ ] 滞空中の本体は踏めない（踏みゲーになっていない）
- [ ] **シールド中はhawkの全攻撃が無効**（ダメージを受けない）
- [ ] R3で再び地上ボス、R4で再び空中ボス…と交互になる
- [ ] hawk撃破時も「画面の敵が全消し」「コイン散布」「DEFEATED演出」が出る
- [ ] オフライン（機内モード）でも boss2_*.png が表示される（=SW登録できている）
- [ ] バージョン表記2箇所と `CACHE_NAME` が一致

> 既存の `TESTING.md`「6. ボス戦」も併せて回し、地上ボスにデグレが無いことを確認すること。

---

## 8. 進め方の推奨順序

1. `GEMINI_API_KEY` を確認 → §2の手順で **画像5枚を生成・後処理**（ここが一番試行錯誤する。納得いくまで再生成）
2. `images/` に配置 → `sprites.js`・`sw.js` 登録 → 表示テスト用に一時的に rooster を hawk 差し替えで見た目確認
3. `updateBossAI_hawk` 実装（まず滞空＋ダイブだけ動かす → 羽根弾 → 怒り）
4. `drawBoss`・`setupBossArena`・`updateBossCollision` を kind 分岐
5. 交互出現（`kind` の付与）を有効化して通しテスト
6. バージョン更新 → コミット → push → ユーザーにマージ案内

---

## 付録: 関連コードの所在（Ver.1.280時点・grep推奨）

| 対象 | 場所 |
|---|---|
| ボス定数 `BOSS_MAX_HP/WIDTH/HEIGHT` | index.html 2113–2115 |
| `bossState` 定義 | index.html 2227, 2650（リセット） |
| `gameRound`（=1初期 / `gameRound++`） | index.html 2226, 5297 |
| `checkBossTrigger` | index.html 5099 |
| `setupBossArena`（ボス生成） | index.html 5110 |
| `updateBoss`（フェーズ機械） | index.html 5184 |
| `updateBossAI`（ディスパッチ） | index.html 5332 |
| `updateBossAI_mama`（既存・触らない） | index.html 5336 |
| `updateBossCollision` | index.html 5515 |
| `spawnEggProjectiles`（弾流用元） | index.html 5637 |
| `drawBoss`（`'boss_rooster'`ハードコード） | index.html 6881 / 6898 |
| 撃破演出・全敵消し | index.html 5241–5292 |
| `sprites.js` の `boss_rooster` | sprites.js 56–64 |
| `isPlayerProtected()`（シールド判定の正） | index.html 内 grep |
