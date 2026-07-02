/**
 * issue-manager.js
 *
 * A utility for auditing and normalizing GitHub issue taxonomy and hierarchy for CRF.xl.
 *
 * Usage (Audit):
 *   GITHUB_TOKEN=xxx node scripts/issue-manager.js audit --repo fderuiter/CRF.xl
 *
 * Usage (Normalize):
 *   GITHUB_TOKEN=xxx node scripts/issue-manager.js normalize --repo fderuiter/CRF.xl --dry-run
 */

const https = require("https");
const fs = require("fs");

const REQUIRED_LABEL_PREFIXES = ["type:", "status:", "priority:", "stream:", "area:"];

async function request(path, method = "GET", body = null) {
  const token = process.env.GITHUB_TOKEN;
  const options = {
    hostname: "api.github.com",
    path: path,
    method: method,
    headers: {
      "User-Agent": "CRF-xl-Issue-Manager",
      "Accept": "application/vnd.github+json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 400) {
          console.error(`Error: ${res.statusCode} for ${path}`);
          console.error(data);
          return reject(new Error(`GitHub API returned ${res.statusCode}`));
        }
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getOpenIssues(repo) {
  let allIssues = [];
  let page = 1;
  while (true) {
    const issues = await request(`/repos/${repo}/issues?state=open&per_page=100&page=${page}`);
    if (!Array.isArray(issues) || issues.length === 0) break;
    // Filter out PRs (GitHub API returns PRs in the issues endpoint)
    allIssues = allIssues.concat(issues.filter(i => !i.pull_request));
    if (issues.length < 100) break;
    page++;
  }
  return allIssues;
}

function analyzeIssue(issue) {
  const labels = issue.labels.map(l => l.name);
  const analysis = {
    number: issue.number,
    title: issue.title,
    labels: labels,
    missingLabels: [],
    extraLabels: [],
    deprecatedLabels: labels.filter(l => l.startsWith("phase:")),
    isChild: labels.includes("relation:child-of-epic"),
    parentRef: null,
  };

  REQUIRED_LABEL_PREFIXES.forEach(prefix => {
    const matching = labels.filter(l => l.startsWith(prefix));
    if (matching.length === 0) {
      analysis.missingLabels.push(prefix);
    } else if (matching.length > 1 && prefix !== "area:") {
      analysis.extraLabels.push(prefix);
    } else if (prefix === "area:" && matching.length > 2) {
      analysis.extraLabels.push(prefix);
    }
  });

  const parentMatch = issue.body.match(/(?:Parent|Sub-Issue of):\s*(?:#(\d+)|https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+))/i);
  if (parentMatch) {
    analysis.parentRef = parseInt(parentMatch[1] || parentMatch[2]);
  }

  return analysis;
}

async function runAudit(repo) {
  console.log(`Auditing issues for ${repo}...`);
  const issues = await getOpenIssues(repo);
  const reports = issues.map(analyzeIssue);

  console.log("\n--- Audit Summary ---");
  reports.forEach(r => {
    const issues_found = [];
    if (r.missingLabels.length > 0) issues_found.push(`Missing: ${r.missingLabels.join(", ")}`);
    if (r.deprecatedLabels.length > 0) issues_found.push(`Deprecated: ${r.deprecatedLabels.join(", ")}`);
    if (r.isChild && !r.parentRef) issues_found.push("Child without explicit parent ref in body");

    if (issues_found.length > 0) {
      console.log(`#${r.number} ${r.title}`);
      issues_found.forEach(i => console.log(`  - ${i}`));
    }
  });
}

async function runNormalize(repo, dryRun = true) {
  console.log(`Normalizing issues for ${repo} (Dry Run: ${dryRun})...`);
  const issues = await getOpenIssues(repo);
  const reports = issues.map(analyzeIssue);

  for (const r of reports) {
    const updates = { labels: [...r.labels] };
    let changed = false;

    // Remove deprecated phase labels
    if (r.deprecatedLabels.length > 0) {
      updates.labels = updates.labels.filter(l => !l.startsWith("phase:"));
      changed = true;
    }

    // Convert child-of-epic to sub-issue if parent is known
    // Note: GitHub Sub-Issues API is currently in private/public beta and might require
    // specific headers or a different endpoint. This script assumes standard parent_id support if available.
    if (r.isChild && r.parentRef) {
      console.log(`[Hierarchy] #${r.number} should be sub-issue of #${r.parentRef}`);
      // updates.parent_id = r.parentRef; // Placeholder for sub-issue logic
      updates.labels = updates.labels.filter(l => l !== "relation:child-of-epic");
      changed = true;
    }

    if (changed) {
      console.log(`[Update] #${r.number}: ${r.title}`);
      console.log(`  New labels: ${updates.labels.join(", ")}`);
      if (!dryRun) {
        await request(`/repos/${repo}/issues/${r.number}`, "PATCH", updates);
        console.log(`  Successfully updated #${r.number}`);
      }
    }
  }
}

const args = process.argv.slice(2);
const command = args[0];
const repoArg = args.find(a => a.startsWith("--repo="))?.split("=")[1] || "fderuiter/CRF.xl";
const dryRun = args.includes("--dry-run") || !args.includes("--no-dry-run");

if (command === "audit") {
  runAudit(repoArg).catch(console.error);
} else if (command === "normalize") {
  runNormalize(repoArg, dryRun).catch(console.error);
} else {
  console.log("Usage: node scripts/issue-manager.js [audit|normalize] --repo=user/repo [--no-dry-run]");
}
