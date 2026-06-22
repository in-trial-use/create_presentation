const fs = require("fs");
const path = require("path");

async function extractFiguresFromPdf({
  placeholders,
  extractedPages,
  outputDir,
  assetPathPrefix,
  apiKey,
  model,
}) {
  const pages = normalizeExtractedPages(extractedPages);
  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  const usedImages = new Set();

  for (let index = 0; index < placeholders.length; index += 1) {
    const placeholder = placeholders[index];
    const match = findBestCaptionMatch(placeholder, pages);
    const candidates = match
      ? [...match.images]
          .filter((image) => image?.data && image.width && image.height)
          .sort((left, right) => right.width * right.height - left.width * left.height)
          .slice(0, 6)
      : [];

    let selected = candidates[0] || null;
    let selectedPageNumber = match?.pageNumber || null;
    let selectedFigureLabel = match?.figureLabel || extractFigureLabel(placeholder);
    let selectedCaptionText = match?.captionLine?.text || "";
    let detectionMethod = selected ? "largest-image-fallback" : "";
    let detectedLabel = "";

    if (candidates.length === 1) {
      detectionMethod = "single-image-page";
    } else if (candidates.length > 1) {
      const chosenImage = await selectBestCandidateImageWithGemini({
        apiKey,
        model,
        placeholder,
        figureLabel: selectedFigureLabel,
        captionText: selectedCaptionText,
        candidates,
      });

      if (chosenImage) {
        selected = chosenImage;
        detectionMethod = "gemini-image-selection";
        detectedLabel = chosenImage.label || "";
      }
    }

    if (!selected) {
      const globalSelection = await selectBestCandidateImageAcrossDocument({
        apiKey,
        model,
        placeholder,
        figureLabel: selectedFigureLabel,
        captionText: selectedCaptionText,
        candidates: collectDocumentWideCandidates(pages).filter(
          (image) => !usedImages.has(`${image.pageNumber}:${image.imageIndex}`)
        ),
      });

      if (globalSelection) {
        selected = globalSelection;
        selectedPageNumber = globalSelection.pageNumber;
        selectedCaptionText = globalSelection.captionText || selectedCaptionText;
        detectionMethod = "gemini-document-selection";
        detectedLabel = globalSelection.label || "";
      }
    }

    if (!selected) {
      results.push({
        placeholder,
        found: false,
        pageNumber: selectedPageNumber,
        figureLabel: selectedFigureLabel,
        captionText: selectedCaptionText,
      });
      continue;
    }

    usedImages.add(`${selectedPageNumber}:${selected.imageIndex}`);

    const fileName = `figure-${String(index + 1).padStart(2, "0")}.png`;
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, Buffer.from(selected.data, "base64"));

    results.push({
      placeholder,
      found: true,
      pageNumber: selectedPageNumber,
      figureLabel: selectedFigureLabel,
      captionText: selectedCaptionText,
      imagePath: toPosixPath(path.join(assetPathPrefix, fileName)),
      widthHint: chooseWidthHint(selected.width, selected.height),
      detectionMethod,
      detectedLabel,
      sourceImageIndex: selected.imageIndex,
      sourceSize: {
        width: selected.width,
        height: selected.height,
      },
    });
  }

  return results;
}

function normalizeExtractedPages(extractedPages) {
  if (!Array.isArray(extractedPages)) {
    return [];
  }

  return extractedPages.map((page) => ({
    pageNumber: Number(page?.pageNumber || 0),
    lines: Array.isArray(page?.textLines)
      ? page.textLines
          .map((text) => ({
            text: String(text || "").trim(),
            normalized: normalizeText(text),
          }))
          .filter((line) => line.text)
      : [],
    images: Array.isArray(page?.images)
      ? page.images.map((image) => ({
          imageIndex: Number(image?.imageIndex || 0),
          width: Number(image?.width || 0),
          height: Number(image?.height || 0),
          mimeType: String(image?.mimeType || "image/png"),
          data: String(image?.data || ""),
        }))
      : [],
  }));
}

