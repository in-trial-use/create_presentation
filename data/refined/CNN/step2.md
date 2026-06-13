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
    <div class="agenda-item">1. ANNが画像で苦手な理由</div>
    <div class="agenda-item">2. CNNの基本アイデア</div>
    <div class="agenda-item">3. 主要レイヤの役割</div>
    <div class="agenda-item">4. CNN構築の設計指針</div>
    <div class="agenda-item">5. まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 1. ANNが画像で苦手な理由
<p class="dense-lead">画像をそのまま全結合層に入れると、入力次元と重みの数が急増する。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>パラメータが爆発する</h3>
    <ul>
      <li>64×64ピクセルのカラー画像では入力が12,288次元</li>
      <li>最初の層のニューロン1つだけで12,288個の重みが必要</li>
      <li>画像サイズが大きいほど重み数も急増する</li>
    </ul>
  </div>
  <div class="pane">
    <h3>過学習しやすい</h3>
    <ul>
      <li>重みが多いほど訓練データに合わせ込みやすい</li>
      <li>未知データへの汎化性能が落ちる</li>
      <li>画像の空間構造を十分に活かせない</li>
    </ul>
  </div>
</div>

<div class="callout">CNNは、画像の「近い画素同士に意味がある」という性質をモデルに組み込む。</div>

---
<!-- class: content-gray show-page -->

## 2. CNNの基本アイデア
<p class="dense-lead">CNNは、画像を小さな領域ごとに見ながら、同じフィルタを画像全体に適用する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>ANNとの違い</h3>
    <ul>
      <li>ニューロンを縦・横・深さの3次元で扱う</li>
      <li>各ニューロンは前の層の一部分だけを見る</li>
      <li>画像の局所的な構造を保ったまま処理する</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>CNNの効率化</h3>
    <ul>
      <li>局所結合で接続数を減らす</li>
      <li>パラメータ共有で同じフィルタを使い回す</li>
      <li>少ない重みで画像全体を処理できる</li>
    </ul>
  </div>
</div>

<div class="callout">全結合で一気に見るのではなく、局所特徴を積み上げて分類へつなげる。</div>

---
<!-- class: content-gray show-page -->

## CNNの処理パイプライン
<p class="dense-lead">典型的なCNNは、特徴抽出と分類を段階的に分けて処理する。</p>

<div class="mini-flow">
  <div class="mini-step"><span class="label">入力画像</span><span class="sub">縦×横×色のデータ</span></div>
  <div class="mini-step"><span class="label">畳み込み</span><span class="sub">局所特徴を抽出</span></div>
  <div class="mini-step"><span class="label">プーリング</span><span class="sub">特徴を圧縮</span></div>
  <div class="mini-step"><span class="label">全結合</span><span class="sub">クラスを判定</span></div>
</div>

<div class="figure-placeholder">[図: シンプルなCNNアーキテクチャの図 (Figure 2)]</div>

<ul class="dense-list">
  <li>畳み込み層とプーリング層で特徴を作り、最後に全結合層で分類する。</li>
</ul>

---
<!-- class: content-gray show-page -->

## 3. 畳み込み層の役割
<p class="dense-lead">畳み込み層は、学習可能なフィルタで画像上を走査し、特徴マップを作る。</p>

<div class="two-pane">
  <div class="pane">
    <h3>何をする層か</h3>
    <ul>
      <li>小さなカーネルを画像に重ねて計算する</li>
      <li>エッジ、角、ストロークなどを検出する</li>
      <li>ReLUにより重要な反応を残しやすくする</li>
    </ul>
  </div>
  <div class="pane">
    <h3>なぜ効率的か</h3>
    <ul>
      <li>局所領域だけを接続する</li>
      <li>同じカーネルを全位置で共有する</li>
      <li>全結合より大幅に重みを減らせる</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 畳み込み演算の図解 (Figure 4)]</div>

---
<!-- class: content-gray show-page -->

## 畳み込み後のサイズ
<p class="dense-lead">畳み込み層の出力サイズは、入力サイズと3つのハイパーパラメータで決まる。</p>

$$
\frac{(V - R + 2Z)}{S} + 1
$$

<ul class="dense-list">
  <li>V: 入力ボリュームのサイズ</li>
  <li>R: 受容野、つまりカーネルのサイズ</li>
  <li>Z: ゼロパディングの量</li>
  <li>S: ストライド、つまりカーネルの移動量</li>
