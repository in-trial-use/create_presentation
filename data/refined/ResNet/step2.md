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
    <div class="agenda-item">1. 深層化の背景と劣化問題</div>
    <div class="agenda-item">2. 深層残差学習と残差ブロック</div>
    <div class="agenda-item">3. ResNetの構成と実験</div>
    <div class="agenda-item">4. 結果と考察</div>
    <div class="agenda-item">5. まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 1. 深層化の背景と劣化問題
<p class="dense-lead">ネットワークを深くすると表現力は上がるはずだが、単純な深層化には限界がある。</p>

<div class="two-pane">
  <div class="pane">
    <h3>深層化の期待</h3>
    <ul>
      <li>VGGネットのように、層を深くすることで表現力が上がる</li>
      <li>より複雑な特徴を段階的に学習できる</li>
      <li>画像認識精度の改善が期待される</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>深層化の障壁</h3>
    <ul>
      <li>勾配消失・爆発により学習が不安定になる</li>
      <li>バッチ正規化などで緩和できる問題もある</li>
      <li>それでもDegradation問題が残る</li>
    </ul>
  </div>
</div>

<div class="callout">ResNetの主題は、層を深くしたときに訓練誤差まで悪化するDegradation問題を解くこと。</div>

---
<!-- class: content-gray show-page -->

## Degradation問題
<p class="dense-lead">深いモデルは浅いモデル以上の性能を出せるはずなのに、実際には訓練誤差が悪化することがある。</p>

<ul class="dense-list">
  <li>理論上は、深いモデルが浅いモデルに「何もしない層」を追加すれば、少なくとも同等の性能を出せるはず。</li>
  <li>しかし、最適化が難しいため、深いPlain Netの方が訓練誤差まで悪化する。</li>
  <li>これは過学習ではなく、訓練誤差の段階で起きる最適化上の問題として扱われる。</li>
</ul>

<div class="figure-placeholder">[図: 論文Figure 1。20層と56層のPlain Netの誤差グラフ]</div>

---
<!-- class: content-gray show-page -->

## 2. 深層残差学習
<p class="dense-lead">ResNetは、出力そのものではなく、入力との差分である残差を学習させる。</p>

従来は、入力 $x$ から望ましい写像 $H(x)$ を直接学習する。

$$
H(x)
$$

本研究では、残差を次のように定義する。

$$
F(x) := H(x) - x
$$

その結果、元の写像は次の形で表せる。

$$
H(x) = F(x) + x
$$

<div class="math-note">見方: 恒等写像が望ましい場合、H(x)=x を直接学ぶ代わりに、残差 F(x)=0 を学べばよい。</div>

---
<!-- class: content-gray show-page -->

## 残差ブロック
<p class="dense-lead">入力をバイパスするショートカットコネクションを追加し、残差を足し戻す。</p>

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
    <h3>なぜ効くか</h3>
    <ul>
      <li>追加層が不要なら残差をゼロに近づければよい</li>
      <li>恒等写像を直接学ぶより最適化しやすい</li>
      <li>深いネットワークでも性能劣化を避けやすい</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 2。残差ブロックの概念図]</div>

---
<!-- class: content-gray show-page -->

## ResNetアーキテクチャ
<p class="dense-lead">ResNetは、VGGベースのPlain Netにショートカットを追加したシンプルな構成である。</p>

<div class="two-pane">
  <div class="pane">
    <h3>Plain Network</h3>
    <ul>
      <li>34層のVGG風ネットワーク</li>
      <li>ショートカットなし</li>
      <li>深くすると劣化問題が生じやすい</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Residual Network</h3>
    <ul>
      <li>同じ層数にショートカットを追加</li>
      <li>残差を学習するブロックを積み重ねる</li>
      <li>深層化による性能劣化を防ぐ</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 3。34層Plain Netと34層ResNetの構成図]</div>

---
<!-- class: content-gray show-page -->

## 3. 実験設定
<p class="dense-lead">ショートカットコネクションの効果を、Plain Netや既存モデルとの比較で検証する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>データセット</h3>
    <ul>
      <li>画像分類: ImageNet 2012, CIFAR-10</li>
      <li>物体検出: PASCAL VOC, MS COCO</li>
      <li>分類だけでなく検出タスクへの汎用性も確認</li>
    </ul>
  </div>
  <div class="pane">
    <h3>比較対象</h3>
    <ul>
      <li>Plain Network: ResNetと同じ層数だがショートカットなし</li>
      <li>VGG, GoogLeNetなどの既存SOTAモデル</li>
      <li>18層から152層までのモデルを比較</li>
    </ul>
  </div>
