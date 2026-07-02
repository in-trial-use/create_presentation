function buildStep2LayoutJudgePrompt({
  markdown,
  localIssues,
  attemptNumber,
}) {
  return `あなたはMarpスライドのレイアウト検査員です。
添付PDFは2つあります。
- 添付1: 元論文PDF。スライド内容が論文から外れていないかを確認するために参照してください。
- 添付2: Marp Markdownから実際にレンダリングしたスライドPDF。主に見た目を確認してください。

添付2のスライドPDFを確認し、次の観点で判定してください。内容の真偽確認が必要な場合だけ添付1の元論文PDFを参照してください。

OK条件:
- 数式が $$ や \\( \\) のような生の記法として表示されていない
- 数式が数式として自然に表示されている
- テキストや表がスライド外へ見切れていない
- 文字量が多すぎて読めないスライドがない
- ページ番号やロゴと本文が不自然に重なっていない
- 余分なページ（例：空白のみ）がない
- 文字が小さすぎるせいで、想定以上に空白が多いページになってしまっている（図は全体の1/4~1/3程度の空白を用いることを想定）
- 論文に書かれていない、飛躍した主張は書かない

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

元Markdown:
${markdown.slice(0, 30000)}`;
}

function buildStep2LayoutCorrectionPrompt({
  currentMarkdown,
  issues,
  attemptNumber,
}) {
  return `あなたはMarp Markdownの修正担当です。
添付PDFは2つあります。
- 添付1: 現在のMarp Markdownから実際にレンダリングしたスライドPDF。修正すべきレイアウト問題を確認してください。
- 添付2: 元論文PDF。内容を削りすぎたり、論文外の主張を足したりしないために参照してください。

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
- 添字や上付きは省略せず、必ず $x_{p}^{1}$, $P^{2}$, $z_{0}$ のように波括弧で範囲を明示する
- $x_{p}^{1}$ のように添字と上付きが同じ記号へ重なる式がPPTXで潰れている場合は、$e_{i}$ などの中間変数を定義して式を分解する
- 添字や上付きの直後に半角英字を続けるとPPTXで文字が潰れやすい。$x_{p}^{1} E$ のように、後続が英字の場合は半角スペースを1文字入れる
- $+$, $-$, $=$, $;$, $,$, $\\cdots$ などの演算子・区切り記号の前後は通常どおりでよい
- 変数説明はHTMLのdivやspanに入れず、Markdown箇条書きで「- $z_{\\ell}$: ...」のように書く
- インライン数式がレンダリング上不安定な箇所は、x_t や H(x) のようなプレーン表記に置き換えてよい
- 見切れ対策では、1枚のスライドを2枚に分割することを優先する
- 左上見出しに「7. 実験設定」のような章番号は付けない
- 図は実画像を入れず、[ここに論文Figure Xを入れる] のようなプレースホルダーにする
- 編集点などを出力するのではなく、あくまでMarkdown(スライド)のみを出力する

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
