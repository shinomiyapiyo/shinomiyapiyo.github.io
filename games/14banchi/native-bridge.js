// native-bridge.js — Capacitor(iOS) ネイティブ連携ブリッジ
// Web/PWA では何もしない（no-op）= 既存コードが自動で「広告なし」動作のまま。
//
// 既存ゲーム index.html が呼ぶ受け口をネイティブで実装する:
//   window.nativeShowRewardedAd(onRewarded, onSkipped)  ← コンプリートの復活（リワード広告）
//   window.showInterstitialAd(onDismiss)                ← もう一度/タイトル遷移（インタースティシャル）
//   window.adRemoved / window.livesUpgrade              ← 課金フラグ（将来IAPで使用・今は未使用）
//   window.pauseGame / window.resumeGame                ← ライフサイクル（index.html側で定義済み）
//
// ⚠ AdMobプラグインのメソッド名/イベント名は @capacitor-community/admob のバージョンに依存します。
//   実機ビルド(ロードマップ Step5)時に、入っているプラグインのドキュメントで要確認・要微調整。
(function () {
  'use strict';
  var Cap = window.Capacitor;
  // ネイティブ(iOS)以外（Web/PWA）では広告ブリッジを定義しない → 既存コードが広告ゼロで動作
  if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return;

  // ====== 設定 ======
  // ★本番ビルド時は false にする。テスト中は必ず true（自分のクリックでのAdMobポリシー違反防止）
  var USE_TEST_ADS = true;
  // インタースティシャルは N 回に1回だけ表示（毎回は審査・体験的にNG）
  var INTERSTITIAL_EVERY_N = 3;
  // ATT(トラッキング許可)。初回は非パーソナライズ広告で回避(案A)＝false。採用時は true。
  var REQUEST_ATT = false;

  // 本番ID（AdMob発行 / アプリID ca-app-pub-4148293353679224~5712611505 は Info.plist 側）
  var PROD = {
    rewarded: 'ca-app-pub-4148293353679224/2368262869',
    interstitial: 'ca-app-pub-4148293353679224/8545824256'
  };
  // Google公式テストID（開発用）
  var TEST = {
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910'
  };
  var IDS = USE_TEST_ADS ? TEST : PROD;

  var AdMob = Cap.registerPlugin('AdMob');
  var AppPlugin = Cap.registerPlugin('App');

  // ====== 初期化 ======
  AdMob.initialize({
    initializeForTesting: USE_TEST_ADS,
    requestTrackingAuthorization: REQUEST_ATT
  }).then(function () {
    preloadRewarded();
    preloadInterstitial();
  }).catch(function (e) { console.warn('[14b:admob] init', e); });

  // ====== リワード広告（復活） ======
  var rewardedReady = false, pendingReward = null, earned = false;

  function preloadRewarded() {
    rewardedReady = false;
    AdMob.prepareRewardVideoAd({ adId: IDS.rewarded, isTesting: USE_TEST_ADS })
      .then(function () { rewardedReady = true; })
      .catch(function (e) { console.warn('[14b:admob] prepareRewarded', e); });
  }
  // ※イベント名は要バージョン確認（v6想定）
  AdMob.addListener('onRewardedVideoAdReward', function () { earned = true; });
  AdMob.addListener('onRewardedVideoAdDismissed', function () {
    var cb = pendingReward; pendingReward = null;
    var got = earned; earned = false;
    preloadRewarded();
    if (cb) { if (got) cb.onRewarded(); else if (cb.onSkipped) cb.onSkipped(); }
  });

  window.nativeShowRewardedAd = function (onRewarded, onSkipped) {
    if (!rewardedReady) { if (onSkipped) onSkipped(); return; }
    pendingReward = { onRewarded: onRewarded, onSkipped: onSkipped };
    earned = false;
    AdMob.showRewardVideoAd().catch(function (e) {
      console.warn('[14b:admob] showRewarded', e);
      var cb = pendingReward; pendingReward = null;
      preloadRewarded();
      if (cb && cb.onSkipped) cb.onSkipped();
    });
  };

  // ====== インタースティシャル（遷移） ======
  var interReady = false, interCount = 0, pendingInter = null;

  function preloadInterstitial() {
    interReady = false;
    AdMob.prepareInterstitial({ adId: IDS.interstitial, isTesting: USE_TEST_ADS })
      .then(function () { interReady = true; })
      .catch(function (e) { console.warn('[14b:admob] prepareInter', e); });
  }
  AdMob.addListener('onInterstitialAdDismissed', function () {
    var cb = pendingInter; pendingInter = null;
    preloadInterstitial();
    if (cb) cb();
  });

  window.showInterstitialAd = function (onDismiss) {
    interCount++;
    // 頻度間引き or 未ロード時は広告を出さず即コールバック（遷移は止めない）
    if (!interReady || (interCount % INTERSTITIAL_EVERY_N) !== 0) {
      if (onDismiss) onDismiss();
      return;
    }
    pendingInter = onDismiss;
    AdMob.showInterstitial().catch(function (e) {
      console.warn('[14b:admob] showInter', e);
      var cb = pendingInter; pendingInter = null;
      preloadInterstitial();
      if (cb) cb();
    });
  };

  // ====== ライフサイクル（バックグラウンドで一時停止） ======
  AppPlugin.addListener('appStateChange', function (state) {
    try {
      if (state && state.isActive === false) { if (window.pauseGame) window.pauseGame(); }
      else if (state && state.isActive === true) { if (window.resumeGame) window.resumeGame(); }
    } catch (e) { console.warn('[14b:lifecycle]', e); }
  });

  console.log('[14b] native bridge ready (test ads: ' + USE_TEST_ADS + ')');
})();
