const fs = require("fs");
const path = require("path");

const packageJsonPath = path.resolve(__dirname, "../package.json");
const projectRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const expectedVersion = `${packageJson.version}.0`;

const manifests = [
  { name: "dev", file: "manifest.dev.xml", forbidDevUrls: false, placeholder: null, clientPlaceholder: "11111111-1111-1111-1111-111111111111" },
  {
    name: "staging",
    file: "manifest.staging.xml",
    forbidDevUrls: true,
    placeholder: "REPLACE_WITH_STAGING_HOST",
    clientPlaceholder: "22222222-2222-2222-2222-222222222222",
  },
  {
    name: "uat",
    file: "manifest.uat.xml",
    forbidDevUrls: true,
    placeholder: "REPLACE_WITH_UAT_HOST",
    clientPlaceholder: "33333333-3333-3333-3333-333333333333",
  },
  {
    name: "production",
    file: "manifest.production.xml",
    forbidDevUrls: true,
    placeholder: "REPLACE_WITH_PRODUCTION_HOST",
    clientPlaceholder: "44444444-4444-4444-4444-444444444444",
  },
];

const prohibitedPattern =
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|ngrok|dev-tunnel|devtunnel\.ms|trycloudflare\.com)/i;

function extractFirstValue(content, tagName) {
  const match = content.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`));
  return match ? match[1].trim() : null;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const ids = new Set();

for (const manifest of manifests) {
  const filePath = path.join(projectRoot, manifest.file);
  if (!fs.existsSync(filePath)) {
    fail(`Missing manifest file: ${manifest.file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const id = extractFirstValue(content, "Id");
  const version = extractFirstValue(content, "Version");
  const permissions = extractFirstValue(content, "Permissions");

  if (!id) {
    fail(`Manifest ${manifest.file} is missing <Id>.`);
  } else if (ids.has(id)) {
    fail(`Manifest ${manifest.file} reuses <Id> '${id}'. Use a unique ID per environment.`);
  } else {
    ids.add(id);
  }

  if (version !== expectedVersion) {
    fail(
      `Manifest ${manifest.file} has version '${version ?? "missing"}', expected '${expectedVersion}' from package.json.`
    );
  }

  if (!permissions) {
    fail(`Manifest ${manifest.file} is missing <Permissions>.`);
  }

  if (manifest.forbidDevUrls && prohibitedPattern.test(content)) {
    fail(`Manifest ${manifest.file} must not include localhost/dev-tunnel URLs.`);
  }

  if (manifest.placeholder && !content.includes(manifest.placeholder)) {
    fail(
      `Manifest ${manifest.file} should keep '${manifest.placeholder}' placeholder until final host is confirmed.`
    );
  }

  if (manifest.clientPlaceholder && !content.includes(manifest.clientPlaceholder)) {
    fail(
      `Manifest ${manifest.file} should keep '${manifest.clientPlaceholder}' placeholder until injection.`
    );
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Manifest checks passed for ${manifests.length} environment manifests.`);
