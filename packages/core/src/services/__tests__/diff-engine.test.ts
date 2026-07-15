/**
 * @issue #28
 */
/** @jest-environment node */
/* global describe, it, expect */
import { DataType, EventType, RuleType, StudyDesign } from "../../types";
import { diffStudyDesigns } from "../diff-engine";

// ---------------------------------------------------------------------------
// Minimal study factory helpers
// ---------------------------------------------------------------------------

function makeMinimalStudy(overrides: Partial<StudyDesign> = {}): StudyDesign {
  return {
    metadata: {
      protocolId: "PROT-001",
      studyName: "Test Study",
      version: "1.0",
      defaultLanguage: "en-US",
    },
    events: [
      {
        eventOid: "V1",
        eventName: "Visit 1",
        orderNumber: 1,
        eventType: EventType.SCHEDULED,
        forms: [{ formOid: "DM", orderNumber: 1, mandatory: true }],
      },
    ],
    forms: {
      DM: {
        formOid: "DM",
        formName: "Demographics",
        orderNumber: 1,
        repeating: false,
        effectiveVersion: "1.0",
        itemGroups: [
          {
            groupOid: "DM_GRP",
            name: "Default Group",
            repeating: false,
            orderNumber: 1,
            items: [
              {
                formOid: "DM",
                groupOid: "DM_GRP",
                itemOid: "SEX",
                name: "SEX",
                orderNumber: 1,
                effectiveVersion: "1.0",
                label: { "en-US": "Sex" },
                dataType: DataType.CODELIST,
                codelistId: "SEX_CL",
                validation: { required: true },
              },
            ],
          },
        ],
      },
    },
    codelists: {
      SEX_CL: {
        codelistId: "SEX_CL",
        codelistName: "Sex",
        dataType: DataType.TEXT,
        items: [
          {
            codelistId: "SEX_CL",
            codedValue: "M",
            decodedText: { "en-US": "Male" },
            orderNumber: 1,
          },
          {
            codelistId: "SEX_CL",
            codedValue: "F",
            decodedText: { "en-US": "Female" },
            orderNumber: 2,
          },
        ],
      },
    },
    rules: [
      {
        ruleId: "RULE_001",
        ruleType: RuleType.VALIDATION,
        expression: "SEX IS NOT MISSING",
        _sourceRowIndex: 1,
      },
    ],
    ...overrides,
  };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Identical studies
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – identical studies", () => {
  it("reports no changes when both studies are identical", () => {
    const study = makeMinimalStudy();
    const report = diffStudyDesigns(study, deepClone(study));

    expect(report.baselineProtocolId).toBe("PROT-001");
    expect(report.currentProtocolId).toBe("PROT-001");
    expect(report.forms.every((e) => e.operation === "unchanged")).toBe(true);
    expect(report.items.every((e) => e.operation === "unchanged")).toBe(true);
    expect(report.codelists.every((e) => e.operation === "unchanged")).toBe(true);
    expect(report.rules.every((e) => e.operation === "unchanged")).toBe(true);
    expect(report.metadataDiff.operation).toBe("unchanged");
  });
});