function findBestCaptionMatch(placeholder, pages) {
  const captionNeedle = normalizeText(placeholder);
  const figureLabel = extractFigureLabel(placeholder);
  const figureNeedles = buildFigureNeedles(figureLabel);
  let bestMatch = null;

  for (const page of pages) {
    for (const line of page.lines) {
      const captionScore = calculateMatchScore(captionNeedle, line.normalized);

      let figureLabelBonus = 0;
      for (const needle of figureNeedles) {
        const starts = line.normalized.startsWith(needle);
        const contains = line.normalized.includes(needle);
        const bonus = starts ? 2.0 : (contains ? 0.5 : 0);
        if (bonus > figureLabelBonus) figureLabelBonus = bonus;
      }

      const figureScore = figureNeedles.length > 0
        ? Math.max(...figureNeedles.map((n) => calculateMatchScore(n, line.normalized)))
        : 0;
      const score = Math.max(captionScore, figureScore, figureLabelBonus);

      if (score < (figureNeedles.length > 0 ? 0.18 : 0.3)) {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          ...page,
          captionLine: line,
          figureLabel,
          score,
        };
      }
    }
  }

  return bestMatch;
}

function collectDocumentWideCandidates(pages) {
  return pages
    .flatMap((page) =>
      page.images
        .filter((image) => image?.data && image.width && image.height)
        .map((image) => ({
          ...image,
          pageNumber: page.pageNumber,
          captionText: findNearestCaptionLine(page.lines),
        })),
    )
    .sort((left, right) => right.width * right.height - left.width * left.height)
    .slice(0, 12);
}

async function selectBestCandidateImageWithGemini({
  apiKey,
  model,
  placeholder,
  figureLabel,
  captionText,
  candidates,
}) {
  const parts = [];

  for (const candidate of candidates) {
    parts.push({
      text: `candidate imageIndex=${candidate.imageIndex}, size=${candidate.width}x${candidate.height}`,
    });
    parts.push({
      inline_data: {
        mime_type: candidate.mimeType || "image/png",
        data: candidate.data,
      },
    });
  }

  parts.push({
    text: [
      "上に並んでいるのは、同じ論文ページから抽出した画像候補です。",
      "以下の図プレースホルダに最も対応する画像を1つだけ選んでください。",
      "ロゴ、アイコン、凡例の一部、小さすぎる断片ではなく、図表やグラフ本体を優先してください。",
      "JSONのみで返し、形式は {\"found\": true|false, \"imageIndex\": number, \"label\": \"...\"} としてください。",
      "見つからない場合は {\"found\": false} を返してください。",
      figureLabel ? `対象の図番号: ${figureLabel}` : "",
      captionText ? `キャプション行: ${captionText}` : "",
      `プレースホルダ全文: ${placeholder}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
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
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
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
    return null;
  }

  const text = extractTextFromGemini(responseJson);

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(stripJsonFence(text));

    if (!parsed?.found) {
      return null;
    }

    const targetIndex = Number(parsed.imageIndex);
    const matched = candidates.find((candidate) => candidate.imageIndex === targetIndex);

    if (!matched) {
      return null;
    }

    return {
      ...matched,
      label: String(parsed.label || "").trim(),
    };
  } catch {
    return null;
  }
}

async function selectBestCandidateImageAcrossDocument({
  apiKey,
  model,
  placeholder,
  figureLabel,
  captionText,
  candidates,
}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const parts = [];

  for (const candidate of candidates) {
    parts.push({
      text: `candidate page=${candidate.pageNumber}, imageIndex=${candidate.imageIndex}, size=${candidate.width}x${candidate.height}`,
    });
    parts.push({
      inline_data: {
        mime_type: candidate.mimeType || "image/png",
        data: candidate.data,
      },
    });
  }

  parts.push({
    text: [
      "上に並んでいるのは、論文PDF全体から抽出した図候補画像です。",
      "以下の図プレースホルダに最も対応する画像を1つだけ選んでください。",
      "小さなアイコンや装飾ではなく、グラフ・図表・可視化本体を優先してください。",
      "JSONのみで返し、形式は {\"found\": true|false, \"pageNumber\": number, \"imageIndex\": number, \"label\": \"...\"} としてください。",
      "見つからない場合は {\"found\": false} を返してください。",
      figureLabel ? `対象の図番号: ${figureLabel}` : "",
      captionText ? `参考キャプション: ${captionText}` : "",
      `プレースホルダ全文: ${placeholder}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
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
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
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
    return null;
  }

  const text = extractTextFromGemini(responseJson);

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(stripJsonFence(text));

    if (!parsed?.found) {
      return null;
    }

    const pageNumber = Number(parsed.pageNumber);
    const imageIndex = Number(parsed.imageIndex);
    const matched = candidates.find((candidate) => candidate.pageNumber === pageNumber && candidate.imageIndex === imageIndex);

    if (!matched) {
      return null;
    }

    return {
      ...matched,
      label: String(parsed.label || "").trim(),
    };
  } catch {
    return null;
  }
}

function calculateMatchScore(needle, haystack) {
  if (!needle || !haystack) {
    return 0;
  }

  if (haystack.includes(needle)) {
    return 1;
  }

  if (needle.includes(haystack)) {
    return haystack.length / needle.length;
  }

  const parts = needle.split(/[:：]/).filter(Boolean);

  if (parts.length > 1 && haystack.includes(parts[0])) {
    const overlap = longestCommonSubstring(parts[parts.length - 1], haystack);
    return Math.max(parts[0].length / needle.length, overlap / needle.length);
  }

  return longestCommonSubstring(needle, haystack) / needle.length;
}

function longestCommonSubstring(left, right) {
  let longest = 0;

  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      let length = 0;

      while (left[i + length] && left[i + length] === right[j + length]) {
        length += 1;
      }

      if (length > longest) {
        longest = length;
      }
    }
  }

  return longest;
}

