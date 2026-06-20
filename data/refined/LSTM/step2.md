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
<p class="dense-lead">時系列データでは、現在の値だけでなく過去の文脈を使って予測・分類する必要がある。</p>

<div class="two-pane">
  <div class="pane">
    <h3>時系列モデルの流れ</h3>
    <ul>
      <li>ARIMAなどの統計モデルは、単純な系列に対して解釈しやすい</li>
      <li>データ量と計算資源の増加により、機械学習モデルの利用が広がった</li>
      <li>RNNは隠れ状態を通じて、過去の情報を次時刻へ渡せる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>RNNの位置づけ</h3>
    <ul>
      <li>系列を時間方向に展開して学習する</li>
      <li>自然言語や発電量予測など、順序が意味を持つデータに向く</li>
      <li>長い文脈を扱うには、通常のRNNだけでは不十分になりやすい</li>
    </ul>
  </div>
</div>

<div class="callout">LSTMは、RNNの「系列を扱える」性質を残しつつ、長期記憶を扱いやすくしたモデルである。</div>

---
<!-- class: content-gray show-page -->

## 解決したい課題
<p class="dense-lead">通常のRNNでは、長い系列で遠い過去の情報が学習に効きにくくなる。</p>

<div class="mini-flow">
  <div class="mini-step"><span class="label">長い系列</span><span class="sub">時間方向に深い計算グラフ</span></div>
  <div class="mini-step"><span class="label">逆伝播</span><span class="sub">過去へ誤差を戻す</span></div>
  <div class="mini-step"><span class="label">勾配消失</span><span class="sub">更新量が小さくなる</span></div>
  <div class="mini-step"><span class="label">長期依存</span><span class="sub">遠い情報を使いにくい</span></div>
</div>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>問題の本質</h3>
    <ul>
      <li>過去の情報を保持したい時刻と忘れたい時刻が混在する</li>
      <li>単純な隠れ状態更新では、重要な情報も上書きされやすい</li>
      <li>長期依存を扱うには、記憶の保持を明示的に制御したい</li>
    </ul>
  </div>
  <div class="pane">
    <h3>必要な性質</h3>
    <ul>
      <li>不要な情報を忘れる</li>
      <li>必要な情報を追加する</li>
      <li>保持した記憶から出力を作る</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 提案手法の全体像
<p class="dense-lead">LSTMは、セル状態と3つのゲートで情報の流れを制御する。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>セル状態</h3>
    <ul>
      <li>長期記憶を運ぶ主要な経路</li>
      <li>重要な情報を比較的そのまま次時刻へ渡す</li>
      <li>勾配が流れやすい道として働く</li>
    </ul>
  </div>
  <div class="pane">
    <h3>3つのゲート</h3>
    <ul>
      <li>忘却ゲート: 過去の記憶をどれだけ残すか</li>
      <li>入力ゲート: 新しい候補記憶をどれだけ加えるか</li>
      <li>出力ゲート: 隠れ状態として何を出すか</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[ここに論文Figure 3: The Architecture of a LSTM Cell を入れる]</div>

---
<!-- class: content-gray show-page -->

## 手法の詳細1
<p class="dense-lead">各ゲートは、前時刻の隠れ状態と現在の入力から計算される。</p>

<div class="two-pane">
  <div class="pane">
    <h3>忘却ゲート</h3>
    <ul>
      <li>古いセル状態をどれだけ残すかを決める</li>
      <li>値は0から1で、0に近いほど忘れる</li>
    </ul>

$$
f_t = \sigma(W_f [h_{t-1}, x_t] + b_f)
$$

  </div>
  <div class="pane emphasis">
    <h3>入力ゲート</h3>
    <ul>
      <li>現在の入力から候補記憶を作る</li>
      <li>その候補をどれだけ採用するかを決める</li>
    </ul>

$$
m_t = \sigma(W_m [h_{t-1}, x_t] + b_m)
$$

  </div>
</div>

<div class="math-note">シグモイド関数は0から1の値を返すため、ゲートは「情報をどれだけ通すか」を表す。</div>

<div class="math-note">記号: x_t は時刻tの入力、h_{t-1} は前時刻の隠れ状態、W_f,W_m は重み、b_f,b_m はバイアス。</div>

---
<!-- class: content-gray show-page -->

## 手法の詳細2: 数式の要点
<p class="dense-lead">セル状態を更新し、更新後の記憶から次時刻へ渡す隠れ状態を作る。</p>

$$
\tilde{c}_t = \tanh(W_c [h_{t-1}, x_t] + b_c)
$$

$$
c_t = f_t \circ c_{t-1} + m_t \circ \tilde{c}_t
$$

$$
o_t = \sigma(W_o [h_{t-1}, x_t] + b_o), \quad
h_t = o_t \circ \tanh(c_t)
$$

