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
    <div class="agenda-item">1. 研究背景と課題</div>
    <div class="agenda-item">2. 提案手法：深層残差学習</div>
    <div class="agenda-item">3. 実験と結果</div>
    <div class="agenda-item">4. 考察とまとめ</div>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## 背景：深層化による性能向上とその限界
ネットワークを深く（Deepに）することで性能は向上するはずでした

<div class="two-col">
  <div class="col">
    <h3>深層化のトレンド</h3>
    <ul>
      <li>VGGネットに代表されるように、層を深くすることでモデルの表現力が向上し、精度が改善されるのが一般的でした。</li>
    </ul>
    <br>
    <h3>深層化の障壁</h3>
    <ul>
      <li><span class="bold blue-text">勾配消失/爆発問題</span>
        <ul>
          <li>学習が不安定になる問題。バッチ正規化(BN)等で緩和。</li>
        </ul>
      </li>
      <li><span class="bold red-text">Degradation（劣化）問題</span>
        <ul>
          <li>層を深くすると、逆に訓練精度が悪化する現象。</li>
        </ul>
      </li>
    </ul>
  </div>
  <div class="col">
    [図: VGGネットのような層が積み重なったネットワークのイメージ図]
    <p class="text-center">層を増やすほど性能は上がるはずが…</p>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## 解決したい課題：Degradation（劣化）問題
単純に層を深くすると、性能が劣化してしまう現象

- 理論上、深いモデルは浅いモデルに「何もしない層」を追加すれば、少なくとも同等以上の性能は出せるはずです。
- しかし、最適化が困難なため、実際には<span class="bold red-text">深いモデルの方が訓練誤差が悪化</span>します。
- これは過学習ではなく、<span class="bold">最適化の難しさ</span>が原因と考えられます。

[図: 論文Figure 1。20層と56層のPlain Netの誤差グラフ]
<p class="text-center">56層ネットワーク（深い）は20層（浅い）より誤差が大きい</p>

---

<!-- class: content-gray show-page -->

## 提案手法：深層残差学習 (Deep Residual Learning)
出力そのものではなく、<span class="red-text">残差（Residual）</span>を学習させます

あるべき写像を $H(x)$ とします。

従来のネットワークでは、入力 $x$ から $H(x)$ を直接学習しようとします。
$$
H(x)
$$

<br>

本研究では、学習対象を<span class="red-text">残差</span> $F(x) = H(x) - x$ と再定義します。
$$
F(x) := H(x) - x
$$
これにより、ネットワークは元の写像 $H(x)$ を $F(x) + x$ として学習します。
$$
H(x) = F(x) + x
$$
このアイデアが、深いネットワークの学習を劇的に容易にします。

---

<!-- class: content-gray show-page -->

## 提案手法の中核：残差ブロック
入力をバイパスする「ショートカットコネクション」を追加します

<div class="two-col">
  <div class="col">
    [図: 論文Figure 2。残差ブロックの概念図]
  </div>
  <div class="col">
    <h3>なぜうまくいくのか？</h3>
    <ul>
      <li>もし追加層が「何もしない」のが最適な場合、従来のネットワークは恒等写像 $H(x)=x$ を学習する必要があり、これは困難です。</li>
      <li>一方、残差学習では<span class="blue-text">残差 $F(x)$ がゼロになるように学習すればよい</span>だけです。</li>
      <li>重みをゼロに近づけるだけで済むため、学習が非常に容易になり、Degradation問題を回避できます。</li>
    </ul>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## ResNetアーキテクチャ
VGGベースのPlain Netにショートカットを追加した構成

<div class="two-col">
  <div class="col">
    <p class="text-center">
      <span class="bold">Plain Network (34層)</span>
    </p>
    [図: 論文Figure 3 Middle。34層Plain Netの構成図]
  </div>
  <div class="col">
    <p class="text-center">
      <span class="bold">Residual Network (34層)</span>
    </p>
    [図: 論文Figure 3 Right。34層ResNetの構成図。ショートカットが追加されている]
  </div>
</div>
<br>
- ResNetは、同じ層数のPlain Netに<span class="red-text">ショートカットコネクションを追加</span>しただけのシンプルな構造です。
- これにより、深層化による性能劣化を防ぎます。

---

<!-- class: content-gray show-page -->

## 実験設定
ショートカットコネクションの効果を直接比較します

- **データセット**
  - **画像分類**: ImageNet 2012, CIFAR-10
  - **物体検出**: PASCAL VOC, MS COCO

