/* global window, console, btoa, URL, Office */
/**
 * @issue #28
 */

import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { Client } from "@microsoft/microsoft-graph-client";

export interface EnvironmentComplianceStatus {
  isCloudHosted: boolean;
  documentUrl: string;
  siteId?: string;
  driveId?: string;
  listId?: string;
  versionHistoryEnabled: boolean;
  checkoutRequired: boolean;
  isCompliant: boolean;
}

export class ComplianceGovernanceService {
  private msalInstance: PublicClientApplication;
  private graphClient: Client | null = null;
  private account: any = null;

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
    }
  }

  public async login() {
    const request = { scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All"] };
    try {
      const response = await this.msalInstance.loginPopup(request);
      this.account = response.account;
      this.setupGraphClient();
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
        isCompliant: false,
      };
    }

    try {
      // Very simplified approach: we can try to extract hostname and path,
      // but to get the drive/list reliably from a document URL via Graph API is tricky.
      // We will mock the Graph resolution for the document URL or make a best-effort API call.

      // Let's assume we can get the site by hostname and path if it's SharePoint
      const urlObj = new URL(documentUrl);
      const hostname = urlObj.hostname;
      const pathSegments = urlObj.pathname.split("/");
      // Just an example, let's say /sites/SiteName
      let sitePath = `/${pathSegments[1]}/${pathSegments[2]}`;

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

      // Compliant if version history is enabled and check-out is NOT required (or required is fine? "disabling check-out requirements if they interfere with the audit trail")
      const isCompliant = versionHistoryEnabled && !checkoutRequired;

      return {
        isCloudHosted,
        documentUrl,
        siteId,
        driveId,
        listId,
        versionHistoryEnabled,
        checkoutRequired,
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
        isCompliant: false,
      };
    }
  }

  public async remediateSettings(siteId: string, listId: string) {
    if (!this.graphClient) throw new Error("Graph client not initialized");

    // Update the list to enable versioning and disable required checkout
    await this.graphClient.api(`/sites/${siteId}/lists/${listId}`).patch({
      list: {
        enableVersioning: true,
        requireCheckout: false,
      },
    });
  }
}

export const complianceGovernanceService = new ComplianceGovernanceService();
