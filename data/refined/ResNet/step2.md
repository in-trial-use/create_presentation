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
<div class="subtitle">論文紹介 2026/05/21</div>
<div class="maintitle">ResNet</div>

<div class="bottom-band">
  <div style="width: 100%;">
    <div class="name-box">同志社大学　工学部</div>
    <div class="name-box">銅　使者</div>
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

## 2. 研究背景
<p class="dense-lead">画像認識では、ネットワークを深くすることでより複雑な特徴を学習できると期待されていた。</p>

<div class="two-pane">
  <div class="pane">
    <h3>深層化の期待</h3>
    <ul>
      <li>浅い層ではエッジなどの単純特徴を学習する</li>
      <li>深い層では物体の部品や意味的特徴を扱える</li>
      <li>VGGのように層を深くする設計が有効だった</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>当時の課題意識</h3>
    <ul>
      <li>深いネットワークほど表現力は高いはず</li>
      <li>しかし単純に深くするだけでは性能が上がらない</li>
      <li>最適化を助ける構造が必要になる</li>
    </ul>
  </div>
</div>

<div class="callout">ResNetは、超深層ネットワークを学習可能にするための残差学習を提案する。</div>

---
<!-- class: content-gray show-page -->

## 3. 解決したい課題
<p class="dense-lead">単純な深層化では、訓練誤差まで悪化するDegradation問題が起こる。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>Degradation問題</h3>
    <ul>
      <li>深いPlain Netが浅いPlain Netより悪くなる</li>
      <li>検証誤差だけでなく訓練誤差も悪化する</li>
      <li>過学習ではなく最適化の問題として扱われる</li>
    </ul>
  </div>
  <div class="pane">
    <h3>直感的な矛盾</h3>
    <ul>
      <li>深いモデルは浅いモデルを内包できるはず</li>
      <li>不要な層が恒等写像になれば同等性能を出せるはず</li>
      <li>実際にはその恒等写像を学ぶことが難しい</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 1。20層と56層のPlain Netの誤差グラフ]</div>

---
<!-- class: content-gray show-page -->

## 4. 提案手法の全体像
<p class="dense-lead">ResNetは、望ましい写像そのものではなく、入力との差分である残差を学習する。</p>

<div class="mini-flow">
  <div class="mini-step"><span class="label">入力</span><span class="sub">xをブロックへ入れる</span></div>
  <div class="mini-step"><span class="label">残差</span><span class="sub">F(x)を畳み込みで学習</span></div>
  <div class="mini-step"><span class="label">Shortcut</span><span class="sub">xをそのまま渡す</span></div>
  <div class="mini-step"><span class="label">加算</span><span class="sub">F(x)+xを出力</span></div>
</div>

<div class="two-pane">
  <div class="pane">
    <h3>Plain Block</h3>
    <ul>
      <li>層を重ねて出力H(x)を直接学習する</li>
      <li>深くなるほど最適化が難しくなる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Residual Block</h3>
    <ul>
      <li>F(x)+xの形で入力を足し戻す</li>
      <li>不要な層はF(x)=0に近づければよい</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 5. 手法の詳細1
<p class="dense-lead">残差ブロックでは、ショートカット接続により入力をバイパスして足し戻す。</p>

<div class="two-pane">
  <div class="pane">
    <h3>構造</h3>
    <ul>
      <li>通常の畳み込み層で残差を計算する</li>
      <li>入力をショートカットでそのまま先へ送る</li>
      <li>最後に残差と入力を足し合わせる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>効果</h3>
    <ul>
      <li>恒等写像を直接学ぶより最適化しやすい</li>
      <li>勾配がショートカット経路を通りやすくなる</li>
      <li>深いモデルでも性能劣化を避けやすい</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 2。残差ブロックの概念図]</div>

---
<!-- class: content-gray show-page -->

## 6. 手法の詳細2: 数式の要点
<p class="dense-lead">残差学習では、目標写像H(x)を残差F(x)と入力xの和として表す。</p>

$$
F(x) := H(x) - x
$$

$$
H(x) = F(x) + x
$$

