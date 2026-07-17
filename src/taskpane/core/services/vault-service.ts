import { logger } from "../utils/logger";
import { appOrchestrator } from "./app-orchestrator";
import { DiagnosticError } from "./diagnostic-framework";
/**
 * @issue #28
 */
export interface VaultCredentials {
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

  constructor(credentials?: VaultCredentials) {
    this.apiUrl =
      credentials?.apiUrl || readEnv("VAULT_API_URL") || "https://api.vault.example.com";
    this.apiKey = credentials?.apiKey || readEnv("VAULT_API_KEY") || "";
  }

  async syncValidationResults(
    protocolId: string,
    version: string,
    issues: any[],
    studyHash: string
  ) {
    if (!this.apiUrl) return;
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/studies/${protocolId}/validation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          version,
          issues,
          studyHash,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
      throw new DiagnosticError({ severity: "error", category: "VAULT_ERROR", message: `Vault operation failed: ${message}`, allowRetry: true });
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
      const response = await fetch(`${this.apiUrl}/api/v1/studies/${protocolId}/freeze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          version,
          studyHash,
          validationIssues,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
      throw new DiagnosticError({ severity: "error", category: "VAULT_ERROR", message: `Vault operation failed: ${message}`, allowRetry: true });
    }
  }

  async getHistory(protocolId: string) {
    if (!this.apiUrl) return [];
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/studies/${protocolId}/history`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
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
      throw new DiagnosticError({ severity: "error", category: "VAULT_ERROR", message: `Vault operation failed: ${message}`, allowRetry: true });
    }
  }
}
