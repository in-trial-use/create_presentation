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
    <div class="agenda-item">CNNの背景と目的</div>
    <div class="agenda-item">従来のANNの課題</div>
    <div class="agenda-item">CNNのアーキテクチャ概要</div>
    <div class="agenda-item">CNNの主要な層</div>
    <div class="agenda-item">CNNの出力サイズ計算</div>
    <div class="agenda-item">CNN設計のヒント</div>
    <div class="agenda-item">まとめ</div>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## CNNの背景と目的
近年、機械学習分野で人工ニューラルネットワーク（ANN）が目覚ましい成果を上げている。

- **ANNの台頭**: 生物の神経系から着想を得た計算モデルである。
- **CNNの登場**: 特に画像認識タスクにおいて、従来のAIを凌駕する性能を持つ。
- **論文の目的**: CNNの基本概念と設計方法を平易に解説し、学習障壁を低減することを目指す。

---

<!-- class: content-gray show-page -->

## 従来のANNにおける課題
高解像度の画像データを従来の全結合ANNで扱うことは困難である。

- **パラメータ数の爆発**:
    - 28x28の白黒画像でも784個の重みが必要である。
    - 64x64のカラー画像では12,288個の重みが必要となる。
- **計算コストの増大**: パラメータ数が多いため、学習に膨大な計算資源と時間を要する。
- **過学習のリスク**: 複雑なモデルは訓練データに過度に適合し、汎化性能が低下する可能性がある。

---

<!-- class: content-gray show-page -->

## CNNのアーキテクチャ概要
CNNは入力が画像であることを前提とし、その特性を活かした設計を持つ。

- **3次元のニューロン配置**: 空間的な次元（高さ、幅）と深度（特徴マップ数）で構成される。
- **局所的結合**: ニューロンは前の層の小さな局所領域にのみ接続する。
- **主要な層**:
    - 畳み込み層 (Convolutional Layer)
    - プーリング層 (Pooling Layer)
    - 全結合層 (Fully-connected Layer)
- [図: シンプルなCNNアーキテクチャの図 (Figure 2) をここに挿入]

---

<!-- class: content-gray show-page -->

## 畳み込み層の詳細
畳み込み層は学習可能なカーネルを用いて、入力画像から局所的な特徴を抽出する。

- **カーネル**: 空間的に小さく、入力の深度全体に広がる学習可能なフィルタである。
- **活性化マップ**: 各カーネルは入力と畳み込み演算を行い、2Dの活性化マップを生成する。
- **局所特徴の学習**: カーネルは特定の特徴（エッジなど）を検出すると「発火」するように学習する。
- **パラメータ削減**: 局所的結合とパラメータ共有により、パラメータ数を劇的に削減する。
- [図: 畳み込み演算の図解 (Figure 4) をここに挿入]

---

<!-- class: content-gray show-page -->

## プーリング層と全結合層
CNNは畳み込み層で抽出された特徴を、プーリング層で集約し、全結合層で最終判定を行う。

- **プーリング層**:
    - 特徴マップの空間的次元を削減（ダウンサンプリング）する。
    - Max-poolingが一般的で、局所領域の最大値を取る。
    - 計算量を減らし、微小な位置ずれへの頑健性 (位置不変性) を獲得する。
- **全結合層**:
    - 従来のANNと同様、全てのニューロンが結合する。
    - 抽出された特徴を統合し、最終的なクラススコアを出力する。

---

<!-- class: content-gray show-page -->

## CNNの出力サイズ計算
畳み込み層の出力サイズは、以下の数式で計算される。

- $V$: 入力ボリュームサイズ (高さ・幅・深度)
- $R$: 受容野サイズ (カーネルサイズ)
- $Z$: ゼロパディング量
- $S$: ストライド

$$
\frac{(V - R + 2Z)}{S} + 1
$$

この計算結果が整数でない場合、ストライドの設定が不適切である。ニューロンが入力全体にきれいに収まらないためである。

---

<!-- class: content-gray show-page -->

## CNN設計のヒント
効果的なCNNモデルを構築するための一般的なヒントを述べる。

- **学習内容の可視化**:
    - 訓練後の畳み込み層の活性化を可視化することで、ネットワークが学習した特徴を理解できる。
    - 例: MNISTの数字のエッジやストロークなど。
    - [図: 学習済みフィルタの可視化 (Figure 3) をここに挿入]
- **層の重ね方**:
    - 複数の畳み込み層を重ねた後にプーリング層を置くのが一般的である。
    - 小さなフィルタ（例: 3x3）を深く重ねることで、より複雑な特徴を捉える。

---

<!-- class: content-gray show-page -->

## まとめ
本論文の結論を述べる。

- CNNは画像認識に特化した強力なANNアーキテクチャである。
- 畳み込み層とプーリング層により効率的な特徴抽出と次元削減を実現する。
- 適切な設計により、従来のANNの課題を克服し高精度な認識を可能にする。