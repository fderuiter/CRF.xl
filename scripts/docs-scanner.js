const fs = require("fs");
const path = require("path");

function parseIgnorePattern(pattern) {
  pattern = pattern.trim();
  if (!pattern || pattern.startsWith("#")) {
    return null;
  }

  const isDirectoryOnly = pattern.endsWith("/");
  if (isDirectoryOnly) {
    pattern = pattern.slice(0, -1);
  }

  const hasSlash = pattern.includes("/");

  let regexStr = "";
  let i = 0;
  while (i < pattern.length) {
    if (pattern.slice(i, i + 3) === "/**") {
      regexStr += "(?:/.*)?";
      i += 3;
    } else if (pattern.slice(i, i + 4) === "**/") {
      regexStr += "(?:.*/)?";
      i += 4;
    } else if (pattern.slice(i, i + 2) === "**") {
      regexStr += ".*";
      i += 2;
    } else if (pattern[i] === "*") {
      regexStr += "[^/]*";
      i += 1;
    } else if (pattern[i] === "?") {
      regexStr += "[^/]";
      i += 1;
    } else {
      const char = pattern[i];
      if ("-\\/^$*+?.()|[]{}".includes(char)) {
        regexStr += "\\" + char;
      } else {
        regexStr += char;
      }
      i += 1;
    }
  }

  let matchFromStart = false;
  if (pattern.startsWith("/")) {
    pattern = pattern.slice(1);
    matchFromStart = true;
  } else if (hasSlash) {
    matchFromStart = true;
  }

  if (matchFromStart) {
    regexStr = "^" + regexStr + "($|/.*)";
  } else {
    regexStr = "(^|/)" + regexStr + "($|/.*)";
  }

  const regex = new RegExp(regexStr);

  return {
    pattern,
    isDirectoryOnly,
    regex,
  };
}

function loadDocsignore(projectRoot) {
  const ignoreFilePath = path.join(projectRoot, ".docsignore");
  const patterns = ["node_modules/"];

  if (fs.existsSync(ignoreFilePath)) {
    const content = fs.readFileSync(ignoreFilePath, "utf8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        patterns.push(trimmed);
      }
    }
  }

  const parsedPatterns = [];
  for (const pattern of patterns) {
    const parsed = parseIgnorePattern(pattern);
    if (parsed) {
      parsedPatterns.push(parsed);
    }
  }
  return parsedPatterns;
}

function isIgnored(relativePath, isDir, parsedPatterns) {
  // 1. Direct match
  for (const { isDirectoryOnly, regex } of parsedPatterns) {
    if (isDirectoryOnly) {
      if (isDir && regex.test(relativePath)) {
        return true;
      }
    } else {
      if (regex.test(relativePath)) {
        return true;
      }
    }
  }

  // 2. Parent directory match (only if this is a file)
  if (!isDir) {
    const parts = relativePath.split("/");
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join("/");
      if (isIgnored(parentPath, true, parsedPatterns)) {
        return true;
      }
    }
  }

  return false;
}

function scanMarkdownFiles(projectRoot) {
  const parsedPatterns = loadDocsignore(projectRoot);

  function findMarkdownFilesRecursive(dir, filesList = []) {
    if (!fs.existsSync(dir)) {
      return filesList;
    }
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/");

      if (stat.isDirectory()) {
        const ignored = isIgnored(relativePath, true, parsedPatterns);
        if (!ignored) {
          findMarkdownFilesRecursive(filePath, filesList);
        }
      } else if (filePath.endsWith(".md")) {
        const ignored = isIgnored(relativePath, false, parsedPatterns);
        if (!ignored) {
          filesList.push(filePath);
        }
      }
    }
    return filesList;
  }

  const docsDir = path.join(projectRoot, "docs");
  const srcDir = path.join(projectRoot, "src");

  const filesList = [];

  if (fs.existsSync(docsDir)) {
    const relDocs = path.relative(projectRoot, docsDir).replace(/\\/g, "/");
    if (!isIgnored(relDocs, true, parsedPatterns)) {
      findMarkdownFilesRecursive(docsDir, filesList);
    }
  }

  if (fs.existsSync(srcDir)) {
    const relSrc = path.relative(projectRoot, srcDir).replace(/\\/g, "/");
    if (!isIgnored(relSrc, true, parsedPatterns)) {
      findMarkdownFilesRecursive(srcDir, filesList);
    }
  }

  const rootReadme = path.join(projectRoot, "README.md");
  if (fs.existsSync(rootReadme)) {
    const relReadme = path.relative(projectRoot, rootReadme).replace(/\\/g, "/");
    if (!isIgnored(relReadme, false, parsedPatterns)) {
      filesList.push(rootReadme);
    }
  }

  return filesList;
}

module.exports = {
  scanMarkdownFiles,
  parseIgnorePattern,
  loadDocsignore,
  isIgnored,
};
