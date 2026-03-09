# SparkJoy

静的サイトとして動作するエディタです（`index.html` + `app.js` + `styles.css`）。

## ローカルで試す

```bash
python -m http.server 4173 --bind 0.0.0.0
# ブラウザで http://localhost:4173/index.html
```

## 補足

- これは静的配信なので、ビルド手順は不要です。
- `sounds/` 配下もそのまま配信されます。
