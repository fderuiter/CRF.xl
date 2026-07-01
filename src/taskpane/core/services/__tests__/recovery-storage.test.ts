/**
 * @issue #28
 */
/* eslint-disable no-undef */
import {
  RECOVERY_STORAGE_KEY,
  RECOVERY_SNAPSHOT_TTL_MS,
  createRecoverySnapshot,
  hasWorkbookChanged,
  persistRecoverySnapshot,
  readRecoverySnapshot,
  summarizeStudyDesign,
} from "../recovery-storage";
import { StudyDesign } from "../../types";
import { ValidationIssue } from "../../types";

function createMockStorage(initialData: Record<string, string> = {}) {
  const state = new Map<string, string>(Object.entries(initialData));
  return {
    getItem: (key: string) => state.get(key) ?? null,
    setItem: (key: string, value: string) => {
      state.set(key, value);
    },
    removeItem: (key: string) => {
      state.delete(key);
    },
  };
}

describe("recovery-storage", () => {
  const mockStudy: StudyDesign = {
    metadata: {
      protocolId: "P-001",
      studyName: "Recovery Study",
      version: "1.0",
      defaultLanguage: "en-US",
    },
    events: [
      {
        eventOid: "V1",
        eventName: "Visit 1",
        eventType: "Scheduled" as any,
        orderNumber: 1,
        forms: [],
      },
      {
        eventOid: "V2",
        eventName: "Visit 2",
        eventType: "Scheduled" as any,
        orderNumber: 2,
        forms: [],
      },
    ],
    forms: {
      F1: {
        formOid: "F1",
        formName: "Form 1",
        repeatable: false,
        itemGroups: [{ items: [{ itemOid: "A" }, { itemOid: "B" }] }],
      } as any,
      F2: {
        formOid: "F2",
        formName: "Form 2",
        repeatable: false,
        itemGroups: [{ items: [{ itemOid: "C" }] }],
      } as any,
    },
    codelists: {},
  };

  const issues: ValidationIssue[] = [
    {
      level: "Error",
      message: "Missing Variable Name.",
      location: "F1 > Row 2",
      sheetName: "F1",
      rowIndex: 2,
    },
    { level: "Warning", message: "Display warning", location: "F2 > X", sheetName: "F2" },
  ];

  it("creates a snapshot with analysis and UI summaries", () => {
    const summary = summarizeStudyDesign(mockStudy);
    const snapshot = createRecoverySnapshot({
      issues,
      studySummary: summary,
      openForm: "F1",
      currentFilter: "F1",
      analyzedAt: 12345,
    });

    expect(snapshot.studySummary).toEqual({
      formCount: 2,
      variableCount: 3,
      visitCount: 2,
    });
    expect(snapshot.validationSummary).toEqual({
      totalIssues: 2,
      errorCount: 1,
      warningCount: 1,
      analyzedAt: 12345,
    });
    expect(snapshot.uiState).toEqual({ openForm: "F1", currentFilter: "F1" });
    expect(snapshot.issues).toHaveLength(2);
  });

  it("clears corrupt snapshots during load", () => {
    const storage = createMockStorage({ [RECOVERY_STORAGE_KEY]: "{not-json" });
    const snapshot = readRecoverySnapshot({ storage });
    expect(snapshot).toBeNull();
    expect(storage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
  });

  it("expires old snapshots based on TTL", () => {
    const storage = createMockStorage();
    const snapshot = createRecoverySnapshot({
      issues,
      studySummary: summarizeStudyDesign(mockStudy),
    });
    storage.setItem(
      RECOVERY_STORAGE_KEY,
      JSON.stringify({
        ...snapshot,
        savedAt: Date.now() - RECOVERY_SNAPSHOT_TTL_MS - 1,
      })
    );

    const restored = readRecoverySnapshot({ storage });
    expect(restored).toBeNull();
    expect(storage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
  });

  it("reports quota failures without throwing", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw { name: "QuotaExceededError" };
      },
      removeItem: () => undefined,
    };
    const snapshot = createRecoverySnapshot({
      issues,
      studySummary: summarizeStudyDesign(mockStudy),
    });
    const result = persistRecoverySnapshot(snapshot, storage);
    expect(result).toEqual({ saved: false, reason: "quota-exceeded" });
  });

  it("returns null when storage getItem throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    expect(readRecoverySnapshot({ storage })).toBeNull();
  });

  it("sanitizes recovery messages containing clinical data before storage", () => {
    const clinicalIssues: ValidationIssue[] = [
      {
        level: "Error",
        message: "Invalid value 'John Doe' in cell A1",
        location: "F1 > Row 2",
        sheetName: "F1",
      },
      {
        level: "Warning",
        message: 'Value "HIV+" is not allowed here',
        location: "F2 > Row 1",
        sheetName: "F2",
      },
    ];

    const snapshot = createRecoverySnapshot({
      issues: clinicalIssues,
      studySummary: summarizeStudyDesign(mockStudy),
    });

    expect(snapshot.issues[0].message).toBe("Invalid value '[REDACTED]' in cell A1");
    expect(snapshot.issues[1].message).toBe('Value "[REDACTED]" is not allowed here');
  });

  it("rejects restoring a session when an unauthorized field is manually injected into storage", () => {
    const storage = createMockStorage();
    const snapshot = createRecoverySnapshot({
      issues,
      studySummary: summarizeStudyDesign(mockStudy),
    });

    // Inject unauthorized field
    const taintedSnapshot = {
      ...snapshot,
      unauthorizedData: "secret clinical info",
    };

    storage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(taintedSnapshot));

    const restored = readRecoverySnapshot({ storage });
    expect(restored).toBeNull();
    // Storage should be cleared because schema validation fails
    expect(storage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
  });

  it("detects workbook shape changes between snapshot and current workbook", () => {
    expect(
      hasWorkbookChanged(
        { sheetCount: 2, sheetNames: ["_Study", "F1"] },
        { sheetCount: 2, sheetNames: ["_Study", "F1"] }
      )
    ).toBe(false);

    expect(
      hasWorkbookChanged(
        { sheetCount: 2, sheetNames: ["_Study", "F1"] },
        { sheetCount: 3, sheetNames: ["_Study", "F1", "F2"] }
      )
    ).toBe(true);
  });
});
