import { validateStudyDesign } from "../validator";
import { StudyDesign, DataType, EventType } from "../../types";

describe("Clinical Validator Engine", () => {
  let mockStudy: StudyDesign;

  beforeEach(() => {
    // Generate a clean, mathematically perfect StudyDesign payload before each test
    mockStudy = {
      metadata: {
        protocolId: "TEST-01",
        studyName: "Unit Test Study",
        version: "1.0",
        defaultLanguage: "en-US",
      },
      events: [
        {
          eventOid: "V1",
          eventName: "Visit 1",
          orderNumber: 1,
          eventType: EventType.SCHEDULED,
          forms: [{ formOid: "F1", orderNumber: 1, mandatory: true }],
        },
      ],
      forms: {
        F1: {
          formOid: "F1",
          formName: "Form 1",
          orderNumber: 1,
          repeating: false,
          effectiveVersion: "1.0",
          itemGroups: [
            {
              groupOid: "G1",
              name: "Group 1",
              repeating: false,
              orderNumber: 1,
              items: [
                {
                  itemOid: "I1",
                  name: "Item 1",
                  formOid: "F1",
                  groupOid: "G1",
                  orderNumber: 1,
                  dataType: DataType.TEXT,
                  label: { "en-US": "Item 1" },
                  effectiveVersion: "1.0",
                  validation: { required: false },
                },
              ],
            },
          ],
        },
      },
      codelists: {},
    };
  });

  it("should return 0 issues for a perfectly valid study", () => {
    const issues = validateStudyDesign(mockStudy);
    expect(issues.length).toBe(0);
  });

  it("should throw an Error if an Item references a missing Codelist ID", () => {
    // Mutate the valid study to inject an error
    mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
    mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "MISSING_DICTIONARY";

    const issues = validateStudyDesign(mockStudy);

    const error = issues.find(
      (i) => i.level === "Error" && i.message.includes("Missing Codelist definition")
    );
    expect(error).toBeDefined();
    expect(error?.location).toContain("F1 > Item 1");
  });

  it("should throw an Error if an Event references a missing Form ID", () => {
    // Mutate the schedule to request a non-existent form
    mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

    const issues = validateStudyDesign(mockStudy);

    const error = issues.find(
      (i) => i.level === "Error" && i.message.includes("schedules a form that doesn't exist")
    );
    expect(error).toBeDefined();
  });
});
