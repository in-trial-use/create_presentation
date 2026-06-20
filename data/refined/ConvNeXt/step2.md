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
<div class="subtitle">2024年度後期第4回輪読会 【物体検出】</div>
<div class="maintitle">ConvNeXt</div>

<div class="bottom-band">
  <div style="width: 100%;">
    <div class="name-box">京都大学理学部2回</div>
    <div class="name-box">千葉 一世</div>
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
    <div class="agenda-item">1. 背景: ViT/Swin後のConvNet</div>
    <div class="agenda-item">2. ResNetを近代化するRoadmap</div>
    <div class="agenda-item">3. ConvNeXt blockの設計</div>
    <div class="agenda-item">4. ImageNet・下流タスクの結果</div>
    <div class="agenda-item">5. まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 1. 背景: ConvNetは本当に古いのか
<p class="dense-lead">ViT以後、画像分類ではTransformerが強くなったが、汎用視覚backboneではConvNet的な性質も重要だった。</p>

<div class="two-pane">
  <div class="pane">
    <h3>ConvNetの強み</h3>
    <ul>
      <li>平行移動等価性などの帰納バイアスを持つ</li>
      <li>sliding-window的な処理が高解像度画像に合う</li>
      <li>検出・セグメンテーションで使いやすい</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Transformer側の流れ</h3>
    <ul>
      <li>ViTは大規模分類で強いが、vanilla構成は汎用backboneで難点がある</li>
      <li>Swinは局所windowなどConvNet priorsを再導入した</li>
      <li>性能差の理由がattentionだけなのかを問い直す</li>
    </ul>
  </div>
</div>

<div class="callout">ConvNeXtの目的は、純ConvNetを現代的な設計に更新したとき、Transformerとどこまで競えるかを検証すること。</div>

---
<!-- class: content-gray show-page -->

## 論文の進め方
<p class="dense-lead">標準ResNetを出発点に、Swin Transformerの設計に近づける変更を段階的に入れていく。</p>

<div class="mini-flow">
  <div class="mini-step">
    <div class="label">ResNet</div>
    <div class="sub">強い学習recipe</div>
  </div>
  <div class="mini-step">
    <div class="label">Macro</div>
    <div class="sub">stage ratio / patchify</div>
  </div>
  <div class="mini-step">
    <div class="label">Block</div>
    <div class="sub">depthwise / inverted</div>
  </div>
  <div class="mini-step">
    <div class="label">Micro</div>
    <div class="sub">GELU / LN / downsample</div>
  </div>
</div>

<div class="two-pane">
  <div class="pane">
    <h3>比較の考え方</h3>
    <ul>
      <li>ResNet-50 / Swin-T程度のFLOPsで主に検証</li>
      <li>ImageNet-1Kで各変更の効果を確認</li>
      <li>FLOPsを大きく外さないように調整</li>
    </ul>
  </div>
  <div class="pane">
    <h3>到達点</h3>
    <ul>
      <li>標準ConvNetモジュールだけで構成</li>
      <li>Transformer的なmacro/micro designを取り入れる</li>
      <li>最終的にConvNeXt familyとして拡張する</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 2. Training Recipe
<p class="dense-lead">まず、アーキテクチャ変更の前に現代的な学習設定をResNetへ適用する。</p>

<div class="layout-grid three">
  <div class="insight-card">
    <h3>Optimizer</h3>
    <p>AdamWを使い、300 epochsの長い学習を行う。</p>
  </div>
  <div class="insight-card">
    <h3>Augmentation</h3>
    <p>Mixup、Cutmix、RandAugment、Random Erasingなどを採用する。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>Accuracy</h3>
    <span class="big-number">78.8%</span>
    <p class="card-note">ResNet-50が76.1%から改善</p>
  </div>
</div>

<div class="callout">この時点で、比較対象のConvNet側もTransformer時代の学習recipeに揃えることになる。</div>

<div class="two-pane">
  <div class="pane">
    <h3>追加される正則化</h3>
    <ul>
      <li>Stochastic Depth</li>
      <li>Label Smoothing</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>この段階の意味</h3>
    <ul>
      <li>ResNetそのものを強い条件で再評価する</li>
      <li>後続の構造変更の効果を見やすくする</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## Macro Design
<p class="dense-lead">ネットワーク全体のstage構成とstemを、Swin Transformerに近い形へ寄せる。</p>

<div class="two-pane">
  <div class="pane">
    <h3>Stage ratio</h3>
    <ul>
      <li>ResNet-50のblock数: (3, 4, 6, 3)</li>
      <li>Swin風に (3, 3, 9, 3) へ変更</li>
      <li>accuracy: 78.8% → 79.4%</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Patchify stem</h3>
    <ul>
      <li>ResNet stemを4x4 stride 4 convolutionへ置換</li>
      <li>Swinのpatchifyに近い入口にする</li>
      <li>accuracy: 79.4% → 79.5%</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 2。ResNetからConvNeXtへ向かうmodernization roadmap]</div>

---
<!-- class: content-gray show-page -->

## 3. Block Design
<p class="dense-lead">ConvNeXt blockは、Transformer blockの設計思想をConvNetの部品で写し取る。</p>

<div class="two-pane">
  <div class="pane">
    <h3>Depthwise convolution</h3>
    <ul>
      <li>空間方向のmixingをchannelごとに行う</li>
      <li>1x1 convolutionと組み合わせ、空間mixingとchannel mixingを分離</li>
      <li>幅をSwin-T相当に広げ、80.5%へ改善</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Inverted bottleneck</h3>
    <ul>
      <li>MLP側の隠れ次元を入力より広くする</li>
      <li>MobileNetV2系の設計ともつながる</li>
      <li>accuracy: 80.5% → 80.6%</li>
    </ul>
  </div>
