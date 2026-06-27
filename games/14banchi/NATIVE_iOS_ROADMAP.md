# 14番地 iOSネイティブ リリース・ロードマップ

最終更新: 2026-06-27 / 対象バージョン: Ver.0.972

## 0. 方針（前提）

- **iOS版を先にリリース**。Android版は保留（後で同じCapacitorプロジェクトに `android` を追加可能なので、この作業は無駄にならない）。
- **リワード広告（広告を見て復活）はゲーム性に必須** → 初回iOSリリースから **AdMob統合が前提**。
- **課金（IAP）はリリース後**に導入（初回リリースには含めない）。
- **Capacitor** でWebアプリ（`games/14banchi/`）をネイティブ化。
- PWA/Webはネイティブ移行後は削除対象（過度な投資はしない）。

凡例：**【あなた】**＝ユーザー作業（環境/アカウント）、**【Claude】**＝コード/設定作業。

---

## 1. 今すぐ始める準備（並行・時間がかかるものを先に）

> これらは順番待ちが発生するので、先に着手しておくと後がスムーズ。

- [x] **【あなた】Apple Developer Program 登録**（完了）。
- [ ] **【あなた】Mac に Xcode をインストール**（App Store から。数GB・時間がかかる）。
- [ ] **【あなた】Node.js（LTS）+ npm をインストール**（Capacitor CLI 用）。 https://nodejs.org/
- [x] **【あなた】Google AdMob アカウント作成**（完了）。
- [x] **【あなた】AdMob で iOS アプリ「14番地」登録 + 広告ユニット2つ作成**（完了）。下記ID取得済み。
- [ ] **【あなた】CocoaPods をインストール**（`sudo gem install cocoapods`。iOSの依存管理に必要）。

### 取得済みの値（コードに設定済み / Info.plistに使用）
- バンドルID：`com.nullpoworks.banchi14`（capacitor.config.json に設定済み）
- AdMob **アプリID**（`~`）：`ca-app-pub-4148293353679224~5712611505` ← **iOSの Info.plist の `GADApplicationIdentifier` に入れる**
- リワード広告ユニット：`ca-app-pub-4148293353679224/2368262869`（native-bridge.js に設定済み）
- インタースティシャル広告ユニット：`ca-app-pub-4148293353679224/8545824256`（native-bridge.js に設定済み）
- ※開発中は `native-bridge.js` の `USE_TEST_ADS=true`（Googleテスト広告）。本番ビルド時に `false` に。

---

## 2. 先に決める「決め事」

- [ ] **アプリ名**（App Store表示名。例：「14番地」/「14番地 〜ぴよ氏の怪異街歩き〜」）
- [ ] **バンドルID**（例：`com.nullpoworks.banchi14`）※後から変更困難。慎重に。
- [ ] **広告の出し方**：
  - リワード（復活）＝必須。
  - インタースティシャル＝**現状は「もう一度/タイトルへ」遷移ごとに表示」**。Appleは過度な広告を嫌うので、**頻度を間引く**（例：3〜5プレイに1回）方向を推奨。→ 決める。
- [ ] **ATT（Appトラッキング透明性）の方針**：
  - 案A：**非パーソナライズ広告のみ**（ATTのポップアップ不要・審査が簡単・収益は下がる）← 初回はこれを推奨。
  - 案B：パーソナライズ広告（ATT許可ポップアップ必須・プライバシー表示が増える）。
- [ ] **App Store プライバシー表示**：AdMobは識別子等を収集 → 申告が必要（プライバシーポリシーは公開済み）。
- [ ] **対象年齢 / レーティング**（ホラー要素あり。Appleの質問票で回答）。

---

## 3. 技術ステップ（この順で進める）

### Step 1. Capacitor 導入　【Claude設計 + あなた実行】
- `games/14banchi/` に `package.json` を用意し、Capacitorを追加。
  ```bash
  cd games/14banchi
  npm init -y
  npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/app
  npx cap init "14番地" com.nullpoworks.banchi14 --web-dir .
  ```
- **【Claude】** `capacitor.config.json` を作成（webDir=ゲームのある場所、landscape固定など）。
- 注意：`web-dir` はビルド成果物のフォルダ。14banchiは素のHTMLなので、配信に不要なファイル（このmd等）を含めない構成を決める（必要なら `www/` にコピーする手順を用意）。

### Step 2. iOSプロジェクト生成　【あなた実行（Mac）】
```bash
npx cap add ios
npx cap sync ios
npx cap open ios   # Xcodeが開く
```
- **【あなた】** Xcodeで「Signing & Capabilities」にApple Developerアカウントを設定。

### Step 3. AdMob統合（既存ブリッジに接続）　【Claude実装 + あなた設定】
- 既存コードは以下の「受け口」を呼ぶだけで、実体が未実装：
  - `window.nativeShowRewardedAd(onRewarded, onSkipped)` ← 復活
  - `window.showInterstitialAd(onDismiss)` ← 遷移時
  - `window.adRemoved` / `window.livesUpgrade`（課金フラグ・今は未使用）
