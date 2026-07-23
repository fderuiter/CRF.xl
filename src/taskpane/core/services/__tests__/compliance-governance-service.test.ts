/**
 * @jest-environment <rootDir>/test/custom-jsdom-environment.js
 * @issue #28
 */

jest.mock("@azure/msal-browser", () => {
  return {
    PublicClientApplication: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        getAllAccounts: jest.fn().mockReturnValue([]),
        handleRedirectPromise: jest.fn().mockResolvedValue(null),
      };
    }),
  };
});

import { complianceGovernanceService } from "../compliance-governance-service";

describe("ComplianceGovernanceService", () => {
  const originalURL = window.location.href;

  afterEach(() => {
    // Reset singleton internal state
    (complianceGovernanceService as any).graphClient = null;
    (global as any).changeJSDOMURL(originalURL);
  });

  function setHostname(hostname: string) {
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      (global as any).changeJSDOMURL(`http://${hostname}:3000/taskpane.html`);
    } else {
      (global as any).changeJSDOMURL(`https://${hostname}/taskpane.html`);
    }
  }

  describe("Local Development Bypass", () => {
    it("immediately returns full compliance for local workbooks when running on localhost", async () => {
      setHostname("localhost");
      const status = await complianceGovernanceService.getEnvironmentStatus("local://document");
      expect(status.isCloudHosted).toBe(false);
      expect(status.isCompliant).toBe(true);
      expect(status.isAdmin).toBe(true);
      expect(status.versionHistoryEnabled).toBe(true);
    });

    it("immediately returns full compliance for local workbooks when running on 127.0.0.1", async () => {
      setHostname("127.0.0.1");
      const status = await complianceGovernanceService.getEnvironmentStatus("local://document");
      expect(status.isCloudHosted).toBe(false);
      expect(status.isCompliant).toBe(true);
      expect(status.isAdmin).toBe(true);
    });

    it("blocks compliance exports for local files in production deployments", async () => {
      setHostname("crf-xl.compliance-app.com");
      const status = await complianceGovernanceService.getEnvironmentStatus("local://document");
      expect(status.isCloudHosted).toBe(false);
      expect(status.isCompliant).toBe(false);
      expect(status.isAdmin).toBe(false);
      expect(status.versionHistoryEnabled).toBe(false);
    });
  });

  describe("Resilient Cloud Compliance & Fallbacks", () => {
    const mockDriveItem = {
      id: "drive-item-id",
      parentReference: {
        driveId: "drive-id",
        siteId: "site-id",
      },
    };

    const mockList = {
      id: "list-id",
      list: {
        enableVersioning: true,
        requireCheckout: false,
      },
    };

    function createMockGraphClient(responses: Record<string, any>) {
      const mockApi = (url: string) => {
        const chain: any = {
          expand: jest.fn().mockImplementation(() => chain),
          top: jest.fn().mockImplementation(() => chain),
          get: async () => {
            const matchedKey = Object.keys(responses)
              .sort((a, b) => b.length - a.length)
              .find((key) => url.includes(key));
            if (matchedKey) {
              const res = responses[matchedKey];
              if (res instanceof Error) throw res;
              return res;
            }
            throw new Error(`No mock response for Graph API URL: ${url}`);
          },
          patch: async () => {
            return {};
          },
          post: async () => {
            return {};
          },
        };
        return chain;
      };

      return {
        api: mockApi,
      } as any;
    }

    it("returns compliant status for administrative user when site configurations are correct", async () => {
      const client = createMockGraphClient({
        driveItem: mockDriveItem,
        list: mockList,
        columns: {
          value: [{ name: "GovernanceSummary" }, { name: "JustificationCount" }],
        },
        permissions: { value: [] }, // permissions check passes (admin)
      });
      (complianceGovernanceService as any).graphClient = client;

      const status = await complianceGovernanceService.getEnvironmentStatus(
        "https://sharepoint.com/doc.xlsx"
      );
      expect(status.isCloudHosted).toBe(true);
      expect(status.isAdmin).toBe(true);
      expect(status.isCompliant).toBe(true);
      expect(status.versionHistoryEnabled).toBe(true);
      expect(status.checkoutRequired).toBe(false);
      expect(status.hasGovernanceSummaryColumn).toBe(true);
      expect(status.hasJustificationCountColumn).toBe(true);
    });

    it("returns non-compliant status for administrative user if versioning is disabled", async () => {
      const client = createMockGraphClient({
        driveItem: mockDriveItem,
        list: {
          id: "list-id",
          list: {
            enableVersioning: false,
            requireCheckout: false,
          },
        },
        columns: {
          value: [{ name: "GovernanceSummary" }, { name: "JustificationCount" }],
        },
        permissions: { value: [] },
      });
      (complianceGovernanceService as any).graphClient = client;

      const status = await complianceGovernanceService.getEnvironmentStatus(
        "https://sharepoint.com/doc.xlsx"
      );
      expect(status.isCloudHosted).toBe(true);
      expect(status.isAdmin).toBe(true);
      expect(status.isCompliant).toBe(false);
      expect(status.versionHistoryEnabled).toBe(false);
    });

    it("marks environment as compliant for non-admin user if required metadata columns pre-exist", async () => {
      const client = createMockGraphClient({
        driveItem: mockDriveItem,
        list: mockList,
        columns: {
          value: [{ name: "GovernanceSummary" }, { name: "JustificationCount" }],
        },
        permissions: new Error("Permission Denied"), // permissions query fails => non-admin
      });
      (complianceGovernanceService as any).graphClient = client;

      const status = await complianceGovernanceService.getEnvironmentStatus(
        "https://sharepoint.com/doc.xlsx"
      );
      expect(status.isCloudHosted).toBe(true);
      expect(status.isAdmin).toBe(false);
      expect(status.isCompliant).toBe(true); // Fallback logic is active!
      expect(status.hasGovernanceSummaryColumn).toBe(true);
      expect(status.hasJustificationCountColumn).toBe(true);
    });

    it("marks environment as non-compliant for non-admin user if metadata columns are missing", async () => {
      const client = createMockGraphClient({
        driveItem: mockDriveItem,
        list: mockList,
        columns: {
          value: [], // Missing both columns
        },
        permissions: new Error("Permission Denied"),
      });
      (complianceGovernanceService as any).graphClient = client;

      const status = await complianceGovernanceService.getEnvironmentStatus(
        "https://sharepoint.com/doc.xlsx"
      );
      expect(status.isCloudHosted).toBe(true);
      expect(status.isAdmin).toBe(false);
      expect(status.isCompliant).toBe(false);
      expect(status.hasGovernanceSummaryColumn).toBe(false);
      expect(status.hasJustificationCountColumn).toBe(false);
    });
  });
});
