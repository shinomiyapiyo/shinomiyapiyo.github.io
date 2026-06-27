#!/usr/bin/env bash
# android/ 生成後(npx cap add android)に1回実行して、AndroidManifest.xml へ
#   ・AdMob App ID (com.google.android.gms.ads.APPLICATION_ID) … 現在はGoogleテスト用
#   ・画面の横向き固定 (screenOrientation=sensorLandscape)
# を適用する。冪等（既に入っていればスキップ）。android/ はgit管理外なので再生成時はこれを再実行。
#
# 使い方:  cd games/14banchi && bash configure-android.sh
set -e
M="android/app/src/main/AndroidManifest.xml"
[ -f "$M" ] || { echo "ERROR: $M が見つかりません。先に 'npx cap add android' を実行してください。" >&2; exit 1; }

# 横向き固定
if ! grep -q 'android:screenOrientation' "$M"; then
  perl -0pi -e 's/(android:configChanges="orientation\|keyboardHidden\|keyboard\|screenSize\|locale\|smallestScreenSize\|screenLayout\|uiMode")/$1\n            android:screenOrientation="sensorLandscape"/' "$M"
fi

# AdMob App ID（テスト用。本番Android広告ユニット作成後に実IDへ差し替え）
if ! grep -q 'com.google.android.gms.ads.APPLICATION_ID' "$M"; then
  perl -0pi -e 's/(android:theme="\@style\/AppTheme">)/$1\n\n        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="ca-app-pub-3940256099942544~3347511713"\/>/' "$M"
fi

echo "OK: AndroidManifest に AdMob App ID（テスト用）と 横向き固定 を適用しました。"
