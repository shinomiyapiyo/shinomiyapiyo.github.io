# CLAUDE.md — shinomiyapiyo.github.io（公式サイト）

このリポジトリは shinomiyapiyo.github.io の公式サイト。ゲーム本体はここには置かず、各ゲームの独立リポジトリにある。

## 構成

- index.html — トップページ（ライブ情報・各種リンク）
- 14banchi.html — 14番地の紹介ページ
- games/piyo-adventure/ — ぴよ氏の冒険の旧URL。新URL /piyos-adventure/ へのリダイレクトのみ
- games/14banchi/ — 14番地の旧URL。/14banchi.html へのリダイレクトのみ

## ゲーム本体は別リポジトリ

- ぴよ氏の冒険 → shinomiyapiyo/piyos-adventure（Public、/piyos-adventure/ で公開中）
- 14番地 → shinomiyapiyo/14banchi（Private、ネイティブ版）

ゲームのコードやアセットはこのリポジトリでは編集しない。games/ 配下にはリダイレクト用の index.html と自壊 sw.js だけを置く。

## ライブ情報の管理

- 過去のライブ情報は HTML から削除しない。日付が過ぎたイベントは JavaScript で自動的に非表示になるため、データとして残しておく

## 画像の扱い（必須ルール）

- ユーザーがアップした画像は、指示がなくても必ずリネームとリサイズを行ってから使用する（毎回の指示は不要）。
  - リネーム: 内容が分かる命名にする。ライブ画像は `live-YYYYMMDD-<会場や催事>-<flyer|timetable等>.jpeg` 形式に統一する
  - リサイズ: 横幅1000px程度（正方形ジャケット等は800px程度）・JPEG品質80前後・optimize 有効で圧縮する。目安は数百KB以内
  - 元のアップロード名のファイル（例: ランダムなIDのjpeg）はリネーム後に `git rm` で削除する
- 上記の取得・リサイズ・命名は `tools/add-live-image.py` にまとめてある。手作業で Pillow を書かずにこれを使う。

```
python3 tools/add-live-image.py <取得元> <名前>
```

- `<取得元>` は X の画像URL / X のメディアIDだけ / ローカルのファイルパス のいずれでもよい
- `<名前>` は拡張子なし（例: `live-20260809-badknee-sendai`）
- X の画像URLから直接取れるのは、環境のネットワーク許可リストに `pbs.twimg.com` が入っている場合のみ。
  入っていない場合はエラーメッセージでその旨を知らせるので、ユーザーに画像を送ってもらう従来の方法に切り替える

## Git 操作

- ユーザー（shinomiyapiyo）は git 操作に詳しくないので、必要な手順は具体的に分かりやすく案内する
- push / merge などリモートに影響する操作は Claude が勝手に実行せず、ユーザーが確認・実行する。Claude はコマンドと手順を案内する役割
- git の結果（log / status / ls-remote）を実際に確認してから報告する。成功したはず、で報告しない
- ツールの出力が想定と違っても、環境やサンドボックスのせいだと決めつけない。まず自分のコマンドや前提を疑う
