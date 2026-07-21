const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const docsDir = path.join(projectRoot, "docs");

let scannedFilesCount = 0;
let totalLinksCount = 0;
let brokenLinksCount = 0;
let unescapedTagsCount = 0;

const allowedHtmlTags = new Set([
  "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map", "mark", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "slot", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr"
]);

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

// Recursively find all markdown files
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

// Extract links from markdown content, stripping code blocks
function extractLinks(content) {
  // Strip fenced code blocks to prevent validating links inside code samples
  let cleanContent = content.replace(/```[\s\S]*?```/g, "");
  // Strip inline code blocks
  cleanContent = cleanContent.replace(/`[^`\n]+`/g, "");

  const links = [];
  let match;

  // 1. Match inline links/images: [text](url) or ![alt](url)
  const inlineRegex = /!?\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = inlineRegex.exec(cleanContent)) !== null) {
    const url = match[2].trim();
    // Strip optional title from markdown link: [text](url "title") or [text](url 'title')
    const titleMatch = url.match(/^([^\s"']+)(?:\s+["'].*?["'])?$/);
    const cleanUrl = titleMatch ? titleMatch[1] : url;
    links.push(cleanUrl);
  }

  // 2. Match reference definitions at the bottom: [ref]: url
  const refRegex = /^\s*\[([^\]]+)\]:\s*(\S+)/gm;
  while ((match = refRegex.exec(cleanContent)) !== null) {
    links.push(match[2].trim());
  }

  return links;
}

// Normalize a link to an absolute filesystem path or return null if it should be skipped
function normalizeLink(link, currentFilePath) {
  // Ignore external web links, email links, and protocols
  if (/^(https?|mailto|ftp):/i.test(link)) {
    return null;
  }

  // Ignore page-local anchor links (e.g. #some-header)
  if (link.startsWith("#")) {
    return null;
  }

  // Strip fragment selectors (e.g., file.md#section-name -> file.md)
  const hashIndex = link.indexOf("#");
  let cleanLink = hashIndex !== -1 ? link.slice(0, hashIndex) : link;

  if (!cleanLink) {
    return null;
  }

  // Decode URI components (e.g., %20 -> space)
  try {
    cleanLink = decodeURIComponent(cleanLink);
  } catch (e) {
    // Ignore decode errors
  }

  // Strip system-specific file:/// prefix
  if (cleanLink.startsWith("file://")) {
    cleanLink = cleanLink.slice(7);
  }

  // Handle system-specific absolute paths ending in CRF.xl (or containing CRF.xl)
  const crfIndex = cleanLink.indexOf("CRF.xl");
  if (crfIndex !== -1) {
    const suffix = cleanLink.slice(crfIndex + 6); // Skip "CRF.xl"
    cleanLink = path.join(projectRoot, suffix);
  }

  // Resolve absolute vs relative paths
  if (path.isAbsolute(cleanLink)) {
    return cleanLink;
  } else {
    // Resolve relative to the file we found it in
    return path.resolve(path.dirname(currentFilePath), cleanLink);
  }
}

function getLineNumber(content, index) {
  return content.substring(0, index).split("\n").length;
}

function validateTags(content, filePath, relativePath) {
  // Strip fenced code blocks and inline code, preserving line numbers by replacing non-newlines with space
  let cleanContent = content.replace(/```[\s\S]*?```/g, match => match.replace(/[^\n]/g, " "));
  cleanContent = cleanContent.replace(/`[^`\n]+`/g, match => match.replace(/[^\n]/g, " "));

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
        fail(`Unescaped XML/HTML tag "${fullTag}" found in "${relativePath}" at line ${lineNum}. Please wrap it in backticks.`);
      }
    }
  }
}

function validateFile(filePath) {
  scannedFilesCount++;
  const relativePath = path.relative(projectRoot, filePath);
  
  if (!fs.existsSync(filePath)) {
    fail(`File does not exist: ${relativePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  
  validateTags(content, filePath, relativePath);

  const rawLinks = extractLinks(content);

  for (const rawLink of rawLinks) {
    const resolvedPath = normalizeLink(rawLink, filePath);
    if (!resolvedPath) {
      continue;
    }

    totalLinksCount++;

    if (!fs.existsSync(resolvedPath)) {
      brokenLinksCount++;
      const resolvedRelative = path.relative(projectRoot, resolvedPath);
      fail(
        `Broken link in "${relativePath}": "${rawLink}" (Resolved to: "${resolvedRelative}")`
      );
    }
  }
}

// ---------------------- Main Execution ----------------------
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

// Report results
if (brokenLinksCount > 0 || unescapedTagsCount > 0) {
  fail(
    `Documentation validation FAILED. Scanned ${scannedFilesCount} files, checked ${totalLinksCount} links, found ${brokenLinksCount} broken link(s) and ${unescapedTagsCount} unescaped tag(s).`
  );
  process.exit(1);
} else {
  success(
    `Documentation validation PASSED. Scanned ${scannedFilesCount} files, successfully checked ${totalLinksCount} links and verified all markdown formatting.`
  );
}