function extractFigureLabel(text) {
  const match = String(text || "").match(/((?:図|表|Figure|FIGURE|Table|TABLE)\s*\d+(?:[.\-]\d+)*)/i);
  return match ? match[1] : "";
}

function buildFigureNeedles(figureLabel) {
  if (!figureLabel) return [];
  const numMatch = figureLabel.match(/\d+(?:[.\-]\d+)*/);
  if (!numMatch) return [normalizeText(figureLabel)];
  const num = numMatch[0];
  const needles = new Set();
  needles.add(normalizeText(figureLabel));
  if (/^(図|figure)/i.test(figureLabel)) {
    needles.add(normalizeText(`Figure ${num}`));
    needles.add(normalizeText(`図${num}`));
    needles.add(normalizeText(`Fig. ${num}`));
  } else if (/^(表|table)/i.test(figureLabel)) {
    needles.add(normalizeText(`Table ${num}`));
    needles.add(normalizeText(`表${num}`));
  }
  return [...needles];
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[：:]/g, ":")
    .replace(/[「」"'`]/g, "")
    .replace(/[()（）［］\[\]{}]/g, "")
    .replace(/[.,，．・]/g, "");
}

function chooseWidthHint(width, height) {
  const longerSide = Math.max(width, height);

  if (longerSide < 700) {
    return 520;
  }

  if (longerSide < 1200) {
    return 640;
  }

  return 820;
}

function findNearestCaptionLine(lines) {
  if (!Array.isArray(lines)) {
    return "";
  }

  const captionLine = lines.find((line) => /^(図|表|figure|fig(?:ure)?\.?|table)\s*\d+/i.test(line.text));
  return captionLine ? captionLine.text : "";
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

function stripJsonFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

module.exports = {
  extractFiguresFromPdf,
};
