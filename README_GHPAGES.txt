GitHub Pages デプロイ手順
===========================
1) GitHub で新しい公開リポジトリを作成（例: sparkjoy-ghp）
2) このフォルダ内のファイルを丸ごとアップロード（index.html, app.js, manifest.json, sw.js, icons/）
3) リポジトリの Settings → Pages → Source: 「Deploy from a branch」/ Branch: main / Folder: /(root) を選択
4) 数分後、 https://<ユーザー名>.github.io/<リポジトリ名>/ で公開されます
5) iPadで開いて、共有（□↑）→ ホーム画面に追加 → 以降はオフラインでも動作（初回はオンラインでキャッシュ）

注意:
- すべてのパスは相対（"./"）なので、サブパスでもOK。
- 更新が反映されない場合は sw.js の CACHE バージョンを上げて再コミット。
