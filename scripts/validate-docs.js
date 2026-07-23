const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { scanMarkdownFiles } = require("./docs-scanner");

const projectRoot = "/app";
const docsDir = path.join(projectRoot, "docs");

const CHECK_EXTERNAL = process.argv.includes("--check-external");

const REGULATORY_DOMAINS = ["fda.gov", "ema.europa.eu", "cdisc.org", "nih.gov", "loinc.org"];

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
let unescapedTagsCount = 0;

const APPROVED_DOCS_FOLDERS = [
  "architecture",
  "specification",
  "compliance",
  "deployment",
  "qa-testing",
  "github",
];

let registryEntries = new Map();
const registryPath = path.join(docsDir, "github", "superseded-registry.md");
if (fs.existsSync(registryPath)) {
  const content = fs.readFileSync(registryPath, "utf8");
  const lines = content.split("\n");
  lines.forEach((line) => {
    if (line.startsWith("|")) {
      const parts = line.split("|").map((s) => s.trim());
      if (parts.length > 2 && parts[1] !== "File Path" && !parts[1].startsWith("---")) {
        registryEntries.set(parts[1], parts[2]);
      }
    }
  });
}

const allowedHtmlTags = new Set([
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
]);

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
      } catch {
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

  try {
    cleanLink = decodeURIComponent(cleanLink);
  } catch {
    // Ignore decode errors
  }

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

function getLineNumber(content, index) {
  return content.substring(0, index).split("\n").length;
}

function validateTags(content, filePath, relativePath) {
  // Strip fenced code blocks and inline code, preserving line numbers by replacing non-newlines with space
  let cleanContent = content.replace(/```[\s\S]*?```/g, (match) => match.replace(/[^\n]/g, " "));
  cleanContent = cleanContent.replace(/`[^`\n]+`/g, (match) => match.replace(/[^\n]/g, " "));

  const tagRegex = /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^>]*)?>/g;
  let match;
  while ((match = tagRegex.exec(cleanContent)) !== null) {
    const fullTag = match[0];
    const tagNameMatch = fullTag.match(/<\/?([A-Za-z][A-Za-z0-9-]*)/);
    if (tagNameMatch) {
      const tagName = tagNameMatch[1].toLowerCase();
      if (!allowedHtmlTags.has(tagName)) {
        unescapedTagsCount++;
        const lineNum = getLineNumber(content, match.index);
        fail(
          `Unescaped XML/HTML tag "${fullTag}" found in "${relativePath}" at line ${lineNum}. Please wrap it in backticks.`
        );
      }
    }
  }
}

function validateFile(filePath) {
  scannedFilesCount++;
  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/");

  if (!fs.existsSync(filePath)) {
    fail(`File does not exist: ${relativePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  validateTags(content, filePath, relativePath);
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
        const resolvedRelative = path.relative(projectRoot, resolvedPath).replace(/\\/g, "/");
        fail(`Broken link in "${relativePath}": "${rawLink}" (Resolved to: "${resolvedRelative}")`);
      }
    }
  }
}

function checkExternalUrl(urlStr, retries = 3) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const req = client.request(
      parsedUrl,
      {
        method: "GET",
        timeout: 5000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Node.js) DocumentationValidator/1.0",
        },
      },
      (res) => {
        res.resume(); // Free memory
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          retry();
        }
      }
    );

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

  // --- OpenAPI Documentation Compilation Check ---
  const apiYamlPath = path.join(docsDir, "specification", "cdisc-library-api.yaml");
  const apiHtmlPath = path.join(docsDir, "specification", "cdisc-library-api.html");

  if (fs.existsSync(apiYamlPath)) {
    if (!fs.existsSync(apiHtmlPath)) {
      fail("Compiled HTML API documentation is missing. Please run `npm run docs:build-api`.");
    } else {
      let isOutOfSync = false;
      try {
        const { execSync } = require("child_process");
        // If there are uncommitted changes to yaml, we check mtime
        const status = execSync(`git status --porcelain "${apiYamlPath}"`).toString().trim();
        if (status) {
          isOutOfSync = fs.statSync(apiYamlPath).mtime > fs.statSync(apiHtmlPath).mtime;
        } else {
          // compare git commit times
          const yamlTimeStr = execSync(`git log -1 --format="%ct" -- "${apiYamlPath}"`)
            .toString()
            .trim();
          const htmlTimeStr = execSync(`git log -1 --format="%ct" -- "${apiHtmlPath}"`)
            .toString()
            .trim();

          if (yamlTimeStr && htmlTimeStr) {
            isOutOfSync = parseInt(yamlTimeStr, 10) > parseInt(htmlTimeStr, 10);
          } else {
            // fallback if not in git (e.g., zip download)
            isOutOfSync = fs.statSync(apiYamlPath).mtime > fs.statSync(apiHtmlPath).mtime;
          }
        }
      } catch {
        // Fallback to mtime if git fails
        isOutOfSync = fs.statSync(apiYamlPath).mtime > fs.statSync(apiHtmlPath).mtime;
      }

      if (isOutOfSync) {
        fail(
          "Compiled HTML API documentation is out of sync with the source YAML. Please run `npm run docs:build-api`."
        );
      }
    }
  }
  // -----------------------------------------------

  // Find all documentation files
  const markdownFiles = scanMarkdownFiles(projectRoot);

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

  // Report results
  const totalErrors =
    brokenLinksCount + outOfBoundsCount + supersededErrorsCount + unescapedTagsCount;
  if (totalErrors > 0 || process.exitCode === 1) {
    fail(
      `Documentation validation FAILED. Scanned ${scannedFilesCount} files, checked ${totalLinksCount} links. Errors found: ${brokenLinksCount} broken link(s), ${outOfBoundsCount} out-of-bounds file(s), ${supersededErrorsCount} superseded rule violation(s), ${unescapedTagsCount} unescaped tag(s).`
    );
    process.exit(1);
  } else {
    success(
      `Documentation validation PASSED. Scanned ${scannedFilesCount} files, successfully checked ${totalLinksCount} links and verified all markdown formatting.`
    );
    process.exit(0);
  }
}

main();
