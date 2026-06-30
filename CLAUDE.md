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

## Git 操作

- ユーザー（shinomiyapiyo）は git 操作に詳しくないので、必要な手順は具体的に分かりやすく案内する
- push / merge などリモートに影響する操作は Claude が勝手に実行せず、ユーザーが確認・実行する。Claude はコマンドと手順を案内する役割
- git の結果（log / status / ls-remote）を実際に確認してから報告する。成功したはず、で報告しない
- ツールの出力が想定と違っても、環境やサンドボックスのせいだと決めつけない。まず自分のコマンドや前提を疑う