// ---------------------------------------------------------------------------
// Empty baseline
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – empty baseline", () => {
  it("marks all entities as added when baseline is empty", () => {
    const empty: StudyDesign = {
      metadata: {
        protocolId: "PROT-EMPTY",
        studyName: "Empty",
        version: "1.0",
        defaultLanguage: "en-US",
      },
      events: [],
      forms: {},
      codelists: {},
      rules: [],
    };
    const current = makeMinimalStudy();
    const report = diffStudyDesigns(empty, current);

    expect(report.forms.every((e) => e.operation === "added")).toBe(true);
    expect(report.items.every((e) => e.operation === "added")).toBe(true);
    expect(report.codelists.every((e) => e.operation === "added")).toBe(true);
    expect(report.rules.every((e) => e.operation === "added")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – forms", () => {
  it("detects an added form", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.forms["VS"] = {
      formOid: "VS",
      formName: "Vital Signs",
      orderNumber: 2,
      repeating: false,
      effectiveVersion: "1.0",
      itemGroups: [],
    };

    const report = diffStudyDesigns(baseline, current);
    const added = report.forms.find((e) => e.formOid === "VS");
    expect(added?.operation).toBe("added");
    expect(added?.current?.formName).toBe("Vital Signs");
    expect(added?.baseline).toBeUndefined();
  });

  it("detects a removed form", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    delete current.forms["DM"];

    const report = diffStudyDesigns(baseline, current);
    const removed = report.forms.find((e) => e.formOid === "DM");
    expect(removed?.operation).toBe("removed");
    expect(removed?.baseline?.formName).toBe("Demographics");
    expect(removed?.current).toBeUndefined();
  });

  it("detects a modified form", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.forms["DM"].formName = "Demographics v2";

    const report = diffStudyDesigns(baseline, current);
    const modified = report.forms.find((e) => e.formOid === "DM");
    expect(modified?.operation).toBe("modified");
    expect(modified?.changedFields).toContain("formName");
  });

  it("reports unchanged when form is unaltered", () => {
    const study = makeMinimalStudy();
    const report = diffStudyDesigns(study, deepClone(study));
    const dm = report.forms.find((e) => e.formOid === "DM");
    expect(dm?.operation).toBe("unchanged");
    expect(dm?.changedFields).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – items", () => {
  it("detects an added item", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.forms["DM"].itemGroups[0].items.push({
      formOid: "DM",
      groupOid: "DM_GRP",
      itemOid: "AGE",
      name: "AGE",
      orderNumber: 2,
      effectiveVersion: "1.0",
      label: { "en-US": "Age" },
      dataType: DataType.INTEGER,
      validation: { required: false },
    });

    const report = diffStudyDesigns(baseline, current);
    const added = report.items.find((e) => e.itemOid === "AGE");
    expect(added?.operation).toBe("added");
    expect(added?.baseline).toBeUndefined();
  });

  it("detects a removed item", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.forms["DM"].itemGroups[0].items = [];

    const report = diffStudyDesigns(baseline, current);
    const removed = report.items.find((e) => e.itemOid === "SEX");
    expect(removed?.operation).toBe("removed");
    expect(removed?.current).toBeUndefined();
  });

  it("detects a modified item", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    (current.forms["DM"].itemGroups[0].items[0] as any).dataType = DataType.TEXT;

    const report = diffStudyDesigns(baseline, current);
    const modified = report.items.find((e) => e.itemOid === "SEX");
    expect(modified?.operation).toBe("modified");
    expect(modified?.changedFields).toContain("dataType");
  });

  it("reports unchanged when item is unaltered", () => {
    const study = makeMinimalStudy();
    const report = diffStudyDesigns(study, deepClone(study));
    const sex = report.items.find((e) => e.itemOid === "SEX");
    expect(sex?.operation).toBe("unchanged");
  });
});

