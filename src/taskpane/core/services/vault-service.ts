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
      await fetch(`${this.apiUrl}/api/v1/studies/${protocolId}/validation`, {
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
    } catch (e) {
      console.error("Vault sync failed", e);
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
      await fetch(`${this.apiUrl}/api/v1/studies/${protocolId}/freeze`, {
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
    } catch (e) {
      console.error("Vault freeze failed", e);
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
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error("Vault history fetch failed", e);
    }
    return [];
  }
}
