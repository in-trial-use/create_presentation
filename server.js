const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  buildSlidePrompt,
  buildFixedSlidePrefix,
} = require("./prompts/build-slide-prompt");
const { buildStep3Prompt } = require("./prompts/build-step3-prompt");
const { extractFiguresFromPdf } = require("./lib/pdf-figure-extractor");
const { refineStep2MarkdownWithLayoutLoop } = require("./lib/step2-layout-refiner");
const {
  sanitizeDataBasePath,
  sanitizeDataRelativeFilePath,
  resolveDataSubdir,
  resolveDataFilePath,
} = require("./lib/data-paths");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const STEP2_REFERENCE_EXAMPLES = [
  {
    name: "ViT",
    markdownPath: path.join(DATA_DIR, "refined", "ViT", "step2.md"),
    paperPdfPath: path.join(DATA_DIR, "refined", "ViT", "vit.pdf"),
  },
];
const MAX_BODY_BYTES = 80 * 1024 * 1024;
const STEP2_LAYOUT_MAX_ATTEMPTS = Number(process.env.STEP2_LAYOUT_MAX_ATTEMPTS || 3);
const GEMINI_INTERACTION_POLL_INTERVAL_MS = Number(process.env.GEMINI_INTERACTION_POLL_INTERVAL_MS || 2000);
const GEMINI_INTERACTION_MAX_POLLS = Number(process.env.GEMINI_INTERACTION_MAX_POLLS || 45);

loadEnvFile(path.join(ROOT_DIR, ".env"));
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const DEFAULT_HOST = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
      });
    }

    if (req.method === "POST" && req.url === "/api/analyze") {
      return await handleAnalyze(req, res);
    }

    if (req.method === "POST" && req.url === "/api/slides") {
      return await handleSlideGeneration(req, res);
    }

    if (req.method === "POST" && req.url === "/api/extract-figures") {
      return await handleFigureExtraction(req, res);
    }

    if (req.method === "POST" && req.url === "/api/regenerate-step3") {
      return await handleStep3Regeneration(req, res);
    }

    if (req.method === "POST" && req.url === "/api/save-slide") {
      return await handleSaveSlide(req, res);
    }

    if (req.method === "GET") {
      return serveStaticFile(req, res);
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(res, error?.statusCode || 500, {
      error: error?.message || "Internal server error",
    });
  }
});

