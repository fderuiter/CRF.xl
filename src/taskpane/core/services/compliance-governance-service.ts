/* global window, console, btoa, URL, Office */
/**
 * @issue #28
 */

import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { Client } from "@microsoft/microsoft-graph-client";

export interface AuditJustification {
  reason: string;
  userId: string;
  timestamp: string;
}

export interface EnvironmentComplianceStatus {
  isCloudHosted: boolean;
  documentUrl: string;
  siteId?: string;
  driveId?: string;
  listId?: string;
  versionHistoryEnabled: boolean;
  checkoutRequired: boolean;
  hasGovernanceSummaryColumn: boolean;
  hasJustificationCountColumn: boolean;
  isAdmin: boolean;
  isCompliant: boolean;
}

export class ComplianceGovernanceService {
  private msalInstance: PublicClientApplication;
  private graphClient: Client | null = null;
  private account: any = null;
  private pendingSync: {
    documentUrl: string;
    justifications: Record<string, AuditJustification>;
  } | null = null;

  constructor(clientId: string = "PLACEHOLDER_CLIENT_ID") {
    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: clientId,
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin + "/taskpane.html",
      },
      cache: {
        cacheLocation: "localStorage",
      },
    });
  }

  public async initialize() {
    await this.msalInstance.initialize();
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      this.account = accounts[0];
      this.setupGraphClient();
      this.processPendingSync();
    }
  }

  public async login() {
    const request = { scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All"] };
    try {
      const response = await this.msalInstance.loginPopup(request);
      this.account = response.account;
      this.setupGraphClient();
      this.processPendingSync();
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  }

  private setupGraphClient() {
    this.graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const request = {
            scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All"],
            account: this.account,
          };
          let response;
          try {
            response = await this.msalInstance.acquireTokenSilent(request);
          } catch (e) {
            if (e instanceof InteractionRequiredAuthError) {
              response = await this.msalInstance.acquireTokenPopup(request);
            } else {
              throw e;
            }
          }
          done(null, response.accessToken);
        } catch (error) {
          done(error as any, null);
        }
      },
    });
  }

  public get isAuthenticated() {
    return !!this.account;
  }

  public async getEnvironmentStatus(documentUrl: string): Promise<EnvironmentComplianceStatus> {
    const isCloudHosted = documentUrl.startsWith("http://") || documentUrl.startsWith("https://");

    if (!isCloudHosted || !this.graphClient) {
      return {
        isCloudHosted,
        documentUrl,
        versionHistoryEnabled: false,
        checkoutRequired: false,
        hasGovernanceSummaryColumn: false,
        hasJustificationCountColumn: false,
        isAdmin: false,
        isCompliant: false,
      };
    }

    try {
      // Very simplified approach: we can try to extract hostname and path,
      // but to get the drive/list reliably from a document URL via Graph API is tricky.
      // We will mock the Graph resolution for the document URL or make a best-effort API call.

      // Let's assume we can get the site by hostname and path if it's SharePoint
      
      
      
      // Just an example, let's say /sites/SiteName
      

      // We can use the Graph API to search for the site or just do a generic call
      // In a real app we might use shares API: GET /shares/{base64-encoded-url}/driveItem
      const encodedUrl = btoa(documentUrl)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const driveItem = await this.graphClient
        .api(`/shares/u!${encodedUrl}/driveItem`)
        .expand("drive")
        .get();

      const driveId = driveItem.parentReference.driveId;
      const siteId = driveItem.parentReference.siteId;

      // To get list settings (versioning, checkout), we need the list associated with the drive
      const list = await this.graphClient.api(`/sites/${siteId}/drives/${driveId}/list`).get();
      const listId = list.id;

      // In Microsoft Graph, list settings like EnableVersioning and RequireCheckout are in list/list
      const listInfo = list.list;
      // Note: OData list property may contain these details or we might need to look at specific list properties
      // Actually, listInfo.contentTypesEnabled etc. Graph Beta might have more.
      // We'll mock the extraction if it's missing.

      const versionHistoryEnabled = listInfo?.enableVersioning ?? false;
      const checkoutRequired = listInfo?.requireCheckout ?? false;

      let hasGovernanceSummaryColumn = false;
      let hasJustificationCountColumn = false;
      try {
        const columns = await this.graphClient
          .api(`/sites/${siteId}/lists/${listId}/columns`)
          .get();
        if (columns && columns.value) {
          hasGovernanceSummaryColumn = columns.value.some(
            (c: any) => c.name === "GovernanceSummary"
          );
          hasJustificationCountColumn = columns.value.some(
            (c: any) => c.name === "JustificationCount"
          );
        }
      } catch (colErr) {
        console.warn("Failed to fetch columns", colErr);
      }

      let isAdmin = false;
      try {
        await this.graphClient.api(`/sites/${siteId}/permissions`).top(1).get();
        isAdmin = true;
      } catch (e) {
        isAdmin = false;
      }

      // Compliant if version history is enabled, check-out is NOT required, and required columns exist
      const isCompliant =
        versionHistoryEnabled &&
        !checkoutRequired &&
        hasGovernanceSummaryColumn &&
        hasJustificationCountColumn;

      return {
        isCloudHosted,
        documentUrl,
        siteId,
        driveId,
        listId,
        versionHistoryEnabled,
        checkoutRequired,
        hasGovernanceSummaryColumn,
        hasJustificationCountColumn,
        isAdmin,
        isCompliant,
      };
    } catch (error) {
      console.error("Error fetching environment status from Graph", error);
      // Fallback
      return {
        isCloudHosted,
        documentUrl,
        versionHistoryEnabled: false,
        checkoutRequired: false,
        hasGovernanceSummaryColumn: false,
        hasJustificationCountColumn: false,
        isAdmin: false,
        isCompliant: false,
      };
    }
  }

  public async remediateSettings(
    siteId: string,
    listId: string,
    missingGovernanceSummary: boolean = false,
    missingJustificationCount: boolean = false
  ) {
    if (!this.graphClient) throw new Error("Graph client not initialized");

    // Update the list to enable versioning and disable required checkout
    await this.graphClient.api(`/sites/${siteId}/lists/${listId}`).patch({
      list: {
        enableVersioning: true,
        requireCheckout: false,
      },
    });

    if (missingGovernanceSummary) {
      try {
        await this.graphClient.api(`/sites/${siteId}/lists/${listId}/columns`).post({
          name: "GovernanceSummary",
          text: {},
        });
      } catch (e) {
        console.warn("Could not create GovernanceSummary", e);
      }
    }

    if (missingJustificationCount) {
      try {
        await this.graphClient.api(`/sites/${siteId}/lists/${listId}/columns`).post({
          name: "JustificationCount",
          number: {},
        });
      } catch (e) {
        console.warn("Could not create JustificationCount", e);
      }
    }
  }

  public async loadJustificationsFromWorkbook(): Promise<Record<string, AuditJustification>> {
    return await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject("_Justifications");
      sheet.load("name");
      await context.sync();

      if (sheet.isNullObject) {
        return {};
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load("values");
      await context.sync();

      if (usedRange.isNullObject || !usedRange.values || usedRange.values.length <= 1) {
        return {};
      }

      const justifications: Record<string, AuditJustification> = {};
      const rows = usedRange.values.slice(1); // Skip header

      for (const row of rows) {
        const [key, reason, userId, timestamp] = row;
        if (key && reason) {
          justifications[key] = {
            reason: String(reason),
            userId: String(userId || ""),
            timestamp: String(timestamp || ""),
          };
        }
      }

      return justifications;
    });
  }

  public async saveJustificationsToWorkbook(
    justifications: Record<string, AuditJustification>
  ): Promise<void> {
    const SHEET_PROTECTION_PASSWORD = "SystemManagedPassword_123!";

    await Excel.run(async (context) => {
      let sheet = context.workbook.worksheets.getItemOrNullObject("_Justifications");
      sheet.load("name");
      await context.sync();

      let existingJustifications: Record<string, AuditJustification> = {};

      if (sheet.isNullObject) {
        sheet = context.workbook.worksheets.add("_Justifications");
      } else {
        sheet.protection.unprotect(SHEET_PROTECTION_PASSWORD);
        const usedRange = sheet.getUsedRangeOrNullObject();
        usedRange.load("values");
        await context.sync();

        if (!usedRange.isNullObject && usedRange.values && usedRange.values.length > 1) {
          const rows = usedRange.values.slice(1);
          for (const row of rows) {
            const [key, reason, userId, timestamp] = row;
            if (key && reason) {
              existingJustifications[key] = {
                reason: String(reason),
                userId: String(userId || ""),
                timestamp: String(timestamp || ""),
              };
            }
          }
        }
        usedRange.clear();
      }

      // Merge new justifications over existing to avoid overwrites during concurrent edits
      const mergedJustifications = { ...existingJustifications, ...justifications };

      const keys = Object.keys(mergedJustifications);
      const data: any[][] = [["ItemKey", "Reason", "UserId", "Timestamp"]];

      for (const key of keys) {
        const j = mergedJustifications[key];
        data.push([key, j.reason, j.userId, j.timestamp]);
      }

      const range = sheet.getRangeByIndexes(0, 0, data.length, 4);
      range.values = data;
      range.format.autofitColumns();

      // Make it visible or hidden but not veryHidden for auditor accessibility
      sheet.visibility = Excel.SheetVisibility.visible;

      sheet.protection.protect(
        {
          allowAutoFilter: true,
          allowSort: true,
        },
        SHEET_PROTECTION_PASSWORD
      );

      await context.sync();
    });
  }

  private syncTimeout: any = null;

  public syncSharePointMetadata(
    documentUrl: string,
    justifications: Record<string, AuditJustification>
  ): void {
    const isCloudHosted = documentUrl.startsWith("http://") || documentUrl.startsWith("https://");
    if (!isCloudHosted) return;

    this.pendingSync = { documentUrl, justifications };

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    // Debounce to batch calls and not degrade performance
    this.syncTimeout = setTimeout(async () => {
      if (!this.graphClient || !this.pendingSync) {
        return;
      }

      try {
        const { documentUrl: url, justifications: justs } = this.pendingSync;
        const count = Object.keys(justs).length;
        const recentChange = Object.values(justs).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        const summaryText =
          count > 0
            ? `${count} justifications recorded. Last update: ${recentChange?.timestamp}`
            : "No justifications.";

        const encodedUrl = btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const driveItem = await this.graphClient.api(`/shares/u!${encodedUrl}/driveItem`).get();

        // Update listItem associated with this file
        await this.graphClient
          .api(`/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/listItem/fields`)
          .patch({
            GovernanceSummary: summaryText, // Custom column Name
            JustificationCount: count, // Custom column Name
          });

        if (this.pendingSync?.documentUrl === url) {
          this.pendingSync = null;
        }
      } catch (error) {
        console.warn("Failed to sync SharePoint metadata for justifications", error);
      }
    }, 1000);
  }

  private async processPendingSync() {
    if (this.pendingSync && this.graphClient) {
      const { documentUrl, justifications } = this.pendingSync;
      this.pendingSync = null; // Clear to prevent infinite loop on failure
      await this.syncSharePointMetadata(documentUrl, justifications);
    }
  }
}

export const complianceGovernanceService = new ComplianceGovernanceService();
