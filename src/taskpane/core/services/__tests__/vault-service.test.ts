import { VaultService, resetMockVaultStore, mockValidationStore } from "../vault-service";
import { DiagnosticError } from "../diagnostic-framework";

jest.mock("../app-orchestrator", () => ({
  appOrchestrator: {
    updateState: jest.fn(),
  },
}));

describe("VaultService - In-Memory Simulator Mode", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeAll(() => {
    // Preserve environment
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // Restore environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    resetMockVaultStore();
    // Reset process.env properties we test
    delete process.env.VAULT_API_URL;
    delete process.env.VAULT_API_KEY;
    process.env.NODE_ENV = "test";
  });

  describe("Activation Rules", () => {
    it("should toggle to simulator mode if VAULT_API_URL is unconfigured", () => {
      const service = new VaultService();
      expect(service.isSimulatorMode()).toBe(true);
    });

    it("should toggle to simulator mode if VAULT_API_URL is the default placeholder", () => {
      process.env.VAULT_API_URL = "https://api.vault.example.com";
      const service = new VaultService();
      expect(service.isSimulatorMode()).toBe(true);
    });

    it("should toggle to simulator mode if VAULT_API_URL is set to 'mock', 'simulate' or 'sandbox'", () => {
      for (const token of ["mock", "simulate", "sandbox", "  mock  ", "SIMULATE"]) {
        process.env.VAULT_API_URL = token;
        const service = new VaultService({ apiUrl: token });
        expect(service.isSimulatorMode()).toBe(true);
      }
    });

    it("should NOT toggle to simulator mode if VAULT_API_URL is a real external service URL", () => {
      process.env.VAULT_API_URL = "https://api.gxp-vault.com";
      const service = new VaultService();
      expect(service.isSimulatorMode()).toBe(false);
    });

    it("should NOT toggle to simulator mode in production builds even if placeholder/mock token is used", () => {
      process.env.NODE_ENV = "production";
      const service = new VaultService();
      expect(service.isSimulatorMode()).toBe(false);
    });
  });

  describe("In-Memory Storage & Interception", () => {
    it("should sync validation results in-memory and not trigger fetch", async () => {
      const fetchSpy = jest.spyOn(globalThis, "fetch");
      const service = new VaultService();

      const issues = [{ level: "Warning", message: "A minor warning" }];
      await service.syncValidationResults("STUDY-123", "1.1.0", issues, "somehash");

      // Verify fetch was bypassed
      expect(fetchSpy).not.toHaveBeenCalled();

      // Verify in-memory storage contains the synced results
      expect(mockValidationStore["STUDY-123"]).toBeDefined();
      expect(mockValidationStore["STUDY-123"].length).toBe(1);
      expect(mockValidationStore["STUDY-123"][0]).toEqual(
        expect.objectContaining({
          version: "1.1.0",
          issues,
          studyHash: "somehash",
        })
      );

      fetchSpy.mockRestore();
    });

    it("should initialize default base history when getHistory is called for a new study", async () => {
      const service = new VaultService();
      const history = await service.getHistory("STUDY-ABC");

      expect(history).toBeDefined();
      expect(history.length).toBe(1);
      expect(history[0]).toEqual({
        version: "1.0.0",
        studyHash: "abc123hash",
        timestamp: "2023-10-01T12:00:00.000Z",
        validationIssues: [],
      });
    });

    it("should update version history dynamically when a new version is frozen", async () => {
      const service = new VaultService();

      // First retrieve history to initialize base history
      const history1 = await service.getHistory("STUDY-999");
      expect(history1.length).toBe(1);

      // Freeze a new version
      const validationIssues = [{ level: "Warning", message: "Check variables" }];
      await service.freezeVersion("STUDY-999", "2.0.0", "newhash999", validationIssues);

      // Retrieve history again and verify dynamic update
      const history2 = await service.getHistory("STUDY-999");
      expect(history2.length).toBe(2);
      expect(history2[0].version).toBe("1.0.0"); // Base history remains
      expect(history2[1]).toEqual(
        expect.objectContaining({
          version: "2.0.0",
          studyHash: "newhash999",
          validationIssues,
        })
      );
    });
  });

  describe("Simulated Client-Side Error Propagation", () => {
    it("should throw connection timeout errors for protocol IDs like FAIL, ERROR, or INVALID", async () => {
      const service = new VaultService();

      await expect(service.getHistory("FAIL")).rejects.toThrow(DiagnosticError);

      await expect(service.freezeVersion("ERROR", "1.0.0", "hash", [])).rejects.toThrow(
        DiagnosticError
      );

      await expect(service.syncValidationResults("INVALID", "1.0.0", [], "hash")).rejects.toThrow(
        DiagnosticError
      );
    });

    it("should throw simulated sync errors if critical validation issues are present", async () => {
      const service = new VaultService();

      const criticalIssues = [{ level: "Error", message: "Missing required Variable Name" }];

      // syncValidationResults check
      await expect(
        service.syncValidationResults("STUDY-1", "1.0.0", criticalIssues, "hash")
      ).rejects.toThrow(DiagnosticError);

      // freezeVersion check
      await expect(
        service.freezeVersion("STUDY-1", "1.0.0", "hash", criticalIssues)
      ).rejects.toThrow(DiagnosticError);
    });
  });
});
