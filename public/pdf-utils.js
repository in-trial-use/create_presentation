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

  // CTM(Current Transformation Matrix)追跡 
  // PDFの描画は全て現在座標系で行われるがこれがtransformオペレータが呼ばれるたびに変換されるのでどう変換されていったかを追跡する
  // この追跡によって結果として最終的なページ座標系のどこに図があるかをbboxから求めることができる よってそこをクロップする
  let ctm = [1, 0, 0, 1, 0, 0];
  const ctmStack = [];

  function multiplyMatrix(a, b) {
    return [
      a[0]*b[0] + a[2]*b[1], a[1]*b[0] + a[3]*b[1],
      a[0]*b[2] + a[2]*b[3], a[1]*b[2] + a[3]*b[3],
      a[0]*b[4] + a[2]*b[5] + a[4], a[1]*b[4] + a[3]*b[5] + a[5],
    ];
  }

  let depth = 0;
  let renderedPageCanvas = null; //同じページに複数のForm XObjectがあった場合でも、レンダリングは結果を記録しておけば一回で済む
  for (let index = 0; index < operatorList.fnArray.length; index += 1) {

    const fn = operatorList.fnArray[index];

    if (fn === ops.save) { ctmStack.push([...ctm]); continue; }
    if (fn === ops.restore) { if (ctmStack.length) ctm = ctmStack.pop(); continue; }
    if (fn === ops.transform) { ctm = multiplyMatrix(ctm, operatorList.argsArray[index]); continue; }

    if (fn == ops.paintFormXObjectBegin){
      // いくつかの図で一部しか取れないと言う問題があった。これは PDF では Form XObject と呼ばれる形式があることが原因だった
      // 直接 PDF のどこに図があるかを特定してクロップすることで一部しか取れなかった図の全体をとることを可能にした
      // matrix と bbox を取得してクロップ処理
      depth++;
      if(depth === 1){
        const args = operatorList.argsArray[index];
        const xObjectData = operatorList.argsArray[index - 1]?.[0];
        const bbox = args?.[1] ?? xObjectData?.bbox;
        const matrix = args?.[0] ?? xObjectData?.matrix ?? [1, 0, 0, 1, 0, 0];
        if (!bbox) continue;

        // Form XObject 内の paintImageXObject をカウント
        let innerImageCount = 0;
        let innerImageIndex = -1;
        let innerDepth = 1;
        for (let j = index + 1; j < operatorList.fnArray.length; j++) {
          const innerFn = operatorList.fnArray[j];
          if (innerFn === ops.paintFormXObjectBegin) { innerDepth++; continue; }
          if (innerFn === ops.paintFormXObjectEnd) {
            innerDepth--;
            if (innerDepth === 0) break;
            continue;
          }
          if (innerDepth === 1 && targetOps.includes(innerFn)) {
            innerImageCount++;
            innerImageIndex = j;
          }
        }

        if (innerImageCount === 1) {
          // 単純な図：中の画像を直接使う
          const candidate = operatorList.argsArray[innerImageIndex]?.[0];
          const imageObject = await resolveImageObject(page, candidate);
          if (imageObject?.data && imageObject.width && imageObject.height && isUsefulImageCandidate(imageObject.width, imageObject.height)) {
            const rgbaData = normalizeToRgba(imageObject.data, imageObject.width, imageObject.height);
            if (rgbaData) {
              const canvas = document.createElement("canvas");
              canvas.width = imageObject.width;
              canvas.height = imageObject.height;
              canvas.getContext("2d").putImageData(new ImageData(rgbaData, imageObject.width, imageObject.height), 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              extractedImages.push({
                imageIndex: extractedImages.length + 1,
                width: imageObject.width,
                height: imageObject.height,
                mimeType: "image/png",
                data: dataUrl.split(",")[1],
              });
            }
          }
        } else {
          // 複合図またはベクター：bbox クロップ
          const m = multiplyMatrix(ctm, matrix);
          let x1_page = bbox[0] * m[0] + bbox[1] * m[2] + m[4];
          let y1_page = bbox[0] * m[1] + bbox[1] * m[3] + m[5];
          let x2_page = bbox[2] * m[0] + bbox[3] * m[2] + m[4];
          let y2_page = bbox[2] * m[1] + bbox[3] * m[3] + m[5];
          let x_max = Math.max(x1_page, x2_page), y_max = Math.max(y1_page, y2_page);
          let x_min = Math.min(x1_page, x2_page), y_min = Math.min(y1_page, y2_page);
          if (!isUsefulImageCandidate(x_max - x_min, y_max - y_min)) continue;

          if (!renderedPageCanvas) {
            const viewport = page.getViewport({ scale: 3 });
            renderedPageCanvas = document.createElement("canvas");
            renderedPageCanvas.width = viewport.width;
            renderedPageCanvas.height = viewport.height;
            await page.render({ canvasContext: renderedPageCanvas.getContext("2d"), viewport }).promise;
          }
          const pageHeight = renderedPageCanvas.height / 3;

          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = Math.round((x_max - x_min) * 3);
          cropCanvas.height = Math.round((y_max - y_min) * 3);
          cropCanvas.getContext("2d").drawImage(
            renderedPageCanvas,
            x_min * 3, (pageHeight - y_max) * 3,
            cropCanvas.width, cropCanvas.height,
            0, 0, cropCanvas.width, cropCanvas.height,
          );
          const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.85);
          extractedImages.push({
            imageIndex: extractedImages.length + 1,
            width: cropCanvas.width,
            height: cropCanvas.height,
            mimeType: "image/jpeg",
            data: dataUrl.split(",")[1],
          });
        }
      }
      continue;
    }
    if (fn === ops.paintFormXObjectEnd){
      depth--;
      continue;
    }
    // depth > 0 なら Form XObject の中なのでスキップ
    if (depth > 0) continue;


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