server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
  console.log(`Server running at http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
});

async function handleAnalyze(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sendJson(res, 500, {
      error: "GEMINI_API_KEY is not set. Copy .env.example to .env and add your API key.",
    });
  }

  const body = await readJsonBody(req, res, { allowLargePdf: true });

  if (!body) {
    return;
  }

  const prompt = String(body.prompt || "").trim();
  const pdfBase64 = String(body.pdfBase64 || "").trim();
  const fileName = String(body.fileName || "paper.pdf").trim() || "paper.pdf";
  const mimeType = String(body.mimeType || "application/pdf").trim() || "application/pdf";
  const model = String(body.model || process.env.GEMINI_MODEL || "gemini-2.5-pro").trim();

  if (!prompt) {
    return sendJson(res, 400, { error: "Prompt is required." });
  }

  if (!pdfBase64) {
    return sendJson(res, 400, { error: "PDF data is required." });
  }

  if (mimeType !== "application/pdf") {
    return sendJson(res, 400, { error: "Only PDF uploads are supported in this prototype." });
  }

  const output = await generateGeminiText({
    apiKey,
    model,
    parts: [
      {
        inline_data: {
          mime_type: mimeType,
          data: pdfBase64,
        },
      },
      {
        text: prompt,
      },
    ],
  });

  return sendJson(res, 200, {
    fileName,
    model,
    output,
  });
}

async function handleSlideGeneration(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sendJson(res, 500, {
      error: "GEMINI_API_KEY is not set. Copy .env.example to .env and add your API key.",
    });
  }

  const body = await readJsonBody(req, res, { allowLargePdf: true });

  if (!body) {
    return;
  }

  const analysis = String(body.analysis || "").trim();
  const slideFlow = String(body.slideFlow || "").trim();
  const pdfBase64 = String(body.pdfBase64 || "").trim();
  const fileName = String(body.fileName || "paper.pdf").trim() || "paper.pdf";
  const mimeType = String(body.mimeType || "application/pdf").trim() || "application/pdf";
  const model = String(body.model || process.env.GEMINI_MODEL || "gemini-2.5-pro").trim();
  const eventName = String(body.eventName || "論文紹介").trim() || "論文紹介";
  const eventDate = String(body.eventDate || "").trim() || formatDateForSlide(new Date());
  const affiliation = String(body.affiliation || "所属未入力").trim() || "所属未入力";
  const presenterName = String(body.presenterName || "発表者未入力").trim() || "発表者未入力";
  const title = String(body.slideTitle || "").trim() || deriveSlideTitle(fileName);
  const layoutLogPath = String(body.layoutLogPath || "").trim();

  if (!pdfBase64) {
    return sendJson(res, 400, {
      error: "Step 2ではPDF参照が必須です。上のPDFファイルを選んでください。",
    });
  }

  if (mimeType !== "application/pdf") {
    return sendJson(res, 400, {
      error: "Only PDF uploads are supported in this prototype.",
    });
  }

  const referenceExamples = loadStep2ReferenceExamples();
  const prompt = buildSlidePrompt({
    analysis,
    slideFlow,
    fileName,
    eventName,
    eventDate,
    affiliation,
    presenterName,
    title,
    referenceExampleName: referenceExamples.map((example) => example.name).join(", "),
    referenceExampleMarkdown: buildReferenceExamplesMarkdown(referenceExamples),
  });
  const layoutLogTarget = layoutLogPath ? buildStep2LayoutLogTarget(layoutLogPath) : null;

  const output = await generateGeminiText({
    apiKey,
    model,
    parts: [
      {
        text: `添付1: 今回スライド化する対象論文PDF（${fileName}）。内容の一次情報として最優先してください。`,
      },
      {
        inline_data: {
          mime_type: mimeType,
          data: pdfBase64,
        },
      },
      ...buildStep2ReferenceExampleParts(referenceExamples),
      {
        text: prompt,
      },
    ],
  });
  const firstMarkdown = buildFixedSlidePrefix({
    eventName,
    eventDate,
    affiliation,
    presenterName,
    title,
  }) + normalizeStep2BodyOutput(output);
  const refined = await refineStep2MarkdownWithLayoutLoop({
    apiKey,
    model,
    markdown: firstMarkdown,
    sourcePdfBase64: pdfBase64,
    sourceFileName: fileName,
    rootDir: ROOT_DIR,
    generateText: generateGeminiText,
    normalizeMarkdown: normalizeMarpOutput,
    stripMarkdownCodeFence,
    artifactDir: layoutLogTarget?.artifactDir || "",
    maxAttempts: STEP2_LAYOUT_MAX_ATTEMPTS,
  });
  const savedStep2MarkdownPath = layoutLogTarget
    ? saveStep2Markdown({
        target: layoutLogTarget,
        markdown: refined.markdown,
      })
    : "";
  const savedLayoutLogPath = layoutLogTarget
    ? saveStep2LayoutLog({
        target: layoutLogTarget,
        log: refined.trace,
      })
    : "";

  return sendJson(res, 200, {
    model,
    output: refined.markdown,
    validation: {
      ...refined.validation,
      logPath: savedLayoutLogPath,
      artifactDir: layoutLogTarget?.relativeArtifactDir || "",
      markdownPath: savedStep2MarkdownPath,
    },
  });
}

async function handleSaveSlide(req, res) {
  const body = await readJsonBody(req, res);

  if (!body) {
    return;
  }

  const rawBaseName = String(body.baseName || "").trim();
  const rawSuffix = String(body.suffix || "").trim().toLowerCase();
  const content = String(body.content || "");

  if (!rawBaseName) {
    return sendJson(res, 400, {
      error: "保存ベース名を入力してください。",
    });
  }

  if (!content.trim()) {
    return sendJson(res, 400, {
      error: "保存するMarp Markdownがありません。",
    });
  }

  if (!["step2", "step3"].includes(rawSuffix)) {
    return sendJson(res, 400, {
      error: "保存対象は step2 または step3 のみです。",
    });
  }

  const baseName = sanitizeDataBasePath(rawBaseName);
  const fileName = ensureMarkdownExtension(rawSuffix);

  if (!baseName || !fileName) {
    return sendJson(res, 400, {
      error: "利用できないファイル名です。記号を減らして別の名前を試してください。",
    });
  }

  const targetDir = resolveDataSubdir(DATA_DIR, baseName);
  fs.mkdirSync(targetDir, { recursive: true });
  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, content, "utf8");

  return sendJson(res, 200, {
    ok: true,
    baseName,
    fileName,
    savedPath: path.relative(ROOT_DIR, filePath),
  });
}

async function handleFigureExtraction(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sendJson(res, 500, {
      error: "GEMINI_API_KEY is not set. Copy .env.example to .env and add your API key.",
    });
  }

  const body = await readJsonBody(req, res, { allowLargePdf: true });

  if (!body) {
    return;
  }

  const step2Markdown = String(body.step2Markdown || "").trim();
  const fileName = String(body.fileName || "paper.pdf").trim() || "paper.pdf";
  const extractedPages = Array.isArray(body.extractedPages) ? body.extractedPages : [];
  const rawBaseName = String(body.baseName || "sample").trim() || "sample";
  const model = String(body.model || process.env.GEMINI_MODEL || "gemini-2.5-pro").trim();

  if (!step2Markdown) {
    return sendJson(res, 400, {
      error: "Step 3ではStep 2のMarp Markdownが必要です。",
    });
  }

  if (extractedPages.length === 0) {
    return sendJson(res, 400, {
      error: "図抽出では、ブラウザ側PDF.jsで抽出した画像候補が必要です。Step 3用のPDFを選んで再実行してください。",
    });
  }

  const placeholders = extractFigurePlaceholders(step2Markdown);

  if (placeholders.length === 0) {
    return sendJson(res, 400, {
      error: "Step 2のMarkdownに [図: ...] 形式のプレースホルダが見つかりませんでした。",
    });
  }

  const baseName = sanitizeDataBasePath(rawBaseName) || "sample";
  const baseDirPath = resolveDataSubdir(DATA_DIR, baseName);
  const assetDirName = "step3-assets";
  const assetDirPath = path.join(baseDirPath, assetDirName);
  fs.mkdirSync(baseDirPath, { recursive: true });
  fs.rmSync(assetDirPath, { recursive: true, force: true });
  const extractedFigures = await extractFiguresFromPdf({
    placeholders,
    extractedPages,
    outputDir: assetDirPath,
    assetPathPrefix: `./${assetDirName}`,
    apiKey,
    model,
  });
  const resolvedFigures = extractedFigures.filter((figure) => figure.found);

  if (resolvedFigures.length === 0) {
    return sendJson(res, 422, {
      error: "論文PDFから対応する図を見つけられませんでした。Step 2の図プレースホルダ表現を見直してください。",
      extractedFigures,
    });
  }

  fs.writeFileSync(
    path.join(assetDirPath, "figures.json"),
    JSON.stringify(extractedFigures, null, 2),
    "utf8",
  );

  return sendJson(res, 200, {
    model,
    sourcePdf: fileName,
    extractedFigures,
    resolvedFigureCount: resolvedFigures.length,
  });
}

async function handleStep3Regeneration(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sendJson(res, 500, {
      error: "GEMINI_API_KEY is not set. Copy .env.example to .env and add your API key.",
    });
  }

  const body = await readJsonBody(req, res);

  if (!body) {
    return;
  }

  const step2Markdown = String(body.step2Markdown || "").trim();
  const extractedFigures = Array.isArray(body.extractedFigures) ? body.extractedFigures : [];
  const model = String(body.model || process.env.GEMINI_MODEL || "gemini-2.5-pro").trim();

  if (!step2Markdown) {
    return sendJson(res, 400, {
      error: "Step 3ではStep 2のMarp Markdownが必要です。",
    });
  }

  if (extractedFigures.length === 0) {
    return sendJson(res, 400, {
      error: "先に図抽出を行い、その結果を渡してください。",
    });
  }

  const resolvedFigures = extractedFigures.filter((figure) => figure && figure.found && figure.imagePath);

  if (resolvedFigures.length === 0) {
    return sendJson(res, 422, {
      error: "抽出結果に利用できる図がありません。図抽出結果を見直してください。",
    });
  }

  const prompt = buildStep3Prompt({
    step2Markdown,
    extractedFigures: resolvedFigures,
  });
  const output = await generateGeminiText({
    apiKey,
    model,
    parts: [{ text: prompt }],
  });

  return sendJson(res, 200, {
    model,
    resolvedFigureCount: resolvedFigures.length,
    output: normalizeMarpOutput(output),
  });
}

function serveStaticFile(req, res) {
  if (req.url.startsWith("/vendor/pdfjs/")) {
    return servePdfJsVendorFile(req, res);
  }

  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        return sendJson(res, 404, { error: "Not found" });
      }

      console.error(error);
      return sendJson(res, 500, { error: "Failed to read file." });
    }

    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(content);
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function servePdfJsVendorFile(req, res) {
  const requestPath = req.url.replace(/^\/vendor\/pdfjs\//, "");
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const vendorRoot = path.join(ROOT_DIR, "node_modules", "pdfjs-dist");
  const filePath = path.join(vendorRoot, safePath);

  if (!filePath.startsWith(vendorRoot)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        return sendJson(res, 404, { error: "Not found" });
      }

      console.error(error);
      return sendJson(res, 500, { error: "Failed to read file." });
    }

    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(content);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req, res, options = {}) {
  let rawBody;

  try {
    rawBody = await readRequestBody(req, MAX_BODY_BYTES);
  } catch (error) {
    if (error?.code === "REQUEST_TOO_LARGE") {
      const message = options.allowLargePdf
        ? "Uploaded PDF or extracted image payload is too large for this prototype. Try a smaller file."
        : "Request body is too large.";

      sendJson(res, 413, { error: message });
      return null;
    }

    throw error;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request body." });
    return null;
  }
}

function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > maxBytes) {
        const error = new Error("Request body is too large.");
        error.code = "REQUEST_TOO_LARGE";
        reject(error);
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });
}

async function generateGeminiText({ apiKey, model, parts }) {
  const generateContentOutput = await generateGeminiTextWithGenerateContent({
    apiKey,
    model,
    parts,
  });

  if (generateContentOutput) {
    return generateContentOutput;
  }

  const interactionOutput = await generateGeminiTextWithInteractions({
    apiKey,
    model,
    parts,
  });

  if (interactionOutput) {
    return interactionOutput;
  }

  const error = new Error("Gemini returned no text output.");
  error.statusCode = 502;
  throw error;
}

async function generateGeminiTextWithInteractions({ apiKey, model, parts }) {
  const input = convertGeminiPartsToInteractionInput(parts);
  const geminiResponse = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        input,
      }),
    },
  );

  const responseText = await geminiResponse.text();
  let responseJson = {};

  try {
    responseJson = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseJson = { raw: responseText };
  }

  if (!geminiResponse.ok) {
    const errorMessage =
      responseJson?.error?.message ||
      responseJson?.raw ||
      `Gemini request failed with status ${geminiResponse.status}.`;

    const error = new Error(errorMessage);
    error.statusCode = geminiResponse.status;
    throw error;
  }

  const resolvedResponseJson = await resolveGeminiInteractionOutput({
    apiKey,
    initialResponseJson: responseJson,
  });
  const output = extractTextFromGeminiInteraction(resolvedResponseJson);

  if (output) {
    return output;
  }

  return "";
}

async function generateGeminiTextWithGenerateContent({ apiKey, model, parts }) {
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${buildGeminiModelResource(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: convertGeminiPartsToGenerateContentParts(parts),
          },
        ],
      }),
    },
  );
  const responseText = await geminiResponse.text();
  let responseJson = {};

  try {
    responseJson = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseJson = { raw: responseText };
  }

  if (!geminiResponse.ok) {
    const errorMessage =
      responseJson?.error?.message ||
      responseJson?.raw ||
      `Gemini generateContent request failed with status ${geminiResponse.status}.`;

    const error = new Error(errorMessage);
    error.statusCode = geminiResponse.status;
    throw error;
  }

  return extractTextFromGemini(responseJson);
}

function buildGeminiModelResource(model) {
  const normalizedModel = String(model || "").trim().replace(/^\/+/, "");
  return normalizedModel.startsWith("models/") ? normalizedModel : `models/${normalizedModel}`;
}

async function resolveGeminiInteractionOutput({ apiKey, initialResponseJson }) {
  if (extractTextFromGeminiInteraction(initialResponseJson)) {
    return initialResponseJson;
  }

  const interactionId = String(initialResponseJson?.id || "").trim();

  if (!interactionId) {
    return initialResponseJson;
  }

  let latestResponseJson = initialResponseJson;

  for (let pollIndex = 1; pollIndex <= GEMINI_INTERACTION_MAX_POLLS; pollIndex += 1) {
    const status = String(latestResponseJson?.status || "").toLowerCase();

    if (["failed", "cancelled", "canceled", "expired"].includes(status)) {
      return latestResponseJson;
    }

    await delay(GEMINI_INTERACTION_POLL_INTERVAL_MS);
    latestResponseJson = await getGeminiInteraction({
      apiKey,
      interactionId,
    });

    if (extractTextFromGeminiInteraction(latestResponseJson)) {
      return latestResponseJson;
    }
  }

  return latestResponseJson;
}

async function getGeminiInteraction({ apiKey, interactionId }) {
  const resourcePath = interactionId.startsWith("interactions/")
    ? interactionId
    : `interactions/${interactionId}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${resourcePath}`,
    {
      method: "GET",
      headers: {
        "x-goog-api-key": apiKey,
      },
    },
  );
  const responseText = await response.text();
  let responseJson = {};

  try {
    responseJson = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseJson = { raw: responseText };
  }

  if (!response.ok) {
    const errorMessage =
      responseJson?.error?.message ||
      responseJson?.raw ||
      `Gemini interaction fetch failed with status ${response.status}.`;

    const error = new Error(errorMessage);
    error.statusCode = response.status;
    throw error;
  }

  return responseJson;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function convertGeminiPartsToInteractionInput(parts) {
  const input = [];

  for (const part of parts || []) {
    if (typeof part?.text === "string") {
      input.push({
        type: "text",
        text: part.text,
      });
      continue;
    }

    if (part?.inline_data?.data && part?.inline_data?.mime_type) {
      input.push({
        type: "document",
        data: part.inline_data.data,
        mime_type: part.inline_data.mime_type,
      });
    }
  }

  return input;
}

function convertGeminiPartsToGenerateContentParts(parts) {
  const convertedParts = [];

  for (const part of parts || []) {
    if (typeof part?.text === "string") {
      convertedParts.push({
        text: part.text,
      });
      continue;
    }

    if (part?.inline_data?.data && part?.inline_data?.mime_type) {
      convertedParts.push({
        inlineData: {
          mimeType: part.inline_data.mime_type,
          data: part.inline_data.data,
        },
      });
    }
  }

  return convertedParts;
}

function extractTextFromGeminiInteraction(responseJson) {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text.trim()) {
    return responseJson.output_text.trim();
  }

  if (typeof responseJson?.outputText === "string" && responseJson.outputText.trim()) {
    return responseJson.outputText.trim();
  }

  const output = responseJson?.output;
  const textParts = [];

  if (Array.isArray(output)) {
    for (const item of output) {
      collectInteractionTextParts(item, textParts);
    }
  } else {
    collectInteractionTextParts(output, textParts);
  }

  if (textParts.length > 0) {
    return textParts.join("\n\n").trim();
  }

  return extractTextFromGemini(responseJson);
}

function collectInteractionTextParts(value, textParts) {
  if (!value) {
    return;
  }

  if (typeof value === "string" && value.trim()) {
    textParts.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectInteractionTextParts(item, textParts);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const key of ["text", "output_text", "outputText", "content", "value"]) {
    if (typeof value[key] === "string" && value[key].trim()) {
      textParts.push(value[key].trim());
    }
  }

  for (const key of [
    "content",
    "parts",
    "items",
    "output",
    "steps",
    "candidates",
    "message",
    "messages",
    "response",
  ]) {
    if (Array.isArray(value[key])) {
      collectInteractionTextParts(value[key], textParts);
    } else if (typeof value[key] === "object" && value[key] !== null) {
      collectInteractionTextParts(value[key], textParts);
    }
  }
}

function summarizeGeminiResponseShape(value, depth = 0) {
  if (depth > 3) {
    return "...";
  }

  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    const first = value.length > 0 ? summarizeGeminiResponseShape(value[0], depth + 1) : "";
    return `array(${value.length})${first ? `[${first}]` : ""}`;
  }

  if (typeof value !== "object") {
    return typeof value;
  }

  const entries = Object.entries(value).slice(0, 12);
  const body = entries
    .map(([key, child]) => `${key}:${summarizeGeminiResponseShape(child, depth + 1)}`)
    .join(",");

  return `{${body}}`;
}

function extractTextFromGemini(responseJson) {
  const candidates = responseJson?.candidates;

  if (!Array.isArray(candidates)) {
    return "";
  }

  const textParts = [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;

    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        textParts.push(part.text.trim());
      }
    }
  }

  return textParts.join("\n\n");
}

function normalizeMarpOutput(output) {
  let trimmed = stripMarkdownCodeFence(output);
  const standardFrontmatterLines = [
    "marp: true",
    "theme: kaira",
    "size: 16:9",
    "math: katex",
    "highlight: github",
    "paginate: true",
  ];

  const leadingBlocks = collectLeadingFrontmatterBlocks(trimmed);

  if (leadingBlocks.length > 0) {
    const [firstBlock] = leadingBlocks;
    const body = trimmed.slice(leadingBlocks[leadingBlocks.length - 1].endIndex).trimStart();
    const extraLines = firstBlock.content
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => {
        if (!line.trim()) {
          return false;
        }

        if (/^style\s*:/i.test(line)) {
          return false;
        }

        return !/^(marp|theme|size|math|highlight|paginate)\s*:/i.test(line);
      });

    return `---\n${[...standardFrontmatterLines, ...extraLines].join("\n")}\n---\n\n${normalizeInlineReferences(body)}`;
  }

  if (!trimmed.startsWith("---")) {
    return `---\n${standardFrontmatterLines.join("\n")}\n---\n\n${normalizeInlineReferences(trimmed)}`;
  }

  return normalizeInlineReferences(trimmed);
}

function normalizeStep2BodyOutput(output) {
  let trimmed = stripMarkdownCodeFence(output);
  const leadingBlocks = collectLeadingFrontmatterBlocks(trimmed);

  if (leadingBlocks.length > 0) {
    trimmed = trimmed.slice(leadingBlocks[leadingBlocks.length - 1].endIndex).trimStart();
  }

  const agendaMatch = trimmed.match(/<!--\s*class:\s*agenda(?:\s+show-page)?\s*-->/i);

  if (agendaMatch && typeof agendaMatch.index === "number") {
    trimmed = trimmed.slice(agendaMatch.index).trimStart();
  } else {
    const titleMatch = trimmed.match(/<!--\s*class:\s*title\s*-->/i);

    if (titleMatch && typeof titleMatch.index === "number") {
      const afterTitle = trimmed.slice(titleMatch.index);
      const separatorMatch = afterTitle.match(/\n---\s*\n/);

      if (separatorMatch && typeof separatorMatch.index === "number") {
        trimmed = afterTitle.slice(separatorMatch.index + separatorMatch[0].length).trimStart();
      }
    }
  }

  trimmed = trimmed.replace(/^(?:---\s*\n)+/, "").trimStart();
  return normalizeInlineReferences(trimmed);
}

function normalizeInlineReferences(markdown) {
  return markdown.replace(
    /(?<![\w>])((?:論文\s*)?[図表式]\s*\d+(?:\.\d+)*)/gu,
    (match) => `<span class="ref-inline">${match.replace(/\s+/gu, "")}</span>`
  );
}

function stripMarkdownCodeFence(output) {
  let trimmed = String(output || "").trim();

  if (trimmed.startsWith("```")) {
    trimmed = trimmed
      .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  }

  return trimmed;
}

