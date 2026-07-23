const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const SRC_DIR = path.join(__dirname, "../src");
const REPORT_PATH = path.join(__dirname, "../docs/github/volatility-matrix.md");
const DEFAULT_VOLATILITY_THRESHOLD = 20;

// Fetch a single page from GitHub API
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const headers = { "User-Agent": "Volatility-Matrix-Engine" };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }
    const options = { headers, timeout: 5000 };

    const req = https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(
            new Error(
              "Failed to parse JSON response: " + (err instanceof Error ? err.message : String(err))
            )
          );
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

function maskToken(message) {
  if (process.env.GITHUB_TOKEN && typeof message === "string") {
    return message.split(process.env.GITHUB_TOKEN).join("***");
  }
  return message;
}

// Fetch all issues from GitHub to check active refactoring plans
async function fetchAllIssues() {
  let page = 1;
  let allIssues = new Map();
  let hasError = false;

  while (true) {
    try {
      const data = await fetchPage(
        `https://api.github.com/repos/fderuiter/CRF.xl/issues?state=all&per_page=100&page=${page}`
      );
      if (!data || data.message) {
        if (data && data.message) {
          console.warn("GitHub API error:", maskToken(data.message));
          hasError = true;
        }
        break;
      }
      if (Array.isArray(data)) {
        if (data.length === 0) break;
        data.forEach((issue) => allIssues.set(issue.number.toString(), issue.title));
        if (data.length < 100) break;
      } else {
        hasError = true;
        break;
      }
      page++;
    } catch (err) {
      console.warn("GitHub API error:", maskToken(err.message));
      hasError = true;
      break;
    }
  }

  if (hasError) {
    console.error(
      "ERROR: GitHub API connectivity issues or rate limits encountered. Failing loudly to prevent silent bypass."
    );
    process.exit(1);
  }

  return allIssues;
}

// Recursively find files
function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

// Identify source files (ignoring test assets, dependencies, etc.)
function isSourceFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.endsWith(".ts") && !normalized.endsWith(".tsx")) {
    return false;
  }
  if (
    normalized.includes("/__tests__/") ||
    normalized.includes("/__fixtures__/") ||
    normalized.endsWith(".test.ts") ||
    normalized.endsWith(".test.tsx") ||
    normalized.endsWith(".spec.ts") ||
    normalized.endsWith(".spec.tsx")
  ) {
    return false;
  }
  return true;
}

