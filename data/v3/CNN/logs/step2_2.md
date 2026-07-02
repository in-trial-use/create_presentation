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
<div class="subtitle">論文紹介 2026/06/27</div>
<div class="maintitle">CNN</div>

<div class="bottom-band">
  <div style="width: 100%;">
    <div class="name-box">理学部　化学科</div>
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
    <div class="agenda-item">ANNとCNNの背景</div>
    <div class="agenda-item">従来のANNの課題</div>
    <div class="agenda-item">CNNの基本構成</div>
    <div class="agenda-item">畳み込み層の詳細</div>
    <div class="agenda-item">その他の主要層</div>
    <div class="agenda-item">CNNの設計指針</div>
    <div class="agenda-item">学習結果の可視化</div>
    <div class="agenda-item">まとめ</div>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## ANNの台頭とCNN
機械学習分野で人工ニューラルネットワーク（ANN）が顕著な成果を上げている。

*   **ANNの進化**: 近年、従来のAI性能を凌駕するモデルが登場している。
*   **CNNの重要性**: 特に画像認識タスクにおいて、畳み込みニューラルネットワーク（CNN）は非常に高い性能を示す。
*   **生物学的着想**: CNNは生物の視覚野から着想を得ており、画像処理に特化したアーキテクチャを持つ。
*   **学習の容易さ**: その構造は精密かつシンプルであり、ANN入門に適している。

---

<!-- class: content-gray show-page -->

## 従来のANNの課題
従来の全結合型ANNは画像データ処理において計算コストと過学習の問題を抱える。

*   **高解像度画像の計算コスト**:
    *   入力画像のサイズが増大すると、ANNのパラメータ数も爆発的に増加する。
    *   例: 64x64x3のカラー画像の場合、最初の隠れ層のニューロン1つあたり12,288個の重みが必要となる。
*   **過学習のリスク増大**:
    *   過剰なパラメータは、訓練データへの過度な適合（過学習）を引き起こし、汎化能力を低下させる。
*   **CNN知識の普及**:
    *   CNNは強力だが、その仕組みが複雑に見えるため、初学者の学習障壁が高い傾向にある。

---

<!-- class: content-gray show-page -->

## CNNの全体像
CNNは画像データに特化し、主に3種類の層を積み重ねて構成される。

<div class="two-col">
  <div class="col">
    <ul>
      <li>**畳み込み層 (Convolutional Layer)**:
        <ul><li>局所的な特徴を抽出する</li></ul>
      </li>
      <li>**プーリング層 (Pooling Layer)**:
        <ul><li>特徴マップの次元を削減する</li></ul>
      </li>
      <li>**全結合層 (Fully-connected Layer)**:
        <ul><li>最終的な分類や回帰を行う</li></ul>
      </li>
    </ul>
  </div>
  <div class="col">
    <h2 style="text-align: center;">[ここに論文Figure 2を入れる]</h2>
    <p style="text-align: center;">シンプルなCNNアーキテクチャの例</p>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## 畳み込み層の詳細
畳み込み層は、学習可能なカーネルを用いて画像から局所的な特徴を効率的に抽出する。

*   **特徴抽出**: 学習可能な**カーネル（フィルタ）**で入力画像からエッジなどの局所特徴を抽出する。
*   **局所的結合**: 各ニューロンは前の層の小さな領域（**受容野**）にのみ接続する。
*   **パラメータ共有**: 同じカーネルを画像全体に適用することで、パラメータ数を大幅に削減する。
*   **活性化関数**: 一般的に**ReLU (Rectified Linear Unit)**が使用される。

<h1 style="text-align: center;">[ここに論文Figure 4を入れる]</h1>
<p style="text-align: center;">畳み込み演算の図解</p>

---

<!-- class: content-gray show-page -->

## その他の主要層：プーリング層と全結合層
畳み込み層で抽出された特徴は、プーリング層で集約され、最終的に全結合層で分類される。

*   **プーリング層**:
    *   特徴マップの空間的次元を削減し、計算負荷を軽減する。
    *   **Max-pooling**: 局所領域の最大値を抽出し、微小な位置ずれに対する頑健性（位置不変性）を付与する。
    *   一般的に2x2のカーネルと2のストライドが使用される。
*   **全結合層**:
    *   畳み込み層とプーリング層で学習された高レベルの特徴を統合する。
    *   最終的な分類スコアや回帰値を出力する層であり、従来のANNと同様の役割を果たす。

---

<!-- class: content-gray show-page -->

## CNNの構造設計とパラメータ削減
CNNの出力ボリュームの次元は、ハイパーパラメータによって調整される。

*   **主要なハイパーパラメータ**:
    *   **深さ (Depth)**: 出力ボリュームの深さ（特徴マップの枚数）。
    *   **ストライド (Stride)**: カーネルが移動するステップサイズ。
    *   **ゼロパディング (Zero-padding)**: 入力画像の周囲にゼロを追加し、出力サイズを制御する。
*   **出力ボリュームサイズの計算式**:
    $$ \frac{(V - R + 2Z)}{S} + 1 $$
    *   V: 入力ボリュームサイズ (高さまたは幅)
    *   R: 受容野サイズ (カーネルサイズ)
    *   Z: ゼロパディング量
    *   S: ストライド
*   **一般的なアーキテクチャ**: 畳み込み層とプーリング層を交互に重ね、最後に全結合層を配置する。

---

<!-- class: content-gray show-page -->

## 学習結果の可視化 (1/2)
CNNは、訓練データから自動的に有用な特徴を階層的に学習する。

*   **特徴の自動学習**: CNNは入力画像から低レベル（エッジ）から高レベル（物体の一部）の特徴までを自動で学習する。
*   **フィルタのアクティベーション**: MNISTデータセットで訓練されたCNNの最初の畳み込み層のアクティベーションを可視化できる。

---

<!-- class: content-gray show-page -->

## 学習結果の可視化 (2/2)
*   **学習内容の把握**: この可視化により、ネットワークが数字特有のエッジやストロークといった基本的な視覚的特徴を捉えていることがわかる。

<h1 style="text-align: center;">[ここに論文Figure 3を入れる]</h1>
<p style="text-align: center;">畳み込み層が学習した特徴の可視化 (MNIST)</p>

---

<!-- class: content-gray show-page -->

## まとめ
CNNは画像データの特性を活かし、効率的な特徴学習と高精度な分類を可能にする。

*   **CNNの利点**: 従来のANNが抱えるパラメータ数の問題と過学習のリスクを、画像の局所性を利用することで克服する。
*   **主要構成要素**: 畳み込み層（特徴抽出）、プーリング層（次元削減）、全結合層（分類）が連携して機能する。
*   **効率的な学習**: パラメータ共有や局所的結合により、少ないパラメータで効率的な学習を実現する。
*   **普及への貢献**: 本論文はCNNの基本概念と設計指針を平易に解説し、この強力な技術の学習障壁を低減することを目指した。