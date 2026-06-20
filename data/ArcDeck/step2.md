---
marp: true
theme: kaira
size: 16:9
math: katex
highlight: github
paginate: true
---

<!-- class: title -->

<div class="logo"></div>
<div class="subtitle">論文紹介 2026/06/06</div>
<div class="maintitle">ArcDeck</div>

<div class="bottom-band">
  <div style="width: 100%;">
    <div class="name-box">京都大学工学部情報学科数理工学コース</div>
    <div class="name-box">知能　太郎</div>
  </div>
</div>

---
<!-- class: agenda show-page -->

<div class="header">
  <div class="title-block"><span class="mark"></span><span>アジェンダ</span></div>
</div>
<div class="logo-right"></div>

<div class="dashed-box">
  <div class="agenda-list">
    <div class="agenda-item">1. 背景と課題</div>
    <div class="agenda-item">2. 提案手法：ArcDeck</div>
    <div class="agenda-item">3. 実験と結果</div>
    <div class="agenda-item">4. まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 背景：論文スライド作成の難しさ
<br>
学術論文から高品質なスライドを作成するのは非常に複雑な作業です。

<br>

<div class="two-col">
  <div class="col">
    <p class="text-center"><b>求められること</b></p>
    <ul>
      <li>密な技術内容を簡潔に要約</li>
      <li>一貫した物語性（ナラティブ）の維持</li>
      <li>視覚的な分かりやすさ</li>
    </ul>
  </div>
  <div class="col">
    <p class="text-center"><b>自動化の課題</b></p>
    <ul>
      <li>単なる要約では物語性が失われる</li>
      <li>論文の論理構造を捉えきれない</li>
      <li>発表の流れを考慮した再構成が困難</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 既存手法とその限界
先行研究は、論文の「物語の流れ」を明示的に扱えていませんでした。

<div class="two-col">
  <div class="col">
    <p><span class="bold blue-text">先行研究のアプローチ</span></p>
    <ul>
      <li><b>直接要約:</b> テキストを単純に要約</li>
      <li><b>セクション単位処理:</b> 章ごとに独立して処理</li>
      <li><b>アウトライン抽出:</b> 見出し構造をそのまま利用</li>
    </ul>
    <br>
    <p>
    → <span class="bold red-text">結果として、物語が分断されたスライドが生成されやすい</span>
    </p>
  </div>
  <div class="col">
    <p><span class="bold blue-text">ArcDeck (本研究)のアプローチ</span></p>
    <ul>
      <li><span class="bold">談話構造の解析</span>で論理をモデル化</li>
      <li><span class="bold">全体計画</span>を立てて一貫性を担保</li>
      <li><span class="bold">反復的な推敲</span>で質を向上</li>
    </ul>
    <br>
    [図: Figure 1. 先行研究とArcDeckの比較]
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 本研究の目的
<br>
<span class="bold">論文から、著者自身の意図や論理展開を忠実に反映した、<br>
<span class="red-text">一貫性のあるナラティブを持つ高品質なスライド</span>を自動生成する</span>

<br>

- 生成されたスライド全体の物語性と論理的な一貫性を実現
- 論文全体の高レベルな構造や意図を保持
- 発表の流れを考慮した内容の再構成

---
<!-- class: content-gray show-page -->

## 提案手法：ArcDeck の全体像
論文からスライド生成を「構造化されたナラティブの再構築」と捉えます。

[図: Figure 2. ArcDeckの処理フロー全体図]

<br>

- **1. Preprocessing:** 論文PDFからテキストと図表を抽出・構造化
- **2. Narrative-Driven Outline Generation:** 談話構造解析と全体計画に基づき、エージェントが反復的にアウトラインを推敲
- **3. Slide Generation:** 洗練されたアウトラインを基に、最終的なスライドを生成

---
<!-- class: content-gray show-page -->

## コア技術(1): 談話構造のモデル化
論文の論理的な骨格を「談話木」として捉えます。

- **Discourse Parser (談話解析器)**
  - 修辞構造理論 (RST) に基づき、段落間の論理関係を解析
    - 例：「主張」と「具体例」、「原因」と「結果」など
  - 階層的な木構造（談話木）を構築し、論文の深い論理構造を可視化
  - この構造が、一貫したナラティブを持つアウトライン生成の土台となる

<br>
[図: Figure 3. 談話木の具体例]

---
<!-- class: content-gray show-page -->

## コア技術(2): 全体計画と反復的推敲
「設計図」と「推敲ループ」で、スライドの質を iteratively に高めます。