- **比較対象**
  - <span class="bold blue-text">Plain Network</span>: ResNetと同じ層数・構造だが<span class="bold red-text">ショートカットがない</span>ネットワーク。Degradation問題を再現し、ResNetの効果を直接比較するために使用。
  - **既存SOTAモデル**: VGG, GoogLeNetなど。

- **評価**
  - 18層から152層までのPlain NetとResNetを比較します。
  - CIFAR-10では1000層を超えるネットワークも試行します。

---

<!-- class: content-gray show-page -->

## 結果1: Degradation問題の解決
ResNetは深くなるほど一貫して性能が向上しました

[図: 論文Figure 4。Plain NetとResNetの訓練・検証誤差グラフの比較]
<div class="two-col">
  <div class="col">
    <h4>Plain Network</h4>
    <ul>
      <li>34層（深い）は18層（浅い）より誤差が悪化。<span class="red-text">Degradation問題を再現</span>。</li>
    </ul>
  </div>
  <div class="col">
    <h4>Residual Network (ResNet)</h4>
    <ul>
      <li>34層は18層より誤差が改善。<span class="blue-text">深さの恩恵を享受</span>。</li>
    </ul>
  </div>
</div>
残差学習が、深いネットワークの最適化を効果的に容易にすることを示しています。

---

<!-- class: content-gray show-page -->

## 結果2: ImageNetでの驚異的な性能
152層ResNetがILSVRC 2015で優勝しました

- ResNetは層を深くするほど精度が向上し、152層モデルで最高性能を達成。
- アンサンブルモデルは<span class="bold red-text">Top-5エラー率3.57%</span>を記録し、当時のSOTAを大幅に更新しました。

[図: 論文Table 4の主要部分を抜粋した表。ResNet-152の圧倒的な性能を示す]

| モデル | Top-5 エラー率 (%) |
| :--- | :--- |
| VGG-16 [41] | 7.1 |
| PReLU-net [13] | 5.71 |
| ResNet-34 B | 5.71 |
| ResNet-101 | 4.60 |
| **ResNet-152** | **4.49** |

---

<!-- class: content-gray show-page -->

## 結果3: 学習された特徴の汎用性
物体検出タスクでも性能が大幅に向上しました

- 物体検出のバックボーンをVGG-16からResNet-101に置き換えるだけで、MS COCOデータセットでの性能が飛躍的に向上しました。
- mAP@.5:.95 (標準指標) で<span class="bold red-text">28%の相対的改善</span>を達成。
- この結果は、ResNetがタスクに依存しない、より高品質で汎用的な特徴を学習できていることを示しています。

[図: 論文Table 8を元にした比較表]

| バックボーン | mAP @ [.5, .95] | mAP @ .5 |
| :--- | :---: | :---: |
| VGG-16 | 21.2 | 41.5 |
| **ResNet-101** | **27.2** | **48.4** |
| 向上率 | <span class="bold red-text">+28%</span> | <span class="bold red-text">+17%</span> |

---

<!-- class: content-gray show-page -->

## 考察：残差は本当に学習されているか？
ResNetの層の応答は、Plain Netより小さい傾向にあります

[図: 論文Figure 7。各層の出力の標準偏差を示すグラフ]
<br>
- ResNetの層の応答（≒学習された残差 $F(x)$ の大きさ）は、Plain Netに比べて全体的に小さいことがわかります。
- 特に深いResNet（110層）ほど、応答が小さくなる傾向があります。
- これは、多くの層が恒等写像に近い、つまり<span class="blue-text">「何もしない」に近い振る舞いをしている</span>ことを示唆しており、残差学習の仮説を裏付けています。

---

<!-- class: content-gray show-page -->

## まとめ
本研究の貢献

<div class="dashed-box">
  <div class="agenda-list">
    <div class="agenda-item"><span class="bold">Degradation問題を解決する「深層残差学習」を提案</span><br>ショートカットコネクションにより、超深層ネットワークの最適化を可能にしました。</div>
    <div class="agenda-item"><span class="bold">152層の超深層モデルでSOTAを達成</span><br>ImageNetコンペで優勝し、深層学習の性能を新たな次元へと引き上げました。</div>
    <div class="agenda-item"><span class="bold">現代の深層学習モデルの基礎を構築</span><br>ResNetは画像認識だけでなく、物体検出など多くのタスクの標準的なバックボーンとなり、その後の研究に絶大な影響を与えました。</div>
  </div>
</div>