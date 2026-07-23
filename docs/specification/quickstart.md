# Developer Quickstart Guide: Integrating with Vault Service

This quickstart guide provides functional TypeScript recipes for programmatic integration with the Vault Service API endpoints.

## Prerequisites

To use the Vault Service, ensure you have the Vault API URL and API Key set in your environment or passed to the service constructor.

```bash
export VAULT_API_URL="https://api.vault.example.com"
export VAULT_API_KEY="your-api-key-placeholder"
```

---

## 1. Syncing Validation Results

This recipe demonstrates how to programmatically sync CDISC validation results of a study protocol version to the Vault Service.

```typescript
import { VaultService } from "../../src/taskpane/core/index";

export async function runValidationSyncRecipe() {
  const vaultUrl = process.env.VAULT_API_URL || "https://api.vault.example.com";
  const vaultToken = process.env.VAULT_API_KEY || "YOUR_API_KEY_PLACEHOLDER";

  const vaultService = new VaultService({
    apiUrl: vaultUrl,
    apiKey: vaultToken,
  });

  const protocolId = "study-protocol-101";
  const version = "1.0.0";
  const studyHash = "abc123hash";
  const issues: any[] = [
    {
      id: "err-01",
      ruleId: "RULE-SDTM-01",
      severity: "error",
      message: "Missing required variable USUBJID",
    },
  ];

  try {
    await vaultService.syncValidationResults(protocolId, version, issues, studyHash);
    console.log("Successfully synced validation results to Vault.");
  } catch (error) {
    console.error("Failed to sync validation results:", error);
  }
}
```

---

## 2. Freezing a Study Version

Once the validation issues are addressed or approved, you can lock/freeze the study version in the Vault.

```typescript
import { VaultService } from "../../src/taskpane/core/index";

export async function runFreezeVersionRecipe() {
  const vaultUrl = process.env.VAULT_API_URL || "https://api.vault.example.com";
  const vaultToken = process.env.VAULT_API_KEY || "YOUR_API_KEY_PLACEHOLDER";

  const vaultService = new VaultService({
    apiUrl: vaultUrl,
    apiKey: vaultToken,
  });

  const protocolId = "study-protocol-101";
  const version = "1.0.0";
  const studyHash = "abc123hash";
  const validationIssues: any[] = [];

  try {
    await vaultService.freezeVersion(protocolId, version, studyHash, validationIssues);
    console.log("Successfully frozen study version in Vault.");
  } catch (error) {
    console.error("Failed to freeze study version:", error);
  }
}
```

---

## 3. Retrieving Study History

Retrieve the complete historical audit log and version milestones of a study protocol.

```typescript
import { VaultService } from "../../src/taskpane/core/index";

export async function runGetHistoryRecipe() {
  const vaultUrl = process.env.VAULT_API_URL || "https://api.vault.example.com";
  const vaultToken = process.env.VAULT_API_KEY || "YOUR_API_KEY_PLACEHOLDER";

  const vaultService = new VaultService({
    apiUrl: vaultUrl,
    apiKey: vaultToken,
  });

  const protocolId = "study-protocol-101";

  try {
    const history = await vaultService.getHistory(protocolId);
    console.log("Retrieved study history:", history);
  } catch (error) {
    console.error("Failed to retrieve study history:", error);
  }
}
```