- **【あなた】** AdMobプラグイン導入：`npm i @capacitor-community/admob` → `npx cap sync`
- **【Claude】** ネイティブ用ブリッジJS（`native-bridge.js`）を作成し、AdMobプラグインで上記 `window.*` を実装：
  - 起動時にAdMob初期化＋（案Bなら）ATT要求
  - リワード/インタースティシャルの事前ロード＆表示、コールバックでゲーム側関数を呼ぶ
  - インタースティシャルは決めた頻度で間引き
- **【あなた】** Xcodeの `Info.plist` にAdMobアプリID、（ATT採用時）`NSUserTrackingUsageDescription` を追加。
- **【Claude】** 広告ユニットID等は設定ファイル化（実IDはあなたが差し込み）。

### Step 4. ライフサイクル/画面向き/アイコン　【Claude + あなた】
- **【Claude】** Capacitor `App` プラグインの状態変化で既存の `window.pauseGame`/`window.resumeGame` を呼ぶ配線。
- **【Claude/あなた】** 横向き固定（Capacitor設定＋Xcode）。
- **【あなた】** アプリアイコン（全iOSサイズ）・起動画面（Launch Screen）をXcodeに設定（素材はPWA用192/512を流用しつつ、不足サイズは作成）。

### Step 5. 実機テスト → TestFlight　【あなた中心】
- **【あなた】** Xcodeでシミュレータ＆実機ビルド、動作確認（広告・ランキング・復活・チュートリアル）。
- **【あなた】** App Store Connect で TestFlight 配信 → 自分や知人でテスト（実ユーザーを少し作る狙い）。
- **【Claude】** 不具合の修正対応。

### Step 6. App Store 申請　【あなた中心】
- **【あなた】** App Store Connect でアプリ作成、**スクリーンショット**（各デバイスサイズ）、**説明文**（ja/en）、**プライバシー表示**、**年齢レーティング質問票**、価格（無料）を設定。
- **【あなた】** 審査提出 → リジェクト時は理由に応じて **【Claude】** が修正。

---

## 4. リスク・注意点

- **インタースティシャル頻度**：遷移ごとは多すぎ。間引き必須（審査・体験の両面）。
- **ATT**：初回は非パーソナライズ広告でATT回避が無難。
- **オンライン依存**：広告（AdMob）とランキング（Firebase Firestore）はネット必須。オフライン時はゲーム本編は遊べるが広告/ランキングは不可（既存挙動）。
- **Firestoreセキュリティルール**：ランキング書き込みの不正（スコア改ざん/スパム）対策のルールを確認・強化（クライアントにAPIキーが出るのは正常）。
- **データ引き継ぎ**：コンプリート進捗・ランキング名はlocalStorage。機種変更で消える。将来Firebaseで同期も可能（ランキング基盤が既にある強み）。今回の初回リリースでは必須ではない。
- **単一HTML（177KB）**：そのままwebDirに入れて動作する想定。Firebaseは `gstatic.com` からCDN読み込み（ネット必須）。

---

## 5. 役割分担サマリ

| 区分 | 主担当 |
|---|---|
| Apple Developer / AdMob / アカウント・課金登録 | **あなた** |
| Mac・Xcode・CocoaPods・Node環境 | **あなた** |
| Capacitor設定・AdMobブリッジ実装・ライフサイクル配線・コード修正 | **Claude** |
| iOSビルド・実機/TestFlight・ストア素材・審査提出 | **あなた**（不具合修正はClaude） |
| バンドルID・アプリ名・広告頻度・ATT方針 等の決定 | **あなた**（Claudeが選択肢提示） |

---

## 6. 進捗（このファイルで管理）

- [x] Step 1: Capacitor導入（npm install / copy:web 完了）
- [x] Step 2: iOSプロジェクト生成（`ios/` 生成・`pod install` 完了＝AdMob SDK 11.3.0 統合済み）
- [~] Step 3: AdMob統合 … ブリッジ実装＋Info.plistにアプリID設定済み。**実機ビルドでAPI/イベント名の動作確認が残**
- [~] Step 4: ライフサイクル/向き/アイコン … ライフサイクル配線済み・横向き固定済み。**アイコン/起動画面が残**
- [ ] Step 5: 実機テスト/TestFlight
- [ ] Step 6: App Store申請

---

## 7. 現在の状態（Claude実行済み）と残作業

### ✅ Claudeが実行・設定済み（このMac上）
- `npm install`（Capacitor 6.2.1 / @capacitor-community/admob 6.2.0 等）
- `npm run copy:web`（www/ 生成）
- `npx cap add ios`（`ios/` Xcodeプロジェクト生成）
- `pod install`（**Google-Mobile-Ads-SDK 11.3.0** 等を統合）
- `ios/App/App/Info.plist` に設定済み：
  - `GADApplicationIdentifier` = `ca-app-pub-4148293353679224~5712611505`
  - 画面 **横向き固定**（iPhone/iPad とも Landscape のみ）
  - ※これらは `configure-ios.sh` で再現可能（`ios/`再生成時は `npm run configure:ios` を実行）

