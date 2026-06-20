const form = document.getElementById("analyze-form");
const fileInput = document.getElementById("pdf-file");
const modelInput = document.getElementById("model");
const promptInput = document.getElementById("prompt");
const statusElement = document.getElementById("status");
const outputElement = document.getElementById("output");
const submitButton = document.getElementById("submit-button");
const copyButton = document.getElementById("copy-button");

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const shared = window.slideAppShared;
  if (!shared) return;

  // Fileオブジェクトを他の input type="file" にコピーするためには DataTransfer が必要
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  // Step 2 の入力欄にセットして change イベントを発火
  if (shared.slidePdfFileInput) {
    shared.slidePdfFileInput.files = dataTransfer.files;
    shared.slidePdfFileInput.dispatchEvent(new Event("change"));
  }

  // Step 3 の入力欄にセットして change イベントを発火
  if (shared.step3PdfFileInput) {
    shared.step3PdfFileInput.files = dataTransfer.files;
    shared.step3PdfFileInput.dispatchEvent(new Event("change"));
  }
});

boot();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = fileInput.files?.[0];
  const prompt = promptInput.value.trim();
  const model = modelInput.value.trim();

  if (!file) {
    setStatus("PDFファイルを選んでください。", true);
    return;
  }

  if (file.type && file.type !== "application/pdf") {
    setStatus("PDFファイルのみアップロードできます。", true);
    return;
  }

  if (!prompt) {
    setStatus("Geminiへ送るプロンプトを入力してください。", true);
    return;
  }

  setLoading(true);
  setStatus(`${file.name} をGeminiへ送信しています...`, false);
  outputElement.textContent = "Geminiが論文を読んでいます...";

  try {
    const pdfData = await window.pdfUtils.readPdfFile(file);
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: pdfData.fileName,
        mimeType: pdfData.mimeType,
        model,
        prompt,
        pdfBase64: pdfData.pdfBase64,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Geminiへの送信に失敗しました。");
    }

    outputElement.textContent = data.output;
    setStatus(`完了: ${data.fileName} を ${data.model} で解析しました。`, false);
  } catch (error) {
    outputElement.textContent = "エラーが発生しました。";
    setStatus(error.message || "不明なエラーが発生しました。", true);
  } finally {
    setLoading(false);
  }
});

copyButton.addEventListener("click", async () => {
  const text = outputElement.textContent.trim();

  if (!text || text === "まだ結果はありません。") {
    setStatus("コピーできる結果がまだありません。", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Geminiの出力をコピーしました。", false);
  } catch {
    setStatus("クリップボードへのコピーに失敗しました。", true);
  }
});

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  fileInput.disabled = isLoading;
  modelInput.disabled = isLoading;
  promptInput.disabled = isLoading;
  copyButton.disabled = isLoading;
}

function setStatus(message, isError) {
  statusElement.textContent = message;
  statusElement.dataset.error = isError ? "true" : "false";
}

async function boot() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    if (response.ok && data.model) {
      modelInput.value = data.model;
    }

    if (response.ok && data.configured) {
      setStatus("Gemini APIキーを検出しました。PDFを選んで送信できます。", false);
    } else {
      setStatus("Gemini APIキーが未設定です。.env を用意してから使ってください。", true);
    }
  } catch {
    setStatus("サーバーの初期状態を確認できませんでした。", true);
  }
}
