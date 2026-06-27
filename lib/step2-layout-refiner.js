const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const {
  buildStep2LayoutJudgePrompt,
  buildStep2LayoutCorrectionPrompt,
} = require("../prompts/build-step2-layout-prompt");

async function refineStep2MarkdownWithLayoutLoop({
  apiKey,
  model,
  markdown,
  sourcePdfBase64,
  sourceFileName,
  rootDir,
  generateText,
  normalizeMarkdown,
  stripMarkdownCodeFence,
  artifactDir = "",
  maxAttempts = 3,
}) {
  let currentMarkdown = normalizeMarkdown(markdown);
  const attempts = [];
  const trace = [];

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const attemptTrace = {
      attempt: attemptNumber,
      inputMarkdown: currentMarkdown,
    };
    const renderResult = await renderMarpMarkdownToPdf(currentMarkdown, {
      label: `step2-layout-${attemptNumber}`,
      rootDir,
    });
    const pdfBase64 = fs.readFileSync(renderResult.pdfPath).toString("base64");
    const pdfStats = fs.statSync(renderResult.pdfPath);
    const artifacts = artifactDir
      ? saveAttemptArtifacts({
          attemptNumber,
          artifactDir,
          renderResult,
          rootDir,
        })
      : null;
    attemptTrace.render = {
      outputPdfBytes: pdfStats.size,
      artifacts,
    };
    const localIssues = detectLocalLayoutIssues({
      markdown: currentMarkdown,
    });
    attemptTrace.localCheck = {
      input: {
        markdown: currentMarkdown,
      },
      output: {
        issues: localIssues,
      },
    };
    const judge = await judgeRenderedSlideLayout({
      apiKey,
      model,
      markdown: currentMarkdown,
      renderedPdfBase64: pdfBase64,
      localIssues,
      attemptNumber,
      generateText,
      stripMarkdownCodeFence,
    });
    attemptTrace.judge = {
      input: {
        prompt: judge.prompt,
        renderedPdfBytes: pdfStats.size,
        localIssues,
      },
      output: {
        raw: judge.rawOutput,
        parsed: judge.parsed,
      },
    };
    const mergedIssues = mergeLayoutIssues(localIssues, judge.issues);
    const ok = Boolean(judge.ok) && mergedIssues.length === 0;
    attemptTrace.result = {
      ok,
      mergedIssues,
      judgeSummary: judge.summary || "",
    };

    attempts.push({
      attempt: attemptNumber,
      ok,
      issues: mergedIssues,
      judgeSummary: judge.summary || "",
    });
    trace.push(attemptTrace);

    cleanupTempDir(renderResult.workDir, { rootDir });

    if (ok) {
      return {
        markdown: currentMarkdown,
        validation: {
          ok: true,
          attempts,
        },
        trace,
      };
    }

    if (attemptNumber === maxAttempts) {
      return {
        markdown: currentMarkdown,
        validation: {
          ok: false,
          attempts,
          warning: "レイアウト自動修正の上限回数に達しました。Markdownは返しますが、手動確認を推奨します。",
        },
        trace,
      };
    }

    const correction = await generateCorrectedStep2Markdown({
      apiKey,
      model,
      currentMarkdown,
      renderedPdfBase64: pdfBase64,
      sourcePdfBase64,
      sourceFileName,
      issues: mergedIssues,
      attemptNumber,
      generateText,
    });
    attemptTrace.correction = {
      input: {
        prompt: correction.prompt,
        issues: mergedIssues,
        currentMarkdown,
      },
      output: {
        markdown: correction.output,
      },
    };
    currentMarkdown = normalizeMarkdown(correction.output);
  }

  return {
    markdown: currentMarkdown,
    validation: {
      ok: false,
      attempts,
      warning: "レイアウト検証が完了しませんでした。",
    },
    trace,
  };
}

async function renderMarpMarkdownToPdf(markdown, { label, rootDir }) {
  const workRoot = path.join(rootDir, ".step2-layout-work");
  fs.mkdirSync(workRoot, { recursive: true });
  const workDir = fs.mkdtempSync(path.join(workRoot, `${label}-`));
  const markdownPath = path.join(workDir, "slides.md");
  const pdfPath = path.join(workDir, "slides.pdf");
  fs.writeFileSync(markdownPath, markdown, "utf8");

  const args = [
    "--prefix",
    rootDir,
    "marp",
    markdownPath,
    "--theme-set",
    path.join(rootDir, "themes", "kaira.css"),
    "--allow-local-files",
    "--pdf",
    "-o",
    pdfPath,
  ];

  await runCommand("npx", args, {
    cwd: rootDir,
    env: buildMarpEnv(workDir),
    timeoutMs: 60_000,
  });

  return {
    workDir,
    markdownPath,
    pdfPath,
  };
}

function saveAttemptArtifacts({ attemptNumber, artifactDir, renderResult, rootDir }) {
  fs.mkdirSync(artifactDir, { recursive: true });

  const markdownPath = path.join(artifactDir, `step2_${attemptNumber}.md`);
  const pdfPath = path.join(artifactDir, `step2_${attemptNumber}.pdf`);

  fs.copyFileSync(renderResult.markdownPath, markdownPath);
  fs.copyFileSync(renderResult.pdfPath, pdfPath);

  return {
    markdownPath: path.relative(rootDir, markdownPath),
    pdfPath: path.relative(rootDir, pdfPath),
  };
}

