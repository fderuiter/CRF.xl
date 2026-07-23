import { VaultClient } from "../client";
import { sha256Native, computeStudyHash } from "../crypto-utils";

describe("Vault SDK", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("VaultClient initialization", () => {
    it("should initialize with default API URL when none is provided", () => {
      const client = new VaultClient({ apiKey: "test-key" });
      expect((client as any).apiUrl).toBe("https://api.vault.example.com");
      expect((client as any).apiKey).toBe("test-key");
    });

    it("should initialize with custom API URL", () => {
      const client = new VaultClient({ apiUrl: "https://custom.vault.com", apiKey: "test-key" });
      expect((client as any).apiUrl).toBe("https://custom.vault.com");
      expect((client as any).apiKey).toBe("test-key");
    });
  });

  describe("syncValidationResults", () => {
    it("should perform sync with automatic study hashing and correct headers", async () => {
      const client = new VaultClient({
        apiUrl: "https://api.test-vault.com",
        apiKey: "secret-token",
      });
      const studyPayload = { metadata: { protocolId: "P001" }, forms: [] };
      const expectedHash = await computeStudyHash(studyPayload);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      } as Response);

      const issues = [{ severity: "error", message: "invalid form" }];
      const result = await client.syncValidationResults("P001", "1.0", issues, studyPayload);

      expect(result).toEqual({ success: true });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test-vault.com/api/v1/studies/P001/validation",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer secret-token",
          },
          body: expect.any(String),
        })
      );

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(sentBody.version).toBe("1.0");
      expect(sentBody.issues).toEqual(issues);
      expect(sentBody.studyHash).toBe(expectedHash);
      expect(sentBody.timestamp).toBeDefined();
    });

    it("should support pre-computed 64-char hex hash strings directly", async () => {
      const client = new VaultClient({
        apiUrl: "https://api.test-vault.com",
        apiKey: "secret-token",
      });
      const precomputedHash = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f61234";

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      } as Response);

      await client.syncValidationResults("P001", "1.0", [], precomputedHash);

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(sentBody.studyHash).toBe(precomputedHash);
    });

    it("should throw error if fetch response is not ok", async () => {
      const client = new VaultClient({
        apiUrl: "https://api.test-vault.com",
        apiKey: "secret-token",
      });
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(client.syncValidationResults("P001", "1.0", [], {})).rejects.toThrow("HTTP 500");
    });
  });

  describe("freezeVersion", () => {
    it("should freeze version with automatic payload hashing and correct parameters", async () => {
      const client = new VaultClient({
        apiUrl: "https://api.test-vault.com",
        apiKey: "secret-token",
      });
      const studyPayload = { metadata: { protocolId: "P001" }, forms: [] };
      const expectedHash = await computeStudyHash(studyPayload);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ frozen: true }),
      } as Response);

      const validationIssues = [{ severity: "warning" }];
      const result = await client.freezeVersion("P001", "1.0", studyPayload, validationIssues);

      expect(result).toEqual({ frozen: true });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test-vault.com/api/v1/studies/P001/freeze",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer secret-token",
          },
          body: expect.any(String),
        })
      );

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(sentBody.version).toBe("1.0");
      expect(sentBody.studyHash).toBe(expectedHash);
      expect(sentBody.validationIssues).toEqual(validationIssues);
      expect(sentBody.timestamp).toBeDefined();
    });

    it("should throw error if freeze response is not ok", async () => {
      const client = new VaultClient({
        apiUrl: "https://api.test-vault.com",
        apiKey: "secret-token",
      });
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response);

      await expect(client.freezeVersion("P001", "1.0", {}, [])).rejects.toThrow("HTTP 400");
    });
  });

  describe("getHistory", () => {
    it("should fetch history list with correct GET request", async () => {
      const client = new VaultClient({
        apiUrl: "https://api.test-vault.com",
        apiKey: "secret-token",
      });
      const mockHistory = [{ version: "1.0", studyHash: "abc", timestamp: "2026-07-23T10:00:00Z" }];

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      } as Response);

      const result = await client.getHistory("P001");

      expect(result).toEqual(mockHistory);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test-vault.com/api/v1/studies/P001/history",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer secret-token",
          },
        })
      );
    });

    it("should throw error if getHistory response is not ok", async () => {
      const client = new VaultClient({
        apiUrl: "https://api.test-vault.com",
        apiKey: "secret-token",
      });
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(client.getHistory("P001")).rejects.toThrow("HTTP 404");
    });
  });

  describe("Isomorphic SHA-256 Hashing", () => {
    it("should generate deterministic sha256 hex string", async () => {
      const hash1 = await sha256Native("hello world");
      const hash2 = await sha256Native("hello world");
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should hash study payload objects consistently", async () => {
      const study1 = { key: "value", nested: { array: [1, 2, 3] } };
      const study2 = { key: "value", nested: { array: [1, 2, 3] } };
      const hash1 = await computeStudyHash(study1);
      const hash2 = await computeStudyHash(study2);
      expect(hash1).toBe(hash2);
    });
  });
});
