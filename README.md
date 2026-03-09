# SparkJoy

静的サイトとして動作するエディタです（`index.html` + `app.js` + `styles.css`）。

## ブランチの変更を試す方法

### 1) ローカルで今のブランチを試す

```bash
python -m http.server 4173 --bind 0.0.0.0
# ブラウザで http://localhost:4173/index.html
```

### 2) GitHub Pages で公開して試す

このリポジトリには `.github/workflows/deploy-pages.yml` を追加済みです。

- `main` に push すると自動で GitHub Pages にデプロイされます。
- 手動実行したい場合は、Actions タブから **Deploy static site to GitHub Pages** を `workflow_dispatch` で実行できます。

#### 初回だけ必要な設定

1. GitHub リポジトリの **Settings > Pages** を開く
2. **Build and deployment** の Source を **GitHub Actions** にする

デプロイ成功後、Actions の実行ログに公開URLが表示されます。

## 補足

- これは静的配信なので、ビルド手順は不要です。
- `sounds/` 配下もそのまま配信されます。
