# create_presentation

arXiv論文のPDFをローカルで読み込み、Geminiで要約し、その結果からMarpスライドMarkdownまで作る最小プロトタイプです。

## アプリの流れ

1. Step 1でPDFをGeminiに送り、論文の背景・手法・結果などを整理
2. Step 2で専用に選んだPDFを一次情報として参照しながら、KaiRA向けMarpテンプレートのスライドMarkdownを生成
3. Step 3で、画面上のStep 2 Markdownをそのまま入力として使い、Step 3専用PDFまたはStep 2のPDFから図を抽出
4. 抽出結果のJSONを確認し、その結果を使って画像付き版を再生成
5. 必要なら、ユーザーが指定したスライドの流れ・章立てを優先して構成

Step 2は単体でPDFを受け取って生成できます。Step 1の要約や手入力メモ、流れ指定は任意の補助情報です。step2版とstep3版は `data/<base>/` 配下の別ファイルとして保存できます。

## 環境変数

- `GEMINI_API_KEY`: Gemini APIキー
- `GEMINI_MODEL`: 省略時のモデル名。デフォルトは `gemini-2.5-flash`
- `PORT`: ローカルサーバーのポート。デフォルトは `3000`
- `HOST`: 待ち受けホスト。デフォルトは `127.0.0.1`

## 起動方法

1. `.env.example` を `.env` にコピーして `GEMINI_API_KEY` を設定
2. サーバーを起動

```bash
node server.js
```
3. ブラウザで `http://localhost:3000` を開く

## 主なファイル構成

- `server.js`: ローカルHTTPサーバーとGemini連携
- `public/app.js`: Step 1のPDF解析UI
- `public/slide-shared.js`: Step 2 / Step 3 の共通UI処理
- `public/step2.js`: Step 2のスライド生成UI
- `public/step3.js`: Step 3の図抽出と再生成UI
- `lib/pdf-figure-extractor.js`: Step 3の図抽出処理（PDF内画像候補の選別ベース）
- `data/`: 生成したMarp Markdownの保存先
- `prompts/marp-template.md`: Marpテンプレート本体（frontmatter + スライド骨格）
- `themes/kaira.css`: 固定のMarpカスタムテーマ
- `.marprc.yml`: `themeSet` と `allowLocalFiles` の共通設定
- `prompts/build-slide-prompt.js`: Step 2用のGemini prompt生成
- `prompts/build-step3-prompt.js`: Step 3用のGemini prompt生成

## 補足

- Step 1 / Step 2 はPDF本体をGeminiへ渡し、Step 3 はブラウザ側PDF.jsでPDF内部画像を抽出してから候補選別する構成です
- 大きいPDFではブラウザ経由のbase64送信が重くなるため、次段階ではFiles API化やarXiv URL直接取得に進めるのがおすすめです
