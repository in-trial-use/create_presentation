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
    <div class="agenda-item">1. RNNの課題とLSTMの位置づけ</div>
    <div class="agenda-item">2. セル状態と3つのゲート</div>
    <div class="agenda-item">3. LSTMの計算式</div>
    <div class="agenda-item">4. 応用例とモデル選択</div>
    <div class="agenda-item">5. まとめ</div>
  </div>
</div>

---
<!-- class: content-gray show-page -->

## 1. RNNの課題とLSTMの位置づけ
<p class="dense-lead">RNNは時系列データを扱えるが、長い系列では遠い過去の情報を学習に反映しにくい。</p>

<div class="two-pane">
  <div class="pane">
    <h3>時系列モデルの流れ</h3>
    <ul>
      <li>従来はARIMAなどの統計モデルが主流</li>
      <li>データ量と計算資源の増加により機械学習モデルが普及</li>
      <li>RNNは内部状態により、過去の情報を次時刻へ渡せる</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>RNNの弱点</h3>
    <ul>
      <li>誤差を時間方向にさかのぼって伝播する</li>
      <li>系列が長くなるほど勾配が小さくなりやすい</li>
      <li>長期的な依存関係を学習しにくい</li>
    </ul>
  </div>
</div>

<div class="callout">LSTMは、長く残す情報と捨てる情報を分けて扱うことで、この弱点に対応する。</div>

<ul class="dense-list">
  <li>ポイントは、RNNの「過去を持てる」という性質を残しつつ、長期記憶を失いにくくすること。</li>
</ul>

---
<!-- class: content-gray show-page -->

## 勾配消失問題
<p class="dense-lead">長い系列では、過去の時刻へ戻るほど勾配が小さくなり、重み更新にほとんど効かなくなる。</p>

<div class="mini-flow">
  <div class="mini-step">
    <span class="label">長い系列</span>
    <span class="sub">時間方向に深いネットワークになる</span>
  </div>
  <div class="mini-step">
    <span class="label">誤差逆伝播</span>
    <span class="sub">各時刻をさかのぼって学習する</span>
  </div>
  <div class="mini-step">
    <span class="label">勾配が縮小</span>
    <span class="sub">過去へ行くほど値が小さくなる</span>
  </div>
  <div class="mini-step">
    <span class="label">長期依存を失う</span>
    <span class="sub">遠い過去の情報を使いにくい</span>
  </div>
</div>

<div class="figure-placeholder">[図: 機械学習におけるLSTMの位置付け (Figure 1)]</div>

---
<!-- class: content-gray show-page -->

## 2. セル状態と3つのゲート
<p class="dense-lead">LSTMは、長期記憶を運ぶセル状態と、情報を制御する3種類のゲートから構成される。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>セル状態</h3>
    <ul>
      <li>長期記憶を担う経路</li>
      <li>重要な情報を比較的そのまま伝える</li>
      <li>勾配が流れやすい道を作る</li>
    </ul>
  </div>
  <div class="pane">
    <h3>ゲートの役割</h3>
    <ul>
      <li>不要な過去情報を忘れる</li>
      <li>現在の入力から必要な情報を追加する</li>
      <li>次の隠れ状態として出力する情報を選ぶ</li>
    </ul>
  </div>
</div>

<div class="callout">単純に状態を上書きするのではなく、記憶を「残す・加える・出す」量を学習する。</div>

<div class="mini-flow">
  <div class="mini-step"><span class="label">忘れる</span><span class="sub">不要な過去情報を減らす</span></div>
  <div class="mini-step"><span class="label">加える</span><span class="sub">現在の入力から候補を作る</span></div>
  <div class="mini-step"><span class="label">保持する</span><span class="sub">セル状態を更新する</span></div>
  <div class="mini-step"><span class="label">出力する</span><span class="sub">隠れ状態として渡す</span></div>
</div>

---
<!-- class: content-gray show-page -->

## LSTMセルの構造
<p class="dense-lead">セル状態を中心に、忘却ゲート・入力ゲート・出力ゲートが段階的に情報を制御する。</p>

<div class="two-pane">
  <div class="pane">
    <h3>3つの制御</h3>
    <ul>
      <li><b>忘却ゲート</b>: 過去のセル状態から不要な情報を削る</li>
      <li><b>入力ゲート</b>: 現在の入力から追加する情報を選ぶ</li>
      <li><b>出力ゲート</b>: 更新後のセル状態から隠れ状態を作る</li>
    </ul>
  </div>
  <div class="pane emphasis">
    <h3>見方</h3>
    <ul>
      <li>各ゲートは0から1の値で情報量を調整する</li>
      <li>セル状態は長期記憶、隠れ状態は次時刻への出力に対応する</li>
      <li>長期依存を扱うための中心はセル状態にある</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[図: LSTMセルのアーキテクチャ (Figure 3)]</div>

---
<!-- class: content-gray show-page -->

## 3. LSTMの計算式
<p class="dense-lead">各ゲートは、前時刻の隠れ状態と現在の入力から計算される。</p>

### 忘却ゲート
過去のセル状態をどれだけ残すかを決める。

$$
f_t = \sigma(W_f \cdot [h_{t-1}, x_t] + b_f)
$$

### 入力ゲート
新しい候補記憶と、その採用量を決める。

$$
\tilde{c}_t = \tanh(W_c \cdot [h_{t-1}, x_t] + b_c)
$$

$$
m_t = \sigma(W_m \cdot [h_{t-1}, x_t] + b_m)
$$

