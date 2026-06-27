#!/usr/bin/env bash
# iOSプロジェクト生成後(npx cap add ios)に1回実行して、Info.plist へ
#   ・AdMob アプリID (GADApplicationIdentifier)
#   ・画面の横向き固定
# を適用する。冪等（何度実行してもOK）。ios/ はgit管理外なので、再生成時はこれを再実行。
#
# 使い方:  cd games/14banchi && bash configure-ios.sh
set -e
PLIST="ios/App/App/Info.plist"
PB="/usr/libexec/PlistBuddy"

if [ ! -f "$PLIST" ]; then
  echo "ERROR: $PLIST が見つかりません。先に 'npx cap add ios' を実行してください。" >&2
  exit 1
fi

# --- AdMob アプリID ---
"$PB" -c "Delete :GADApplicationIdentifier" "$PLIST" 2>/dev/null || true
"$PB" -c "Add :GADApplicationIdentifier string ca-app-pub-4148293353679224~5712611505" "$PLIST"

# --- 横向き固定 (iPhone) ---
"$PB" -c "Delete :UISupportedInterfaceOrientations" "$PLIST" 2>/dev/null || true
"$PB" -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
"$PB" -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationLandscapeLeft" "$PLIST"
"$PB" -c "Add :UISupportedInterfaceOrientations:1 string UIInterfaceOrientationLandscapeRight" "$PLIST"

# --- 横向き固定 (iPad) ---
"$PB" -c "Delete :UISupportedInterfaceOrientations~ipad" "$PLIST" 2>/dev/null || true
"$PB" -c "Add :UISupportedInterfaceOrientations~ipad array" "$PLIST"
"$PB" -c "Add :UISupportedInterfaceOrientations~ipad:0 string UIInterfaceOrientationLandscapeLeft" "$PLIST"
"$PB" -c "Add :UISupportedInterfaceOrientations~ipad:1 string UIInterfaceOrientationLandscapeRight" "$PLIST"

plutil -lint "$PLIST"
echo "OK: Info.plist に AdMobアプリID と 横向き固定 を適用しました。"
