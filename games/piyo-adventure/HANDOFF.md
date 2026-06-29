# 引き継ぎ — メイド服スキン（idle 立ち絵は完了）

> 最初に `CLAUDE.md`（プロジェクトルール）を読むこと。本書はその次。
> 最終更新時点: 公開版 **Ver.1.328**。作業ディレクトリ: `games/piyo-adventure/`。
> ユーザーの自動メモ `[[veo-motion-sprite-workflow]]` に手法・罠の詳細あり（必読）。
> （※以前ここにあった「2体目ボス」指示書は完了済みのため破棄）

## 完了していること（メイド服スキン＝アバター着せ替え）
- **walk_1〜4**: Gemini **Veo 3.1**(image-to-video) 歩行動画→コマ切り出し→緑クロマキー＋正規化。**高品質・ユーザー合格**。
- **jump / fall**: `gpt-image-1` 生成（正面・クリーンな顔）。**合格**。
- **idle（立ち絵）**: **完了 (Ver.1.328)**。最終的に**ユーザー自身が ChatGPT で生成した正面立ち絵**を採用（Veo横向き立ちは結局「振り向き360°回転」になり不採用＝下記参照）。透過PNG(1024×1536)を `tools/idle-from-image.mjs` で 64×64 化（背景は生成時点で透過済みのためクロマキー不要・bboxトリム→高さ54/足元gapBottom5で正規化）。実機ゲーム内idleで美麗な顔・透過OK・他スプライトとサイズ整合を確認済み。元画像は `_raw/user_idle_src_1024.png` に保管。
- **入手条件**: 実績 **dist_5000（合計5,000m走る）** の報酬で解放（コイン+メイド服）。`isSkinOwned` / `claimAchievement` / きせかえ画面のロック表示・実績行のスキンバッジまで実装済み。
- 実績リストのスクロール修正(1.326)、タイトル6ボタンの横向き収まり(1.323)、肌の透過修正(1.324/1.325)、**永久アイテム表示領域タップでジャンプ(1.327)** も済み。

## ✅ idle（立ち絵）完了の記録（Ver.1.328）
**採用方式**: ユーザーが ChatGPT で生成した**正面向きの透過立ち絵**（クリーンな顔）を採用。`images/<元ファイル>` に置いてもらい、`tools/idle-from-image.mjs` で 64×64 スプライト化（背景透過済み＝クロマキー不要・bboxトリム→高さ54・足元gapBottom5・中央寄せ）。元画像は `_raw/user_idle_src_1024.png` に保管。

**検証済み**: cache無しヘッドレスChromeでゲーム起動→`piyo_settings`に`ownedSkins:['maid'],activeSkin:'maid',tutorialSeen:true`を注入→splash(`startApp()`)とログインボーナス(`#loginBonusPopup`の受取ボタン)を閉じ→`startGame()`で実プレイのidle描画をスクショ。顔美麗・透過OK・サイズ整合・コンソールエラー無し・Ver.1.328表示を確認。

### この過程で却下された方式（将来の参考・繰り返さない）
- ❌ gpt で真正面 idle（旧）→ 不自然に固い真正面（idle_v2）。
- ❌ Veo で「横向きのまま立たせる」→ プロンプトに反し**360°振り向き回転**になり、横向き静止コマが冒頭数フレームしか無く品質も不足。`_raw/veo_idle.mp4` 参照。
- ❌ Veo で正面に振り向かせる → 振り向き＋縮小で顔が潰れ「ゆるキャラ」化。
- ❌ 元idle(`_raw/orig_idle*.png`)を種 → 元idleの顔は実体RGBがノイズ。
- 教訓: **「動きのある差分（walk等）＝Veo動画切り出し」「単発の止め絵（idle/jump/fall）＝画像生成（gpt / ユーザー生成）」のハイブリッドが結論**。idleを動画から無理に作る必要は無かった。

### 品質バー（達成済み・今後の他スキンでも維持）
ユーザーは「美少女キャラ」を要求。**顔が潰れた“ゆるキャラ”は不可**。今回の正面立ち絵で達成。

## 環境・運用
- `OPENAI_API_KEY` / `GEMINI_API_KEY` は **`.zshrc`** にあり。生成は **`zsh -ic`** 経由（非対話bashは空に見える）。
- ルール: **HTMLを1行でも変えたら index.html Ver.+0.001＋sw.js CACHE_NAME 同期**。回答末尾に現在Ver.記載。Git/PR/マージは Claude が実行（ユーザーはGit不慣れ＝具体手順で案内）。
- 検証: ヘッドレスChrome(CDP)。サーバは `python3 -m http.server`、Chromeは `--headless=new --remote-debugging-port=...`。**新規プロファイルでキャッシュ無し確認**（SWキャッシュで本番だけ壊れる罠）。
- 主要ツール: `tools/veo-walk.mjs`(--idle), `veo-frames-to-skin.mjs`, `opacify-skin.mjs`, `generate-skin-maid-openai.mjs`。

## 今後（別途・ユーザー要望）
他アバター追加、**コイン購入・課金専用スキン**（ショップ/IAP整備が前提）。解放の仕組み（`SKINS[].unlockAch` / `ACHIEVEMENTS[].skinReward` / `isSkinOwned` / `claimAchievement`）は実装済みで流用可。