<div class="two-pane">
  <div class="pane">
    <h3>状態の意味</h3>
    <ul>
      <li>c_t: 更新後のセル状態、長期記憶</li>
      <li>h_t: 次時刻や予測に渡す隠れ状態</li>
      <li>c~_t: 現在入力から作る候補記憶</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>ゲートと演算</h3>
    <ul>
      <li>f_t,m_t,o_t: 忘却・入力・出力ゲート</li>
      <li>W_c,W_o,b_c,b_o: 学習される重みとバイアス</li>
      <li>○: 要素ごとの積、sigma: sigmoid関数</li>
    </ul>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 実験設定
<p class="dense-lead">LSTMは、長期依存が重要な時系列予測や自然言語処理で評価される。</p>

<div class="two-pane">
  <div class="pane">
    <h3>太陽光発電量予測</h3>
    <ul>
      <li>過去の気象データから将来の発電量を予測</li>
      <li>複数発電所・複数日分の時系列データを扱う</li>
      <li>物理法則ベースの予測モデルと比較する</li>
    </ul>
  </div>
  <div class="pane">
    <h3>自然言語処理</h3>
    <ul>
      <li>双方向LSTMで前後の文脈を扱う</li>
      <li>文脈に応じた単語表現を作る</li>
      <li>SQuADなどのベンチマークで評価される</li>
    </ul>
  </div>
</div>

<div class="callout">評価の見どころは、長い文脈や複数時系列の情報を、単純な統計モデルよりうまく使えるかである。</div>

---
<!-- class: content-gray show-page -->

## 結果
<p class="dense-lead">LSTMは、長期依存や文脈情報が効くタスクで性能向上を示す。</p>

<div class="layout-grid three">
  <div class="insight-card">
    <h3>時系列予測</h3>
    <p>複数の入力系列から非線形な変化を学習し、発電量予測に利用できる。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>文脈表現</h3>
    <p>双方向LSTMにより、単語の意味を前後文脈に応じて変化させられる。</p>
  </div>
  <div class="insight-card">
    <h3>比較結果</h3>
    <p>長期情報が必要な場面では、単純なRNNや固定表現より有利になる。</p>
  </div>
</div>

<div class="figure-placeholder">[表: 太陽光発電予測・NLPベンチマークの比較結果]</div>

---
<!-- class: content-gray show-page -->

## 考察
<p class="dense-lead">LSTMの強さは、記憶をそのまま上書きせず、ゲートで情報量を調整する点にある。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>効いている点</h3>
    <ul>
      <li>セル状態が長期記憶の経路を作る</li>
      <li>忘却・入力・出力を別々に学習できる</li>
      <li>遠い過去の情報を必要な分だけ残しやすい</li>
    </ul>
  </div>
  <div class="pane">
    <h3>読み取り方</h3>
    <ul>
      <li>単純な短期パターンなら統計モデルで十分な場合がある</li>
      <li>複数要因や文脈依存があるほどLSTMの利点が出やすい</li>
      <li>ゲートは解釈の入口にもなる</li>
    </ul>
  </div>
</div>

<div class="callout">LSTMは「何を覚えるか」だけでなく「何を忘れるか」も学習するモデルとして理解できる。</div>

<div class="figure-placeholder">[ここに論文Figure 1: LSTM placed in the Machine Learning taxonomy を入れる]</div>

---
<!-- class: content-gray show-page -->

## 限界・今後の課題
<p class="dense-lead">LSTMは万能ではなく、データ量・系列長・計算コストに応じて使い分けが必要である。</p>

<div class="two-pane">
  <div class="pane">
    <h3>限界</h3>
    <ul>
      <li>統計モデルより計算コストが高い</li>
      <li>短く単純な系列では過剰なモデルになりうる</li>
      <li>非常に長い系列では、さらに別の工夫が必要になる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>今後の方向</h3>
    <ul>
      <li>タスクに応じたモデル選択</li>
      <li>双方向化や多層化による表現力の向上</li>
      <li>Attention系モデルとの比較・併用</li>
    </ul>
  </div>
</div>

<div class="callout">入門者向けには、LSTMを「長く残す記憶をゲートで守るRNN」と押さえると流れを追いやすい。</div>

---
<!-- class: content-gray show-page -->

## まとめ
<p class="dense-lead">LSTMは、長期依存を扱うためにセル状態とゲート機構を導入したRNNである。</p>

<div class="summary-grid">
  <div class="insight-card">
    <h3>背景</h3>
    <p>時系列・自然言語では過去の文脈を扱う必要がある。</p>
  </div>
  <div class="insight-card emphasis">
    <h3>方法</h3>
    <p>セル状態と3つのゲートで、記憶の保持・追加・出力を制御する。</p>
  </div>
  <div class="insight-card">
    <h3>結論</h3>
    <p>長期依存が重要なタスクで、通常のRNNより扱いやすい。</p>
  </div>
</div>

<div class="callout">標準構成では、背景から課題、手法、実験、考察、限界までを一続きで説明する。</div>