</div>

<div class="callout">self-attentionの代わりにdepthwise convolutionを使い、ConvNetのまま「空間mixing」と「channel mixing」を分ける。</div>

---
<!-- class: content-gray show-page -->

## Large Kernel
<p class="dense-lead">Transformerの広い受容野に対応する要素として、大きな畳み込みkernelを再検討する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>位置の変更</h3>
    <ul>
      <li>depthwise convをblockの前方へ移動</li>
      <li>TransformerでMSAがMLPより前に来る構造と対応</li>
      <li>一時的に79.9%まで性能が下がる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Kernel size</h3>
    <ul>
      <li>3, 5, 7, 9, 11を比較</li>
      <li>7x7で性能改善が飽和</li>
      <li>accuracy: 79.9% → 80.6%</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: 論文Figure 3/4。ResNeXt blockからConvNeXt blockへの変更]</div>

---
<!-- class: content-gray show-page -->

## Micro Design
<p class="dense-lead">activation、normalization、downsamplingもTransformer時代の設計に合わせて見直す。</p>

<div class="layout-grid three">
  <div class="insight-card">
    <h3>GELU + fewer activations</h3>
    <p>ReLUをGELUへ置換し、block内のactivationを1つに減らす。</p>
    <span class="big-number">81.3%</span>
  </div>
  <div class="insight-card">
    <h3>Fewer norms + LN</h3>
    <p>normalizationを減らし、BatchNormからLayerNormへ置き換える。</p>
    <span class="big-number">81.5%</span>
  </div>
  <div class="insight-card emphasis">
    <h3>Separate downsampling</h3>
    <p>stage間に独立したdownsampling layerを置く。</p>
    <span class="big-number">82.0%</span>
  </div>
</div>

<div class="callout">最終的なConvNeXt-Tは、同程度のFLOPsのSwin-T 81.3%を上回る結果になった。</div>

<div class="mini-flow">
  <div class="mini-step">
    <div class="label">Activation</div>
    <div class="sub">GELUを1つ残す</div>
  </div>
  <div class="mini-step">
    <div class="label">Norm</div>
    <div class="sub">BN中心からLNへ</div>
  </div>
  <div class="mini-step">
    <div class="label">Downsample</div>
    <div class="sub">stage間で分離</div>
  </div>
  <div class="mini-step">
    <div class="label">ConvNeXt</div>
    <div class="sub">最終blockへ到達</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 4. ImageNetでの結果
<p class="dense-lead">ConvNeXtは同程度の複雑さのSwin Transformerに対して、ImageNetで同等以上の性能を示す。</p>

<div class="layout-grid three">
  <div class="insight-card">
    <h3>ConvNeXt-T</h3>
    <span class="big-number">82.1%</span>
    <p class="card-note">Swin-T: 81.3%, 4.5G FLOPs</p>
  </div>
  <div class="insight-card">
    <h3>ConvNeXt-B</h3>
    <span class="big-number">85.1%</span>
    <p class="card-note">384 resolution, Swin-Bより高精度・高throughput</p>
  </div>
  <div class="insight-card emphasis">
    <h3>ConvNeXt-XL</h3>
    <span class="big-number">87.8%</span>
    <p class="card-note">ImageNet-22K pre-training後のtop-1</p>
  </div>
</div>

<div class="callout">論文は、適切に設計されたConvNetは大規模事前学習でもTransformerに劣らずスケールすると述べている。</div>

<div class="mini-flow">
  <div class="mini-step">
    <div class="label">1K trained</div>
    <div class="sub">T/S/B/LでSwin同等以上</div>
  </div>
  <div class="mini-step">
    <div class="label">Throughput</div>
    <div class="sub">同程度FLOPsで良好</div>
  </div>
  <div class="mini-step">
    <div class="label">22K pre-trained</div>
    <div class="sub">大規模化でさらに改善</div>
  </div>
  <div class="mini-step">
    <div class="label">Scaling</div>
    <div class="sub">XLが87.8%へ到達</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 下流タスクでの結果
<p class="dense-lead">ConvNeXtは画像分類だけでなく、COCO検出・ADE20KセグメンテーションでもSwinと競合する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>COCO detection / segmentation</h3>
    <ul>
      <li>Swinと同じmulti-scale trainingやAdamW設定で比較</li>
      <li>同程度の複雑さで同等以上のbox AP / mask AP</li>
      <li>大きなモデルではSwinより明確に高い場合がある</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>ADE20K semantic segmentation</h3>
    <ul>
      <li>UperNetを用いてmIoUを比較</li>
      <li>ImageNet-22K事前学習のConvNeXtが強い</li>
      <li>標準ConvNetの単純さと効率を保つ</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[表: 論文Table 3/4。COCOとADE20KにおけるSwinとConvNeXtの比較]</div>

---
<!-- class: content-gray show-page -->

## 5. まとめ
<p class="dense-lead">ConvNeXtは、Transformer時代の設計を取り入れた「2020年代のConvNet」として提案された。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>問い</h3>
    <p>性能差はattention固有の優位性なのか、設計・学習recipeの差なのかを切り分ける。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>方法</h3>
    <p>ResNetをtraining、macro design、block design、micro designの順に近代化する。</p>
  </div>
  <div class="insight-card">
    <h3>結論</h3>
    <p>純ConvNetでもImageNet、COCO、ADE20KでTransformerと同等以上に競える。</p>
  </div>
</div>

<div class="callout">輪読では「ConvNeXtはSwinをConvNet側から再解釈したモデル」と見ると、変更の流れを追いやすい。</div>
