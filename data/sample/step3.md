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
<div class="subtitle">論文紹介 2026/06/06</div>
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
    <div class="agenda-item">研究背景と課題</div>
    <div class="agenda-item">提案手法：Transformerの全体像</div>
    <div class="agenda-item">Attentionメカニズムの詳細</div>
    <div class="agenda-item">実験設定と結果</div>
    <div class="agenda-item">考察：Self-Attentionの利点</div>
    <div class="agenda-item">まとめ</div>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## 研究背景
従来のシーケンス変換モデルはRNNやCNNが主流でした。

*   <span class="bold blue-text">RNN (LSTM, GRU):</span>
    *   シーケンスの順次計算により並列化が困難
    *   長距離依存関係の学習に課題
*   <span class="bold blue-text">CNN (ByteNet, ConvS2S):</span>
    *   並列化は可能だが、長距離依存関係は複数層で対応
*   <span class="bold blue-text">Attentionメカニズム:</span>
    *   入力・出力間の依存関係を距離に関係なくモデル化可能
    *   通常はRNNと組み合わせて使用される

---

<!-- class: content-gray show-page -->

## 解決したい課題
従来のモデルは並列化の制約と長距離依存関係の学習に課題を抱えていました。

*   <span class="bold blue-text">計算の順次性:</span>
    *   RNNは本質的に順次計算のため、並列化が困難
    *   長いシーケンスでは訓練時間が大幅に増加
*   <span class="bold blue-text">長距離依存関係の学習:</span>
    *   遠い位置間の信号を関連付けるのが難しい
    *   情報がネットワーク内を伝播するパス長が長い
*   <span class="bold blue-text">計算効率:</span>
    *   より高品質なモデルを、より少ない訓練時間で実現したい

---

<!-- class: content-gray show-page -->

## 提案手法：Transformerの全体像
再帰・畳み込みを完全に排し、Attentionのみで構築された新しいネットワークです。

*   エンコーダー・デコーダー構造を採用
*   スタックされたSelf-AttentionとPoint-wise全結合層からなる
*   RNNやCNNモデルより高い並列性と訓練速度を実現

![w:820](./step3-assets/figure-01.png)
Figure 1: The Transformer - model architecture.

---

<!-- class: content-gray show-page -->

## エンコーダー・デコーダー構造
TransformerはN=6層の同一のエンコーダーとデコーダーで構成されます。

<div class="two-col">
  <div class="col">
    <span class="bold blue-text">エンコーダー:</span>
    <ul>
      <li>N=6個の同一レイヤーのスタック</li>
      <li>各レイヤーは以下で構成:
        <ul>
          <li>Multi-Head Self-Attention</li>
          <li>Position-wise Feed-Forward Network</li>
        </ul>
      </li>
      <li>Residual ConnectionとLayer Normalizationを使用</li>
    </ul>
  </div>
  <div class="col">
    <span class="bold blue-text">デコーダー:</span>
    <ul>
      <li>N=6個の同一レイヤーのスタック</li>
      <li>エンコーダーの出力に対するMulti-Head Attention層を追加</li>
      <li>Self-Attention層には「将来の情報を参照しない」マスクを適用
        <ul>
          <li>オートリグレッシブな特性を維持</li>
        </ul>
      </li>
    </ul>
  </div>
</div>

---

<!-- class: content-gray show-page -->

## Attentionメカニズム
クエリ、キー、バリューから出力を計算する汎用的な関数です。

*   <span class="bold blue-text">Scaled Dot-Product Attention:</span>
    *   入力: クエリ (Q), キー (K), バリュー (V)
    *   出力はQとKの内積を$d_k$でスケーリングし、Softmax後にVを重み付け和
    $$
    Attention(Q, K, V) = softmax\left(\frac{QK^T}{\sqrt{d_k}}\right)V
    $$
    *   $d_k$でスケーリングすることで、大きな値でもSoftmax勾配の消失を防ぐ
*   <span class="bold blue-text">Multi-Head Attention:</span>
    *   Attention関数を複数（h個）並列で実行
    *   異なる線形射影を使用し、異なる表現部分空間からの情報を同時に捉える
    *   単一Attentionと同等の計算コストで、表現力を向上

---

<!-- class: content-gray show-page -->

## Position-wise Feed-Forward Network と Positional Encoding

Transformerは位置情報を明示的に加えることで順序を扱います。

*   <span class="bold blue-text">Position-wise Feed-Forward Network:</span>
    *   各エンコーダー/デコーダー層内のサブレイヤー
    *   各ポジションに独立かつ同一に適用される全結合ネットワーク
    $$
    FFN(x) = \max(0, xW_1 + b_1)W_2 + b_2
    $$
    *   内層の次元は$d_{ff}=2048$、入出力は$d_{model}=512$
*   <span class="bold blue-text">Positional Encoding:</span>
    *   モデルがシーケンスの順序を利用するための位置情報
    *   入力埋め込みに加算される
    *   サイン・コサイン関数を使用し、学習可能な埋め込みと同等の性能
    $$
    PE_{(pos,2i)} = \sin(pos/10000^{2i/d_{model}}) \\
    PE_{(pos,2i+1)} = \cos(pos/10000^{2i/d_{model}})
    $$