// ---------------------------------------------------------------------------
// Codelists
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – codelists", () => {
  it("detects an added codelist", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.codelists["YESNO"] = {
      codelistId: "YESNO",
      codelistName: "Yes / No",
      dataType: DataType.TEXT,
      items: [
        { codelistId: "YESNO", codedValue: "Y", decodedText: { "en-US": "Yes" }, orderNumber: 1 },
        { codelistId: "YESNO", codedValue: "N", decodedText: { "en-US": "No" }, orderNumber: 2 },
      ],
    };

    const report = diffStudyDesigns(baseline, current);
    const added = report.codelists.find((e) => e.codelistId === "YESNO");
    expect(added?.operation).toBe("added");
    expect(added?.baseline).toBeUndefined();
  });

  it("detects a removed codelist", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    delete current.codelists["SEX_CL"];

    const report = diffStudyDesigns(baseline, current);
    const removed = report.codelists.find((e) => e.codelistId === "SEX_CL");
    expect(removed?.operation).toBe("removed");
    expect(removed?.current).toBeUndefined();
  });

  it("detects a modified codelist (changed item decode)", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.codelists["SEX_CL"].items[0].decodedText = { "en-US": "Male (updated)" };

    const report = diffStudyDesigns(baseline, current);
    const modified = report.codelists.find((e) => e.codelistId === "SEX_CL");
    expect(modified?.operation).toBe("modified");
    expect(modified?.changedFields).toContain("items");
  });

  it("reports unchanged when codelist is unaltered", () => {
    const study = makeMinimalStudy();
    const report = diffStudyDesigns(study, deepClone(study));
    const cl = report.codelists.find((e) => e.codelistId === "SEX_CL");
    expect(cl?.operation).toBe("unchanged");
  });
});

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – rules", () => {
  it("detects an added rule", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.rules!.push({
      ruleId: "RULE_002",
      ruleType: RuleType.DERIVATION,
      expression: "AGE > 18",
      _sourceRowIndex: 2,
    });

    const report = diffStudyDesigns(baseline, current);
    const added = report.rules.find((e) => e.ruleId === "RULE_002");
    expect(added?.operation).toBe("added");
    expect(added?.baseline).toBeUndefined();
  });

  it("detects a removed rule", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.rules = [];

    const report = diffStudyDesigns(baseline, current);
    const removed = report.rules.find((e) => e.ruleId === "RULE_001");
    expect(removed?.operation).toBe("removed");
    expect(removed?.current).toBeUndefined();
  });

  it("detects a modified rule", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.rules![0].expression = "SEX IS MISSING";

    const report = diffStudyDesigns(baseline, current);
    const modified = report.rules.find((e) => e.ruleId === "RULE_001");
    expect(modified?.operation).toBe("modified");
    expect(modified?.changedFields).toContain("expression");
  });

  it("handles studies with no rules on either side", () => {
    const baseline = makeMinimalStudy({ rules: undefined });
    const current = makeMinimalStudy({ rules: undefined });
    const report = diffStudyDesigns(baseline, current);
    expect(report.rules).toHaveLength(0);
  });

  it("reports unchanged when rules are unaltered", () => {
    const study = makeMinimalStudy();
    const report = diffStudyDesigns(study, deepClone(study));
    const rule = report.rules.find((e) => e.ruleId === "RULE_001");
    expect(rule?.operation).toBe("unchanged");
  });
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – metadata", () => {
  it("detects changed study metadata", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    current.metadata.version = "2.0";
    current.metadata.studyName = "Test Study v2";

    const report = diffStudyDesigns(baseline, current);
    expect(report.metadataDiff.operation).toBe("modified");
    expect(report.metadataDiff.changedFields).toContain("version");
    expect(report.metadataDiff.changedFields).toContain("studyName");
  });

  it("reports unchanged metadata when nothing changed", () => {
    const study = makeMinimalStudy();
    const report = diffStudyDesigns(study, deepClone(study));
    expect(report.metadataDiff.operation).toBe("unchanged");
    expect(report.metadataDiff.changedFields).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Report shape
// ---------------------------------------------------------------------------

describe("diffStudyDesigns – report shape", () => {
  it("always emits all top-level sections", () => {
    const study = makeMinimalStudy();
    const report = diffStudyDesigns(study, deepClone(study));

    expect(Array.isArray(report.forms)).toBe(true);
    expect(Array.isArray(report.items)).toBe(true);
    expect(Array.isArray(report.codelists)).toBe(true);
    expect(Array.isArray(report.rules)).toBe(true);
    expect(report.metadataDiff).toBeDefined();
    expect(typeof report.generatedAt).toBe("string");
    expect(typeof report.baselineProtocolId).toBe("string");
    expect(typeof report.currentProtocolId).toBe("string");
  });

  it("produces a deterministic, JSON-serializable report", () => {
    const study = makeMinimalStudy();
    const r1 = diffStudyDesigns(study, deepClone(study));
    const r2 = diffStudyDesigns(study, deepClone(study));

    // generatedAt will differ; strip it before comparing
    const { generatedAt: _t1, ...rest1 } = r1;
    const { generatedAt: _t2, ...rest2 } = r2;
    expect(JSON.stringify(rest1)).toBe(JSON.stringify(rest2));
  });

  it("preserves baseline and current snapshots on added/removed entries", () => {
    const baseline = makeMinimalStudy();
    const current = deepClone(baseline);
    delete current.forms["DM"];
    current.forms["VS"] = {
      formOid: "VS",
      formName: "Vital Signs",
      orderNumber: 2,
      repeating: false,
      effectiveVersion: "1.0",
      itemGroups: [],
    };

    const report = diffStudyDesigns(baseline, current);

    const removed = report.forms.find((e) => e.formOid === "DM");
    expect(removed?.baseline).toBeDefined();
    expect(removed?.current).toBeUndefined();

    const added = report.forms.find((e) => e.formOid === "VS");
    expect(added?.baseline).toBeUndefined();
    expect(added?.current).toBeDefined();
  });
});
