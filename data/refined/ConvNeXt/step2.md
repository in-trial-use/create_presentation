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
      <li>性能差の理由がattentionだけなのかを問い直す流れがある</li>
    </ul>
  </div>
</div>

<div class="callout">ConvNeXtは、純ConvNetを現代的な設計に更新したとき、Transformerとどこまで競えるかを検証する。</div>

---
<!-- class: content-gray show-page -->

## 解決したい課題
<p class="dense-lead">Transformerが強い理由を、attentionそのものだけで説明してよいのかを切り分けたい。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>比較の難しさ</h3>
    <ul>
      <li>Transformerは新しい学習recipeも同時に導入した</li>
      <li>macro designやmicro designもResNetとは異なる</li>
      <li>単純なResNet対Swinでは、差の原因が混ざる</li>
    </ul>
  </div>
  <div class="pane">
    <h3>論文の問い</h3>
    <ul>
      <li>ConvNetも同じ設計原理を取り込めば強くなるか</li>
      <li>純ConvNetのままSwinと競えるか</li>
      <li>検出・セグメンテーションでも汎用backboneとして使えるか</li>
    </ul>
  </div>
</div>

<div class="callout">課題は、ResNetを段階的に近代化し、どの変更が性能差に効くかを見ること。</div>

---
<!-- class: content-gray show-page -->

## 提案手法の全体像
<p class="dense-lead">標準ResNetを出発点に、Swin Transformerの設計に近づける変更を段階的に入れる。</p>

<div class="two-pane">
  <div class="pane">
    <h3>Modernization</h3>
    <ul>
      <li>ResNet-50 / Swin-T程度のFLOPsで主に検証</li>
      <li>ImageNet-1Kで各変更の効果を確認</li>
      <li>FLOPsを大きく外さないように調整</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>到達点</h3>
    <ul>
      <li>標準ConvNetモジュールだけで構成</li>
      <li>Transformer的なmacro/micro designを取り入れる</li>
      <li>ConvNeXt familyとして拡張する</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[ここに論文Figure 2: ResNetからConvNeXtへ向かうmodernization roadmap を入れる]</div>

---
<!-- class: content-gray show-page -->

## 手法の詳細1
<p class="dense-lead">まず学習recipeとmacro designを、Transformer時代の設定へ揃える。</p>

<div class="layout-grid three">
  <div class="insight-card">
    <h3>Training recipe</h3>
    <p>AdamW、300 epochs、Mixup、Cutmix、RandAugmentなどを導入する。</p>
    <span class="big-number">78.8%</span>
  </div>
  <div class="insight-card">
    <h3>Stage ratio</h3>
    <p>ResNet-50の(3,4,6,3)をSwin風の(3,3,9,3)へ変更する。</p>
    <span class="big-number">79.4%</span>
  </div>
  <div class="insight-card emphasis">
    <h3>Patchify stem</h3>
    <p>stemを4x4 stride 4 convolutionへ置き換える。</p>
    <span class="big-number">79.5%</span>
  </div>
</div>

<div class="callout">アーキテクチャだけでなく、学習条件と大きな構成を揃えることから始める。</div>

---
<!-- class: content-gray show-page -->

## 手法の詳細2: Block設計
<p class="dense-lead">ConvNeXt blockは、Transformer blockの設計思想をConvNetの部品で写し取る。</p>

<div class="two-pane">
  <div class="pane">
    <h3>Spatial / channel mixing</h3>
    <ul>
      <li>depthwise convolutionで空間方向をmixingする</li>
      <li>1x1 convolutionでchannel方向をmixingする</li>
      <li>self-attentionの代わりにConvNet部品で分離を実現する</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>Inverted bottleneck + large kernel</h3>
    <ul>
      <li>MLP側の隠れ次元を入力より広くする</li>
      <li>depthwise convを前方へ移動する</li>
      <li>7x7 kernelで性能改善が飽和する</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[ここに論文Figure 3/4: Block modifications と ResNet/Swin/ConvNeXt block比較を入れる]</div>

---
<!-- class: content-gray show-page -->

## 実験設定
<p class="dense-lead">ConvNeXtはImageNet分類、COCO検出、ADE20Kセグメンテーションで評価される。</p>

