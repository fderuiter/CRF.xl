const fs = require("fs");
const path = require("path");

const projectRoot = "/app";
const docsDir = path.join(projectRoot, "docs");

let scannedFilesCount = 0;
let totalLinksCount = 0;
let brokenLinksCount = 0;
let outOfBoundsCount = 0;
let supersededErrorsCount = 0;

const APPROVED_DOCS_FOLDERS = ["architecture", "specification", "compliance", "deployment", "qa-testing", "github"];

let registryEntries = new Map();
const registryPath = path.join(docsDir, "github", "superseded-registry.md");
if (fs.existsSync(registryPath)) {
  const content = fs.readFileSync(registryPath, "utf8");
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.startsWith('|')) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length > 2 && parts[1] !== 'File Path' && !parts[1].startsWith('---')) {
        registryEntries.set(parts[1], parts[2]);
      }
    }
  });
}

function fail(message) {
  console.error(`\x1b[31m[ERROR] ${message}\x1b[0m`);
  process.exitCode = 1;
}

function success(message) {
  console.log(`\x1b[32m[SUCCESS] ${message}\x1b[0m`);
}

function info(message) {
  console.log(`[INFO] ${message}`);
}

function findMarkdownFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) {
    return filesList;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, filesList);
    } else if (filePath.endsWith(".md")) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

function extractLinks(content) {
  let cleanContent = content.replace(/```[\s\S]*?```/g, "");
  cleanContent = cleanContent.replace(/`[^`\n]+`/g, "");

  const links = [];
  let match;

  const inlineRegex = /!?\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = inlineRegex.exec(cleanContent)) !== null) {
    const url = match[2].trim();
    const titleMatch = url.match(/^([^\s"']+)(?:\s+["'].*?["'])?$/);
    const cleanUrl = titleMatch ? titleMatch[1] : url;
    links.push(cleanUrl);
  }

  const refRegex = /^\s*\[([^\]]+)\]:\s*(\S+)/gm;
  while ((match = refRegex.exec(cleanContent)) !== null) {
    links.push(match[2].trim());
  }

  return links;
}

function normalizeLink(link, currentFilePath) {
  if (/^(https?|mailto|ftp):/i.test(link)) return null;
  if (link.startsWith("#")) return null;

  const hashIndex = link.indexOf("#");
  let cleanLink = hashIndex !== -1 ? link.slice(0, hashIndex) : link;
  if (!cleanLink) return null;

  try { cleanLink = decodeURIComponent(cleanLink); } catch (e) {}

  if (cleanLink.startsWith("file://")) {
    cleanLink = cleanLink.slice(7);
  }

  const crfIndex = cleanLink.indexOf("CRF.xl");
  if (crfIndex !== -1) {
    const suffix = cleanLink.slice(crfIndex + 6);
    cleanLink = path.join(projectRoot, suffix);
  }

  if (path.isAbsolute(cleanLink)) {
    return cleanLink;
  } else {
    return path.resolve(path.dirname(currentFilePath), cleanLink);
  }
}

function checkFolderBoundaries(relativePath) {
  if (relativePath.startsWith("docs/")) {
    const parts = relativePath.split("/");
    if (parts.length === 2 && parts[1] !== "README.md") {
      fail(`Out-of-bounds file in docs root: ${relativePath}`);
      outOfBoundsCount++;
    } else if (parts.length > 2) {
      const topLevelFolder = parts[1];
      if (!APPROVED_DOCS_FOLDERS.includes(topLevelFolder)) {
        fail(`Unapproved top-level docs folder: ${relativePath}`);
        outOfBoundsCount++;
      }
    }
  }
}

function checkSuperseded(relativePath, content) {
  let cleanContent = content.replace(/```[\s\S]*?```/g, "");
  cleanContent = cleanContent.replace(/`[^`\n]+`/g, "");

  const isSupersededDir = relativePath.includes("/superseded/");
  const isSupersededStatus = cleanContent.includes("**Status:** Superseded");

  if (isSupersededStatus && !isSupersededDir) {
    fail(`Retired document not in a superseded directory: ${relativePath}`);
    supersededErrorsCount++;
  }
  
  if (isSupersededDir) {
    if (!isSupersededStatus) {
      fail(`File in superseded directory missing warning banner: ${relativePath}`);
      supersededErrorsCount++;
    } else {
      const replacedByRegex = /\*\*Replaced by:\*\*\s*(.+)/;
      const match = replacedByRegex.exec(cleanContent);
      if (!match) {
        fail(`Superseded file missing 'Replaced by:' in banner: ${relativePath}`);
        supersededErrorsCount++;
      }
      
      if (!registryEntries.has(relativePath)) {
        fail(`Superseded file not registered in central registry: ${relativePath}`);
        supersededErrorsCount++;
      }
    }
  }
}

function validateFile(filePath) {
  scannedFilesCount++;
  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  
  if (!fs.existsSync(filePath)) {
    fail(`File does not exist: ${relativePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  checkFolderBoundaries(relativePath);
  checkSuperseded(relativePath, content);

  const rawLinks = extractLinks(content);
  for (const rawLink of rawLinks) {
    const resolvedPath = normalizeLink(rawLink, filePath);
    if (!resolvedPath) continue;
    
    totalLinksCount++;
    if (!fs.existsSync(resolvedPath)) {
      brokenLinksCount++;
      const resolvedRelative = path.relative(projectRoot, resolvedPath).replace(/\\/g, '/');
      fail(`Broken link in "${relativePath}": "${rawLink}" (Resolved to: "${resolvedRelative}")`);
    }
  }
}

info("Starting markdown documentation link validation...");

const srcDir = path.join(projectRoot, "src");
const markdownFiles = [
  ...findMarkdownFiles(docsDir),
  ...findMarkdownFiles(srcDir)
];
const rootReadme = path.join(projectRoot, "README.md");

if (fs.existsSync(rootReadme)) {
  markdownFiles.push(rootReadme);
}

for (const file of markdownFiles) {
  validateFile(file);
}

const totalErrors = brokenLinksCount + outOfBoundsCount + supersededErrorsCount;
if (totalErrors > 0) {
  fail(
    `Documentation validation FAILED. Scanned ${scannedFilesCount} files. Errors found: ${brokenLinksCount} broken link(s), ${outOfBoundsCount} out-of-bounds file(s), ${supersededErrorsCount} superseded rule violation(s).`
  );
  process.exit(1);
} else {
  success(
    `Documentation validation PASSED. Scanned ${scannedFilesCount} files, successfully checked ${totalLinksCount} links.`
  );
}
