const https = require("https");

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const headers = { "User-Agent": "Traceability-Engine" };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }
    const options = { headers, timeout: 10000 };

    const req = https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error("Failed to parse JSON: " + err.message));
        }
      });
    });
    req.on("error", reject);
  });
}

async function run() {
  let page = 1;
  let allIssues = [];
  while (true) {
    console.log(`Fetching page ${page}...`);
    const data = await fetchPage(`https://api.github.com/repos/fderuiter/CRF.xl/issues?state=all&per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }
    allIssues.push(...data);
    if (data.length < 100) {
      break;
    }
    page++;
  }

  console.log(`Fetched ${allIssues.length} issues in total.`);

  // Save all issues data to json for local analysis
  const simplified = allIssues.map(i => ({
    number: i.number,
    title: i.title,
    state: i.state,
    labels: i.labels.map(l => l.name),
    milestone: i.milestone ? i.milestone.title : null,
    updated_at: i.updated_at,
    created_at: i.created_at,
    pull_request: !!i.pull_request
  }));

  const fs = require("fs");
  fs.writeFileSync("issues_dump.json", JSON.stringify(simplified, null, 2));
  console.log("Dumped simplified issues to issues_dump.json");
}

run().catch(console.error);
