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
    <div class="name-box">知能太郎</div>
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
<p class="dense-lead">NLPではTransformerが標準になった一方、画像認識ではCNNが長く主流だった。</p>

<div class="two-pane">
  <div class="pane">
    <h3>NLP側の成功</h3>
    <ul>
      <li>Transformerは大規模事前学習とfine-tuningで高性能を示した</li>
      <li>BERTやGPT系のように、事前学習済み表現を転移する流れが強い</li>
      <li>モデルとデータを大きくしても性能が伸び続けた</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>画像認識側の状況</h3>
    <ul>
      <li>ResNet系の畳み込みネットワークが強い</li>
      <li>局所性や平行移動等価性が画像に合っていた</li>
      <li>自己注意はCNNと組み合わせる研究が多かった</li>
    </ul>
  </div>
</div>

<div class="callout">ViTは、CNNに依存せず標準Transformerを画像分類へ直接使えるかを検証する。</div>

---
<!-- class: content-gray show-page -->

## 解決したい課題
<p class="dense-lead">画像をTransformerへ入れるには、2次元画像を1次元トークン列として扱う必要がある。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>技術的な課題</h3>
    <ul>
      <li>Transformerは1D系列のtoken embeddingsを入力にする</li>
      <li>画像は2D構造と局所性を持つ</li>
      <li>画像固有の帰納バイアスを減らすとデータ要求が大きくなる</li>
    </ul>
  </div>
  <div class="pane">
    <h3>論文の問い</h3>
    <ul>
      <li>画像を単語列のように扱えるか</li>
      <li>標準Transformer encoderだけで画像分類できるか</li>
      <li>大規模事前学習でCNNとの差を埋められるか</li>
    </ul>
  </div>
</div>

<div class="callout">中規模データではResNetに劣るが、大規模事前学習で状況が変わる、という仮説が中心になる。</div>

---
<!-- class: content-gray show-page -->

## 提案手法の全体像
<p class="dense-lead">ViTは画像を固定サイズのパッチに分け、それぞれをTransformerの入力トークンとして扱う。</p>

<div class="two-pane">
  <div class="pane">
    <h3>入力側</h3>
    <ul>
      <li>パッチはNLPの単語tokenに対応</li>
      <li>各パッチを同じ次元のベクトルへ写像</li>
      <li>先頭に分類用のlearnable tokenを追加</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>モデル側</h3>
    <ul>
      <li>Transformer encoderはほぼ標準形</li>
      <li>画像固有の処理は入力変換に集中</li>
      <li>最後のclass tokenを画像表現として使う</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[ここに論文Figure 1: Model overview。Image -> Patches -> Transformer Encoder の全体図を入れる]</div>

---
<!-- class: content-gray show-page -->

## 手法の詳細1
<p class="dense-lead">2次元画像をパッチ列へ変換し、位置情報を足してTransformerへ入力する。</p>

### パッチ数

画像サイズを H x W、パッチサイズを P x P とすると、パッチ数 N は次で決まる。

$$
N = \frac{H W}{P^{2}}
$$

- $H, W$: 入力画像の高さと幅
- $P$: 1パッチの一辺
- $N$: Transformerへ入る画像パッチの個数

パッチサイズを小さくすると系列長が増え、計算量は増えるが細かい情報を扱いやすくなる。

---
<!-- class: content-gray show-page -->

## 手法の詳細1: 初期系列
<p class="dense-lead">class token、パッチ埋め込み、位置埋め込みを足してTransformerの入力系列を作る。</p>

$$
z_{0} =
\left[
x_{\mathrm{class}};
e_{1};
\cdots;
e_{N}
\right]
+ E_{\mathrm{pos}}
$$

- $z_{0}$: Transformer Encoderへ入力する最初のtoken列
- $x_{\mathrm{class}}$: 画像全体の表現を集約するclass token
- $e_{i}$: $i$ 番目の画像パッチを線形射影した埋め込み
- $E_{\mathrm{pos}}$: 各tokenの位置を表す位置埋め込み

---
<!-- class: content-gray show-page -->

## 手法の詳細2: Encoder
<p class="dense-lead">各層では、LayerNorm、Multi-head Self-Attention、MLP、残差接続を交互に使う。</p>

$$
u_{\ell} = \mathrm{MSA}(\mathrm{LN}(z_{\ell - 1})) + z_{\ell - 1}
$$

