const fs = require("fs");
const path = require("path");

const packageJsonPath = path.join(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const prodDeps = packageJson.dependencies || {};

const testingTools = [
  "@axe-core/playwright",
  "@playwright/test",
  "jest",
  "ts-jest",
  "@testing-library/react",
  "@testing-library/jest-dom",
  "@testing-library/dom",
  "@testing-library/user-event",
];
const misplacedTools = testingTools.filter((tool) => prodDeps[tool]);

if (misplacedTools.length > 0) {
  console.error("ERROR: Testing tools detected in production dependencies:");
  misplacedTools.forEach((dep) => console.error(` - ${dep}`));
  console.error("\nPlease move these tools to devDependencies.");
  process.exit(1);
}

console.log("Production dependencies validated successfully. No misplaced testing tools detected.");
process.exit(0);
