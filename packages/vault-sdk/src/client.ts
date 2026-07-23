import { computeStudyHash } from "./crypto-utils";

/**
 * Configuration options for initializing the VaultClient.
 */
export interface VaultConfig {
  /**
   * The base URL of the Vault Service API.
   * @default "https://api.vault.example.com"
   */
  apiUrl?: string;

  /**
   * The API key/token used for authenticating with the Vault Service.
   */
  apiKey?: string;
}

/**
 * A lightweight, isomorphic client for integrating with the Vault Service.
 * Works seamlessly in both web browsers and Node.js environments.
 */
export class VaultClient {
  private apiUrl: string;
  private apiKey: string;

  /**
   * Initializes a new instance of the VaultClient.
   * @param config Configuration options.
   */
  constructor(config: VaultConfig) {
    this.apiUrl = config.apiUrl || "https://api.vault.example.com";
    this.apiKey = config.apiKey || "";
  }

  /**
   * Helper to resolve either a raw study payload or a pre-computed hash string.
   */
  private async resolveStudyHash(studyPayload: string | Record<string, any>): Promise<string> {
    if (typeof studyPayload === "string") {
      // If it is exactly 64 hex characters, it could be a precomputed hash.
      if (/^[a-fA-F0-9]{64}$/.test(studyPayload)) {
        return studyPayload;
      }
    }
    return computeStudyHash(studyPayload);
  }

  /**
   * Synchronizes clinical validation issues with the Vault Service.
   * Automatically hashes the study payload in the background before sending.
   *
   * @param protocolId The unique identifier of the protocol/study.
   * @param version The current version string of the study design.
   * @param issues List of validation issues.
   * @param studyPayload The raw study design object or its stringified payload.
   * @returns A promise that resolves to the parsed JSON response from the API.
   */
  async syncValidationResults(
    protocolId: string,
    version: string,
    issues: any[],
    studyPayload: string | Record<string, any>
  ): Promise<any> {
    const studyHash = await this.resolveStudyHash(studyPayload);
    const url = `${this.apiUrl}/api/v1/studies/${protocolId}/validation`;
    const response = await fetch(url, {
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
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text };
    }
  }

  /**
   * Freezes the current version of the study state in the Vault Service.
   * Automatically hashes the study payload in the background before sending.
   *
   * @param protocolId The unique identifier of the protocol/study.
   * @param version The current version string to freeze.
   * @param studyPayload The raw study design object or its stringified payload.
   * @param validationIssues List of validation issues associated with this version.
   * @returns A promise that resolves to the parsed JSON response from the API.
   */
  async freezeVersion(
    protocolId: string,
    version: string,
    studyPayload: string | Record<string, any>,
    validationIssues: any[]
  ): Promise<any> {
    const studyHash = await this.resolveStudyHash(studyPayload);
    const url = `${this.apiUrl}/api/v1/studies/${protocolId}/freeze`;
    const response = await fetch(url, {
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
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text };
    }
  }

  /**
   * Fetches the audit version history for a given protocol from the Vault Service.
   *
   * @param protocolId The unique identifier of the protocol/study.
   * @returns A promise that resolves directly to the parsed JSON array of history items.
   */
  async getHistory(protocolId: string): Promise<any[]> {
    const url = `${this.apiUrl}/api/v1/studies/${protocolId}/history`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  }
}
