function buildStep2LayoutJudgePrompt({
  markdown,
  renderedText,
  localIssues,
  attemptNumber,
}) {
  return `あなたはMarpスライドのレイアウト検査員です。
添付PDFはMarp Markdownから実際にレンダリングしたスライドです。PDFの見た目を確認し、次の観点だけで判定してください。

OK条件:
- 数式が $$ や \\( \\) のような生の記法として表示されていない
- 数式が数式として自然に表示されている
- テキストや表がスライド外へ見切れていない
- 文字量が多すぎて読めないスライドがない
- ページ番号やロゴと本文が不自然に重なっていない

NGの場合は、修正しやすいように「何枚目の何が問題か」を具体的に書いてください。
判定は厳しめでよいですが、軽微な余白の多さだけではNGにしないでください。

必ず次のJSONだけを返してください。Markdownや説明文は禁止です。
{
  "ok": true,
  "summary": "短い総評",
  "issues": [
    {
      "severity": "error または warning",
      "slide": 3,
      "type": "raw_math_visible / clipped_text / overcrowded / overlap / other",
      "message": "具体的な問題"
    }
  ]
}

試行回数: ${attemptNumber}

ローカル検査で見つかった懸念:
${JSON.stringify(localIssues, null, 2)}

PDF抽出テキストの一部:
${renderedText.slice(0, 6000)}

元Markdown:
${markdown.slice(0, 30000)}`;
}

function buildStep2LayoutCorrectionPrompt({
  currentMarkdown,
  issues,
  attemptNumber,
}) {
  return `あなたはMarp Markdownの修正担当です。
現在のMarkdownを、添付されたレンダリング済みPDFのレイアウト問題に基づいて修正してください。

目的:
- PDF化したときに数式が生の $$ や \\( \\) として見えないようにする
- 文字が見切れる/詰まりすぎる場合は、内容を削りすぎず、スライドを分割して解決する
- 1枚に書きすぎない
- 論文内容から外れた新情報は足さない

絶対ルール:
- 出力は完全なMarp Markdownのみ
- コードフェンス、説明文、JSONは禁止
- frontmatterとタイトルスライドは維持する
- 既存のKaiRAテンプレート用class指定は維持する
- 数式はHTMLタグ内に入れない
- ブロック数式は $$ を単独行で使う
- インライン数式がレンダリング上不安定な箇所は、x_t や H(x) のようなプレーン表記に置き換えてよい
- 見切れ対策では、1枚のスライドを2枚に分割することを優先する
- 左上見出しに「7. 実験設定」のような章番号は付けない
- 図は実画像を入れず、[ここに論文Figure Xを入れる] のようなプレースホルダーにする

今回の試行: ${attemptNumber}

検出された問題:
${JSON.stringify(issues, null, 2)}

現在のMarkdown:
${currentMarkdown}`;
}

module.exports = {
  buildStep2LayoutJudgePrompt,
  buildStep2LayoutCorrectionPrompt,
};
