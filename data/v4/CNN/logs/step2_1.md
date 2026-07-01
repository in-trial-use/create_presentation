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
    <div class="agenda-item">1. 研究背景：ANNとCNNの台頭</div>
    <div class="agenda-item">2. 解決したい課題：従来のANNの限界</div>
    <div class="agenda-item">3. CNNアーキテクチャの概要</div>
    <div class="agenda-item">4. 畳み込み層の機能と最適化</div>
    <div class="agenda-item">5. プーリング層と全結合層</div>
    <div class="agenda-item">6. 実践的なCNN設計ガイド</div>
    <div class="agenda-item">7. まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 研究背景：ANNとCNNの台頭
<p class="dense-lead">ANNは生物学的神経系に着想を得た計算システムであり、CNNはその優れたアーキテクチャの一つである。</p>

<div class="two-pane">
  <div class="pane">
    <h3>ANN（人工ニューラルネットワーク）</h3>
    <ul>
      <li>相互接続された多数のニューロンで構成される</li>
      <li>入力から学習し、出力を最適化する</li>
      <li>画像認識タスクにおいて従来のAIを凌駕する</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>CNN（畳み込みニューラルネットワーク）</h3>
    <ul>
      <li>ANNの中でも特に優れたアーキテクチャである</li>
      <li>主に画像駆動型のパターン認識タスクに利用される</li>
      <li>精密でシンプルな構造が特徴である</li>
    </ul>
  </div>
</div>

<div class="callout">CNNは画像認識タスクに特化し、ANNの導入を容易にする手法を提供する。</div>

---
<!-- class: content-gray show-page -->

## 解決したい課題：従来のANNの限界
<p class="dense-lead">従来のANNは画像データ処理の計算複雑性や過学習に課題があり、深いネットワークの構築が困難である。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>従来のANNの課題</h3>
    <ul>
      <li>画像データ処理で計算が複雑になる</li>
      <li>64x64カラー画像で1ニューロンあたり12,288個の重みが必要となる</li>
      <li>層やニューロンを増やすと計算資源が不足する</li>
      <li>「過学習」により汎化性能が低下する</li>
    </ul>
  </div>
  <div class="pane">
    <h3>過学習の問題</h3>
    <ul>
      <li>ネットワークが訓練データに過度に適応してしまう</li>
      <li>未学習データへの予測性能が低下する</li>
      <li>モデルのパラメータ数を減らすことが対策になる</li>
    </ul>
  </div>
</div>

<div class="callout">計算複雑性と過学習の抑制が、深層ANNの性能向上に不可欠である。</div>

---
<!-- class: content-gray show-page -->

## CNNアーキテクチャの概要
<p class="dense-lead">CNNは、画像入力に特化して、ニューロンを3次元で配置し、局所的な接続を用いることで効率的な処理を実現する。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>CNNの主要な違い</h3>
    <ul>
      <li>ニューロンは高さ・幅・深さの3次元で組織化される</li>
      <li>各層のニューロンは先行層の小さな領域にのみ接続される</li>
      <li>画像固有の特徴をアーキテクチャに組み込める</li>
    </ul>
  </div>
  <div class="pane">
    <h3>CNNの主要な3つの層</h3>
    <ul>
      <li>畳み込み層 (Convolutional Layers)</li>
      <li>プーリング層 (Pooling Layers)</li>
      <li>全結合層 (Fully-connected Layers)</li>
    </ul>
  </div>
</div>

[図: 論文Figure 2. CNNの簡易アーキテクチャ図]

---
<!-- class: content-gray show-page -->

## 畳み込み層の機能と最適化
<p class="dense-lead">畳み込み層は学習可能なカーネルで画像の特徴を抽出し、ハイパーパラメータでモデルの複雑性を最適化する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>機能</h3>
    <ul>
      <li>「カーネル（フィルタ）」を画像にスライドさせ特徴を抽出する</li>
      <li>局所領域とのスカラー積を計算し「活性化マップ」を生成する</li>
      <li>ReLu（Rectified Linear Unit）などの活性化関数を適用する</li>
      <li>ニューロンは「受容野サイズ」の小さな領域にのみ接続される</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>最適化のためのハイパーパラメータ</h3>
    <ul>
      <li>**深さ (Depth)**: 出力ボリュームの深さを決定する</li>
      <li>**ストライド (Stride)**: カーネルの移動量を制御する</li>
      <li>**ゼロパディング (Zero-padding)**: 入力の周囲をパディングする</li>
    </ul>
  </div>
</div>

<div class="callout">出力サイズの計算式: $ \frac{(V - R + 2Z)}{S} + 1 $</div>

---
<!-- class: content-gray show-page -->

## プーリング層と全結合層
<p class="dense-lead">プーリング層は次元数を削減し、全結合層は従来のANNと同様にクラススコアを生成する。</p>

<div class="two-col">
  <div class="col">
    <h3>プーリング層</h3>
    <ul>
      <li>表現の次元数を徐々に削減する</li>
      <li>パラメータ数と計算複雑性を低減する</li>
      <li>「MAX関数」を用いるマックスプーリングが一般的である</li>
      <li>例: 2x2カーネル、ストライド2で元のサイズの25%に縮小する</li>
    </ul>
  </div>
  <div class="col">
    <h3>全結合層</h3>
    <ul>
      <li>隣接する2つの層のニューロンと直接接続される</li>
      <li>従来のANNにおけるニューロン配置と同様である</li>
      <li>最終的に分類のためのクラススコアを生成する</li>
      <li>ReLuを層間に適用することも性能向上に有効である</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 実践的なCNN設計ガイド
<p class="dense-lead">CNNのアーキテクチャ設計には決まった方法はないが、いくつかの共通のパターンと最適化戦略が存在する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>層のスタックと入力サイズ</h3>
    <ul>
      <li>畳み込み層を複数重ねてからプーリング層を挟む構造が一般的である (<span class="ref-inline">図5</span>)</li>
      <li>複数の畳み込み層をスタックし、複雑な特徴を抽出する</li>
      <li>入力層のサイズは2で再帰的に割り切れる数値が推奨される</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>フィルタとリソース課題</h3>
    <ul>
      <li>小さなフィルタサイズ (例: 3x3) を使い、ストライドは1に設定する</li>
      <li>ゼロパディングを活用して出力の次元を維持する</li>
      <li>計算リソースが厳しい場合、入力画像のリサイズや大きなフィルタ・ストライドを検討する</li>
    </ul>
  </div>
</div>

[図: 論文Figure 5. 畳み込み層を重ねたCNNアーキテクチャ図]

---
<!-- class: content-gray show-page -->

## まとめ
<p class="dense-lead">CNNは画像特化型のアーキテクチャにより、従来のANNが抱える計算複雑性や過学習の課題を効果的に解決する。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>背景と課題</h3>
    <p>ANNは強力だが、画像処理で計算が複雑になり、過学習が課題だった。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>CNNの貢献</h3>
    <p>3次元ニューロン配置、局所接続、畳み込み層で効率的に画像特徴を抽出する。</p>
  </div>
  <div class="insight-card">
    <h3>設計と最適化</h3>
    <p>畳み込み層、プーリング層、全結合層を組み合わせ、適切なパラメータで高い性能を発揮する。</p>
  </div>
</div>

<div class="callout">CNNはシンプルなアーキテクチャで画像認識の課題を克服し、ANN学習の出発点を提供する。</div>