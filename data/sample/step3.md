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
<div class="subtitle">論文紹介 2026/06/18</div>
<div class="maintitle">Attention is all you need</div>

<div class="bottom-band">
  <div style="width: 100%;">
    <div class="name-box">所属未入力</div>
    <div class="name-box">発表者未入力</div>
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
    <div class="agenda-item">2. 提案モデル: Transformerの全体像</div>
    <div class="agenda-item">3. Attentionメカニズムの詳細</div>
    <div class="agenda-item">4. 実験設定と結果</div>
    <div class="agenda-item">5. モデルの利点と考察</div>
    <div class="agenda-item">6. まとめ</div>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## 1. 研究背景と課題
従来の系列変換モデルは並列化に課題

*   **従来のモデル**:
    *   RNNs, LSTMs, Gated Recurrent Networksが主流
    *   Encoder-Decoderアーキテクチャが一般的
    *   EncoderとDecoderをAttentionで接続し性能向上
*   **課題**:
    *   計算が入力・出力のシンボル位置に沿って逐次的に行われる
    *   長い系列では並列化が困難
    *   長距離依存関係の学習も課題

---

<!-- class: content-gray show-page -->

## 2. 提案モデル: Transformerの全体像
Attentionメカニズムのみで構成された新しいアーキテクチャ

*   **Transformerの概要**:
    *   再帰層や畳み込み層を完全に排除
    *   Attentionメカニズムのみでグローバルな依存関係を捕捉
    *   高い並列化が可能
*   **モデル構造**:
    *   EncoderとDecoderから成る
    *   それぞれ複数の同一層が積み重ねられている
    *   残差接続と層正規化を使用

![w:820](./step3-assets/figure-01.png)
Figure 1: The Transformer - model architecture.

---

<!-- class: content-gray show-page -->

## 3. Attentionメカニズムの詳細
クエリ、キー、値を用いた重み付き和を計算

*   **Scaled Dot-Product Attention**:
    *   クエリ（Q）、キー（K）、値（V）を入力
    *   出力はQとKの内積をスケールし、ソフトマックス関数を通してVの重み付き和を算出
    *   次元 $d_k$ でスケールすることで、大きな値の内積がソフトマックスを飽和させるのを防ぐ
    $$
    \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
    $$
*   **Multi-Head Attention**:
    *   複数のAttention関数を並列に実行
    *   それぞれのヘッドで異なる表現部分空間に注目できる
    *   複数のヘッドの出力を結合し、線形変換

---

<!-- class: content-gray show-page -->

## 3. Attentionメカニズムの詳細 (続き)
Multi-Head Attentionの適用箇所

*   **Encoder-Decoder Attention**:
    *   Decoderからのクエリ、Encoderからのキーと値
    *   Decoderが入力系列全体に注目することを可能にする
*   **EncoderのSelf-Attention**:
    *   全てのクエリ、キー、値がEncoderの前の層の出力から供給
    *   Encoder内の各位置が、Encoderの前の層の全位置に注目できる
*   **DecoderのSelf-Attention**:
    *   Decoder内の各位置が、その位置以前のDecoder位置に注目
    *   自己回帰性を保つため、将来の位置への情報流をマスク

---

<!-- class: content-gray show-page -->

## 3. Position-wise Feed-Forward Networks
Attention層に加えて各層に導入

*   **構成**:
    *   2つの線形変換とReLU活性化関数から成る
    *   各位置に独立して同一のネットワークを適用
    $$
    \text{FFN}(x) = \max(0, xW_1 + b_1)W_2 + b_2
    $$
*   **特徴**:
    *   異なる位置間で同じパラメータを共有
    *   カーネルサイズ1の2つの畳み込みと解釈できる
    *   入出力次元 $d_{\text{model}} = 512$
    *   内層次元 $d_{\text{ff}} = 2048$

---

<!-- class: content-gray show-page -->

## 3. Positional Encoding
逐次処理や畳み込みがないモデルの課題解決

*   **必要性**:
    *   モデルが系列の順序を利用できない課題
    *   入力埋め込みと位置エンコーディングを単純に加算
