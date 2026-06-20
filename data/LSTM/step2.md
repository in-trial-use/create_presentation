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
<div class="subtitle">論文紹介(時系列系統) 2026/05/21</div>
<div class="maintitle">LSTM</div>

<div class="bottom-band">
  <div style="width: 100%;">
    <div class="name-box">京都大学工学部情報学科数理工学コース</div>
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
    <div class="agenda-item">1. はじめに：時系列予測の変遷とRNNの課題</div>
    <div class="agenda-item">2. LSTMの仕組み：勾配消失問題の解決策</div>
    <div class="agenda-item">3. 応用事例：太陽光発電予測と自然言語処理</div>
    <div class="agenda-item">4. 考察とまとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 1. はじめに：時系列予測の背景
従来は統計モデルが主流でしたが、近年は機械学習モデルが台頭しています

<div class="two-col">
  <div class="col">
    <h3>統計モデル (ARIMAなど)</h3>
    <ul>
      <li>過去50年以上にわたり、時系列予測の主流</li>
      <li>データの生成過程を数式で記述する構造化モデル</li>
      <li>トレンドや季節性を捉えるのに長けている</li>
    </ul>
  </div>
  <div class="col">
    <h3>機械学習モデル (RNNなど)</h3>
    <ul>
      <li>データ量の増大と計算能力の向上により注目</li>
      <li>Recurrent Neural Network (RNN) は時間的情報を扱うのに適している</li>
      <li>内部のループ構造で過去の情報を記憶する</li>
    </ul>
  </div>
</div>
<br>
<div class="text-center">
[図: 機械学習におけるLSTMの位置付け (Figure 1)]
</div>

---
<!-- class: content-gray show-page -->

## RNNの課題：勾配消失問題
RNNは、時系列が長くなると過去の情報を忘れてしまう弱点がありました

### 勾配消失問題 (Vanishing Gradient Problem)
- RNNは、時間を遡って誤差を伝播させることで学習します (Backpropagation Through Time)
- しかし、時系列が長くなる（ネットワークが深くなる）と、勾配がどんどん小さくなり、ほぼ0になってしまいます
- 結果として、遠い過去の情報が重みの更新に反映されず、<span class="bold red-text">長期的な依存関係を学習できません</span>

<div class="text-center">
<br>
<p>この問題を解決するために <span class="bold blue-text">LSTM</span> が開発されました</p>
</div>

---
<!-- class: content-gray show-page -->

## 2. LSTMの仕組み：長期記憶の実現
LSTMは「セル状態」と「ゲート」により、情報の取捨選択を行います

### LSTMのキーコンセプト
- **セル状態 (Cell State)**
  - 「情報のコンベアベルト」に例えられる、長期記憶を担う経路
  - 重要な情報が、ほとんど加工されずに長期間伝わることが可能

- **3つのゲート (Gate)**
  - セル状態を流れる情報を制御する仕組み
  - どの情報を「忘れ」、どの情報を「記憶」し、何を「出力」するかを学習する

<br>
<p>
このゲート機構により、<span class="bold">必要な情報だけを長期的に保持</span>し、勾配消失問題を回避します。
</p>

---
<!-- class: content-gray show-page -->

## LSTMセルの内部アーキテクチャ
3つのゲートがセル状態を緻密にコントロールします

<div class="text-center">
[図: LSTMセルのアーキテクチャ (Figure 3)]
</div>

- **忘却ゲート (Forget Gate)**
  - 過去のセル状態から、不要な情報を削除する

- **入力ゲート (Input Gate)**
  - 現在の入力から、セル状態に追加すべき新しい情報を選択する

- **出力ゲート (Output Gate)**
  - 更新されたセル状態に基づき、次の隠れ状態（短期記憶）として何を出力するかを決定する

---
<!-- class: content-gray show-page -->

## LSTMの計算プロセス
各ゲートはシグモイド関数、セル状態の更新はtanh関数を用いて計算されます

### 忘却ゲート (Forget Gate)
過去の情報をどれだけ忘れるかを決定 (0: 完全に忘れる, 1: 完全に記憶)
$$
f_t = \sigma(W_f \cdot [h_{t-1}, x_t] + b_f)
$$

### 入力ゲート (Input Gate)
新しい情報をセル状態に加える
$$
\tilde{c}_t = \tanh(W_c \cdot [h_{t-1}, x_t] + b_c)
$$
$$
m_t = \sigma(W_m \cdot [h_{t-1}, x_t] + b_m)
$$

