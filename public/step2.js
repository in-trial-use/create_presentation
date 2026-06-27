const step2Shared = window.slideAppShared;

const slidesForm = document.getElementById("slides-form");
const eventNameInput = document.getElementById("event-name");
const eventDateInput = document.getElementById("event-date");
const slideTitleInput = document.getElementById("slide-title");
const affiliationInput = document.getElementById("affiliation");
const presenterNameInput = document.getElementById("presenter-name");
const slideFlowInput = document.getElementById("slide-flow");
const step2LayoutLogPathInput = document.getElementById("step2-layout-log-path");
const slidesStatusElement = document.getElementById("slides-status");
const slidesOutputStatusElement = document.getElementById("slides-output-status");
const slidesOutputElement = document.getElementById("slides-output");
const slidesSubmitButton = document.getElementById("slides-submit-button");
const slidesCopyButton = document.getElementById("slides-copy-button");
const slidesSaveButton = document.getElementById("slides-save-button");

bootstrapStep2();

slidesForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const analysis = step2Shared.slideSourceInput.value.trim();
  const slideFlow = slideFlowInput.value.trim();
  const model = step2Shared.modelField.value.trim();
  const file = step2Shared.getStep2PdfFile();
  const eventName = eventNameInput.value.trim() || "論文紹介";
  const eventDate = eventDateInput.value.trim() || step2Shared.formatToday();
  const slideTitle =
    slideTitleInput.value.trim() || inferSlideTitleFromFile(file) || "タイトル未入力";
  const affiliation = affiliationInput.value.trim() || "所属未入力";
  const presenterName = presenterNameInput.value.trim() || "発表者未入力";
  const layoutLogPath = step2LayoutLogPathInput.value.trim();

  if (!file) {
    setSlidesStatus("Step 2用のPDFファイルを選んでください。", true);
    return;
  }

  setStep2Loading(true);
  setSlidesStatus("PDFを参照しながらMarp Markdownを生成しています...", false);
  setSlidesOutputStatus("", false);
  slidesOutputElement.value = "Geminiがスライド原稿を組み立てています...";

  try {
    const pdfData = await window.pdfUtils.readPdfFile(file);
    const response = await fetch("/api/slides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analysis,
        slideFlow,
        fileName: pdfData.fileName,
        mimeType: pdfData.mimeType,
        pdfBase64: pdfData.pdfBase64,
        model,
        eventName,
        eventDate,
        slideTitle,
        affiliation,
        presenterName,
        layoutLogPath,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Marp Markdownの生成に失敗しました。");
    }

    slidesOutputElement.value = data.output;
    setSlidesStatus(buildStep2CompletionMessage(data), !data.validation?.ok);
    document.dispatchEvent(new Event("step2:updated"));
  } catch (error) {
    slidesOutputElement.value = "エラーが発生しました。";
    setSlidesStatus(error.message || "不明なエラーが発生しました。", true);
  } finally {
    setStep2Loading(false);
  }
});

slidesCopyButton.addEventListener("click", async () => {
  await step2Shared.copyOutput({
    text: slidesOutputElement.value.trim(),
    emptyMessage: "まだMarp Markdownはありません。",
    onSuccess: () => setSlidesOutputStatus("Marp Markdownをコピーしました。", false),
    onError: (message) => setSlidesOutputStatus(message, true),
  });
});

slidesSaveButton.addEventListener("click", async () => {
  await step2Shared.saveMarkdownToData({
    baseName: step2Shared.slidesBaseNameInput.value.trim(),
    suffix: "step2",
    text: slidesOutputElement.value.trim(),
    onSuccess: (savedPath, normalizedBaseName) => {
      step2Shared.slidesBaseNameInput.value = normalizedBaseName;
      setSlidesOutputStatus(`${savedPath} に保存しました。`, false);
    },
    onError: (message) => setSlidesOutputStatus(message, true),
  });
});

function bootstrapStep2() {
  if (!eventDateInput.value.trim()) {
    eventDateInput.value = step2Shared.formatToday();
  }

  step2Shared.slidePdfFileInput.addEventListener("change", () => {
    if (slideTitleInput.value.trim()) {
      return;
    }

    const file = step2Shared.getStep2PdfFile();

    if (!file) {
      return;
    }

    slideTitleInput.value = inferSlideTitleFromFile(file);
  });
}

function setStep2Loading(isLoading) {
  slidesSubmitButton.disabled = isLoading;
  slidesCopyButton.disabled = isLoading;
  slidesSaveButton.disabled = isLoading;
  step2Shared.slidePdfFileInput.disabled = isLoading;
  step2Shared.slidesBaseNameInput.disabled = isLoading;
  eventNameInput.disabled = isLoading;
  eventDateInput.disabled = isLoading;
  slideTitleInput.disabled = isLoading;
  affiliationInput.disabled = isLoading;
  presenterNameInput.disabled = isLoading;
  step2LayoutLogPathInput.disabled = isLoading;
  step2Shared.slideSourceInput.disabled = isLoading;
  slideFlowInput.disabled = isLoading;
}

function setSlidesStatus(message, isError) {
  slidesStatusElement.textContent = message;
  slidesStatusElement.dataset.error = isError ? "true" : "false";
}

function setSlidesOutputStatus(message, isError) {
  slidesOutputStatusElement.textContent = message;
  slidesOutputStatusElement.dataset.error = isError ? "true" : "false";
}

function buildStep2CompletionMessage(data) {
  const validation = data.validation;

  if (!validation) {
    return `完了: ${data.model} でMarp Markdownを生成しました。`;
  }

  const attempts = Array.isArray(validation.attempts) ? validation.attempts : [];
  const lastAttempt = attempts[attempts.length - 1];
  const attemptText = attempts.length > 0 ? `${attempts.length}回検証` : "検証なし";
  const logText = validation.logPath ? ` ログ: ${validation.logPath}` : "";

  if (validation.ok) {
    return `完了: ${data.model} で生成し、PDFレイアウト検証もOKです（${attemptText}）。${logText}`;
  }

  const firstIssue = lastAttempt?.issues?.[0]?.message || validation.warning || "手動確認が必要です。";
  return `生成しましたが、PDFレイアウト検証に警告があります（${attemptText}）。${firstIssue}${logText}`;
}

function inferSlideTitleFromFile(file) {
  if (!file?.name) {
    return "";
  }

  return file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKC")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
