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

export interface MockHistoryItem {
  version: string;
  studyHash: string;
  timestamp: string;
  validationIssues: any[];
}

export const mockHistoryStore: Record<string, MockHistoryItem[]> = {};
export const mockValidationStore: Record<
  string,
  { version: string; issues: any[]; studyHash: string; timestamp: string }[]
> = {};

export function resetMockVaultStore() {
  for (const key of Object.keys(mockHistoryStore)) {
    delete mockHistoryStore[key];
  }
  for (const key of Object.keys(mockValidationStore)) {
    delete mockValidationStore[key];
  }
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

  isSimulatorMode(): boolean {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    const url = (this.apiUrl || "").toLowerCase().trim();
    return (
      !url ||
      url === "https://api.vault.example.com" ||
      url === "mock" ||
      url === "simulate" ||
      url === "sandbox"
    );
  }

  private checkSimulatedError(protocolId: string, issues?: any[]) {
    const upperId = protocolId.toUpperCase();
    if (upperId === "FAIL" || upperId === "ERROR" || upperId === "INVALID") {
      throw new Error(`Simulated connection timeout error for protocol ${protocolId}`);
    }
    if (issues && issues.some((issue: any) => issue.level === "Error")) {
      throw new Error("Simulated validation sync failure: critical validation issues present");
    }
  }

  async syncValidationResults(
    protocolId: string,
    version: string,
    issues: any[],
    studyHash: string
  ) {
    if (process.env.NODE_ENV !== "production" && this.isSimulatorMode()) {
      try {
        this.checkSimulatedError(protocolId, issues);
        if (!mockValidationStore[protocolId]) {
          mockValidationStore[protocolId] = [];
        }
        mockValidationStore[protocolId].push({
          version,
          issues,
          studyHash,
          timestamp: new Date().toISOString(),
        });
        return;
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
    if (process.env.NODE_ENV !== "production" && this.isSimulatorMode()) {
      try {
        this.checkSimulatedError(protocolId, validationIssues);
        if (!mockHistoryStore[protocolId]) {
          mockHistoryStore[protocolId] = [
            {
              version: "1.0.0",
              studyHash: "abc123hash",
              timestamp: "2023-10-01T12:00:00.000Z",
              validationIssues: [],
            },
          ];
        }
        mockHistoryStore[protocolId].push({
          version,
          studyHash,
          timestamp: new Date().toISOString(),
          validationIssues,
        });
        return;
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
    if (process.env.NODE_ENV !== "production" && this.isSimulatorMode()) {
      try {
        this.checkSimulatedError(protocolId);
        if (!mockHistoryStore[protocolId]) {
          mockHistoryStore[protocolId] = [
            {
              version: "1.0.0",
              studyHash: "abc123hash",
              timestamp: "2023-10-01T12:00:00.000Z",
              validationIssues: [],
            },
          ];
        }
        return [...mockHistoryStore[protocolId]];
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