function collectLeadingFrontmatterBlocks(markdown) {
  const blocks = [];
  let remaining = markdown;
  let offset = 0;

  while (true) {
    const match = remaining.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

    if (!match) {
      break;
    }

    const endIndex = offset + match[0].length;
    blocks.push({
      content: match[1],
      endIndex,
    });
    remaining = remaining.slice(match[0].length);
    offset = endIndex;

    const whitespaceMatch = remaining.match(/^\s*/);
    const whitespaceLength = whitespaceMatch ? whitespaceMatch[0].length : 0;
    remaining = remaining.slice(whitespaceLength);
    offset += whitespaceLength;
  }

  return blocks;
}

function deriveSlideTitle(fileName) {
  const baseName = path.basename(String(fileName || "paper.pdf"), path.extname(String(fileName || "paper.pdf")));
  const normalized = baseName
    .normalize("NFKC")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "タイトル未入力";
}

function formatDateForSlide(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function buildStep2LayoutLogTarget(rawLogPath) {
  const relativeLogPath = sanitizeDataRelativeFilePath(rawLogPath, {
    defaultFileName: "step2-layout-log.json",
  });

  if (!relativeLogPath) {
    const error = new Error("利用できないログ保存先です。");
    error.statusCode = 400;
    throw error;
  }

  const filePath = resolveDataFilePath(DATA_DIR, relativeLogPath);
  const relativeLogDir = path.posix.dirname(relativeLogPath);
  const relativeArtifactDir = path.posix.join(relativeLogDir === "." ? "" : relativeLogDir, "logs");
  const artifactDir = resolveDataSubdir(DATA_DIR, relativeArtifactDir);
  const markdownPath = path.join(path.dirname(filePath), "step2.md");

  return {
    filePath,
    markdownPath,
    artifactDir,
    relativeLogPath: path.relative(ROOT_DIR, filePath),
    relativeMarkdownPath: path.relative(ROOT_DIR, markdownPath),
    relativeArtifactDir: path.relative(ROOT_DIR, artifactDir),
  };
}

function saveStep2Markdown({ target, markdown }) {
  fs.mkdirSync(path.dirname(target.markdownPath), { recursive: true });
  fs.writeFileSync(target.markdownPath, markdown, "utf8");
  return target.relativeMarkdownPath;
}

function saveStep2LayoutLog({ target, log }) {
  fs.mkdirSync(path.dirname(target.filePath), { recursive: true });
  fs.writeFileSync(target.filePath, JSON.stringify(log, null, 2), "utf8");
  return target.relativeLogPath;
}

function loadStep2ReferenceExamples() {
  return STEP2_REFERENCE_EXAMPLES
    .filter((example) => fs.existsSync(example.markdownPath) && fs.existsSync(example.paperPdfPath))
    .map((example) => ({
      name: example.name,
      markdownPath: example.markdownPath,
      paperPdfPath: example.paperPdfPath,
      markdown: fs.readFileSync(example.markdownPath, "utf8"),
      paperPdfBase64: fs.readFileSync(example.paperPdfPath).toString("base64"),
    }));
}

function buildReferenceExamplesMarkdown(referenceExamples) {
  return referenceExamples
    .map((example, index) => {
      return [
        `## 参考例${index + 1}: ${example.name}`,
        `Markdown: ${path.relative(ROOT_DIR, example.markdownPath)}`,
        example.markdown,
      ].join("\n\n");
    })
    .join("\n\n---\n\n");
}

function buildStep2ReferenceExampleParts(referenceExamples) {
  if (!Array.isArray(referenceExamples) || referenceExamples.length === 0) {
    return [];
  }

  return referenceExamples.flatMap((example, index) => {
    const attachmentNumber = index + 2;

    return [
      {
        text:
          `添付${attachmentNumber}: 参考例${index + 1}の元論文PDF（${example.name}）。` +
          "これは内容を流用するためではなく、参考スライドMarkdownがどの程度論文内容を圧縮しているかを見るための例です。",
      },
      {
        inline_data: {
          mime_type: "application/pdf",
          data: example.paperPdfBase64,
        },
      },
    ];
  });
}

function ensureMarkdownExtension(fileName) {
  if (!fileName) {
    return "";
  }

  return fileName.toLowerCase().endsWith(".md") ? fileName : `${fileName}.md`;
}

function extractFigurePlaceholders(markdown) {
  return [...markdown.matchAll(/\[図:\s*([^\]]+)\]/g)].map((match) => match[1].trim());
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
