const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const projectRoot = "/app";
const docsDir = path.join(projectRoot, "docs");

const CHECK_EXTERNAL = process.argv.includes("--check-external");

const REGULATORY_DOMAINS = [
  "fda.gov",
  "ema.europa.eu",
  "cdisc.org",
  "nih.gov",
  "loinc.org"
];

function isWhitelisted(hostname) {
  return REGULATORY_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith("." + domain)
  );
}

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

const externalLinksToCheck = [];

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

// Normalize a link to an absolute filesystem path or return an object if it should be checked externally
function normalizeLink(link, currentFilePath) {
  if (link.startsWith("#")) return null;

  // Ignore external web links unless flag is passed and domain is whitelisted
  if (/^(https?):/i.test(link)) {
    if (CHECK_EXTERNAL) {
      try {
        const urlObj = new URL(link);
        if (isWhitelisted(urlObj.hostname)) {
          return { type: "external", url: link };
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    }
    return null;
  }
  
  if (/^(mailto|ftp):/i.test(link)) {
    return null;
  }

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
    return { type: "local", path: cleanLink };
  } else {
    // Resolve relative to the file we found it in
    return { type: "local", path: path.resolve(path.dirname(currentFilePath), cleanLink) };
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
    const resolved = normalizeLink(rawLink, filePath);
    if (!resolved) {
      continue;
    }

    totalLinksCount++;

    if (resolved.type === "external") {
      externalLinksToCheck.push({ url: resolved.url, relativePath, rawLink });
    } else if (resolved.type === "local") {
      const resolvedPath = resolved.path;
      if (!fs.existsSync(resolvedPath)) {
        brokenLinksCount++;
        const resolvedRelative = path.relative(projectRoot, resolvedPath).replace(/\\/g, '/');
        fail(
          `Broken link in "${relativePath}": "${rawLink}" (Resolved to: "${resolvedRelative}")`
        );
      }
    }
  }
}

function checkExternalUrl(urlStr, retries = 3) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const req = client.request(parsedUrl, { 
      method: "GET", 
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Node.js) DocumentationValidator/1.0"
      }
    }, (res) => {
      res.resume(); // Free memory
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        retry();
      }
    });

    req.on("error", retry);
    req.on("timeout", () => {
      req.destroy();
      retry();
    });
    
    req.end();

    function retry() {
      if (retries > 0) {
        resolve(checkExternalUrl(urlStr, retries - 1));
      } else {
        resolve(false);
      }
    }
  });
}

// ---------------------- Main Execution ----------------------
async function main() {
  info("Starting markdown documentation link validation...");

  // Find all documentation files
  const srcDir = path.join(projectRoot, "src");
  const markdownFiles = [
    ...findMarkdownFiles(docsDir),
    ...findMarkdownFiles(srcDir)
  ];
  const rootReadme = path.join(projectRoot, "README.md");

  if (fs.existsSync(rootReadme)) {
    markdownFiles.push(rootReadme);
  }

  // Validate each file
  for (const file of markdownFiles) {
    validateFile(file);
  }

  if (externalLinksToCheck.length > 0) {
    info(`Validating ${externalLinksToCheck.length} external regulatory links...`);
    await Promise.all(
      externalLinksToCheck.map(async ({ url, relativePath, rawLink }) => {
        const isAlive = await checkExternalUrl(url, 3);
        if (!isAlive) {
          brokenLinksCount++;
          fail(`Broken external link in "${relativePath}": "${rawLink}"`);
        }
      })
    );
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
    process.exit(0);
  }
}

main();