// Get commit count for all files using a single git log run
function getCommitCounts() {
  const counts = {};
  try {
    const output = execSync("git log --name-only --format= -- src", {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    const lines = output.split("\n");
    for (const line of lines) {
      const filePath = line.trim();
      if (filePath && isSourceFile(filePath)) {
        counts[filePath] = (counts[filePath] || 0) + 1;
      }
    }
  } catch (err) {
    console.warn("Warning: Could not compute commit counts from git history:", err.message);
  }
  return counts;
}

// Identify files modified in this branch/worktree compared to the target branch (or modified unstaged/staged files)
function getModifiedFiles() {
  const modified = new Set();
  try {
    const statusOutput = execSync("git status --porcelain", { encoding: "utf8" });
    statusOutput.split("\n").forEach((line) => {
      if (line.trim() && line.length > 3) {
        const filePath = line.substring(3).trim();
        if (filePath && isSourceFile(filePath)) {
          modified.add(filePath);
        }
      }
    });
  } catch {
    // Ignore error
  }

  try {
    let baseRef = "origin/main";
    if (process.env.GITHUB_BASE_REF) {
      baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
    }
    let diffCmd = `git diff --name-only ${baseRef}`;
    try {
      execSync(`git rev-parse --verify ${baseRef}`, { stdio: "ignore" });
    } catch {
      try {
        execSync("git rev-parse --verify origin/develop", { stdio: "ignore" });
        diffCmd = "git diff --name-only origin/develop";
      } catch {
        try {
          execSync("git rev-parse --verify main", { stdio: "ignore" });
          diffCmd = "git diff --name-only main";
        } catch {
          diffCmd = "git diff --name-only HEAD~1";
        }
      }
    }

    const diffOutput = execSync(diffCmd, { encoding: "utf8" });
    diffOutput.split("\n").forEach((line) => {
      const filePath = line.trim();
      if (filePath && isSourceFile(filePath)) {
        modified.add(filePath);
      }
    });
  } catch {
    // Ignore error
  }

  return Array.from(modified);
}

// Parse issue tags in a file
function parseIssueTags(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const tagMatches = [...content.matchAll(/@issue\s+([^\n*]+)/g)];
    const issueNumbers = [];
    for (const tagMatch of tagMatches) {
      const matchIssues = [...tagMatch[1].matchAll(/#(\d+)/g)].map((m) => m[1]);
      issueNumbers.push(...matchIssues);
    }
    return [...new Set(issueNumbers)];
  } catch {
    return [];
  }
}

// Check if linked issues contain a valid refactoring reference
function checkFileAlignment(uniqueIssues, validIssues) {
  const alignment = {
    hasAnyTag: uniqueIssues.length > 0,
    hasValidTag: false,
    hasRefactoringTag: false,
    linkedIssues: [],
  };

  for (const num of uniqueIssues) {
    const title = validIssues.get(num);
    if (title) {
      alignment.hasValidTag = true;
      const isRefactoring = title.toLowerCase().includes("refactor");
      if (isRefactoring) {
        alignment.hasRefactoringTag = true;
      }
      alignment.linkedIssues.push({ number: num, title, isRefactoring });
    }
  }

  return alignment;
}

async function main() {
  const startTime = Date.now();
  console.log("Fetching issues from GitHub...");
  const validIssues = await fetchAllIssues();

  console.log("Analyzing file commit counts...");
  const commitCounts = getCommitCounts();

  console.log("Scanning source files in repository...");
  const allFiles = walk(SRC_DIR).filter(isSourceFile);
  const relRoot = path.join(__dirname, "..");

  const filesMetrics = [];
  const modifiedFilesList = getModifiedFiles();
  const modifiedSet = new Set(modifiedFilesList);

  const threshold = process.env.VOLATILITY_THRESHOLD
    ? parseInt(process.env.VOLATILITY_THRESHOLD, 10)
    : DEFAULT_VOLATILITY_THRESHOLD;

  let hasValidationError = false;
  const validationFailures = [];

  for (const file of allFiles) {
    const relPath = path.relative(relRoot, file).replace(/\\/g, "/");
    const commitCount = commitCounts[relPath] || 0;
    const isVolatile = commitCount >= threshold;
    const issues = parseIssueTags(file);
    const alignment = checkFileAlignment(issues, validIssues);

    filesMetrics.push({
      path: relPath,
      commits: commitCount,
      isVolatile,
      issues,
      alignment,
      isModified: modifiedSet.has(relPath),
    });

    // CI Gate Check logic:
    // 1. Any tracked volatile file must have at least one linked issue annotation (any valid issue tag)
    if (isVolatile && !alignment.hasValidTag) {
      hasValidationError = true;
      validationFailures.push({
        file: relPath,
        reason: "Volatile file misses a valid linked issue annotation.",
        guidance: `File has ${commitCount} commits (threshold is ${threshold}). Please add a valid issue tag using: @issue #<issue_number>`,
      });
    }

    // 2. Modified volatile files must have a valid refactoring ticket linked
    if (isVolatile && modifiedSet.has(relPath) && !alignment.hasRefactoringTag) {
      hasValidationError = true;
      validationFailures.push({
        file: relPath,
        reason:
          "Modifications target a highly volatile file that does not contain a valid refactoring reference.",
        guidance: `File has ${commitCount} commits (threshold is ${threshold}) and was modified. You must link it to an active refactoring ticket in your code using: @issue #<issue_number> where the issue title contains the word "refactor".`,
      });
    }
  }

  // Sort files by commit count descending
  filesMetrics.sort((a, b) => b.commits - a.commits);

  // Generate markdown document
  let md = `# Codebase Churn & Volatility Matrix\n\n`;
  md += `_This document is auto-generated by the Volatility Matrix & CI Traceability Gate. Do not edit manually._\n\n`;
  md += `Related: [\`docs/github/codebase-alignment.md\`](codebase-alignment.md) — functional traceability map.\n\n`;
  md += `## Volatility Matrix\n\n`;
  md += `| File Path | Change Frequency (Commits) | Status | Linked Issues | Refactoring Alignment |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;

  for (const f of filesMetrics) {
    const statusText = f.isVolatile ? `**Volatile**` : `Normal`;
    let issuesText = "None";
    let alignmentText = "N/A";

    if (f.alignment.hasAnyTag) {
      issuesText = f.alignment.linkedIssues
        .map((i) => `\`#${i.number}\` (${i.isRefactoring ? "Refactor" : "General"})`)
        .join("<br>");
    }

    if (f.isVolatile) {
      alignmentText = f.alignment.hasRefactoringTag ? `✅ Aligned` : `❌ Unaligned`;
    }

    md += `| \`${f.path}\` | ${f.commits} | ${statusText} | ${issuesText} | ${alignmentText} |\n`;
  }

  // Write report to docs
  const reportDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, md, "utf8");

  try {
    execSync(`npx prettier --write "${REPORT_PATH}"`, { stdio: "ignore" });
  } catch {
    // Ignore prettier errors
  }

  console.log(`Successfully generated volatility matrix at docs/github/volatility-matrix.md`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Volatility matrix analysis finished in ${durationSec} seconds.`);

  if (hasValidationError) {
    console.error(`\n\x1b[31m[ERROR] Volatility Matrix Validation FAILED:\x1b[0m`);
    validationFailures.forEach((failure) => {
      console.error(`\n  - File: \x1b[33m${failure.file}\x1b[0m`);
      console.error(`    Reason: ${failure.reason}`);
      console.error(`    Guidance: ${failure.guidance}`);
    });
    process.exit(1);
  } else {
    console.log(`\n\x1b[32m[SUCCESS] Volatility Matrix Validation PASSED.\x1b[0m`);
    process.exit(0);
  }
}

module.exports = {
  isSourceFile,
  walk,
  getCommitCounts,
  getModifiedFiles,
  parseIssueTags,
  checkFileAlignment,
  main,
};

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
