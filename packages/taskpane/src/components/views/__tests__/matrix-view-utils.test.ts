/* global describe, expect, it */
/**
 * @issue #28
 */

import { performance } from "perf_hooks";
import { buildMatrixSearchIndex, filterMatrixSearchIndex } from "../matrix-view-utils";
import { DataType, EventType } from "@crf-xl/core/types/enums";
import { StudyDesign } from "@crf-xl/core/types/hierarchy";


function createStudy(options?: {
  formCount?: number;
  variablesPerForm?: number;
  eventCount?: number;
}): StudyDesign {
  const formCount = options?.formCount ?? 2;
  const variablesPerForm = options?.variablesPerForm ?? 3;
  const eventCount = options?.eventCount ?? 2;
  const forms: StudyDesign["forms"] = {};
  const events: StudyDesign["events"] = [];

  for (let formIndex = 1; formIndex <= formCount; formIndex += 1) {
    const formOid = `FORM_${String(formIndex).padStart(3, "0")}`;
    forms[formOid] = {
      formOid,
      formName: formIndex === 1 ? "Demographics" : `Form ${formIndex}`,
      repeating: false,
      orderNumber: formIndex,
      effectiveVersion: "1.0",
      itemGroups: [
        {
          groupOid: `${formOid}_GRP`,
          name: "Default Group",
          repeating: false,
          orderNumber: 1,
          items: Array.from({ length: variablesPerForm }, (_, itemIndex) => ({
            formOid,
            groupOid: `${formOid}_GRP`,
            itemOid:
              formIndex === 1 && itemIndex === 0
                ? "SUBJID"
                : `VAR_${String(formIndex).padStart(3, "0")}_${String(itemIndex + 1).padStart(3, "0")}`,
            name:
              formIndex === 1 && itemIndex === 0
                ? "SUBJID"
                : `VAR_${String(formIndex).padStart(3, "0")}_${String(itemIndex + 1).padStart(3, "0")}`,
            orderNumber: itemIndex + 1,
            effectiveVersion: "1.0",
            label: {
              "en-US":
                formIndex === 1 && itemIndex === 0
                  ? "Subject Identifier"
                  : `Variable ${formIndex}-${itemIndex + 1}`,
            },
            dataType: itemIndex % 2 === 0 ? DataType.TEXT : DataType.INTEGER,
            validation: { required: itemIndex % 2 === 0 },
          })),
        },
      ],
    };
  }

  for (let eventIndex = 1; eventIndex <= eventCount; eventIndex += 1) {
    events.push({
      eventOid: `VISIT_${eventIndex}`,
      eventName: eventIndex === 1 ? "Screening" : `Visit ${eventIndex}`,
      eventType: EventType.SCHEDULED,
      orderNumber: eventIndex,
      forms: Object.keys(forms).map((formOid, index) => ({
        formOid,
        orderNumber: index + 1,
        mandatory: true,
      })),
    });
  }

  return {
    metadata: {
      protocolId: "PROT-001",
      studyName: "Matrix Search Test Study",
      version: "1.0",
      defaultLanguage: "en-US",
    },
    events,
    forms,
    codelists: {},
  };
}

describe("matrix-view-utils", () => {
  it("matches by form name, visit name, variable oid, and variable label", () => {
    const entries = buildMatrixSearchIndex(createStudy());

    expect(
      filterMatrixSearchIndex(entries, {
        search: "demographics",
        required: "all",
        dataType: "all",
        visit: "all",
      })
    ).toHaveLength(2);
    expect(
      filterMatrixSearchIndex(entries, {
        search: "screening",
        required: "all",
        dataType: "all",
        visit: "all",
      })
    ).toHaveLength(2);
    expect(
      filterMatrixSearchIndex(entries, {
        search: "subjid",
        required: "all",
        dataType: "all",
        visit: "all",
      })
    ).toHaveLength(2);
    expect(
      filterMatrixSearchIndex(entries, {
        search: "subject identifier",
        required: "all",
        dataType: "all",
        visit: "all",
      })
    ).toHaveLength(2);
  });

  it("returns an empty list when nothing matches and restores the matrix when cleared", () => {
    const entries = buildMatrixSearchIndex(createStudy());

    expect(
      filterMatrixSearchIndex(entries, {
        search: "NON_EXISTENT_MATRIX_TERM",
        required: "all",
        dataType: "all",
        visit: "all",
      })
    ).toEqual([]);
    expect(
      filterMatrixSearchIndex(entries, {
        search: "",
        required: "all",
        dataType: "all",
        visit: "all",
      })
    ).toHaveLength(entries.length);
  });

  it("matches case-insensitively and combines required, data type, and visit filters", () => {
    const entries = buildMatrixSearchIndex(createStudy());
    const results = filterMatrixSearchIndex(entries, {
      search: "SuBjId",
      required: "required",
      dataType: DataType.TEXT,
      visit: "VISIT_1",
    });

    expect(results).toHaveLength(1);
    expect(results[0].formOid).toBe("FORM_001");
    expect(results[0].eventOid).toBe("VISIT_1");
    expect(results[0].previewSource[0].itemOid).toContain("SUBJID");
  });

  it("stays responsive for a 500-entry matrix index", () => {
    const entries = buildMatrixSearchIndex(
      createStudy({ formCount: 10, variablesPerForm: 60, eventCount: 50 })
    );
    const searchStart = performance.now();
    const results = filterMatrixSearchIndex(entries, {
      search: "var_010_060",
      required: "all",
      dataType: "all",
      visit: "all",
    });
    const elapsedMs = performance.now() - searchStart;

    expect(entries).toHaveLength(500);
    expect(results.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(150);
  });
});
