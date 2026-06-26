function buildStep3Prompt({ step2Markdown, extractedFigures }) {
  const figureList = extractedFigures
    .map((figure, index) => {
      return [
        `${index + 1}. placeholder: ${figure.placeholder}`,
        `   imagePath: ${figure.imagePath}`,
        `   captionText: ${figure.captionText}`,
        `   widthHint: ${figure.widthHint}`,
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
- 1スライドあたりの本文は合計 10行以内（ネスト行を含む）
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
  <img src="IMAGE_PATH" alt="CAPTION_TEXT">
  <div class="figure-caption">CAPTION_TEXT</div>
</div>

- IMAGE_PATH には imagePath を一字一句そのまま使うこと。
- CAPTION_TEXT には captionText を短く要約して入れること。
- 生の ![](...) だけで画像を置かないこと。
- ![w:WIDTH](...) は原則使わないこと。
- 図を挿入するレイアウトは以下の基準で選ぶこと:
  - 本文が短い（箇条書き3点以下）場合 → figure-block を本文の下に置くだけでよい
  - 本文と図を並べないと両方が収まらない場合のみ → two-column を使う
  - 迷ったら figure-block 単独を優先すること
  - two-column を使う場合、column-text の箇条書きは親項目3点まで（ネストはあり）
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
  <img src="IMAGE_PATH" alt="CAPTION">
  <div class="figure-caption">CAPTION</div>
</div>
  </div>
</div>

- 図が本文と重なる場合は、本文を短くしてよい。
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

画像記法の参考:
- 複数画像を無理に詰め込まず、1つの図を素直に1ブロックで置く

数式を含むスライドのレイアウトの変更に関する注意事項：
MarpのHTMLブロック（div内）では Markdown数式（$ や $$）は一切機能しないので、HTMLブロックに組み込むスライド内に数式が含まれる場合は、必ず以下の【判定基準】に従ってレイアウトを決定すること
ただし、step2 の Marp Markdown で既に存在する数式を削除したり、内容を変更してはならない
1. 【HTMLテキストで代用可能なケース】-> 2-column（HTML）を維持し、必ず、下記の代用ルールA~Dを遵守して、数式を書き換える
   - 数式が「1行の文字列」で表現でき、数値以外の特殊な記号がギリシャ文字、簡単な不等号、上下の添字のみの場合
   - 代用ルール:
  [ルールA] ギリシャ文字の変換
   - LaTeXのギリシャ文字命令（\alpha, \beta, \gamma, \theta など）は、「$」と「\\」を取り除き、 「&」と「;」で、間にスペースを置かずに直接挟む
     - 例: $\theta$ ➡️ &theta;
     - 例: $\gamma$ ➡️ &gamma;

   [ルールB] 添字（下付き）とべき乗（上付き）の汎用変換
   - 下付きの添字（ $..._...$ または $..._{...}$ ）は、必ず 「$」を除き、添字部分を<sub> タグで囲む
     - 例: $\gamma_{sl}$ ➡️ &gamma;<sub>sl</sub>
     - 例: $V_{oc}$ ➡️ &V;<sub>oc</sub>
   - 上付きのべき乗（ $....^...$ または $...^{...}$ ）は、必ず 「$」を除き、べき乗部分を<sup> タグで囲む
     - 例: $x^2$ ➡️ x<sup>2</sup>
     - 例: $10^{-3}$ ➡️ 10<sup>&minus;3</sup>

    [ルールC] 演算記号・特殊文字の変換
   - 掛け算記号（\times）は、必ず 「&times;」 または全角「×」に置換し、半角の 「x」で代用しない
     - 例: $9.8 \times 10^{-3}$ ➡️ 9.8 &times; 10<sup>&minus;3</sup>
   - マイナス記号（\minus または単なるハイフン -）は、数式表現として美しく見せるため、必ず 「&minus;」 に置換する
   - 不等号（ < や > ）をdivタグ内で使う場合は、HTMLの構文エラーを防ぐため、必ず「&lt;」および「&gt;」にエスケープする
     - 例: $0^\circ < \theta < 10^\circ$ ➡️ 0&deg; &lt;  &lt; 10&deg;

     [ルールD] その他の高度な数学記号の変換
   - 以下の数学記号は指示にある通りに LaTeX の特殊命令や「$」記号を完全に除去してHTML実体参照に変換してください。
   - 以上 ( $\ge$ ) / 以下 ( $\le$ )はそれぞれ「&ge;」 / 「&le;」に変換する
   - プラスマイナス ( $\pm$ )は 「&plusmn;」に変換する
   - 無限大 ( $\infty$ )は 「&infin;」に変換する
   - 不等号 ( $\neq$ )は 「&ne;」に変換する
   - 合同・定義 ( $\equiv$ )は 「&equiv;」に変換する
   - 比例 ( $\propto$ )は 「&prop;」に変換する
   - 等号 ( $\equals$ )は 「&equals;」に変換する
   - 角度 ( $\angle$ )は 「&ang;」に変換する
   - 直交 ( $\perp$ )は 「&perp;」に変換する
   - °($\circ$)は 「&deg;」に変換する
   - 括弧（可変長含む）( $\left( / \right)& )は「 ( ) 」に変換する 
   - ただし括弧の中身（変数や記号）も必ずすべて、変換ルールを順守して、HTML表記に変換する【連鎖変換】
  

2. 【HTMLテキストでは表現不可能なケース】-> 必ず 2-column を諦め、Markdown の通常文または通常の数式ブロックのまま維持する
ただし、数式スライドに画像を入れる必要がある場合は、本文を減らし、画像は単独の figure-block として置く
   以下の特徴を持つ複雑な数式（$ や $$）が含まれる場合は、絶対にHTMLタグ（div, ul, liなど）で囲わずに、divレイアウトを完全に排除し、h2見出しの下に通常のMarkdown箇条書きと数式ブロック（$$）を縦に並べる構成にする
   - 分数（\frac{}{} を含むもの）
   - 長い根号（\sqrt{} を含むもの）
   - 上下に上限・下限がつく総和や積分（\sum や \int を含むもの）
   - 行列や連立方程式（\begin{matrix} や \cases などを伴う複数行のもの）
   - 複雑な上下の添字が大量に密集しているもの
   - 複雑な括弧が大量に密集しているもの
   - 上記のルールで変換できない文字が含まれているもの


禁止:
- 新しいCSSや<style>タグは禁止
- 存在しない画像パスを作らない
- imagePathを書き換えない
- 引用ブロック (>) を使って数式を囲ってはいけない

以下が step2 の Marp Markdown です。

${step2Markdown}

以下が、実際に挿入できる図の一覧です。

${figureList}

この情報だけを用いて、step3 の完成版 Marp Markdown を返してください。`;
}

module.exports = {
  buildStep3Prompt,
};