*   **手法**:
    *   異なる周波数のサイン関数とコサイン関数を使用
    $$
    PE_{(\text{pos},2i)} = \sin(\text{pos}/10000^{2i/d_{\text{model}}}) \\
    PE_{(\text{pos},2i+1)} = \cos(\text{pos}/10000^{2i/d_{\text{model}}})
    $$
    *   `pos` は位置、`i` は次元
    *   学習可能な位置埋め込みと比較し、ほぼ同等の結果
    *   訓練時に遭遇するよりも長い系列への外挿に有利と仮定

---

<!-- class: content-gray show-page -->

## 4. 実験設定と結果
機械翻訳タスクで性能を評価

*   **データセット**:
    *   WMT 2014 英独翻訳: 約450万文
    *   WMT 2014 英仏翻訳: 約3600万文
*   **学習**:
    *   8基のNVIDIA P100 GPUを使用
    *   Baseモデルは12時間、Bigモデルは3.5日で学習
    *   Adamオプティマイザ、学習率スケジューリング、Dropout、Label Smoothingを使用

---

<!-- class: content-gray show-page -->

## 4. 実験設定と結果 (続き)
Transformerが両タスクでSoTAを達成

*   **英独翻訳 (WMT 2014)**:
    *   **Transformer (big)**: BLEU <span class="blue-text">28.4</span> を達成
    *   既存の最高記録（アンサンブル含む）を <span class="blue-text">2.0 BLEU以上</span> 上回る
*   **英仏翻訳 (WMT 2014)**:
    *   **Transformer (big)**: BLEU <span class="blue-text">41.8</span> を達成
    *   既存の最高記録（単一モデル）を上回り、訓練コストも大幅に削減
*   **訓練コスト**:
    *   既存モデルよりも桁違いに少ないFLOPSで高性能を実現

---

<!-- class: content-gray show-page -->

## 5. モデルの利点と考察
Attention層の特性とTransformerの優位性

*   **計算複雑度**:
    *   Self-Attention層はRecurrent層よりも低コスト ($O(n^2 \cdot d)$ vs $O(n \cdot d^2)$)
*   **並列化**:
    *   Self-Attentionは定数の逐次操作で全位置を接続
    *   Recurrent層は $O(n)$ の逐次操作が必要
*   **パス長**:
    *   Self-Attentionは長距離依存関係のパス長が <span class="blue-text">定数</span> ($O(1)$)
    *   Recurrent層やConvolutional層よりも短く、学習が容易

---

<!-- class: content-gray show-page -->

## 5. モデルの利点と考察 (続き)
モデルバリエーションからの知見

*   **Attention Head数**:
    *   最適なヘッド数があり、単一ヘッドや多すぎるヘッドでは性能が低下
*   **キー次元 ($d_k$)**:
    *   キー次元の削減はモデル品質を損なう
    *   互換性決定の難しさを示唆
*   **モデルサイズ**:
    *   一般的に、より大きなモデルが良い性能を示す
*   **Dropout**:
    *   過学習を防ぐ上で非常に有効
*   **Positional Encoding**:
    *   学習済み埋め込みとサイン波埋め込みでほぼ同等の結果

---

<!-- class: content-gray show-page -->

## 5. 他のタスクへの適用
英語構文解析タスクでの成功

*   **タスクの課題**:
    *   出力に強い構造的制約がある
    *   入力より出力が著しく長い場合がある
    *   少量の訓練データではRNNsがState-of-the-Artを達成できていなかった
*   **Transformerの成果**:
    *   WSJデータセット（4万文）のみの学習で高精度を達成
    *   半教師あり学習設定でも優れた性能を示し、多くの既存モデルを凌駕
    *   タスク固有の調整なしに良好な汎化性能を発揮

---

<!-- class: content-gray show-page -->

## 6. まとめ
AttentionのみのTransformerが新たな標準へ

*   **Transformerの貢献**:
    *   再帰・畳み込み層を廃し、Attentionのみで系列変換を可能にした初のモデル
    *   機械翻訳タスクでState-of-the-ArtのBLEUスコアを達成し、訓練時間も大幅に短縮
    *   英語構文解析のような異なるタスクでも優れた汎化性能を発揮

*   **今後の展望**:
    *   Attentionベースモデルのさらなる応用
    *   画像や音声など、他のモダリティへの拡張
    *   生成プロセスの非逐次化
---