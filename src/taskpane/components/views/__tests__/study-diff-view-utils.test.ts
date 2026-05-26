/* global describe, expect, it */

import { DataType, EventType, RuleType, StudyDiffReport } from "../../../core/types";
import {
  buildStudyDiffList,
  filterStudyDiffList,
  paginateStudyDiffList,
} from "../study-diff-view-utils";

function createReport(): StudyDiffReport {
  return {
    baselineProtocolId: "BASE",
    currentProtocolId: "CURR",
    generatedAt: "2026-01-01T00:00:00Z",
    forms: [
      {
        operation: "added",
        formOid: "VS",
        current: {
          formOid: "VS",
          formName: "Vitals",
          repeating: false,
          orderNumber: 1,
          effectiveVersion: "1.0",
          itemGroups: [],
        },
      },
      {
        operation: "removed",
        formOid: "VS_OLD",
        baseline: {
          formOid: "VS_OLD",
          formName: "Vitals",
          repeating: false,
          orderNumber: 1,
          effectiveVersion: "1.0",
          itemGroups: [],
        },
      },
    ],
    items: [
      {
        operation: "modified",
        formOid: "DM",
        itemOid: "AGE",
        changedFields: ["dataType"],
        baseline: {
          formOid: "DM",
          groupOid: "DM_GRP",
          itemOid: "AGE",
          name: "AGE",
          orderNumber: 1,
          effectiveVersion: "1.0",
          label: { "en-US": "Age" },
          dataType: DataType.INTEGER,
          validation: { required: false },
        },
        current: {
          formOid: "DM",
          groupOid: "DM_GRP",
          itemOid: "AGE",
          name: "AGE",
          orderNumber: 1,
          effectiveVersion: "1.0",
          label: { "en-US": "Age" },
          dataType: DataType.FLOAT,
          validation: { required: false },
        },
      },
    ],
    codelists: [
      {
        operation: "removed",
        codelistId: "YESNO",
        baseline: {
          codelistId: "YESNO",
          codelistName: "Yes / No",
          dataType: DataType.TEXT,
          items: [],
        },
      },
    ],
    rules: [
      {
        operation: "added",
        ruleId: "RULE_002",
        current: {
          ruleId: "RULE_002",
          ruleType: RuleType.DERIVATION,
          expression: "A+B",
          _sourceRowIndex: 2,
        },
      },
    ],
    metadataDiff: {
      operation: "modified",
      changedFields: ["studyName"],
    },
  };
}

describe("study-diff-view-utils", () => {
  it("builds grouped entries and classifies moved/renamed pairs", () => {
    const entries = buildStudyDiffList(createReport());
    const movedOrRenamedForms = entries.filter(
      (entry) => entry.group === "forms" && entry.changeClass === "moved_or_renamed"
    );
    expect(movedOrRenamedForms).toHaveLength(2);
    expect(
      entries.some((entry) => entry.group === "items" && entry.changeClass === "modified")
    ).toBe(true);
  });

  it("applies change class, severity, subsystem, and area filters", () => {
    const entries = buildStudyDiffList(createReport());
    const filtered = filterStudyDiffList(entries, "items", {
      changeClass: "modified",
      severity: "medium",
      subsystem: "Structure",
      area: "DM",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("DM.AGE");
  });

  it("paginates large lists safely", () => {
    const entries = Array.from({ length: 45 }, (_, index) => ({
      id: `items:DM:ITEM_${index}`,
      group: "items" as const,
      key: `DM.ITEM_${index}`,
      title: `DM.ITEM_${index}`,
      subtitle: "Synthetic item",
      operation: "added" as const,
      changeClass: "added" as const,
      severity: "low" as const,
      subsystem: "Structure",
      area: "DM",
      changedFields: [],
    }));
    const page = paginateStudyDiffList(entries, 3, 20);
    expect(page.totalPages).toBe(3);
    expect(page.entries).toHaveLength(5);
    expect(page.page).toBe(3);
  });
});
