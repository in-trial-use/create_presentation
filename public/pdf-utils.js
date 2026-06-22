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
        const tableImages = await extractPageTableImages(page, pdfjsLib.OPS);

        const allImages = [...images];
        for (const tImg of tableImages) {
          allImages.push({ ...tImg, imageIndex: allImages.length + 1 });
        }

        extractedPages.push({
          pageNumber,
          textLines,
          images: allImages,
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

async function extractPageTableImages(page, ops) {
  // 1. ページ上の "Table N" / "表N" キャプションを検出
  const textContent = await page.getTextContent();
  const items = textContent.items.filter((item) => item?.str?.trim());

  const tableCaptions = [];
  for (const item of items) {
    if (/^(table|表)\s*\d+/i.test(item.str.trim())) {
      tableCaptions.push({
        text: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5],
        height: item.height || 12,
      });
    }
  }

  if (tableCaptions.length === 0) return [];

  // 2. operator list から水平罫線を抽出（学術論文の表は booktabs 形式の水平線で構成される）
  // PDF.js の constructPath args 構造:
  //   argsArray[i] = [strokeOp, [Float32Array(pathBuffer)], minMax]
  //   pathBuffer はインターリーブ形式: [DrawOPS, x, y, DrawOPS, x, y, ...]
  //   DrawOPS 定数: moveTo=0, lineTo=1, curveTo=2, quadraticCurveTo=3, closePath=4
  const DRAW_MOVE_TO = 0;
  const DRAW_LINE_TO = 1;
  const DRAW_CURVE_TO = 2;
  const DRAW_QUAD_CURVE_TO = 3;

  const operatorList = await page.getOperatorList();
  const horizontalLines = [];

  let ctm = [1, 0, 0, 1, 0, 0];
  const ctmStack = [];

  function multiplyMatrix(a, b) {
    return [
      a[0]*b[0] + a[2]*b[1], a[1]*b[0] + a[3]*b[1],
      a[0]*b[2] + a[2]*b[3], a[1]*b[2] + a[3]*b[3],
      a[0]*b[4] + a[2]*b[5] + a[4], a[1]*b[4] + a[3]*b[5] + a[5],
    ];
  }

  function transformPoint(x, y) {
    return [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
  }

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];

    if (fn === ops.save) { ctmStack.push([...ctm]); continue; }
    if (fn === ops.restore) { if (ctmStack.length) ctm = ctmStack.pop(); continue; }
    if (fn === ops.transform) { ctm = multiplyMatrix(ctm, operatorList.argsArray[i]); continue; }

    if (fn === ops.constructPath) {
      const pathData = operatorList.argsArray[i]?.[1]?.[0];
      if (!pathData || !pathData.length) continue;

      let ci = 0;
      let curX = 0, curY = 0;

      while (ci < pathData.length) {
        const drawOp = pathData[ci++];

        if (drawOp === DRAW_MOVE_TO) {
          curX = pathData[ci++]; curY = pathData[ci++];
        } else if (drawOp === DRAW_LINE_TO) {
          const lx = pathData[ci++], ly = pathData[ci++];
          const [px1, py1] = transformPoint(curX, curY);
          const [px2, py2] = transformPoint(lx, ly);
          if (Math.abs(py1 - py2) < 2 && Math.abs(px2 - px1) > 50) {
            horizontalLines.push({ x1: Math.min(px1, px2), x2: Math.max(px1, px2), y: (py1 + py2) / 2 });
          }
          curX = lx; curY = ly;
        } else if (drawOp === DRAW_CURVE_TO) {
          ci += 6; curX = pathData[ci - 2]; curY = pathData[ci - 1];
        } else if (drawOp === DRAW_QUAD_CURVE_TO) {
          ci += 4; curX = pathData[ci - 2]; curY = pathData[ci - 1];
        } else {
          // closePath(4) or unknown: no coords consumed
        }
      }
    }
  }

  if (horizontalLines.length === 0) return [];

  // 3. 各テーブルキャプションに対して、近接する水平罫線クラスタから表領域を特定
  const tableRegions = [];

  for (const caption of tableCaptions) {
    // キャプションより下にある罫線を収集（PDF座標系: y減少 = 下方向）
    const candidateLines = horizontalLines.filter(
      (line) => line.y < caption.y + 5 && line.y > caption.y - 500
    );
    if (candidateLines.length < 2) continue;

    // x範囲が類似する罫線をクラスタリング（表の罫線は同じ幅で揃う）
    const clusters = [];
    for (const line of candidateLines) {
      let matched = false;
      for (const cluster of clusters) {
        const ref = cluster[0];
        if (Math.abs(line.x1 - ref.x1) < 30 && Math.abs(line.x2 - ref.x2) < 30) {
          cluster.push(line);
          matched = true;
          break;
        }
      }
      if (!matched) clusters.push([line]);
    }

    // 2本以上の罫線を持つクラスタで、キャプションに最も近いものを選択
    const validClusters = clusters.filter((c) => c.length >= 2);
    if (validClusters.length === 0) continue;

    validClusters.sort((a, b) => {
      const aTop = Math.max(...a.map((l) => l.y));
      const bTop = Math.max(...b.map((l) => l.y));
      return bTop - aTop;
    });

    const best = validClusters[0];
    const padding = 5;
    const x1 = Math.min(...best.map((l) => l.x1)) - padding;
    const x2 = Math.max(...best.map((l) => l.x2)) + padding;
    const yBottom = Math.min(...best.map((l) => l.y)) - padding;
    const yTop = caption.y + caption.height + padding;

    if ((x2 - x1) < 80 || (yTop - yBottom) < 30) continue;
    tableRegions.push({ x1, y1: yBottom, x2, y2: yTop });
  }

  if (tableRegions.length === 0) return [];

  // 4. ページをレンダリングして表領域をクロップ
  const RENDER_SCALE = 3;
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

  const pageHeight = viewport.height / RENDER_SCALE;
  const extractedImages = [];

  for (const region of tableRegions) {
    const width = Math.round((region.x2 - region.x1) * RENDER_SCALE);
    const height = Math.round((region.y2 - region.y1) * RENDER_SCALE);
    if (width < 100 || height < 60) continue;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = width;
    cropCanvas.height = height;
    cropCanvas.getContext("2d").drawImage(
      canvas,
      region.x1 * RENDER_SCALE, (pageHeight - region.y2) * RENDER_SCALE,
      width, height,
      0, 0, width, height,
    );
    const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.85);
    extractedImages.push({
      imageIndex: extractedImages.length + 1,
      width,
      height,
      mimeType: "image/jpeg",
      data: dataUrl.split(",")[1],
    });
  }

  canvas.width = 0;
  canvas.height = 0;
  return extractedImages;
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
