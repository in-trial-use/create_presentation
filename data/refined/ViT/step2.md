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
<div class="subtitle">物体検知輪読#3</div>
<div class="maintitle">Vision Transformer</div>

<div class="bottom-band">
  <div style="width: 100%;">
    <div class="name-box">工学部情報学科2回</div>
    <div class="name-box">野村 隆晃</div>
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
    <div class="agenda-item">1. 背景: CNN優勢の画像認識</div>
    <div class="agenda-item">2. ViTの入力表現と構成</div>
    <div class="agenda-item">3. 帰納バイアスと事前学習</div>
    <div class="agenda-item">4. 実験結果とスケーリング</div>
    <div class="agenda-item">5. まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 1. 背景: Transformerを画像へ
<p class="dense-lead">NLPではTransformerが標準になった一方、画像認識ではCNNが長く主流だった。</p>

<div class="two-pane">
  <div class="pane">
    <h3>当時の画像認識</h3>
    <ul>
      <li>ResNet系の畳み込みネットワークが強い</li>
      <li>局所性や平行移動等価性が画像に合う</li>
      <li>自己注意はCNNと組み合わせる研究が多かった</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>この論文の問い</h3>
    <ul>
      <li>CNNに依存せず、標準Transformerを画像へ直接使えるか</li>
      <li>画像を単語列のようなトークン列に変換できるか</li>
      <li>大規模事前学習で性能差を埋められるか</li>
    </ul>
  </div>
</div>

<div class="callout">ViTの主張は「画像をパッチ列にすれば、ほぼ標準Transformerだけで画像分類ができる」という点にある。</div>

---
<!-- class: content-gray show-page -->

## ViTの基本アイデア
<p class="dense-lead">画像を固定サイズのパッチへ分割し、それぞれをTransformerの入力トークンとして扱う。</p>

<div class="mini-flow">
  <div class="mini-step">
    <div class="label">Image</div>
    <div class="sub">入力画像</div>
  </div>
  <div class="mini-step">
    <div class="label">Patches</div>
    <div class="sub">16x16などに分割</div>
  </div>
  <div class="mini-step">
    <div class="label">Embeddings</div>
    <div class="sub">線形射影 + 位置埋め込み</div>
  </div>
  <div class="mini-step">
    <div class="label">Encoder</div>
    <div class="sub">Transformerで分類</div>
  </div>
</div>

<div class="two-pane">
  <div class="pane">
    <h3>入力の見方</h3>
    <ul>
      <li>パッチはNLPの単語トークンに対応</li>
      <li>各パッチを同じ次元のベクトルへ写像</li>
      <li>先頭に分類用のlearnable tokenを追加</li>
    </ul>
  </div>
  <div class="pane">
    <h3>モデルの見方</h3>
    <ul>
      <li>Transformer encoderはほぼ標準形</li>
      <li>画像固有の処理は入力変換に集中</li>
      <li>最後のclass tokenを画像表現として使う</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 2. 入力系列の作り方
<p class="dense-lead">2次元画像を1次元のトークン列へ変換する部分がViTの入口になる。</p>

<div class="equation-grid">
  <div class="equation-panel">
    <h3>パッチ数</h3>
    <p>画像サイズを H x W、パッチサイズを P x P とすると、系列長は次で決まる。</p>

$$
N = \frac{HW}{P^2}
$$

  </div>
  <div class="equation-panel">
    <h3>初期系列</h3>
    <p>class token、各パッチの線形射影、位置埋め込みを足して入力にする。</p>

$$
z_0 = [x_{\mathrm{class}}; x_p^1E; \cdots; x_p^NE] + E_{\mathrm{pos}}
$$

  </div>
</div>

<div class="math-note">パッチサイズを小さくすると系列長が増えるため、計算量は増えるが細かい情報を扱いやすくなる。</div>

<div class="two-pane">
  <div class="pane">
    <h3>class token</h3>
    <ul>
      <li>BERTの[class] tokenと同じ発想</li>
      <li>encoder出力の先頭ベクトルを画像表現として使う</li>
    </ul>
  </div>
  <div class="pane">
    <h3>position embedding</h3>
    <ul>
      <li>パッチの位置情報を系列へ加える</li>
      <li>高解像度fine-tuning時は2D補間で調整する</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## Transformer Encoder
<p class="dense-lead">各層では、LayerNorm、Multi-head Self-Attention、MLP、残差接続を交互に使う。</p>

<div class="equation-grid">
  <div class="equation-panel">
    <h3>自己注意ブロック</h3>

$$
z'_\ell = \mathrm{MSA}(\mathrm{LN}(z_{\ell-1})) + z_{\ell-1}
$$
  </div>
  <div class="equation-panel">
    <h3>MLPブロック</h3>

