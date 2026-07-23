const fs = require("fs");
const path = require("path");

function generateUnifiedSpec() {
  const projectRoot = "/app";
  const sourcePath = path.join(projectRoot, "docs/specification/cdisc-library-api.yaml");
  const outputPath = path.join(projectRoot, "docs/specification/unified-api.yaml");

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source specification file not found at ${sourcePath}`);
    process.exit(1);
  }

  console.log("Reading CDISC Library API specification...");
  const content = fs.readFileSync(sourcePath, "utf8");
  const lines = content.split(/\r?\n/);

  console.log("Generating unified specification...");
  const outputLines = [];

  const vaultPaths = `
  /api/v1/studies/{protocolId}/validation:
    post:
      tags:
        - Vault Service
      summary: Sync Validation Results
      description: Sync validation results for a study protocol
      parameters:
        - name: protocolId
          in: path
          required: true
          description: The protocol ID of the study
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SyncValidationBody'
      responses:
        '200':
          description: Successful sync
          content:
            application/json:
              schema:
                type: object
        '400':
          description: Bad Request
        '500':
          description: Internal Server Error

  /api/v1/studies/{protocolId}/freeze:
    post:
      tags:
        - Vault Service
      summary: Freeze Version
      description: Freeze a version of a study protocol
      parameters:
        - name: protocolId
          in: path
          required: true
          description: The protocol ID of the study
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/FreezeVersionBody'
      responses:
        '200':
          description: Version frozen successfully
          content:
            application/json:
              schema:
                type: object
        '400':
          description: Bad Request
        '500':
          description: Internal Server Error

  /api/v1/studies/{protocolId}/history:
    get:
      tags:
        - Vault Service
      summary: Get History
      description: Retrieve history of a study protocol
      parameters:
        - name: protocolId
          in: path
          required: true
          description: The protocol ID of the study
          schema:
            type: string
      responses:
        '200':
          description: Successful retrieval of history
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/HistoryItem'
        '400':
          description: Bad Request
        '500':
          description: Internal Server Error
`;

  const vaultSchemas = `
    SyncValidationBody:
      type: object
      required:
        - version
        - issues
        - studyHash
      properties:
        version:
          type: string
        issues:
          type: array
          items:
            type: object
        studyHash:
          type: string
        timestamp:
          type: string
          format: date-time

    FreezeVersionBody:
      type: object
      required:
        - version
        - studyHash
        - validationIssues
      properties:
        version:
          type: string
        studyHash:
          type: string
        validationIssues:
          type: array
          items:
            type: object
        timestamp:
          type: string
          format: date-time

    HistoryItem:
      type: object
      properties:
        id:
          type: string
        version:
          type: string
        timestamp:
          type: string
          format: date-time
        action:
          type: string
`;

  let inInfoBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Modify Title
    if (line.startsWith("info:")) {
      inInfoBlock = true;
      outputLines.push(line);
      continue;
    }
    if (inInfoBlock && line.startsWith("  title:")) {
      outputLines.push("  title: Unified CDISC and Vault Service API Portal");
      continue;
    }
    if (inInfoBlock && line.startsWith("  description:")) {
      outputLines.push(
        "  description: Unified Interactive API portal for CDISC Library and Vault Service"
      );
      continue;
    }
    if (inInfoBlock && line.trim() === "") {
      inInfoBlock = false;
    } else if (inInfoBlock && !line.startsWith(" ")) {
      inInfoBlock = false;
    }

    outputLines.push(line);

    // Insert paths
    if (line === "paths:") {
      outputLines.push(vaultPaths);
    }

    // Insert schemas
    if (line === "  schemas:") {
      outputLines.push(vaultSchemas);
    }
  }

  fs.writeFileSync(outputPath, outputLines.join("\n"), "utf8");
  console.log(`Successfully generated unified specification at ${outputPath}`);
}

if (require.main === module) {
  generateUnifiedSpec();
} else {
  module.exports = { generateUnifiedSpec };
}