</ul>

<div class="math-note">設計の見方: R, Z, S を調整することで、特徴マップの解像度と計算量を制御する。</div>

---
<!-- class: content-gray show-page -->

## プーリング層の役割
<p class="dense-lead">プーリング層は、特徴マップを小さくして計算量を抑える。</p>

<div class="two-pane">
  <div class="pane">
    <h3>次元削減</h3>
    <ul>
      <li>縦横方向のサイズを縮小する</li>
      <li>計算コストを下げる</li>
      <li>過学習の抑制にもつながる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Max-pooling</h3>
    <ul>
      <li>小領域の最大値を代表値にする</li>
      <li>小さな位置ずれに強くなる</li>
      <li>本質的な反応を残しやすい</li>
    </ul>
  </div>
</div>

<div class="callout">細部をすべて保持するのではなく、分類に役立つ反応をコンパクトに残す。</div>

---
<!-- class: content-gray show-page -->

## 全結合層の役割
<p class="dense-lead">全結合層は、抽出済みの特徴を統合し、最終的なクラス分類を行う。</p>

<div class="two-pane">
  <div class="pane">
    <h3>特徴をまとめる</h3>
    <ul>
      <li>畳み込みとプーリングで得た特徴を入力する</li>
      <li>特徴の組み合わせからクラスらしさを計算する</li>
      <li>画像認識の最終的な識別を担う</li>
    </ul>
  </div>
  <div class="pane">
    <h3>ANNとの接点</h3>
    <ul>
      <li>構造は従来の全結合ネットワークと同じ</li>
      <li>CNNの後段で分類器として使われる</li>
      <li>前段で作った特徴が入力になる</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: FNNの基本構造図 (Figure 1)]</div>

---
<!-- class: content-gray show-page -->

## フィルタが学習するもの
<p class="dense-lead">学習済みフィルタを可視化すると、CNNがどの特徴に反応しているかを確認できる。</p>

<div class="figure-placeholder">[図: 学習済みフィルタの可視化画像 (Figure 3)]</div>

<div class="mini-flow">
  <div class="mini-step"><span class="label">浅い層</span><span class="sub">エッジやストローク</span></div>
  <div class="mini-step"><span class="label">中間層</span><span class="sub">単純特徴の組み合わせ</span></div>
  <div class="mini-step"><span class="label">深い層</span><span class="sub">数字や物体のパーツ</span></div>
  <div class="mini-step"><span class="label">分類</span><span class="sub">特徴を統合して判定</span></div>
</div>

---
<!-- class: content-gray show-page -->

## 4. CNN構築の設計指針
<p class="dense-lead">CNNは、畳み込みを重ねてから圧縮し、最後に分類する流れで組むのが基本である。</p>

<div class="mini-flow">
  <div class="mini-step"><span class="label">小さなフィルタ</span><span class="sub">3×3などで局所特徴を抽出</span></div>
  <div class="mini-step"><span class="label">畳み込みを重ねる</span><span class="sub">表現力を高める</span></div>
  <div class="mini-step"><span class="label">適度に圧縮</span><span class="sub">Poolingでサイズを下げる</span></div>
  <div class="mini-step"><span class="label">最後に分類</span><span class="sub">全結合層へ渡す</span></div>
</div>

<div class="figure-placeholder">[図: 一般的なCNNアーキテクチャの例 (Figure 5)]</div>

<div class="callout">フィルタサイズは小さく、層を深くする方が性能が良い傾向がある。</div>

---
<!-- class: content-gray show-page -->

## 5. まとめ
<p class="dense-lead">CNNは、画像の構造を活かして特徴抽出と分類を効率化するアーキテクチャである。</p>

<ul class="dense-list">
  <li><b>効率的</b>: 局所結合とパラメータ共有により、全結合ANNの重み爆発を抑える。</li>
  <li><b>階層的</b>: 浅い層ではエッジ、深い層ではより複雑な特徴を段階的に学習する。</li>
  <li><b>実用的</b>: 畳み込み、プーリング、全結合を組み合わせて画像分類へつなげる。</li>
  <li><b>設計指針</b>: 小さなフィルタ、複数の畳み込み、適度な圧縮が基本になる。</li>
</ul>

<div class="callout">ポイント: CNNは画像をそのまま全結合で扱うのではなく、局所特徴を段階的に抽出する。</div>
