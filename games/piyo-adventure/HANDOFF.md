# 引き継ぎ — メイド服スキン idle 立ち絵の作り直し

> 最初に `CLAUDE.md`（プロジェクトルール）を読むこと。本書はその次。
> 最終更新時点: 公開版 **Ver.1.327**。作業ディレクトリ: `games/piyo-adventure/`。
> ユーザーの自動メモ `[[veo-motion-sprite-workflow]]` に手法・罠の詳細あり（必読）。
> （※以前ここにあった「2体目ボス」指示書は完了済みのため破棄）

## 完了していること（メイド服スキン＝アバター着せ替え）
- **walk_1〜4**: Gemini **Veo 3.1**(image-to-video) 歩行動画→コマ切り出し→緑クロマキー＋正規化。**高品質・ユーザー合格**。
- **jump / fall**: `gpt-image-1` 生成（正面・クリーンな顔）。**合格**。
- **入手条件**: 実績 **dist_5000（合計5,000m走る）** の報酬で解放（コイン+メイド服）。`isSkinOwned` / `claimAchievement` / きせかえ画面のロック表示・実績行のスキンバッジまで実装済み。
- 実績リストのスクロール修正(1.326)、タイトル6ボタンの横向き収まり(1.323)、肌の透過修正(1.324/1.325)、**永久アイテム表示領域タップでジャンプ(1.327)** も済み。

## ★ 残タスク: idle（立ち絵）の作り直し ★
**現状の `images/skin_maid_idle.png` は gpt の真正面・不自然な立ち絵で NG（ユーザー却下）。作り直す。**

### 正しい方式（ユーザー指定・厳守）
**「walk の歩いているキャラを、ただ立ち止まらせる」** ＝ **横向きのまま**立たせた動画から良い1コマを抜く。walk は高品質なので横向きを維持すれば顔も高品質になるはず。

### 過去に失敗した方式（繰り返さない）
- ❌ gpt で真正面 idle → 不自然に真正面（idle_v2）。
- ❌ Veo で正面に振り向かせる → 振り向き＋縮小で**顔が潰れて「ゆるキャラ」化**（美少女にならない）。
- ❌ 元idle(`_raw/orig_idle*.png`)を種に使う → 元idleの顔は実体RGBがノイズ（透過で明るい背景が透けて美麗に“見えていた”だけ）。**種に使わない**。

### 手順（スクリプト準備済み）
1. **生成**（プロンプトは「横向きのまま立ち止まる・正面を向かない」に更新済み。Veo 3.1 Fast, 約$0.40）:
   ```
   zsh -ic 'cd games/piyo-adventure/tools && node veo-walk.mjs --idle'
   ```
   → `tools/_raw/veo_idle.mp4`（種は walk と同じ `oai_base_side_2_1024.png`）。横向き立ちがうまく出なければ `veo-walk.mjs` の `PROMPT_IDLE` を微調整して再生成。
2. **コマ抽出＆選定**:
   ```
   mkdir -p tools/_raw/veo_idle_frames
   ffmpeg -y -i tools/_raw/veo_idle.mp4 tools/_raw/veo_idle_frames/f_%03d.png
   ```
   両足が地に着き静止・腕が自然・**顔が美麗（潰れていない）**なフレームを選ぶ。確認は `open` で実機Previewに出してユーザーに見せる。拡大コンタクトシートは crop(x20,y140,w680,h1100) で作る（過去スクリプトは scratchpad 参照）。
3. **スプライト化**: `tools/veo-frames-to-skin.mjs`（緑クロマキー＋idle基準で正規化）を idle 用に流用（フレーム番号を渡せるよう軽微改修が要るかも）。→ `tools/opacify-skin.mjs` で内部透明穴を塗る → **マゼンタ背景で透過チェック**（顔が透けない）。サイズは jump/fall=54・walk=59 と整合（idleは高さ54前後、足元を揃える）。
4. `images/skin_maid_idle.png` に反映 → **新規(キャッシュ無し)ロードで検証** → Ver.+0.001＋`sw.js` CACHE_NAME 同期 → `gh` でブランチ→PR→マージ。

### 品質バー（最重要）
ユーザーは「美少女キャラ」を要求。**顔が潰れた“ゆるキャラ”は不可**。walk と同等の精細さの横向き立ち絵を狙う。出なければ根気よくコマを探す／プロンプト微調整。妥協しない。

## 環境・運用
- `OPENAI_API_KEY` / `GEMINI_API_KEY` は **`.zshrc`** にあり。生成は **`zsh -ic`** 経由（非対話bashは空に見える）。
- ルール: **HTMLを1行でも変えたら index.html Ver.+0.001＋sw.js CACHE_NAME 同期**。回答末尾に現在Ver.記載。Git/PR/マージは Claude が実行（ユーザーはGit不慣れ＝具体手順で案内）。
- 検証: ヘッドレスChrome(CDP)。サーバは `python3 -m http.server`、Chromeは `--headless=new --remote-debugging-port=...`。**新規プロファイルでキャッシュ無し確認**（SWキャッシュで本番だけ壊れる罠）。
- 主要ツール: `tools/veo-walk.mjs`(--idle), `veo-frames-to-skin.mjs`, `opacify-skin.mjs`, `generate-skin-maid-openai.mjs`。

## 今後（別途・ユーザー要望）
他アバター追加、**コイン購入・課金専用スキン**（ショップ/IAP整備が前提）。解放の仕組み（`SKINS[].unlockAch` / `ACHIEVEMENTS[].skinReward` / `isSkinOwned` / `claimAchievement`）は実装済みで流用可。