### セル状態の更新 (Cell State Update)
忘却ゲートと入力ゲートの結果を使い、長期記憶を更新
$$
c_t = f_t \circ c_{t-1} + m_t \circ \tilde{c}_t
$$

### 出力ゲート (Output Gate)
更新されたセル状態から、次の隠れ状態（出力）を計算
$$
o_t = \sigma(W_o \cdot [h_{t-1}, x_t] + b_o)
$$
$$
h_t = o_t \circ \tanh(c_t)
$$

---
<!-- class: content-gray show-page -->

## 3. 応用事例(1)：太陽光発電量の予測
LSTMは物理モデルよりも高い精度で発電量を予測しました

### 概要
- **タスク**: 過去の気象データから将来の太陽光発電量を予測
- **モデル**: 4層のLSTMネットワーク
- **データ**: 21発電所、990日分の時系列データ
- **比較対象**: 物理法則に基づく予測モデル (P-PVFM)

### 結果
- 評価指標 (RMSE, MAE) において、LSTMが物理モデルを上回る性能を達成
- LSTMは、複数の時系列にまたがる複雑なトレンドや季節性を学習できることが示唆された

<br>
<div class="text-center">
[表: 太陽光発電予測の性能比較 (Table 1)]
</div>

---
<!-- class: content-gray show-page -->

## 応用事例(2)：自然言語処理 (ELMo)
双方向LSTMを用いることで、文脈に応じた単語の意味を捉えることに成功しました

### 概要
- **タスク**: 文脈を考慮した単語のベクトル表現（単語埋め込み）を生成
- **モデル**: ELMo (Embeddings from Language Models)
  - <span class="bold">双方向LSTM (Bidirectional LSTM)</span> を使用
  - 単語の前後の文脈を両方考慮できる

### 結果
- SQuAD (質問応答) などのベンチマークで、従来手法を大幅に上回り、人間に近い性能を達成
- 例：「bank」という単語を「川岸」と「銀行」で使い分け、異なるベクトルを生成できる

<br>
<div class="text-center">
[表: NLPベンチマークにおけるELMoの性能 (Table 2)]
</div>

---
<!-- class: content-gray show-page -->

## 4. 考察：LSTMは万能薬ではない
LSTMは強力ですが、常に最良の選択とは限りません

### LSTM vs. 統計モデル (ARIMAなど)

- **LSTMの強み**
  - 複数の時系列データから、複雑な非線形パターンを学習できる
  - 特徴量エンジニアリングの手間が少ない

- **統計モデルの強み**
  - 単純な単変量時系列データでは、同等以上の性能を示すことがある
  - <span class="bold red-text">過学習のリスクが低い</span>
  - 計算コストが低い

<br>
<div class="text-center bold">
結論：データの特性やタスクの複雑さに応じて、<br>適切なモデルを選択することが重要
</div>

---
<!-- class: content-gray show-page -->

## 今後の展望と発展
LSTMのアーキテクチャは、さらに高度なモデルの基礎となっています

- **Deep-LSTM (DLSTM)**
  - LSTM層を複数重ねることで、より複雑なデータ構造を表現

- **Attention機構**
  - 系列データのどの部分に「注目」すべきかを学習する仕組み
  - LSTMと組み合わせることで性能が向上
  - この概念が <span class="bold blue-text">Transformer</span> へと発展

- **BERT (2018)**
  - Transformerをベースにしたエンコーダーモデル
  - ELMoと同様に、文脈に応じた単語表現が可能

<br>
LSTMは、現代の高度な自然言語処理モデルの礎を築いた重要な技術と言えます。

---
<!-- class: content-gray show-page -->

## まとめ
本発表では、LSTMの仕組みと応用について解説しました

- **LSTMはゲート機構により勾配消失問題を解決**
  - 「セル状態」と「3つのゲート」で情報の取捨選択を行い、長期的な依存関係を学習可能にした

- **多様な分野で高い性能を発揮**
  - 時系列予測（太陽光発電）や自然言語処理 (ELMo) で、従来手法を上回る成果を示した

- **モデル選択の重要性**
  - LSTMは強力だが、万能ではない
  - ARIMAのような古典的統計モデルも依然として有用であり、問題に応じた使い分けが重要