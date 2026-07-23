const fs = require("fs");
const path = require("path");

function verifyParity() {
  const projectRoot = "/app";
  const servicePath = path.join(projectRoot, "src/taskpane/core/services/vault-service.ts");
  const yamlPath = path.join(projectRoot, "docs/specification/unified-api.yaml");

  if (!fs.existsSync(servicePath)) {
    console.error(`Vault Service file not found at ${servicePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(yamlPath)) {
    console.error(`Unified API specification file not found at ${yamlPath}`);
    process.exit(1);
  }

  const serviceCode = fs.readFileSync(servicePath, "utf8");
  const yamlContent = fs.readFileSync(yamlPath, "utf8");

  // Find all method definitions and their fetches
  const methods = [];
  const methodNames = ["syncValidationResults", "freezeVersion", "getHistory"];

  for (const name of methodNames) {
    const startIdx = serviceCode.indexOf(`${name}(`);
    if (startIdx === -1) {
      console.error(`Method ${name} not found in VaultService class.`);
      process.exit(1);
    }
    const bodyCode = serviceCode.substring(startIdx, startIdx + 1500);

    // Find fetch path
    const pathMatch = bodyCode.match(/fetch\(\`\$\{this\.apiUrl\}([^`]+)\`/);
    if (!pathMatch) {
      console.error(`Could not find fetch path for method ${name}`);
      process.exit(1);
    }

    let apiPath = pathMatch[1];
    apiPath = apiPath.replace(/\$\{(\w+)\}/g, "{$1}");

    // Find fetch method
    let httpMethod = "GET";
    const verbMatch = bodyCode.match(/method:\s*["'](POST|PUT|DELETE|GET)["']/i);
    if (verbMatch) {
      httpMethod = verbMatch[1].toUpperCase();
    }

    // Find request body fields if POST
    const bodyFields = [];
    if (httpMethod === "POST") {
      const stringifyMatch = bodyCode.match(/body:\s*JSON\.stringify\(\{([\s\S]*?)\}\)/);
      if (stringifyMatch) {
        const fieldsText = stringifyMatch[1];
        fieldsText.split(",").forEach((line) => {
          const cleanLine = line.trim();
          if (cleanLine) {
            const field = cleanLine.split(":")[0].trim();
            if (field && !field.startsWith("//") && !field.startsWith("/*")) {
              bodyFields.push(field);
            }
          }
        });
      }
    }

    methods.push({
      methodName: name,
      apiPath,
      httpMethod,
      bodyFields: bodyFields.filter((f) => f && !f.includes("//") && !f.includes("/*")),
    });
  }

  console.log("Found client methods implementation:", JSON.stringify(methods, null, 2));

  // Check that each of these methods is correctly documented in docs/specification/unified-api.yaml
  for (const method of methods) {
    if (!yamlContent.includes(method.apiPath)) {
      console.error(
        `\x1b[31m[ERROR] Vault API contract mismatch: path "${method.apiPath}" is not documented in unified-api.yaml\x1b[0m`
      );
      process.exit(1);
    }

    const pathIndex = yamlContent.indexOf(method.apiPath + ":");
    if (pathIndex === -1) {
      console.error(
        `\x1b[31m[ERROR] Vault API contract mismatch: path "${method.apiPath}" is missing in unified-api.yaml\x1b[0m`
      );
      process.exit(1);
    }

    // Extract path block up to the next endpoint or less indented line
    const remainingYaml = yamlContent.substring(pathIndex);
    const lines = remainingYaml.split("\n");
    const pathBlockLines = [lines[0]];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("  /") || (line.trim() !== "" && !line.startsWith(" "))) {
        break;
      }
      pathBlockLines.push(line);
    }
    const pathBlock = pathBlockLines.join("\n");

    const httpMethodLower = method.httpMethod.toLowerCase();
    if (!pathBlock.match(new RegExp(`\\b${httpMethodLower}:`))) {
      console.error(
        `\x1b[31m[ERROR] Vault API contract mismatch: HTTP method "${method.httpMethod}" for path "${method.apiPath}" is missing or incorrect in unified-api.yaml\x1b[0m`
      );
      process.exit(1);
    }

    // Check request body fields if any
    for (const field of method.bodyFields) {
      if (field === "timestamp") continue; // Client-generated metadata, optional to document

      // Let's resolve the schema if it references a schema definition
      const refMatch = pathBlock.match(/\$ref:\s*["']?#\/components\/schemas\/(\w+)["']?/);
      if (refMatch) {
        const schemaName = refMatch[1];
        const schemaDefStart = yamlContent.indexOf(`    ${schemaName}:`);
        if (schemaDefStart === -1) {
          console.error(
            `\x1b[31m[ERROR] Schema reference "${schemaName}" not found in unified-api.yaml\x1b[0m`
          );
          process.exit(1);
        }
        // Extract schema block
        const remainingSchemaYaml = yamlContent.substring(schemaDefStart);
        const schemaLines = remainingSchemaYaml.split("\n");
        const schemaBlockLines = [schemaLines[0]];
        for (let i = 1; i < schemaLines.length; i++) {
          const sLine = schemaLines[i];
          if (sLine.trim() !== "" && !sLine.startsWith("      ")) {
            break;
          }
          schemaBlockLines.push(sLine);
        }
        const schemaBlock = schemaBlockLines.join("\n");
        if (!schemaBlock.match(new RegExp(`\\b${field}:`))) {
          console.error(
            `\x1b[31m[ERROR] Vault API contract mismatch: Request field "${field}" is not defined under schema "${schemaName}" in unified-api.yaml\x1b[0m`
          );
          process.exit(1);
        }
      } else {
        // Fallback: check inside the pathBlock directly
        if (!pathBlock.includes(field)) {
          console.error(
            `\x1b[31m[ERROR] Vault API contract mismatch: Request field "${field}" for "${method.httpMethod} ${method.apiPath}" is not documented in unified-api.yaml\x1b[0m`
          );
          process.exit(1);
        }
      }
    }
  }

  console.log("\x1b[32m[SUCCESS] Vault API Contract Parity Check: PASSED\x1b[0m");
}

if (require.main === module) {
  verifyParity();
} else {
  module.exports = { verifyParity };
}
