const fs = require("fs");
const issues = JSON.parse(fs.readFileSync("issues_dump.json", "utf8"));

console.log(`Analyzing ${issues.length} total issues...`);

const openIssues = issues.filter(i => i.state === "open" && !i.pull_request);
console.log(`Found ${openIssues.length} open backlog issues.`);

// 1. status:needs-more-information
const needsMoreInfo = openIssues.filter(i => i.labels.includes("status:needs-more-information"));
console.log("\n--- status:needs-more-information ---");
needsMoreInfo.forEach(i => console.log(`#${i.number} [${i.labels.join(", ")}]: ${i.title} (${i.milestone})`));

// 2. status:needs-design
const needsDesign = openIssues.filter(i => i.labels.includes("status:needs-design"));
console.log("\n--- status:needs-design ---");
needsDesign.forEach(i => console.log(`#${i.number} [${i.labels.join(", ")}]: ${i.title} (${i.milestone})`));

// 3. no milestone
const noMilestone = openIssues.filter(i => !i.milestone);
console.log("\n--- open issues with no milestone ---");
noMilestone.forEach(i => console.log(`#${i.number} [${i.labels.join(", ")}]: ${i.title}`));

// 4. priority:p0 not in active milestone
const activeMilestones = [
  "M1 — Core Metadata Foundations",
  "M2 — Standards Import & Reverse Ingestion",
  "M3 — Metadata Diff & Comparison",
  "M4 — Authoring UX & Internationalization",
  "M5 — Reviewer Export & aCRF",
  "M6 — Enterprise Hardening & Deployment",
  "M7 — Audit & Governance"
];
const p0NotActive = openIssues.filter(i => i.labels.includes("priority:p0") && (!i.milestone || !activeMilestones.includes(i.milestone)));
console.log("\n--- priority:p0 not in active milestone ---");
p0NotActive.forEach(i => console.log(`#${i.number} [${i.labels.join(", ")}]: ${i.title} (${i.milestone})`));

// 5. status:in-progress issues (all, with update date to check stales)
const inProgress = openIssues.filter(i => i.labels.includes("status:in-progress"));
console.log("\n--- status:in-progress issues ---");
inProgress.forEach(i => console.log(`#${i.number} [${i.labels.join(", ")}]: ${i.title} (Updated: ${i.updated_at}, Milestone: ${i.milestone})`));

// 6. relation:duplicate-candidate or relation:superseded
const duplicates = openIssues.filter(i => i.labels.includes("relation:duplicate-candidate") || i.labels.includes("relation:superseded"));
console.log("\n--- relation:duplicate-candidate and relation:superseded ---");
duplicates.forEach(i => console.log(`#${i.number} [${i.labels.join(", ")}]: ${i.title}`));

// 7. Decision queue issues status
const decisionQueueIds = [88, 89, 90, 91, 92];
console.log("\n--- Decision Queue Issues ---");
issues.filter(i => decisionQueueIds.includes(i.number)).forEach(i => {
  console.log(`#${i.number} (State: ${i.state}) [${i.labels.join(", ")}]: ${i.title} (Milestone: ${i.milestone})`);
});

// 8. Epic health check issues
const epicHealthIds = [35, 42, 59, 60, 68];
console.log("\n--- Epic Health Check Issues ---");
issues.filter(i => epicHealthIds.includes(i.number)).forEach(i => {
  console.log(`#${i.number} (State: ${i.state}) [${i.labels.join(", ")}]: ${i.title} (Milestone: ${i.milestone})`);
});
