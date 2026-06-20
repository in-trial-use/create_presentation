window.pdfUtils = {
  async readPdfFile(file) {
    assertPdfFile(file);

    const pdfBase64 = await fileToBase64(file);

    return {
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      pdfBase64,
    };
  },

  async extractImagesFromPdf(file) {
    assertPdfFile(file);

    const pdfjsLib = await loadPdfJs();
    const pdf = await loadPdf(file, pdfjsLib);
    const extractedPages = [];

    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textLines = await extractPageTextLines(page);
        const images = await extractPageImages(page, pdfjsLib.OPS);

        extractedPages.push({
          pageNumber,
          textLines,
          images,
        });
      }
    } finally {
      await pdf.destroy();
    }

    return {
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      extractedPages,
      totalImages: extractedPages.reduce((count, page) => count + page.images.length, 0),
    };
  },
};

let pdfJsPromise;

function assertPdfFile(file) {
  if (!file) {
    throw new Error("PDFファイルを選んでください。");
  }

  if (file.type && file.type !== "application/pdf") {
    throw new Error("PDFファイルのみアップロードできます。");
  }
}

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("/vendor/pdfjs/legacy/build/pdf.mjs").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/legacy/build/pdf.worker.min.mjs";
      return pdfjsLib;
    });
  }

  return pdfJsPromise;
}

async function loadPdf(file, pdfjsLib) {
  const buffer = await readFileAsArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isOffscreenCanvasSupported: false,
  });

  return loadingTask.promise;
}

async function extractPageTextLines(page) {
  const textContent = await page.getTextContent();
  const buckets = [];

  for (const item of textContent.items) {
    if (!item?.str || !item.str.trim()) {
      continue;
    }

    const x = Number(item.transform?.[4] || 0);
    const y = Number(item.transform?.[5] || 0);
    const normalizedY = Math.round(y / 8) * 8;
    let bucket = buckets.find((line) => Math.abs(line.normalizedY - normalizedY) <= 8);

    if (!bucket) {
      bucket = {
        normalizedY,
        items: [],
      };
      buckets.push(bucket);
    }

    bucket.items.push({
      x,
      text: item.str,
    });
  }

  return buckets
    .map((bucket) =>
      bucket.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

async function extractPageImages(page, ops) {
  const operatorList = await page.getOperatorList();
  const targetOps = [ops.paintImageXObject, ops.paintInlineImageXObject];
  const extractedImages = [];

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    if (!targetOps.includes(operatorList.fnArray[index])) {
      continue;
    }

    const candidate = operatorList.argsArray[index]?.[0];
    const imageObject = await resolveImageObject(page, candidate);

    if (!imageObject?.data || !imageObject.width || !imageObject.height) {
      continue;
    }

    if (!isUsefulImageCandidate(imageObject.width, imageObject.height)) {
      continue;
    }

    const rgbaData = normalizeToRgba(imageObject.data, imageObject.width, imageObject.height);

    if (!rgbaData) {
      continue;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("画像抽出用のcanvasを初期化できませんでした。");
    }

    canvas.width = imageObject.width;
    canvas.height = imageObject.height;
    context.putImageData(new ImageData(rgbaData, imageObject.width, imageObject.height), 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

    extractedImages.push({
      imageIndex: extractedImages.length + 1,
      width: imageObject.width,
      height: imageObject.height,
      mimeType: "image/png",
      data: base64,
    });
  }

  return extractedImages
    .sort((left, right) => right.width * right.height - left.width * left.height)
    .slice(0, 6);
}

async function resolveImageObject(page, candidate) {
  if (candidate?.data && candidate.width && candidate.height) {
    return candidate;
  }

  if (typeof candidate !== "string") {
    return null;
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(null);
    }, 3000);

    try {
      page.objs.get(candidate, (resolvedObject) => {
        window.clearTimeout(timeoutId);
        resolve(resolvedObject || null);
      });
    } catch {
      window.clearTimeout(timeoutId);
      resolve(null);
    }
  });
}

function isUsefulImageCandidate(width, height) {
  return width * height >= 25000 && Math.max(width, height) >= 120;
}

function normalizeToRgba(data, width, height) {
  const pixelCount = width * height;
  const input = data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data);

  if (input.length === pixelCount * 4) {
    return input;
  }

  if (input.length === pixelCount * 3) {
    const output = new Uint8ClampedArray(pixelCount * 4);

    for (let source = 0, target = 0; source < input.length; source += 3, target += 4) {
      output[target] = input[source];
      output[target + 1] = input[source + 1];
      output[target + 2] = input[source + 2];
      output[target + 3] = 255;
    }

    return output;
  }

  if (input.length === pixelCount) {
    const output = new Uint8ClampedArray(pixelCount * 4);

    for (let source = 0, target = 0; source < input.length; source += 1, target += 4) {
      const value = input[source];
      output[target] = value;
      output[target + 1] = value;
      output[target + 2] = value;
      output[target + 3] = 255;
    }

    return output;
  }

  return null;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("PDFの読み込みに失敗しました。"));
    };

    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (!reader.result) {
        reject(new Error("PDFの読み込みに失敗しました。"));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("PDFの読み込みに失敗しました。"));
    };

    reader.readAsArrayBuffer(file);
  });
}
