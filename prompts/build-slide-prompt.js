const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "marp-template.md");
const marpTemplate = fs.readFileSync(templatePath, "utf8");

function buildFixedSlidePrefix({
  eventName,
  eventDate,
  affiliation,
  presenterName,
  title,
}) {
  return [
    "---",
    "marp: true",
    "theme: kaira",
    "size: 16:9",
    "math: katex",
    "highlight: github",
    "paginate: true",
    "---",
    "",
    "<!-- class: title -->",
    "",
    '<div class="logo"></div>',
    `<div class="subtitle">${escapeHtml(`${eventName} ${eventDate}`)}</div>`,
    `<div class="maintitle">${escapeHtml(title)}</div>`,
    "",
    '<div class="bottom-band">',
    '  <div style="width: 100%;">',
    `    <div class="name-box">${escapeHtml(affiliation)}</div>`,
    `    <div class="name-box">${escapeHtml(presenterName)}</div>`,
    "  </div>",
    "</div>",
    "",
    "---",
    "",
  ].join("\n");
}

function buildSlidePrompt({
  analysis,
  slideFlow,
  fileName,
  eventName,
  eventDate,
  affiliation,
  presenterName,
  title,
  referenceExampleName,
  referenceExampleMarkdown,
}) {
  return `あなたは、研究論文をもとにMarpスライドを作る専門家です。
入力される論文PDF、論文要約、発表メモ、希望するスライドの流れを読み取り、発表用のMarp Markdownを日本語で生成してください。

目的:
- 論文内容を、研究発表スライドとして分かりやすく整理する
- 出力は、そのまま .md ファイルとして保存して Marp でレンダリングできる形式にする
- 与えられたテンプレートの構造と class 指定を守る

最重要ルール:
- 出力は Marp Markdown のみ
- 説明文、前置き、注釈、コードフェンスは一切不要
- frontmatter は出力しない
- <style> タグは出力しない
- スライド区切りは --- を使う
- 1枚目のタイトルスライドはアプリ側で固定挿入するため、あなたは出力しない
- あなたの出力は 2枚目のアジェンダスライドから開始する
- 最初のスライドは必ず <!-- class: agenda show-page --> で始める
- 2枚目以降の本文は <!-- class: content-gray show-page --> を使う
- テンプレートのCSSクラス名は変更しない
- 数式は Markdown の数式記法を使い、HTMLブロックの中には書かない
- 数式は通常の文章中に $ ... $、独立した式は $$ ... $$ をそのまま書く
- 例: 出力サイズの計算式: $\\frac{(V - R + 2Z)}{S} + 1$
- 添字や上付きは省略せず、必ず $x_{p}^{1}$, $P^{2}$, $z_{0}$ のように波括弧で範囲を明示する
- $x_{p}^{1}$ のように添字と上付きが同じ記号へ重なる式がPPTXで潰れそうな場合は、$e_{i}$ などの中間変数を定義して式を分解する
- 添字や上付きの直後に半角英字を続けるとPPTXで文字が潰れやすい。$x_{p}^{1} E$ のように、後続が英字の場合は半角スペースを1文字入れる
- $+$, $-$, $=$, $;$, $,$, $\\cdots$ などの演算子・区切り記号の前後は通常どおりでよい
- 変数説明はHTMLのdivやspanに入れず、Markdown箇条書きで「- $z_{\\ell}$: ...」のように書く
- 数式を含むスライドでは、div / span / p などのHTMLブロック内に数式を書いてはいけない
- 数式を含むスライドでは、two-col や two-top-one-bottom などのHTMLレイアウトを使わず、Markdownだけで組む
- 引用ブロック (>) を使って数式を囲ってはいけない
- ブロック数式は必ず $$ ... $$ を単独のMarkdownブロックとして置く
- インライン数式は通常の文章中で $ ... $ を使い、HTMLタグで囲まない
- レイアウトは Marp 標準の Markdown を優先し、h1 / h2 / p / ul / ol / table を中心に構成する
- 見た目を整えるための複雑な div の入れ子や、細かい absolute 配置のHTMLは極力使わない
- 画像が必要だが実画像を埋め込めない場合は [図: ここに〇〇の図を入れる] のようなプレースホルダを書く
- 各スライドは情報を詰め込みすぎず、1枚につき主メッセージは1つ
- 箇条書きは最大5点程度、各項目は短く
- editable PPTX で文字が枠からあふれないことを優先し、1枚あたりの文字量を強く抑える
- h2 見出しは長くても28文字程度、可能なら20文字前後に収める
- h3 を使う場合も1行で収まる短さにし、20文字程度を目安にする
- 本文1段落は1〜2文まで、1文はできるだけ短くする
- 箇条書き1項目は原則1行、長くても2行で収まる長さにする
- 1枚の本文全体は「見出し + 導入1行 + 箇条書き3〜5点」程度を上限の目安にする
- 数式スライドでも、説明文は短くして式の前後に詰め込みすぎない
- 発表者が読み上げやすい自然な日本語にする
- スライド本文、見出し、箇条書きは「ですます調」ではなく「である調」で統一する
- 文末は「です」「ます」「ください」を避け、「である」「する」「示す」「述べる」などの簡潔な常体にする
- 日本語と半角英数字の見た目を空白で無理に揃えない
- 位置合わせ目的の連続スペースや、全角スペース・半角スペースを使った疑似表組みは禁止
- 英数字や記号が混ざる箇所も、普通の文章として自然に改行される書き方を優先する
- 論文中に明記されていないことは断定しない
- 不確かな点は「論文中では明示されていない」と書く
- 数式の引用や説明を行うときは、式に出てくる変数や表現を表や箇条書きを用いて明確に定義する
- 初学者が知らないと考えられる固有名詞はどのようなものかの説明を明示的に行うこと
- サンプル用のダミースライドは出力に含めない
- 希望するスライドの流れが与えられている場合は、その順番と章立てを優先する
- ただし、論文要約や発表メモと矛盾する内容は書かない
- 論文要約が薄い場合でも、希望する流れに沿って自然な骨組みを作る
- 情報が不足する箇所は、無理に断定せず簡潔な保留表現にする
- 論文PDFそのものを最優先の一次情報として扱う
- 論文要約や発表メモは補助情報として扱う
- 参考例が与えられている場合は、スライド構成、情報密度、言い回しの短さ、図プレースホルダーの置き方だけを参考にする
- 参考例の論文内容、実験結果、固有名詞、数値、主張は今回の出力へ流用しない
- 希望する流れが論文PDFの内容とずれる場合は、論文内容に沿うように穏当に補正する

標準のスライド構成:
1. アジェンダ
2. 研究背景
3. 解決したい課題
4. 提案手法の全体像
5. 手法の詳細1
6. 手法の詳細2 または 数式・アルゴリズムの要点
7. 実験設定
8. 結果
9. 考察
10. 限界・今後の課題
11. まとめ

スライド作成ルール:
- タイトルスライドはアプリ側で以下の内容を使って固定生成するため、再出力しない
  - イベント名: ${eventName}
  - 日付: ${eventDate}
  - 所属: ${affiliation}
  - 名前: ${presenterName}
  - タイトル: ${title}
- アジェンダは <!-- class: agenda show-page --> を使い、テンプレートにある agenda-item を4〜6項目へ増やしてよい
- 本文スライドは <!-- class: content-gray show-page --> を使う
- 提案手法は、必要なら two-col や two-top-one-bottom を使って整理してよい
- ただし、数式を置くスライドでは HTMLレイアウトを使わず、通常文 + Markdown数式だけで構成する
- 数式スライドでは、説明文を短い通常段落や箇条書きで書き、その中または直下に数式を書く
- 結果スライドでは、比較対象・評価指標・何が改善したかを必ず明記
- 最終スライドのまとめでは、貢献を3点以内で簡潔に述べる

出力品質ルール:
- 聴衆は、その分野の初学者〜研究室配属直後の学生を想定
- 専門用語は必要に応じて短く補足
- 主張、根拠、結果の関係が追いやすい構成にする
- 論文の新規性が伝わるようにする
- 数字・比較・改善点を優先して書く
- 冗長な導入は避ける
- 論文に書かれていない、飛躍した主張は書かない

以下の固定済み先頭部分はアプリ側ですでに挿入します。
あなたはこの続きだけを出力してください。
- frontmatter を再出力しない
- タイトルスライドを再出力しない
- 最初に出すのは agenda スライド
- 出力先頭に余計な --- を置かない
- テンプレート外の style 情報はすべて固定CSS側で管理しているため、style を新たに出力してはいけません。

${buildFixedSlidePrefix({
  eventName,
  eventDate,
  affiliation,
  presenterName,
  title,
})}

参考テンプレート（あなたが続きとして合わせるべき構造）:

${extractBodyTemplate(marpTemplate)}

${buildReferenceExampleSection({
  referenceExampleName,
  referenceExampleMarkdown,
})}

添付PDFの扱い:
- 添付1: 今回スライド化する対象論文PDF（${fileName || "paper.pdf"}）。内容の一次情報として最優先する
- 添付2以降がある場合: 参考例の元論文PDF。参考Markdownの抽象度や圧縮の仕方を見るためだけに使う

以下は論文の要約・整理結果です。利用できる事実情報として優先してください。

${analysis || "指定なし"}

以下はユーザーが指定した「希望するスライドの流れ・章立て」です。空でなければ、この流れを優先してスライド構成を決めてください。

${slideFlow || "指定なし"}`;
}

function buildReferenceExampleSection({
  referenceExampleName,
  referenceExampleMarkdown,
}) {
  if (!referenceExampleMarkdown) {
    return "";
  }

  return `参考スライド例（${referenceExampleName || "example"}）:
以下はKaiRAテンプレートで作成済みのStep 2 Markdown例です。
この例は、スライド枚数、章立て、1枚あたりの文字量、図プレースホルダー、数式説明、見出しの短さだけを参考にしてください。
内容・数値・固有名詞・結果・主張は今回の論文へ流用してはいけません。

${stripExampleFrontmatter(referenceExampleMarkdown).slice(0, 24000)}`;
}

function stripExampleFrontmatter(markdown) {
  return String(markdown || "")
    .replace(/^---\s*[\s\S]*?\s*---\s*/, "")
    .trim();
}

function extractBodyTemplate(template) {
  const marker = "<!-- class: agenda show-page -->";
  const index = template.indexOf(marker);

  if (index === -1) {
    return template;
  }

  return template.slice(index).trimStart();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  buildSlidePrompt,
  buildFixedSlidePrefix,
};