$$
z_{\ell} = \mathrm{MLP}(\mathrm{LN}(u_{\ell})) + u_{\ell}
$$

<div class="mini-flow">
  <div class="mini-step"><div class="label">LN</div><div class="sub">各blockの前に適用</div></div>
  <div class="mini-step"><div class="label">MSA</div><div class="sub">全パッチ間を学習</div></div>
  <div class="mini-step"><div class="label">MLP</div><div class="sub">各tokenを変換</div></div>
  <div class="mini-step"><div class="label">Residual</div><div class="sub">各block後に足し戻す</div></div>
</div>

- $z_{\ell - 1}$: 前層から渡される入力表現
- $u_{\ell}$: Self-Attention後の中間表現
- $z_{\ell}$: MLP後に次層へ渡される出力表現
- $\mathrm{LN}$, $\mathrm{MSA}$, $\mathrm{MLP}$: LayerNorm、Multi-head Self-Attention、MLPを表す

---
<!-- class: content-gray show-page -->

## 実験設定
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
    <h3>転移評価</h3>
    <ul>
      <li>ImageNet / ImageNet-ReaL</li>
      <li>CIFAR-10 / CIFAR-100</li>
      <li>Oxford Pets, Flowers, VTAB</li>
    </ul>
  </div>
</div>

<div class="callout">比較では、ResNetベースのBiTやNoisy Studentなど当時の強いCNN系モデルも参照される。</div>

---
<!-- class: content-gray show-page -->

## 結果
<p class="dense-lead">十分な規模で事前学習したViTは、複数の画像認識ベンチマークで高い性能を示した。</p>

<div class="figure-placeholder">[ここに論文Table 2: popular image classification benchmarks の比較表を入れる]</div>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>表で見る点</h3>
    <ul>
      <li>ImageNet、CIFAR-100、VTABなどで比較する</li>
      <li>ViT-L/16とBiT-Lなど強いCNN系を比べる</li>
      <li>平均値と標準偏差で性能を報告する</li>
    </ul>
  </div>
  <div class="pane">
    <h3>主な読み取り</h3>
    <ul>
      <li>JFT-300M事前学習でViTは高い転移性能を示す</li>
      <li>大規模データではCNN系baselineを上回る</li>
      <li>精度だけでなく事前学習コストも議論される</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 考察
<p class="dense-lead">ViTの弱点は画像固有の帰納バイアスが少ないことだが、その分スケールしたときの伸びが大きい。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>小さい事前学習</h3>
    <ul>
      <li>ImageNetのみでは大きなViTがResNetより不利</li>
      <li>データ不足では帰納バイアスの少なさが弱点になる</li>
      <li>空間関係をデータから学ぶ必要がある</li>
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

<div class="figure-placeholder">[ここに論文Figure 3/5: 事前学習データ規模・計算量と転移性能の関係を入れる]</div>

---
<!-- class: content-gray show-page -->

## 限界・今後の課題
<p class="dense-lead">ViTは強力だが、十分なデータと計算資源が前提になりやすい。</p>

<div class="two-pane">
  <div class="pane">
    <h3>限界</h3>
    <ul>
      <li>中規模データだけではCNNに劣る場合がある</li>
      <li>系列長が長くなると計算量が増える</li>
      <li>画像の2D構造は主にパッチ分割と位置埋め込みに限られる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>今後の方向</h3>
    <ul>
      <li>自己教師あり事前学習の改善</li>
      <li>より効率的な視覚Transformer</li>
      <li>階層構造や局所性を取り入れた発展モデル</li>
    </ul>
  </div>
</div>

<div class="callout">ViT以後、SwinやConvNeXtのように、TransformerとConvNetの設計を再検討する流れが強まった。</div>

---
<!-- class: content-gray show-page -->

## まとめ
<p class="dense-lead">ViTは、画像をパッチ列として扱うことでTransformerを画像分類へ直接適用した。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>背景</h3>
    <p>NLPで成功したTransformerを、CNN優勢の画像認識へ持ち込む。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>方法</h3>
    <p>画像を固定サイズパッチに分け、位置埋め込み付きのtoken列として処理する。</p>
  </div>
  <div class="insight-card">
    <h3>結論</h3>
    <p>大規模事前学習後の転移では、強いCNN系baselineに匹敵または上回る。</p>
  </div>
</div>

<div class="callout">輪読では「画像を16x16 wordsとして読むTransformer」と捉えると、論文の流れを追いやすい。</div>
