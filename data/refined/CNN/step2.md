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
<div class="subtitle">論文紹介 2026/04/07</div>
<div class="maintitle">畳み込みニューラルネットワーク入門</div>

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
    <div class="agenda-item">1. 研究背景</div>
    <div class="agenda-item">2. 解決したい課題</div>
    <div class="agenda-item">3. 提案手法の全体像</div>
    <div class="agenda-item">4. 手法の詳細と数式</div>
    <div class="agenda-item">5. 実験・結果・考察・まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 研究背景
<p class="dense-lead">画像認識では、画素の並びや近傍関係を保ったまま特徴を抽出することが重要になる。</p>

<div class="two-pane">
  <div class="pane">
    <h3>従来の全結合ANN</h3>
    <ul>
      <li>画像を1次元ベクトルとして扱う</li>
      <li>各ニューロンが入力全体に接続する</li>
      <li>画像の縦横の構造を直接活かしにくい</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>画像データの性質</h3>
    <ul>
      <li>近い画素同士には意味のある関係がある</li>
      <li>同じ模様は画像中の別位置にも現れる</li>
      <li>浅い特徴から複雑な特徴へ階層化できる</li>
    </ul>
  </div>
</div>

<div class="callout">CNNは、画像の局所性とパターンの再利用をネットワーク構造に組み込む。</div>

---
<!-- class: content-gray show-page -->

## 解決したい課題
<p class="dense-lead">画像を全結合層で直接扱うと、重み数が急増し、過学習しやすくなる。</p>

<div class="layout-grid three">
  <div class="insight-card emphasis">
    <h3>入力次元</h3>
    <span class="big-number">12,288</span>
    <p class="card-note">64x64カラー画像の入力次元</p>
  </div>
  <div class="insight-card">
    <h3>重み数</h3>
    <p>最初のニューロン1つだけでも、多数の画素すべてに重みが必要になる。</p>
  </div>
  <div class="insight-card">
    <h3>汎化</h3>
    <p>重みが多いほど訓練データに合わせ込みやすく、未知画像に弱くなる。</p>
  </div>
</div>

<div class="callout">課題は、画像の空間構造を保ちながら、パラメータ数と計算量を抑えること。</div>

---
<!-- class: content-gray show-page -->

## 提案手法の全体像
<p class="dense-lead">CNNは、局所特徴を抽出し、圧縮し、最後に分類する流れで構成される。</p>

<div class="two-pane">
  <div class="pane">
    <h3>局所結合</h3>
    <ul>
      <li>各ニューロンは前層の一部だけを見る</li>
      <li>近傍画素の関係を保つ</li>
      <li>全結合より接続数を減らせる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>パラメータ共有</h3>
    <ul>
      <li>同じフィルタを画像全体に適用する</li>
      <li>場所が違っても同じ特徴を検出できる</li>
      <li>少ない重みで画像全体を処理する</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[ここに論文Fig. 2: A simple CNN architecture を入れる]</div>

---
<!-- class: content-gray show-page -->

## 手法の詳細1
<p class="dense-lead">畳み込み層は、学習可能なフィルタを画像上で走査して特徴マップを作る。</p>

<div class="two-pane">
  <div class="pane">
    <h3>畳み込み層</h3>
    <ul>
      <li>小さなカーネルを画像に重ねて計算する</li>
      <li>エッジ、角、ストロークなどに反応する</li>
      <li>ReLUにより重要な反応を残しやすくする</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>プーリング層</h3>
    <ul>
      <li>特徴マップの縦横サイズを縮小する</li>
      <li>計算コストを下げる</li>
      <li>Max-poolingでは小領域の最大値を代表値にする</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[ここに論文Fig. 4: A visual representation of a convolutional layer を入れる]</div>

---
<!-- class: content-gray show-page -->

## 手法の詳細2: サイズ計算
<p class="dense-lead">畳み込み後の出力サイズは、入力サイズとカーネル・パディング・ストライドで決まる。</p>

$$
\frac{(V - R + 2Z)}{S} + 1
$$

