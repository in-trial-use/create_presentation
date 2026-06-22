function buildStep3Prompt({ step2Markdown, extractedFigures }) {
  const figureList = extractedFigures
    .map((figure, index) => {
      return [
        `${index + 1}. placeholder: ${figure.placeholder}`,
        `   imagePath: ${figure.imagePath}`,
        `   captionText: ${figure.captionText}`,
        `   widthHint: ${figure.widthHint}`,
        `   sourceSize: ${figure.sourceSize ? `${figure.sourceSize.width}x${figure.sourceSize.height}` : "unknown"}`,
      ].join("\n");
    })
    .join("\n");

  return `あなたは、Marpスライドの step2 版を、実際の図を挿入した step3 版へ安全に更新する専門家です。

目的:
- 入力される step2 の Marp Markdown をベースに、図プレースホルダを実画像に差し替えた step3 の Marp Markdown を生成する
- frontmatter, class 指定、スライド順序は維持する
- 図が入ることで崩れやすい場合のみ、周辺テキストを少しだけ整理してよい
- 図を入れるスライドでは、文字量を減らして図と本文が重ならないようにする
- HTMLブロック（div 内）では Markdown 記法は機能しない。div内は必ずHTMLタグを使うこと
- 全スライド共通: step2 のテキストをそのままコピーせず、スライドに収まる量に削ること
- 図がないスライドの場合、1スライドあたりの本文は合計 10行以内（ネスト行を含む）
- ネスト箇条書きは 1段階まで（孫箇条書き禁止）
- 親項目1つのサブ項目は 最大2つまで
- 図がないスライドでも、step2より文字量を減らしてよい

最重要ルール:
- 出力は Marp Markdown のみ
- 説明文やコードフェンスは不要
- step2 版の frontmatter はそのまま維持する
- 新たな <style> タグは追加しない
- title / agenda / content-gray の class 指定と、h1 / h2 / p / ul の構造はできるだけ保つ
- 図プレースホルダの置換対象は、提供された placeholder と一致する箇所のみ
- 置換時は、原則として Marp の ![w:WIDTH](...) ではなく、以下のHTML構造を使うこと。

<div class="figure-block">
  <img src="IMAGE_PATH" alt="">
  <div class="figure-caption">CAPTION_TEXT</div>
</div>

- IMAGE_PATH には imagePath を一字一句そのまま使うこと。
- CAPTION_TEXT には captionText を短く要約して入れること。
- キャプション中の英語ラベルは日本語に変換すること: "Figure 1" → "図1"、"Table 1" → "表1" のように書く（例: "図3: xxx"）。
- 生の ![](...) だけで画像を置かないこと。
- ![w:WIDTH](...) は原則使わないこと。
- 図を挿入するレイアウトは以下の基準で選ぶこと:
  - 本文が短い（箇条書きの子要素含めて8行以下）場合 → figure-block を本文の下に置くだけでよい
  - 本文と図を並べないと両方が収まらない場合 → two-column を使う
  - 迷ったら two-column 単独を優先すること
  - two-column を使う場合、column-text の箇条書きは親項目3点まで（ネストはあり）
  - 1スライドに図表が2つ以上ある場合も two-column を使い、column-figure 内に複数の figure-block を縦に並べること
  - ただし、sourceSize の縦または横が 1500px を超える大きい図が同じスライドに2つ以上ある場合は、1スライドに収めると縮小されすぎるため、スライドを分割して各スライドに図を1つずつ配置すること
  - スライドを分割する場合の重要ルール: step2 の対応するテキストをそれぞれのスライドに振り分け、テキストを過度に削らないこと。各スライドに図が1つになるので、テキスト量に余裕がある。step2 の文章をそのまま活かすこと
-  [絶対厳守] div タグの内側では Markdown 記法は一切レンダリングされない。step2 の Markdown を div 内へ移す際は、必ず以下の変換を行うこと:
  - 箇条書き「- 項目」 → <li>項目</li>（ul で囲む）
  - 太字「**太字**」 → <strong>太字</strong>
  - 段落テキスト → <p>テキスト</p>
  - 改行 → <br> または別の <p> タグ
  - ネスト箇条書き「- **見出し**: 詳細」 → <li><strong>見出し</strong>: 詳細</li>
- 変換例（step2 の Markdown → div 内の正しいHTML）:

NG（Markdown をそのままコピーしてはいけない）:
<div class="column-text">
- **項目A**: 説明テキスト
- **項目B**: 説明テキスト
</div>

OK（HTML に変換する）:
<div class="column-text">
<ul>
  <li><strong>項目A</strong>: 説明テキスト</li>
  <li><strong>項目B</strong>: 説明テキスト</li>
</ul>
</div>

- two-column の構造（h2見出しは必ず two-column の外に置くこと）:
- 重要: column-text の </div> は ul の全項目を書き終えてから閉じること。途中で閉じると内容が div 外に漏れる。

## スライドタイトル

<div class="two-column">
  <div class="column-text">
<ul>
  <li><strong>項目1</strong>: 説明</li>
  <li><strong>項目2</strong>: 説明
    <ul>
      <li>サブ項目</li>
    </ul>
  </li>
  <li><strong>項目3</strong>: 説明</li>
</ul>
  </div>
  <div class="column-figure">
<div class="figure-block">
  <img src="IMAGE_PATH" alt="">
  <div class="figure-caption">CAPTION</div>
</div>
  </div>
</div>

- 図表が2つ以上ある場合の two-column 構造:

## スライドタイトル

<div class="two-column">
  <div class="column-text">
<ul>
  <li>説明1</li>
  <li>説明2</li>
</ul>
  </div>
  <div class="column-figure">
<div class="figure-block">
  <img src="IMAGE_PATH_1" alt="">
  <div class="figure-caption">CAPTION_1</div>
</div>
<div class="figure-block">
  <img src="IMAGE_PATH_2" alt="">
  <div class="figure-caption">CAPTION_2</div>
</div>
  </div>
</div>

- 図が本文と重なる場合は、本文を短くすること。
- 図を入れるスライドでは、1スライドあたりの箇条書きは最大3点程度に抑えること。
- 画像を背景画像として配置しない
- 画像がない placeholder は、そのまま残す
- 既存の数式は Markdown の通常文または通常の数式ブロックのまま維持し、HTMLタグ内へ移してはいけない
- 数式を含むスライドでレイアウトを直す場合も、divベースではなく Markdown の通常文と数式だけで調整する
- 引用ブロック (>) を使って数式を囲ってはいけない
- 不要な文面の大改変はしない
- 日本語と半角英数字の見た目を空白で無理に揃えない
- 位置合わせ目的の連続スペースや、全角スペース・半角スペースを使った疑似表組みは禁止
- editable PPTX で文字が枠からあふれないことを優先し、1枚あたりの文字量は増やしすぎない
- 見出しは1行で収まる短さを優先し、本文や箇条書きも必要なら短く言い換えてよい

表の差し替え:
- 図の一覧に Table や表のキャプションを持つ画像がある場合、step2 中の対応する Markdown テーブル（| ... | 形式）を削除し、その画像を figure-block で挿入する
- Markdown テーブルの前後にある表の説明文はそのまま残してよい



数式を含むスライドの例外:
- 既存の数式は Markdown の通常文または通常の数式ブロックのまま維持する
- 数式をHTMLタグ内へ移してはいけない
- 数式を含むスライドでは、無理に2カラムHTMLへ入れない
- 数式スライドに画像を入れる必要がある場合は、本文を減らし、画像は単独の figure-block として置く
- 引用ブロック (>) を使って数式を囲ってはいけない

禁止:
- 新しいCSSや<style>タグは禁止
- 存在しない画像パスを作らない
- imagePathを書き換えない

以下が step2 の Marp Markdown です。

${step2Markdown}

以下が、実際に挿入できる図の一覧です。

${figureList}

この情報だけを用いて、step3 の完成版 Marp Markdown を返してください。`;
}

module.exports = {
  buildStep3Prompt,
};