<div class="two-pane">
  <div class="pane">
    <h3>ImageNet</h3>
    <ul>
      <li>ImageNet-1Kで分類性能を評価</li>
      <li>ImageNet-22Kで事前学習し、ImageNet-1Kへfine-tune</li>
      <li>ConvNeXt-T/S/B/L/XLを構成する</li>
    </ul>
  </div>
  <div class="pane">
    <h3>Downstream tasks</h3>
    <ul>
      <li>COCOで物体検出・instance segmentationを評価</li>
      <li>ADE20Kでsemantic segmentationを評価</li>
      <li>Swin Transformerと同程度の複雑さで比較する</li>
    </ul>
  </div>
</div>

<div class="callout">分類だけでなく、汎用backboneとして使えるかが重要な評価軸になる。</div>

---
<!-- class: content-gray show-page -->

## 結果
<p class="dense-lead">ConvNeXtは同程度の複雑さのSwin Transformerに対して、ImageNetで同等以上の性能を示す。</p>

<div class="layout-grid three">
  <div class="insight-card"><h3>ConvNeXt-T</h3><span class="big-number">82.1%</span><p class="card-note">Swin-T: 81.3%, 4.5G FLOPs</p></div>
  <div class="insight-card"><h3>ConvNeXt-B</h3><span class="big-number">85.1%</span><p class="card-note">384 resolution</p></div>
  <div class="insight-card emphasis"><h3>ConvNeXt-XL</h3><span class="big-number">87.8%</span><p class="card-note">ImageNet-22K pre-training後</p></div>
</div>

<div class="mini-flow">
  <div class="mini-step"><div class="label">1K trained</div><div class="sub">Swin同等以上</div></div>
  <div class="mini-step"><div class="label">Throughput</div><div class="sub">同程度FLOPsで良好</div></div>
  <div class="mini-step"><div class="label">COCO</div><div class="sub">同等以上のAP</div></div>
  <div class="mini-step"><div class="label">ADE20K</div><div class="sub">競争的なmIoU</div></div>
</div>

---
<!-- class: content-gray show-page -->

## 考察
<p class="dense-lead">ConvNeXtの結果は、Transformerの強さの一部が設計・学習recipeにも由来することを示す。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>重要な観察</h3>
    <ul>
      <li>ConvNetも現代的なrecipeで大きく改善する</li>
      <li>Swinに似たmacro/micro designはConvNetでも有効</li>
      <li>attentionなしでも同等以上に競える場面がある</li>
    </ul>
  </div>
  <div class="pane">
    <h3>ConvNeXtらしさ</h3>
    <ul>
      <li>標準ConvNetモジュールだけで構成される</li>
      <li>shifted windowやrelative position biasなどの専用機構を使わない</li>
      <li>実装の単純さと効率を保つ</li>
    </ul>
  </div>
</div>

<div class="callout">ConvNeXtは、SwinをConvNet側から再解釈したモデルとして読むと流れを追いやすい。</div>

---
<!-- class: content-gray show-page -->

## 限界・今後の課題
<p class="dense-lead">ConvNeXtはConvNetの有効性を示すが、Transformerを不要にする結論ではない。</p>

<div class="two-pane">
  <div class="pane">
    <h3>限界</h3>
    <ul>
      <li>大規模学習では計算資源とデータが必要</li>
      <li>globalな関係を扱う柔軟性はTransformerに利点がある場合がある</li>
      <li>タスクによって最適なbackboneは変わる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>今後の方向</h3>
    <ul>
      <li>ConvNetとTransformerの設計原理の整理</li>
      <li>より効率的なbackbone設計</li>
      <li>検出・セグメンテーションでのさらなる検証</li>
    </ul>
  </div>
</div>

<div class="callout">論文の主張は「畳み込みはまだ重要であり、設計次第で2020年代でも強い」という点にある。</div>

---
<!-- class: content-gray show-page -->

## まとめ
<p class="dense-lead">ConvNeXtは、Transformer時代の設計を取り入れた純ConvNetとして提案された。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>背景</h3>
    <p>ViT/Swinの成功後、ConvNetの価値と設計差を見直す必要があった。</p>
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

<div class="callout">標準構成にすると、背景から課題、手法、実験、考察、限界までを一続きで説明できる。</div>