<div class="math-note">読み方: シグモイド関数は0から1の値を返すため、ゲートは「どれだけ通すか」を表す重みとして働く。</div>

---
<!-- class: content-gray show-page -->

## セル状態と出力の更新
<p class="dense-lead">忘却ゲートと入力ゲートでセル状態を更新し、出力ゲートで隠れ状態を作る。</p>

### セル状態の更新
古い記憶を残す量と、新しい記憶を足す量を組み合わせる。

$$
c_t = f_t \circ c_{t-1} + m_t \circ \tilde{c}_t
$$

### 出力ゲートと隠れ状態
更新後のセル状態から、次の時刻へ渡す情報を選ぶ。

$$
o_t = \sigma(W_o \cdot [h_{t-1}, x_t] + b_o)
$$

$$
h_t = o_t \circ \tanh(c_t)
$$

<div class="math-note">読み方: セル状態は長期記憶、隠れ状態は次時刻へ渡す短期的な出力として使われる。</div>

---
<!-- class: content-gray show-page -->

## 4. 応用例
<p class="dense-lead">LSTMは、長期依存が重要になる時系列予測や自然言語処理で利用された。</p>

<div class="two-pane">
  <div class="pane">
    <h3>太陽光発電量の予測</h3>
    <ul>
      <li>過去の気象データから将来の発電量を予測</li>
      <li>4層のLSTMネットワークを利用</li>
      <li>21発電所、990日分の時系列データを扱う</li>
      <li>比較対象は物理法則ベースの予測モデル</li>
    </ul>
  </div>
  <div class="pane">
    <h3>自然言語処理: ELMo</h3>
    <ul>
      <li>双方向LSTMで前後の文脈を扱う</li>
      <li>文脈に応じた単語ベクトルを生成</li>
      <li>SQuADなどのベンチマークで性能向上を示した</li>
      <li>単語の意味を文脈に応じて変えられる</li>
    </ul>
  </div>
</div>

<div class="figure-placeholder">[表: 太陽光発電予測・NLPベンチマークの比較結果]</div>

---
<!-- class: content-gray show-page -->

## LSTMは万能ではない
<p class="dense-lead">LSTMは強力だが、常に最良の選択とは限らず、データの性質に応じた使い分けが必要になる。</p>

<div class="two-pane">
  <div class="pane emphasis">
    <h3>LSTMの強み</h3>
    <ul>
      <li>複数時系列にまたがる非線形パターンを扱える</li>
      <li>長期依存や文脈情報を学習しやすい</li>
      <li>特徴量設計の一部をモデルに任せられる</li>
    </ul>
  </div>
  <div class="pane">
    <h3>統計モデルの強み</h3>
    <ul>
      <li>単純な単変量時系列では同等以上の場合がある</li>
      <li>計算コストが低い</li>
      <li>過学習リスクを抑えやすい</li>
    </ul>
  </div>
</div>

<div class="callout">結論: タスクの複雑さ、データ量、系列の長さに応じてモデルを選択する。</div>

<ul class="dense-list">
  <li>比較の観点は、精度だけでなく、解釈しやすさ、計算コスト、過学習リスクにも置かれる。</li>
</ul>

---
<!-- class: content-gray show-page -->

## 今後の発展
<p class="dense-lead">LSTMの系列処理の考え方は、AttentionやTransformerなどの発展にもつながっている。</p>

<ul class="dense-list">
  <li><b>Deep-LSTM</b>: LSTM層を複数重ねることで、より複雑なデータ構造を表現する。</li>
  <li><b>Attention機構</b>: 系列のどの部分に注目すべきかを学習する仕組み。</li>
  <li><b>Transformer</b>: Attentionを中心に発展し、現代の自然言語処理で広く使われる。</li>
  <li><b>BERT</b>: Transformerベースのエンコーダーモデルで、文脈に応じた表現を学習する。</li>
</ul>

<div class="callout">LSTMは、長期依存を扱う系列モデルとして、後続の高度なモデルを理解する土台にもなる。</div>

<div class="mini-flow">
  <div class="mini-step"><span class="label">LSTM</span><span class="sub">長期依存を扱う</span></div>
  <div class="mini-step"><span class="label">Attention</span><span class="sub">重要部分へ注目する</span></div>
  <div class="mini-step"><span class="label">Transformer</span><span class="sub">Attentionを中心化</span></div>
  <div class="mini-step"><span class="label">BERT</span><span class="sub">文脈表現を学習</span></div>
</div>

---
<!-- class: content-gray show-page -->

## 5. まとめ
<p class="dense-lead">LSTMは、RNNの長期依存の弱点に対して、セル状態とゲート機構で対応するモデルである。</p>

<ul class="dense-list">
  <li><b>セル状態</b>により、重要な情報を長く保持する経路を作る。</li>
  <li><b>忘却・入力・出力ゲート</b>により、情報を残す量、加える量、出す量を学習する。</li>
  <li>時系列予測や自然言語処理で利用され、長期依存や文脈を扱う場面で有効性を示した。</li>
  <li>一方で、単純な時系列では統計モデルも有力であり、問題に応じた使い分けが重要である。</li>
</ul>

<div class="callout">ポイント: LSTMは「すべてを記憶する」のではなく、「必要な情報を選んで保持する」RNNである。</div>

<ul class="dense-list">
  <li>この仕組みにより、長い系列でも遠い過去の情報を扱いやすくする。</li>
</ul>
