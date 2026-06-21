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

最重要ルール:
- 出力は Marp Markdown のみ
- 説明文やコードフェンスは不要
- step2 版の frontmatter はそのまま維持する
- 新たな <style> タグは追加しない
- title / agenda / content-gray の class 指定と、h1 / h2 / p / ul の構造はできるだけ保つ
- 図プレースホルダの置換対象は、提供された placeholder と一致する箇所のみ
- 置換時は Marp の画像記法を使う
- 基本は \`![w:WIDTH](./path/to/image.png)\` の形を使う
- WIDTH には widthHint を優先して使う
- 画像の直後に captionText を短く1行で置く
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
- スライド本文、見出し、箇条書きは「ですます調」ではなく「である調」で統一する
- 文末は「です」「ます」「ください」を避け、「である」「する」「示す」「述べる」などの簡潔な常体にする

画像記法の参考:
- 通常画像: \`![w:600](./images/example.png)\`
- 横幅指定で縦横比は維持される
- 複数画像を無理に詰め込まず、1つの図を素直に1ブロックで置く

以下が step2 の Marp Markdown です。

${step2Markdown}

以下が、実際に挿入できる図の一覧です。

${figureList}

この情報だけを用いて、step3 の完成版 Marp Markdown を返してください。`;
}

module.exports = {
  buildStep3Prompt,
};
