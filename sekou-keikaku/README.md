# 施工計画書たたき台ジェネレーター（無料版）

コンクリート工事の施工計画書ドラフトを生成するWebツール。
KYフォームツールと同じ Vercel 構成（静的HTML + Serverless Function）。

## ファイル構成

```
sekou-keikaku/
├── index.html        … フロントエンド（フォーム＋結果表示）
├── api/
│   └── generate.js   … Anthropic API を呼ぶ Serverless Function
└── README.md
```

## デプロイ手順（Vercel）

1. このフォルダを Vercel プロジェクトとしてデプロイ
   （GitHubリポジトリ連携 or `vercel` CLI どちらでも可）
2. Vercel ダッシュボード → Settings → Environment Variables で
   `ANTHROPIC_API_KEY` を設定（★コードに直書きしない）
3. 再デプロイして `https://<プロジェクト名>.vercel.app/` で動作確認

## WordPress への埋め込み

カスタムHTMLブロックで iframe 埋め込み：

```html
<iframe src="https://<プロジェクト名>.vercel.app/"
        style="width:100%;height:1800px;border:none;"
        title="施工計画書たたき台ジェネレーター"></iframe>
```

※ 高さは記事側で調整。スマホは縦長になるので 2000px 程度を推奨。

## 確認しておくべき設定

- `api/generate.js` の CORS は現在 `*`（全許可）。公開後、
  `Access-Control-Allow-Origin` を自ブログのドメインに絞るとより安全。
- モデルは `claude-sonnet-4-6` を指定。変更する場合は generate.js の
  `model` を書き換える。
- 入力サイズ上限（20,000文字）とPOST制限で簡易的な濫用対策済み。
  アクセスが増えたら Vercel 側でレート制限の追加を検討。

## 無料版の仕様（プロンプトに織り込み済み）

- 確認ポイントは各章3点まで → 省略分は「▶ 製品版ではあと◯点出力」と表示
- 空欄は「※要確認（未入力）」で出力（勝手に数値を補完しない）
- 一般論の数値は「一般に〜とされる」＋仕様書確認の但し書き付き
- 工期から寒中／暑中を自動判定（フロント側で判定して確定値をAPIに渡す）

## 製品版で追加する機能（今後の実装）

- 全工種対応（鉄筋・型枠・鉄骨・土工事・内装・防水ほか）
- 確認ポイントの網羅出力（systemプロンプトの差し替えのみ）
- Word（.docx）出力 ─ ※要確認箇所の黄色ハイライト
- 入力内容の保存・呼び出し