### ▶ 次に【あなた】がXcodeでやること（Step 4〜5）
1. ターミナルで `cd games/14banchi && npx cap open ios`（または `ios/App/App.xcworkspace` をダブルクリック）
2. Xcode左の「App」→ **Signing & Capabilities** で **Team（Apple Developerアカウント）** を選択（自動署名）。
3. **アプリアイコン**：`App/Assets.xcassets/AppIcon` に各サイズを設定（PWA用 icon-512.png を元に生成可）。
4. 実機をUSB接続 → 上部で実機を選び ▶ で **ビルド＆実行**（初回は実機の「デベロッパを信頼」が必要）。
5. 動作確認：タイトル→各モード／復活（テスト広告が出るか）／遷移（インタースティシャル）／ランキング／チュートリアル。
6. 問題なければ **Product → Archive → TestFlight 配信**。

### ⚠ 注意・残課題
- **AdMobブリッジの動作確認**：`native-bridge.js` のメソッド/イベント名は @capacitor-community/admob 6.2.0 準拠で記述。実機でリワード/インタースティシャルが正しく出るか確認し、出なければ報告 → **Claudeが微調整**。
- **本番ビルド前**：`native-bridge.js` の `USE_TEST_ADS = true` → **`false`**（実広告へ。Claudeが切替）。
- **コード更新時の反映**：`index.html` 等を直したら `cd games/14banchi && npm run sync` で `ios/` に反映（ロケール対策済み）。
- **`ios/` はgit管理外**（ローカルのみ）。Info.plist設定は `configure-ios.sh`（コミット済み）で再現。

### 参考：ロケール問題（解決済み）
`pod install` が `Unicode Normalization ... ASCII-8BIT` で失敗する場合はシェルのロケールが非UTF-8。
`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` を付けて実行（`npm run sync` は対策済み）。

---

## 8. Android（クローズドテスト更新）

### 方針（2026-06-27 ユーザー決定）
- **Android本番申請は「iOSが正式リリースされた後」**。iOS優先は維持。
- ただし **クローズドテスト版は今から最新（Ver.0.974）に更新**しておく。
- 最終申請の少し前に、ユーザーが実プレイユーザーに呼びかける（実稼働ユーザー確保）。

### 重要な前提（Google Play Console で確認済み）
- 既存Androidアプリ **「14番地 〜ぴよ氏の怪異街歩き〜」**、パッケージ **`com.nullpoworks.banchi14`** ＝ Capacitorと一致 ✅
- **クローズドテストの要件（12人以上×14日以上）は達成済み**（製品版アクセス申請が可能な段階）。前回「実稼働ユーザーがいない」却下は別アプリの件。

### ✅ Claudeが実行・設定済み（このMac上）
- `npm i @capacitor/android` → `npx cap add android`（`android/` 生成・Gradle同期OK）
- `native-bridge.js` を **iOS/Android別の広告ID出し分け**に修正（`Capacitor.getPlatform()`）。Android本番ユニットは未作成のため `PROD_ANDROID` は仮(0埋め)。
- `android/app/src/main/AndroidManifest.xml`：AdMob App ID（**Google公式テスト用** `ca-app-pub-3940256099942544~3347511713`）＋ **横向き固定**（`configure-android.sh` で再現可）
- `npx cap copy` で最新Web資産を ios/android 両方へ反映

### ▶ 次に【あなた】がやること（Androidクローズドテスト更新）
1. `cd games/14banchi && npx cap open android`（Android Studioが開く）
2. Android Studioで **アプリアイコン**（`res/mipmap`）を設定（PWA用 icon-512.png を元に生成可）
3. **署名付きAAB（App Bundle）を生成**：Build → Generate Signed Bundle / APK → **既存Playアプリと同じアップロード鍵**で署名（最初にアップした時の鍵）
4. Play Console → テストとリリース → **クローズドテスト** → 新しいリリースで AAB をアップロード（versionCodeは既存より大きく）
5. 反映を確認（テスターで実機確認）

### ⚠ Android本番（iOSリリース後）に必要なこと
- **AdMobで「Androidアプリ」＋広告ユニット2つ作成** → `native-bridge.js` の `PROD_ANDROID` と AndroidManifest の App ID を**実IDに差し替え**（Claude対応）＋ `USE_TEST_ADS=false`
- 本番リリース申請（「本番環境へのアクセスを申請」）

### 進捗
- [x] Android: `cap add android`／Manifest設定／ブリッジのプラットフォーム別ID対応
- [ ] Android: アイコン設定・署名AAB生成・クローズドテストへアップロード（あなた）
- [ ] Android: 本番用 実広告ユニット差し替え＋本番申請（iOSリリース後）
