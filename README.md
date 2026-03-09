# SparkJoy

静的サイトとして動作するエディタです（`index.html` + `app.js` + `styles.css`）。

## ブランチの変更を試す方法

### 1) ローカルで今のブランチを試す

```bash
python -m http.server 4173 --bind 0.0.0.0
# ブラウザで http://localhost:4173/index.html
```

### 2) GitHub Pages で公開して試す

このリポジトリには以下の workflow を追加済みです。

- `.github/workflows/deploy-pages.yml`（main / 手動実行向け）
- `.github/workflows/pr-preview-pages.yml`（PRプレビュー向け）

- `main` に push すると自動で GitHub Pages にデプロイされます。
- PR では `deploy-pages.yml` は検証のみ実行します。
- 同一リポジトリ内ブランチの PR は `pr-preview-pages.yml` で Pages プレビューをデプロイします（マージ前確認用）。
- フォークからの PR は権限制約のため、PR デプロイはスキップされます。
- 手動実行したい場合は、Actions タブから **Deploy static site to GitHub Pages** を `workflow_dispatch` で実行できます。

#### 初回だけ必要な設定

1. GitHub リポジトリの **Settings > Pages** を開く
2. **Build and deployment** の Source を **GitHub Actions** にする

デプロイ成功後、Actions の実行ログに公開URLが表示されます。

## 補足

- これは静的配信なので、ビルド手順は不要です。
- `sounds/` 配下もそのまま配信されます。


## トラブルシュート（「Deploy static site to GitHub Pages」が見つからない）

- **未マージのブランチだけに workflow がある**場合、Actions 一覧に出ないことがあります。
  - この場合は PR を作ると `deploy-pages.yml` で検証、`pr-preview-pages.yml` でプレビュー デプロイ（同一リポジトリ時）が走り、PR の Checks から確認できます。
- リポジトリで **Actions が無効**だと表示されません（Settings > Actions を確認）。
- フォーク先では Actions 制限で実行されないことがあります。
- `workflow_dispatch` は、workflow ファイルが GitHub 側で認識されるまで少し時間がかかる場合があります。
- `refs/pull/*/merge is not allowed to deploy` エラーが出る場合は、`pull_request_target` 側の実行結果で確認してください（同一リポジトリPRのみ対象）。