function buildMarpEnv(workDir) {
  const env = {
    ...process.env,
    HOME: workDir,
    TMPDIR: workDir,
    XDG_RUNTIME_DIR: workDir,
  };

  if (!env.CHROME_PATH) {
    for (const chromePath of ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"]) {
      if (fs.existsSync(chromePath)) {
        env.CHROME_PATH = chromePath;
        break;
      }
    }
  }

  return env;
}

function detectLocalLayoutIssues({ markdown }) {
  const issues = [];
  const htmlMathMatches = markdown.match(/<[^>]+>[^<]*(?:\\\(|\\\[|\$\$)[\s\S]*?<\/[^>]+>/g);

  if (htmlMathMatches && htmlMathMatches.length > 0) {
    issues.push({
      severity: "error",
      type: "math_inside_html",
      message: "HTMLブロック内に数式記法が含まれています。Marp/KaTeXで崩れやすいため、Markdown本文へ出してください。",
    });
  }

  const slideBodies = splitMarpSlides(markdown).slice(1);
  slideBodies.forEach((slide, index) => {
    const plain = slide
      .replace(/```[\s\S]*?```/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\$\$[\s\S]*?\$\$/g, " ")
      .replace(/\$[^$]+\$/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const bulletCount = (slide.match(/^\s*[-*+]\s+/gm) || []).length;
    const longLineCount = slide.split(/\r?\n/).filter((line) => line.trim().length > 80).length;

    if (plain.length > 650 || bulletCount > 8 || longLineCount > 4) {
      issues.push({
        severity: "warning",
        type: "dense_slide",
        slide: index + 2,
        message: `スライド${index + 2}は情報量が多く、見切れや過密の可能性があります。必要なら分割してください。`,
      });
    }
  });

  return issues;
}

async function judgeRenderedSlideLayout({
  apiKey,
  model,
  markdown,
  renderedPdfBase64,
  localIssues,
  attemptNumber,
  generateText,
  stripMarkdownCodeFence,
}) {
  const prompt = buildStep2LayoutJudgePrompt({
    markdown,
    localIssues,
    attemptNumber,
  });

  const output = await generateText({
    apiKey,
    model,
    parts: [
      {
        inline_data: {
          mime_type: "application/pdf",
          data: renderedPdfBase64,
        },
      },
      {
        text: prompt,
      },
    ],
  });

  const parsed = parseJsonObject(stripMarkdownCodeFence(output), {
    ok: false,
    summary: "レイアウト判定JSONを解析できませんでした。",
    issues: [
      {
        severity: "warning",
        type: "judge_parse_failed",
        message: "判定結果のJSON解析に失敗しました。安全側に倒して修正を試みます。",
      },
    ],
  });
  return {
    ...parsed,
    parsed,
    rawOutput: output,
    prompt,
  };
}

async function generateCorrectedStep2Markdown({
  apiKey,
  model,
  currentMarkdown,
  renderedPdfBase64,
  sourcePdfBase64,
  sourceFileName,
  issues,
  attemptNumber,
  generateText,
}) {
  const prompt = buildStep2LayoutCorrectionPrompt({
    currentMarkdown,
    issues,
    attemptNumber,
  });

  const output = await generateText({
    apiKey,
    model,
    parts: [
      {
        inline_data: {
          mime_type: "application/pdf",
          data: renderedPdfBase64,
        },
      },
      {
        inline_data: {
          mime_type: "application/pdf",
          data: sourcePdfBase64,
        },
      },
      {
        text: `元論文PDFファイル名: ${sourceFileName}\n\n${prompt}`,
      },
    ],
  });
  return {
    prompt,
    output,
  };
}

function mergeLayoutIssues(localIssues, judgeIssues) {
  const issues = [];

  for (const issue of [...(localIssues || []), ...(Array.isArray(judgeIssues) ? judgeIssues : [])]) {
    if (!issue) {
      continue;
    }

    const normalized = {
      severity: issue.severity || "warning",
      type: issue.type || "other",
      message: issue.message || String(issue),
    };

    if (issue.slide) {
      normalized.slide = issue.slide;
    }

    const key = `${normalized.severity}:${normalized.type}:${normalized.slide || ""}:${normalized.message}`;
    if (!issues.some((existing) => `${existing.severity}:${existing.type}:${existing.slide || ""}:${existing.message}` === key)) {
      issues.push(normalized);
    }
  }

  return issues;
}

function splitMarpSlides(markdown) {
  return String(markdown || "").split(/\n---\s*\n/g);
}

function parseJsonObject(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return fallback;
      }
    }

    return fallback;
  }
}

function cleanupTempDir(dirPath, { rootDir }) {
  try {
    if (dirPath && dirPath.startsWith(path.join(rootDir, ".step2-layout-work"))) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn("Failed to clean temporary slide layout files:", error.message);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          if (settled) {
            return;
          }
          settled = true;
          child.kill("SIGTERM");
          const error = new Error(`${command} timed out.`);
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }, options.timeoutMs)
      : null;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(`${command} exited with code ${code}: ${stderr || stdout}`);
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

module.exports = {
  refineStep2MarkdownWithLayoutLoop,
};