</div>

<div class="callout">CIFAR-10では1000層を超えるネットワークも試行し、深層化の限界を検証している。</div>

---
<!-- class: content-gray show-page -->

## 4. 結果: Degradation問題の解決
<p class="dense-lead">ResNetでは、深いモデルが浅いモデルより良くなり、深さの恩恵を受けられた。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>Plain Network</h3>
    <ul>
      <li>34層は18層より誤差が悪化</li>
      <li>深くしただけでは最適化が難しい</li>
      <li>Degradation問題を再現</li>
    </ul>
  </div>
  <div class="pane">
    <h3>Residual Network</h3>
    <ul>
      <li>34層は18層より誤差が改善</li>
      <li>深さの恩恵を受けられる</li>
      <li>残差学習が最適化を容易にする</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 4。Plain NetとResNetの訓練・検証誤差グラフ]</div>

---
<!-- class: content-gray show-page -->

## ImageNetでの性能
<p class="dense-lead">152層ResNetが高い性能を示し、ILSVRC 2015で優勝した。</p>

<div class="two-pane">
  <div class="pane">
    <h3>単体モデルの比較</h3>
    <ul>
      <li>VGG-16: Top-5エラー率 7.1%</li>
      <li>PReLU-net: Top-5エラー率 5.71%</li>
      <li>ResNet-101: Top-5エラー率 4.60%</li>
      <li><b>ResNet-152: Top-5エラー率 4.49%</b></li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>主要な結果</h3>
    <ul>
      <li>ResNetは層を深くするほど精度が向上した</li>
      <li>152層モデルで最高性能を達成した</li>
      <li>アンサンブルではTop-5エラー率3.57%を記録した</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Table 4。ResNet-152の性能比較]</div>

---
<!-- class: content-gray show-page -->

## 物体検出での汎用性
<p class="dense-lead">ResNetで学習された特徴は、画像分類だけでなく物体検出でも有効だった。</p>

| バックボーン | mAP @ [.5, .95] | mAP @ .5 |
| :--- | :---: | :---: |
| VGG-16 | 21.2 | 41.5 |
| **ResNet-101** | **27.2** | **48.4** |
| 向上率 | **+28%** | **+17%** |

<ul class="dense-list">
  <li>バックボーンをVGG-16からResNet-101に置き換えるだけで、MS COCOで性能が向上した。</li>
  <li>ResNetがタスクに依存しない汎用的な特徴を学習できていることを示している。</li>
</ul>

---
<!-- class: content-gray show-page -->

## 考察: 残差は本当に小さいか
<p class="dense-lead">ResNetの層の応答はPlain Netより小さい傾向にあり、残差学習の仮説を支持する。</p>

<ul class="dense-list">
  <li>ResNetの層の応答、つまり学習された残差の大きさは、Plain Netに比べて全体的に小さい。</li>
  <li>特に深いResNetほど、応答が小さくなる傾向がある。</li>
  <li>多くの層が恒等写像に近い、「何もしない」に近い振る舞いをしていることを示唆する。</li>
</ul>

<div class="figure-placeholder">[図: 論文Figure 7。各層の出力の標準偏差を示すグラフ]</div>

---
<!-- class: content-gray show-page -->

## 5. まとめ
<p class="dense-lead">ResNetは、残差学習とショートカットにより、超深層ネットワークの最適化を可能にした。</p>

<ul class="dense-list">
  <li><b>Degradation問題を解決</b>: 深くすると訓練誤差が悪化する問題に対して、残差学習を提案した。</li>
  <li><b>152層でSOTAを達成</b>: ImageNetコンペで優勝し、深層化の有効性を示した。</li>
  <li><b>汎用的な特徴を学習</b>: 物体検出でもResNetバックボーンにより性能が向上した。</li>
  <li><b>現代モデルの基礎</b>: 画像認識や検出の標準的なバックボーンとして広く使われるようになった。</li>
</ul>

<div class="callout">ポイント: ResNetは「深くするほど学習しにくい」を、「残差を学ぶ」ことで乗り越えた。</div>