<div class="two-pane">
  <div class="pane">
    <h3>記号</h3>
    <ul>
      <li>V: 入力ボリュームのサイズ</li>
      <li>R: 受容野、つまりカーネルサイズ</li>
      <li>Z: ゼロパディングの量</li>
      <li>S: ストライド、つまり移動量</li>
      <li>式の値: 出力特徴マップの一辺のサイズ</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>設計の見方</h3>
    <ul>
      <li>パディングで解像度を保ちやすくする</li>
      <li>ストライドで出力サイズを制御する</li>
      <li>特徴マップの大きさは計算量に直結する</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 実験設定
<p class="dense-lead">CNNの効果は、画像分類の流れの中で各層がどの役割を持つかを確認する形で示される。</p>

<div class="two-pane">
  <div class="pane">
    <h3>入力と処理</h3>
    <ul>
      <li>画像を縦・横・色の3次元として扱う</li>
      <li>畳み込みとプーリングを複数回重ねる</li>
      <li>最後に全結合層で分類する</li>
    </ul>
  </div>
  <div class="pane">
    <h3>確認する観点</h3>
    <ul>
      <li>重み数を抑えられるか</li>
      <li>局所特徴が段階的に抽出されるか</li>
      <li>小さな位置ずれに強くなるか</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: シンプルなCNNアーキテクチャの例]</div>

---
<!-- class: content-gray show-page -->

## 結果
<p class="dense-lead">CNNは、全結合ANNより画像の構造を活かしながら効率的に特徴を作れる。</p>

<div class="layout-grid three">
  <div class="insight-card">
    <h3>効率化</h3>
    <p>局所結合とパラメータ共有により、全結合層より重み数を抑えられる。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>階層表現</h3>
    <p>浅い層ではエッジ、深い層では複雑な形や部品を学習する。</p>
  </div>
  <div class="insight-card">
    <h3>頑健性</h3>
    <p>プーリングにより、細かな位置ずれの影響を小さくできる。</p>
  </div>
</div>

<div class="figure-placeholder">[ここに論文Fig. 3: Activations from the first convolutional layer を入れる]</div>

---
<!-- class: content-gray show-page -->

## 考察
<p class="dense-lead">CNNの本質は、画像の性質に合う制約を入れて、少ない重みで良い特徴を作る点にある。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>なぜ効くか</h3>
    <ul>
      <li>近い画素を見る局所性が画像に合う</li>
      <li>同じフィルタを使うため、場所に依存しない特徴を拾える</li>
      <li>層を重ねることで単純特徴から複雑特徴へ発展する</li>
    </ul>
  </div>
  <div class="pane">
    <h3>設計の基本</h3>
    <ul>
      <li>小さなフィルタを重ねる</li>
      <li>適度にプーリングで圧縮する</li>
      <li>最後に分類器へ渡す</li>
    </ul>
  </div>
</div>

<div class="callout">全結合で一気に見るのではなく、局所特徴を段階的に積み上げることが重要。</div>

---
<!-- class: content-gray show-page -->

## 限界・今後の課題
<p class="dense-lead">基本的なCNNにも、設計やタスクによって注意すべき限界がある。</p>

<div class="two-pane">
  <div class="pane">
    <h3>限界</h3>
    <ul>
      <li>層を深くすると学習が難しくなる場合がある</li>
      <li>大域的な関係は局所畳み込みだけでは扱いにくい</li>
      <li>カーネルサイズやプーリング設計に性能が左右される</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>今後の方向</h3>
    <ul>
      <li>より深いCNNの安定学習</li>
      <li>残差接続などの改善手法</li>
      <li>Attention系モデルとの使い分け</li>
    </ul>
  </div>
</div>

<div class="callout">CNN入門の次には、ResNetのような深層化を支える仕組みが自然な発展になる。</div>

---
<!-- class: content-gray show-page -->

## まとめ
<p class="dense-lead">CNNは、画像の局所構造を活かして特徴抽出と分類を効率化するアーキテクチャである。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>背景</h3>
    <p>画像を全結合で扱うと、空間構造を活かしにくく重み数も増える。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>方法</h3>
    <p>畳み込み・プーリング・全結合を組み合わせて、階層的に特徴を作る。</p>
  </div>
  <div class="insight-card">
    <h3>結論</h3>
    <p>局所結合とパラメータ共有により、画像認識へ適した効率的なモデルになる。</p>
  </div>
</div>

<div class="callout">標準構成では、背景から限界までを一方向に並べ、輪読で話の流れを追いやすくする。</div>
