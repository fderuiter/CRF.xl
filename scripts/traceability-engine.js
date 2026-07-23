const fs = require("fs");
const path = require("path");
const https = require("https");

const SRC_DIR = path.join(__dirname, "../src");
const REPORT_PATH = path.join(__dirname, "../docs/github/codebase-alignment.md");
const MODULE_MAP_PATH = path.join(__dirname, "../docs/architecture/module-map.md");

// Fetch all issues from GitHub API
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const headers = { "User-Agent": "Traceability-Engine" };
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
          reject(new Error("Failed to parse JSON response"));
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

function parseAlignmentDocument() {
  const issues = new Map();
  if (!fs.existsSync(REPORT_PATH)) return issues;
  const content = fs.readFileSync(REPORT_PATH, "utf8");
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("| `#")) {
      const parts = line.split("|").map(s => s.trim());
      if (parts.length >= 3) {
        const issueMatch = parts[1].match(/`#(\d+)`/);
        if (issueMatch) {
          issues.set(issueMatch[1], parts[2]);
        }
      }
    }
  }
  return issues;
}

function maskToken(message) {
  if (process.env.GITHUB_TOKEN && typeof message === "string") {
    return message.split(process.env.GITHUB_TOKEN).join("***");
  }
  return message;
}

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
    console.error("ERROR: GitHub API connectivity issues or rate limits encountered. Failing loudly to prevent silent bypass.");
    process.exit(1);
  }

  return allIssues;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function parseExpectedAbsent() {
  const content = fs.readFileSync(MODULE_MAP_PATH, "utf8");
  const expected = [];
  let inTable = false;
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.includes("| Expected Module") || line.includes("| Expected module")) {
      inTable = true;
      continue;
    }
    if (inTable && line.trim() === "") {
      inTable = false;
      continue;
    }
    if (inTable && line.startsWith("|")) {
      if (line.includes("---")) continue;
      const parts = line.split("|").map((s) => s.trim());
      if (parts.length >= 4) {
        // | Expected Module | Purpose | Blocking Issue | Planned Location |
        const moduleMatch = parts[1].match(/`([^`]+)`/);
        const moduleName = moduleMatch ? moduleMatch[1] : parts[1];
        const purpose = parts[2];
        const issueMatches = [...parts[3].matchAll(/#(\d+)/g)].map((m) => m[1]);
        if (issueMatches.length > 0) {
          expected.push({
            module: moduleName,
            purpose,
            issues: issueMatches,
          });
        }
      }
    }
  }
  return expected;
}

async function main() {
  console.log("Fetching issues from GitHub to validate...");
  const validIssues = await fetchAllIssues();

  const files = walk(SRC_DIR);
  const DOCS_DIR = path.join(__dirname, "../docs");
  const docFiles = [];
  const walkDocs = (dir) => {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        walkDocs(filePath);
      } else if (filePath.endsWith(".md")) {
        docFiles.push(filePath);
      }
    });
  };
  walkDocs(DOCS_DIR);

  const issueToFiles = new Map();
  let missingTags = [];
  let invalidIssues = [];

  for (const file of files) {
    const relPath = path.relative(path.join(__dirname, ".."), file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const tagMatches = [...content.matchAll(/@issue\s+([^\n*]+)/g)];

    if (tagMatches.length === 0) {
      missingTags.push(relPath);
      continue;
    }

    let issueNumbers = [];
    for (const tagMatch of tagMatches) {
      const matchIssues = [...tagMatch[1].matchAll(/#(\d+)/g)].map((m) => m[1]);
      issueNumbers.push(...matchIssues);
    }

    if (issueNumbers.length === 0) {
      missingTags.push(relPath);
      continue;
    }

    // Remove duplicates
    issueNumbers = [...new Set(issueNumbers)];

    for (const num of issueNumbers) {
      if (validIssues.size > 0 && !validIssues.has(num)) {
        invalidIssues.push({ file: relPath, issue: num });
      }

      if (!issueToFiles.has(num)) {
        issueToFiles.set(num, []);
      }
      issueToFiles.get(num).push(relPath);
    }
  }

  for (const file of docFiles) {
    const relPath = path.relative(path.join(__dirname, ".."), file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const tagMatches = [...content.matchAll(/@issue\s+([^\n*>-]+)/g)];
    if (tagMatches.length === 0) continue;

    let issueNumbers = [];
    for (const tagMatch of tagMatches) {
      const matchIssues = [...tagMatch[1].matchAll(/#(\d+)/g)].map((m) => m[1]);
      issueNumbers.push(...matchIssues);
    }

    // Remove duplicates
    issueNumbers = [...new Set(issueNumbers)];

    for (const num of issueNumbers) {
      if (validIssues.size > 0 && !validIssues.has(num)) {
        invalidIssues.push({ file: relPath, issue: num });
      }
      if (!issueToFiles.has(num)) {
        issueToFiles.set(num, []);
      }
      issueToFiles.get(num).push(relPath);
    }
  }

  if (missingTags.length > 0) {
    console.error("ERROR: The following functional modules are missing a valid @issue tag:");
    missingTags.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  if (invalidIssues.length > 0) {
    console.error("ERROR: The following files reference non-existent issue IDs:");
    invalidIssues.forEach((i) => console.error(`  - ${i.file} references #${i.issue}`));
    process.exit(1);
  }

  const expectedAbsent = parseExpectedAbsent();

  // Also map absent to issues
  for (const abs of expectedAbsent) {
    for (const num of abs.issues) {
      if (!issueToFiles.has(num)) {
        issueToFiles.set(num, []);
      }
      issueToFiles.get(num).push({ absent: true, module: abs.module, notes: abs.purpose });
    }
  }

  // Generate markdown
  let md = `# Backlog to Codebase Alignment\n\n`;
  md += `*This document is auto-generated by the Self-Documenting Traceability Engine. Do not edit manually.*\n\n`;
  md += `Related: [\`docs/architecture/module-map.md\`](../architecture/module-map.md) — complete code module inventory.\n\n`;
  md += `## Alignment Matrix\n\n`;
  md += `| Issue | Title | Status in code | Strongest evidence |\n`;
  md += `| --- | --- | --- | --- |\n`;

  // Sort issues numerically descending
  const sortedIssues = Array.from(issueToFiles.keys()).sort((a, b) => parseInt(b) - parseInt(a));

  for (const issue of sortedIssues) {
    const items = issueToFiles.get(issue);
    const presentFiles = items.filter((i) => typeof i === "string").sort();
    const absentFiles = items.filter((i) => typeof i !== "string").sort((a, b) => a.module.localeCompare(b.module));

    let status = "Present";
    if (presentFiles.length === 0 && absentFiles.length > 0) status = "Absent";
    if (presentFiles.length > 0 && absentFiles.length > 0) status = "Partial";

    let evidenceParts = [];
    presentFiles.forEach((f) => evidenceParts.push(`[\`${f}\`](../../${f})`));
    absentFiles.forEach((f) => evidenceParts.push(`\`${f.module}\` *(Expected)*`));

    const evidence = evidenceParts.join("<br>");
    const title = validIssues.get(issue) || `Issue #${issue}`;

    md += `| \`#${issue}\` | ${title} | ${status} | ${evidence} |\n`;
  }

  md += `\n## Expected-but-absent modules\n\n`;
  md += `| Expected module | Owning issue(s) | Notes |\n`;
  md += `| --- | --- | --- |\n`;
  for (const abs of expectedAbsent) {
    const issuesList = abs.issues.map((i) => `\`#${i}\``).join(", ");
    md += `| \`${abs.module}\` | ${issuesList} | ${abs.purpose} |\n`;
  }

  fs.writeFileSync(REPORT_PATH, md, "utf8");
  try {
    const { execSync } = require("child_process");
    execSync(`npx prettier --write "${REPORT_PATH}"`, { stdio: "ignore" });
  } catch (err) {
    // ignore formatting errors if prettier is not available
  }
  console.log("Successfully generated alignment matrix at docs/github/codebase-alignment.md");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