<div class="two-col">
  <div class="col">
    <p><span class="bold blue-text">Commitment Builder</span></p>
    <ul>
      <li>論文の主題、貢献、想定聴衆などの高レベルな情報を「Global Commitment (全体計画書)」として明文化</li>
      <li>スライド生成プロセス全体を通して、一貫した指針として機能</li>
    </ul>
    <br>
    [図: Figure 4. Global Commitmentの例]
  </div>
  <div class="col">
    <p><span class="bold blue-text">Narrative Refinement Loop</span></p>
    <ul>
      <li>専門エージェント (Planner, Critic, Judge) が協調</li>
      <li>「下書き→批評→判断→修正」のサイクルを繰り返し、アウトラインを洗練</li>
      <li>物語の一貫性や論理の流れを向上</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 評価用ベンチマーク：ArcBench
<br>
本研究では、評価のために新たなベンチマーク「ArcBench」を構築しました。

- トップレベル国際会議 (CVPR, NeurIPSなど) から収集
- 100組の学術論文と、<span class="bold red-text">著者自身が作成した高品質な口頭発表スライド</span>のペアで構成
- 自動生成スライドの品質を、信頼性の高い「人間の参照」と比較可能

<br>
[図: Figure 6. ArcBenchの統計情報]

---
<!-- class: content-gray show-page -->

## 実験設定

- **比較手法**
  - **プロンプトベース:** 単一のLLMコールで生成
  - **既存マルチエージェント:** Paper2Poster, PPTAgent, SlideGen
  - **人間による参照:** ArcBenchの著者作成スライド (AP)

- **評価指標**
  - **VLM-as-Judge:** VLM評価者による4軸でのスコアリング
    - テキスト品質、ナラティブフロー、視覚レイアウト、テーマ性
  - **VLM-based Q&A:** 生成スライドのみで論文に関する質問に回答
  - **ペアワイズ比較:** 2つのスライドを比較し、優劣を判断

---
<!-- class: content-gray show-page -->

## 結果(1): 定性的な品質比較
ArcDeckは、既存手法より一貫したナラティブを持つスライドを生成しました。

[図: Figure 7. 各手法による生成スライドの定性比較]

- **既存手法の問題点**
  - 論文の章構成をそのまま反映し、話の流れが硬直的
  - 複数のスライドで内容が重複・散逸
- **ArcDeckの改善点**
  - <span class="bold blue-text">問題提起から手法、結果へと続く自然な物語の流れ</span>を再構築
  - <span class="bold blue-text">スライド間の重複がなく、論理的な繋がりが明確</span>

---
<!-- class: content-gray show-page -->

## 結果(2): ナラティブフローの定量的評価
VLMによるペアワイズ比較で、ArcDeckは全ベースラインを上回りました。

[表: Table 4a. ナラティブフローに関するペアワイズ比較の結果]

- **Ours vs. Baselines (Win rate %)**
  - ArcDeckは、既存のマルチエージェント手法やプロンプトベース手法に対し、<span class="bold blue-text">一貫して高い勝率</span>を記録
  - この結果は、<span class="bold red-text">談話構造の明示的モデリングと反復的推敲</span>が、物語の一貫性向上に極めて有効であることを示唆

---
<!-- class: content-gray show-page -->

## 結果(3): 内容保持力の評価
Q&Aクイズにおいて、ArcDeckは論文の核心を深く保持していることを示しました。

- **VLM-based Q/A Quiz の結果**
  - 特に<span class="bold blue-text">「物語性 (Story)」</span>や<span class="bold blue-text">「深い概念理解 (Hard, Depth)」</span>を問うカテゴリで、ベースラインを上回る高いスコアを達成
  - 表面的な要約に留まらず、論文の背景にある論理や詳細な技術内容を忠実にスライドへ反映できていることを示唆

---
<!-- class: content-gray show-page -->

## アブレーションスタディ
提案手法の各コンポーネントが、ナラティブ生成に不可欠であることを確認しました。

- **評価**
  - ArcDeckから主要コンポーネントを個別に取り除き、性能変化を測定
    - `w/o Discourse Parser`
    - `w/o Global Commitment`
    - `w/o Narrative Refinement Loop`
- **結果**
  - <span class="bold red-text">いずれのコンポーネントを除去しても、ナラティブフローのスコアが大幅に低下</span>
  - 提案手法の各要素が、高品質なナラティブを持つスライド生成にそれぞれ重要な役割を果たしていることが証明された

---
<!-- class: content-gray show-page -->

## まとめ
本研究では、ナラティブ駆動な論文スライド自動生成フレームワーク「ArcDeck」を提案しました。

- **貢献**
  1. <span class="bold">談話構造の明示的モデリング</span>により、論文の論理的骨格を捉え、物語性のあるアウトラインを生成する手法を確立
  2. <span class="bold">全体計画とマルチエージェントによる反復的推敲ループ</span>を導入し、スライド全体の一貫性と品質を大幅に向上
  3. 高品質な評価を可能にするベンチマーク<span class="bold">「ArcBench」</span>を構築・公開

<br>
<p class="text-center">
<span class="bold blue-text">論文の「魂」であるナラティブを捉えることで、<br>人間が作成したスライドに近い品質の自動生成を実現</span>
</p>