<div class="two-pane">
  <div class="pane">
    <h3>恒等写像が望ましい場合</h3>
    <ul>
      <li>H(x)=xを直接学ぶ必要がない</li>
      <li>F(x)=0を学べばよい</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>実装上の単純さ</h3>
    <ul>
      <li>追加するのはショートカットと加算</li>
      <li>パラメータを増やさない恒等ショートカットも使える</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 7. 実験設定
<p class="dense-lead">残差学習の効果を、Plain Netや既存モデルとの比較で検証する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>データセット</h3>
    <ul>
      <li>画像分類: ImageNet 2012, CIFAR-10</li>
      <li>物体検出: PASCAL VOC, MS COCO</li>
      <li>分類と検出の両方で汎用性を確認</li>
    </ul>
  </div>
  <div class="pane">
    <h3>比較対象</h3>
    <ul>
      <li>Plain Network: 同じ層数でショートカットなし</li>
      <li>VGG, GoogLeNetなどの既存モデル</li>
      <li>18層から152層までのResNet</li>
    </ul>
  </div>
</div>

<div class="callout">CIFAR-10では1000層を超えるネットワークも試し、深層化の限界を検証している。</div>

---
<!-- class: content-gray show-page -->

## 8. 結果
<p class="dense-lead">ResNetでは、深いモデルが浅いモデルより良くなり、深さの恩恵を受けられた。</p>

<div class="layout-grid three">
  <div class="insight-card">
    <h3>Degradation解消</h3>
    <p>34層ResNetは18層ResNetより良くなり、Plain Netとは逆の傾向を示した。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>ImageNet</h3>
    <span class="big-number">4.49%</span>
    <p class="card-note">ResNet-152単体のTop-5エラー率</p>
  </div>
  <div class="insight-card">
    <h3>Ensemble</h3>
    <span class="big-number">3.57%</span>
    <p class="card-note">ILSVRC 2015で優勝</p>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 4 / Table 4。Plain NetとResNetの比較]</div>

---
<!-- class: content-gray show-page -->

## 9. 考察
<p class="dense-lead">ResNetの層の応答はPlain Netより小さく、残差学習の仮説を支持する。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>残差の見方</h3>
    <ul>
      <li>多くの層は入力を大きく変える必要がない</li>
      <li>深いResNetほど残差応答が小さい傾向がある</li>
      <li>恒等写像に近い振る舞いを許す構造が効いている</li>
    </ul>
  </div>
  <div class="pane">
    <h3>汎用性</h3>
    <ul>
      <li>分類だけでなく検出タスクでも効果を示す</li>
      <li>MS COCOではVGG-16からResNet-101への置換で性能が向上</li>
      <li>学習された特徴がタスク横断で有効だった</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 7。各層の応答の大きさ]</div>

---
<!-- class: content-gray show-page -->

## 10. 限界・今後の課題
<p class="dense-lead">ResNetは深層化を可能にしたが、深さだけで全てが解決するわけではない。</p>

<div class="two-pane">
  <div class="pane">
    <h3>限界</h3>
    <ul>
      <li>非常に深くすると計算量とメモリ消費が増える</li>
      <li>タスクによっては深さ以外の設計も重要になる</li>
      <li>ショートカットだけで表現効率の全問題を解くわけではない</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>今後の発展</h3>
    <ul>
      <li>より効率的なblock設計</li>
      <li>検出・セグメンテーションなど下流タスクへの応用</li>
      <li>ConvNeXtのような現代的ConvNetへの発展</li>
    </ul>
  </div>
</div>

<div class="callout">ResNet以後の多くのモデルは、残差接続を基本部品として利用している。</div>

---
<!-- class: content-gray show-page -->

## 11. まとめ
<p class="dense-lead">ResNetは、残差学習とショートカットにより、超深層ネットワークの最適化を可能にした。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>背景</h3>
    <p>深いネットワークは表現力が高いが、単純な深層化ではDegradation問題が起きる。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>方法</h3>
    <p>H(x)を直接学ばず、F(x)+xとして残差を学習する。</p>
  </div>
  <div class="insight-card">
    <h3>結論</h3>
    <p>深いモデルほど性能を伸ばせるようになり、分類・検出で有効性を示した。</p>
  </div>
</div>

<div class="callout">輪読では「深くしたいが最適化できない」という課題から、残差学習へ進む流れを押さえる。</div>