$$
z_\ell = \mathrm{MLP}(\mathrm{LN}(z'_\ell)) + z'_\ell
$$
  </div>
</div>

<div class="callout">ViTの本体は「画像専用Transformer」ではなく、標準Transformer encoderを画像パッチ列に適用したもの。</div>

<div class="mini-flow">
  <div class="mini-step">
    <div class="label">LN</div>
    <div class="sub">各blockの前に適用</div>
  </div>
  <div class="mini-step">
    <div class="label">MSA</div>
    <div class="sub">空間関係を大域的に学習</div>
  </div>
  <div class="mini-step">
    <div class="label">MLP</div>
    <div class="sub">各tokenを非線形変換</div>
  </div>
  <div class="mini-step">
    <div class="label">Residual</div>
    <div class="sub">各block後に足し戻す</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 3. 帰納バイアスの少なさ
<p class="dense-lead">ViTはCNNより画像固有の仮定が少ないため、データ量への依存が大きい。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>CNNが持つ性質</h3>
    <ul>
      <li>局所的な近傍構造を各層で使う</li>
      <li>平行移動等価性が組み込まれている</li>
      <li>少なめのデータでも画像らしさを利用しやすい</li>
    </ul>
  </div>
  <div class="pane">
    <h3>ViTの性質</h3>
    <ul>
      <li>self-attentionは全パッチを大域的に扱う</li>
      <li>2D構造はパッチ分割と位置埋め込みに限られる</li>
      <li>空間関係の多くをデータから学ぶ必要がある</li>
    </ul>
  </div>
</div>

<div class="callout">ImageNetのような中規模データだけではResNetに数ポイント劣るが、大規模事前学習で状況が変わる。</div>

---
<!-- class: content-gray show-page -->

## 事前学習とFine-tuning
<p class="dense-lead">ViTは大規模データで事前学習し、小さめの下流データセットへ転移する設計で評価される。</p>

<div class="two-pane">
  <div class="pane">
    <h3>事前学習データ</h3>
    <ul>
      <li>ImageNet: 1.3M images</li>
      <li>ImageNet-21k: 14M images</li>
      <li>JFT-300M: 303M high-resolution images</li>
    </ul>
  </div>
  <div class="pane">
    <h3>転移時の処理</h3>
    <ul>
      <li>事前学習の予測ヘッドを外す</li>
      <li>下流クラス数に合わせたheadを付ける</li>
      <li>高解像度fine-tuning時は位置埋め込みを補間する</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 3/5。データ規模・事前学習計算量と転移性能の関係]</div>

---
<!-- class: content-gray show-page -->

## 4. 実験結果
<p class="dense-lead">十分な規模で事前学習したViTは、複数の画像認識ベンチマークで高い性能を示した。</p>

<div class="layout-grid four">
  <div class="insight-card emphasis">
    <h3>ImageNet</h3>
    <span class="big-number">88.55%</span>
    <p class="card-note">best modelのfine-tuning accuracy</p>
  </div>
  <div class="insight-card">
    <h3>ImageNet-ReaL</h3>
    <span class="big-number">90.72%</span>
    <p class="card-note">cleaned-up labelsで評価</p>
  </div>
  <div class="insight-card">
    <h3>CIFAR-100</h3>
    <span class="big-number">94.55%</span>
    <p class="card-note">転移先の画像分類</p>
  </div>
  <div class="insight-card">
    <h3>VTAB</h3>
    <span class="big-number">77.63%</span>
    <p class="card-note">19タスクのsuite</p>
  </div>
</div>

<div class="callout">JFT-300Mで事前学習したViTは、ResNetベースの強いbaselineを上回りつつ、事前学習コストも有利だった。</div>

<div class="two-pane">
  <div class="pane">
    <h3>比較対象</h3>
    <ul>
      <li>大規模ResNetであるBiT-L</li>
      <li>Noisy Studentなど当時の強いCNN系モデル</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>読み取り方</h3>
    <ul>
      <li>大規模事前学習後の転移性能を見る</li>
      <li>精度だけでなく事前学習コストも議論している</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## データ規模が効く理由
<p class="dense-lead">ViTの弱点は「画像らしさを仮定しない」ことだが、その分スケールしたときの伸びが大きい。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>小さい事前学習</h3>
    <ul>
      <li>ImageNetのみでは大きなViTがResNetより不利</li>
      <li>データ不足では帰納バイアスの少なさが弱点になる</li>
      <li>正則化なしでは汎化が難しい</li>
    </ul>
  </div>
  <div class="pane">
    <h3>大きい事前学習</h3>
    <ul>
      <li>ImageNet-21kで性能差が縮まる</li>
      <li>JFT-300Mでは大きなViTが強くなる</li>
      <li>ResNetは早めに頭打ちになり、ViTは伸び続ける</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 4。事前学習データサイズに対するViTとResNetの性能比較]</div>

---
<!-- class: content-gray show-page -->

## 5. まとめ
<p class="dense-lead">ViTは、画像をパッチ列として扱うことでTransformerを画像分類へ直接適用した。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>入力設計</h3>
    <p>画像を固定サイズパッチに分け、線形射影と位置埋め込みでTransformerの系列入力にする。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>重要な条件</h3>
    <p>画像固有の帰納バイアスが少ないため、十分な大規模事前学習が性能の鍵になる。</p>
  </div>
  <div class="insight-card">
    <h3>結果</h3>
    <p>大規模事前学習後の転移では、CNN系の強いbaselineに匹敵または上回る性能を示した。</p>
  </div>
</div>

<div class="callout">入門的には「画像を16x16 wordsとして読むTransformer」と捉えると、論文の流れを追いやすい。</div>
