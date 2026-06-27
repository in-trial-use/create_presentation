const path = require("path");

function sanitizeDataBasePath(rawPath) {
  const normalizedPath = String(rawPath || "")
    .normalize("NFKC")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  if (!normalizedPath) {
    return "";
  }

  const parts = normalizedPath.split("/");
  const safeParts = [];

  for (const part of parts) {
    const safePart = part
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[:*?"<>|]/g, "")
      .replace(/[^\p{L}\p{N}_-]/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!safePart || safePart === "." || safePart === "..") {
      continue;
    }

    safeParts.push(safePart);
  }

  return safeParts.join("/");
}

function sanitizeDataRelativeFilePath(rawPath, { defaultFileName }) {
  const normalizedPath = String(rawPath || "")
    .normalize("NFKC")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  if (!normalizedPath) {
    return "";
  }

  const rawParts = normalizedPath.split("/");
  const safeParts = rawParts
    .map((part) =>
      part
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[:*?"<>|]/g, "")
        .replace(/[^\p{L}\p{N}_./-]/gu, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter((part) => part && part !== "." && part !== "..");

  if (safeParts.length === 0) {
    return "";
  }

  const lastPart = safeParts[safeParts.length - 1];

  if (!path.posix.extname(lastPart)) {
    safeParts.push(defaultFileName);
  }

  return safeParts.join("/");
}

function resolveDataSubdir(dataDir, baseName) {
  const targetDir = path.resolve(dataDir, baseName);
  const dataRoot = path.resolve(dataDir);

  if (targetDir !== dataRoot && !targetDir.startsWith(`${dataRoot}${path.sep}`)) {
    const error = new Error("保存先がdataディレクトリ外を指しています。");
    error.statusCode = 400;
    throw error;
  }

  return targetDir;
}

function resolveDataFilePath(dataDir, relativeFilePath) {
  const filePath = path.resolve(dataDir, relativeFilePath);
  const dataRoot = path.resolve(dataDir);

  if (!filePath.startsWith(`${dataRoot}${path.sep}`)) {
    const error = new Error("保存先がdataディレクトリ外を指しています。");
    error.statusCode = 400;
    throw error;
  }

  return filePath;
}

module.exports = {
  sanitizeDataBasePath,
  sanitizeDataRelativeFilePath,
  resolveDataSubdir,
  resolveDataFilePath,
};
