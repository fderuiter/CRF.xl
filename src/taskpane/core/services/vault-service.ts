import { logger } from "../utils/logger";
import { appOrchestrator } from "./app-orchestrator";
import { DiagnosticError } from "./diagnostic-framework";
import { VaultClient } from "../../../../packages/vault-sdk/src/client";

/**
 * @issue #28
 */
interface VaultCredentials {
  apiKey?: string;
  apiUrl?: string;
}

function readEnv(name: string): string | undefined {
  const processRef = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return processRef?.env?.[name];
}

export class VaultService {
  private apiUrl: string;
  private apiKey: string;
  private client: VaultClient;

  constructor(credentials?: VaultCredentials) {
    this.apiUrl =
      credentials?.apiUrl || readEnv("VAULT_API_URL") || "https://api.vault.example.com";
    this.apiKey = credentials?.apiKey || readEnv("VAULT_API_KEY") || "";
    this.client = new VaultClient({ apiUrl: this.apiUrl, apiKey: this.apiKey });
  }

  async syncValidationResults(
    protocolId: string,
    version: string,
    issues: any[],
    studyHash: string
  ) {
    if (!this.apiUrl) return;
    try {
      await this.client.syncValidationResults(protocolId, version, issues, studyHash);
    } catch (e) {
      logger.error("Vault sync failed", e);
      const message = e instanceof Error ? e.message : "Network error";
      appOrchestrator.updateState({
        uiError: {
          severity: "error",
          category: "VAULT_ERROR",
          message: `Vault sync failed: ${message}`,
          allowRetry: true,
        },
      });
      throw new DiagnosticError({
        severity: "error",
        category: "VAULT_ERROR",
        message: `Vault operation failed: ${message}`,
        allowRetry: true,
      });
    }
  }

  async freezeVersion(
    protocolId: string,
    version: string,
    studyHash: string,
    validationIssues: any[]
  ) {
    if (!this.apiUrl) return;
    try {
      await this.client.freezeVersion(protocolId, version, studyHash, validationIssues);
    } catch (e) {
      logger.error("Vault freeze failed", e);
      const message = e instanceof Error ? e.message : "Network error";
      appOrchestrator.updateState({
        uiError: {
          severity: "error",
          category: "VAULT_ERROR",
          message: `Vault freeze failed: ${message}`,
          allowRetry: true,
        },
      });
      throw new DiagnosticError({
        severity: "error",
        category: "VAULT_ERROR",
        message: `Vault operation failed: ${message}`,
        allowRetry: true,
      });
    }
  }

  async getHistory(protocolId: string) {
    if (!this.apiUrl) return [];
    try {
      return await this.client.getHistory(protocolId);
    } catch (e) {
      logger.error("Vault history fetch failed", e);
      const message = e instanceof Error ? e.message : "Network error";
      appOrchestrator.updateState({
        uiError: {
          severity: "error",
          category: "VAULT_ERROR",
          message: `Vault history fetch failed: ${message}`,
          allowRetry: true,
        },
      });
      throw new DiagnosticError({
        severity: "error",
        category: "VAULT_ERROR",
        message: `Vault operation failed: ${message}`,
        allowRetry: true,
      });
    }
  }
}