---

<!-- class: content-gray show-page -->

## 実験設定
WMT 2014機械翻訳タスクでTransformerの性能を評価しました。

*   <span class="bold blue-text">データセット:</span>
    *   WMT 2014 英独 (4.5M文ペア), 英仏 (36M文ペア)
    *   バイトペアエンコーディング (BPE) を使用
*   <span class="bold blue-text">訓練設定:</span>
    *   8基のNVIDIA P100 GPUを使用
    *   ベースモデル: 100,000ステップ (12時間)
    *   ビッグモデル: 300,000ステップ (3.5日間)
*   <span class="bold blue-text">最適化・正則化:</span>
    *   Adam optimizerを使用
    *   ウォームアップステップ付きの学習率スケジュール
    *   Residual Dropout, Label Smoothingを適用

---

<!-- class: content-gray show-page -->

## 実験結果：機械翻訳
Transformerは既存モデルを上回り、訓練コストも大幅に削減しました。

*   <span class="bold blue-text">WMT 2014 英独タスク:</span>
    *   Transformer (big) が <span class="bold red-text">28.4 BLEU</span> を達成
    *   既存の最高結果 (アンサンブル含む) を <span class="bold red-text">2.0 BLEU以上上回る</span>
*   <span class="bold blue-text">WMT 2014 英仏タスク:</span>
    *   Transformer (big) が <span class="bold red-text">41.8 BLEU</span> を達成
    *   既存の最高シングルモデルを上回る
*   <span class="bold blue-text">訓練コスト:</span>
    *   SOTAモデルの訓練コストの数分の1〜数十分の1に削減
*   [図: Table 2 からTransformer (base/big)と既存SOTAのBLEUスコア、訓練コストを抜粋して示す]

---

<!-- class: content-gray show-page -->

## 考察：Self-Attentionの利点
Self-Attention層は、RNNやCNN層と比較して明確な利点があります。

<div class="two-col">
  <div class="col">
    <span class="bold blue-text">1. 計算複雑性 (1層あたり):</span>
    <ul>
      <li>Self-Attention: $O(n^2 \cdot d)$</li>
      <li>Recurrent: $O(n \cdot d^2)$</li>
      <li>シーケンス長$n$が次元$d$より小さい場合、Self-Attentionが高速</li>
    </ul>
  </div>
  <div class="col">
    <span class="bold blue-text">2. 並列化 (逐次操作の最小数):</span>
    <ul>
      <li>Self-Attention: $O(1)$</li>
      <li>Recurrent: $O(n)$</li>
      <li>Self-Attentionは完全に並列化可能</li>
    </ul>
  </div>
</div>
<br>
<span class="bold blue-text">3. 長距離依存関係のパス長:</span>
<ul>
  <li>Self-Attention: $O(1)$（任意の2ポジション間）</li>
  <li>Recurrent: $O(n)$</li>
  <li>パス長が短いため、長距離依存関係の学習が容易</li>
</ul>

---

<!-- class: content-gray show-page -->

## 考察：モデルのバリエーションと一般化
Attentionの設定や他のタスクへの適用も検討しました。

*   <span class="bold blue-text">モデルのバリエーション:</span>
    *   Attentionヘッド数やキー次元はモデル品質に影響
    *   ドロップアウトは過学習防止に非常に有効
    *   サイン波形Positional Encodingは学習可能PEとほぼ同性能
*   <span class="bold blue-text">他のタスクへの一般化 (英語構文解析):</span>
    *   タスク固有の調整なしでも高いF1スコアを達成
    *   既存のRNNベースモデルやBerkeley-Parserを上回る結果
    *   Transformerが多様なNLPタスクに適用可能であることを実証

---

<!-- class: content-gray show-page -->

## 限界・今後の課題
Transformerは優れている一方で、いくつかの課題も残されています。

*   <span class="bold blue-text">計算コスト:</span>
    *   シーケンス長 $n$ に対し $O(n^2)$ の計算コスト
    *   非常に長いシーケンスでは計算量が課題となる
    *   将来的に近傍に限定したAttentionメカニズムの調査が必要
*   <span class="bold blue-text">生成の逐次性:</span>
    *   出力がオートリグレッシブであるため、生成は順次的に行われる
    *   生成プロセスの非逐次化が今後の研究目標
*   <span class="bold blue-text">今後の展望:</span>
    *   画像、音声、動画など他のモダリティへの適用
    *   さらなる効率化と汎用性の追求

---

<!-- class: content-gray show-page -->

## まとめ
本研究では、Attentionメカニズムのみに基づくTransformerを提案しました。

*   <span class="bold blue-text">Transformerを提案:</span>
    *   再帰・畳み込みを排し、Multi-Head Self-Attentionを主要素とする新しいアーキテクチャ
*   <span class="bold blue-text">SOTA性能と効率化:</span>
    *   機械翻訳タスクで既存のモデルやアンサンブルを凌駕するBLEUスコアを達成
    *   訓練時間が大幅に短縮され、高い並列化が可能
*   <span class="bold blue-text">汎用性の実証:</span>
    *   構文解析タスクでも良好な性能を示し、Attentionベースモデルの多様なタスクへの可能性を実証