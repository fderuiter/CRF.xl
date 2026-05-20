/* eslint-disable no-undef */
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
    expect(error?.location).toContain("Form 1 > Item 1");
  });

  it("should validate codelistId references even when dataType is not Codelist", () => {
    mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.TEXT;
    mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "MISSING_DICTIONARY";

    const issues = validateStudyDesign(mockStudy);

    const error = issues.find(
      (i) => i.level === "Error" && i.message.includes("Missing Codelist definition")
    );
    expect(error).toBeDefined();
  });

  it("should throw an Error if an Event references a missing Form ID", () => {
    // Mutate the schedule to request a non-existent form
    mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

    const issues = validateStudyDesign(mockStudy);

    const error = issues.find(
      (i) => i.level === "Error" && i.message.includes("non-existent Form ID")
    );
    expect(error).toBeDefined();
  });

  it("should throw an Error if an Item is missing a Variable Name", () => {
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 7;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Missing Variable Name.",
          location: "F1 > Row 7",
          rowIndex: 7,
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should throw an Error if Type is Codelist and ID is blank", () => {
    mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
    delete (mockStudy.forms["F1"].itemGroups[0].items[0] as any).codelistId;
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 2;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Type is Codelist, but ID is blank.",
          location: "Form 1 > Item 1",
          rowIndex: 2,
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should not throw a Codelist reference error when the Codelist exists", () => {
    mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
    mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "YESNO";
    mockStudy.codelists["YESNO"] = {
      codelistId: "YESNO",
      codelistName: "Yes / No",
      dataType: DataType.TEXT,
      items: [
        { codelistId: "YESNO", codedValue: "Y", decodedText: { "en-US": "Yes" }, orderNumber: 1 },
        { codelistId: "YESNO", codedValue: "N", decodedText: { "en-US": "No" }, orderNumber: 2 },
      ],
    };

    const issues = validateStudyDesign(mockStudy);
    const codelistErrors = issues.filter((i) => i.message.includes("Codelist"));

    expect(codelistErrors).toHaveLength(0);
  });

  it("should throw an Error for duplicate Variable Names across forms", () => {
    mockStudy.forms["F2"] = {
      formOid: "F2",
      formName: "Form 2",
      orderNumber: 2,
      repeating: false,
      effectiveVersion: "1.0",
      itemGroups: [
        {
          groupOid: "G2",
          name: "Group 2",
          repeating: false,
          orderNumber: 1,
          items: [
            {
              itemOid: "I1",
              name: "Item 2",
              formOid: "F2",
              groupOid: "G2",
              orderNumber: 1,
              dataType: DataType.TEXT,
              label: { "en-US": "Item 2" },
              effectiveVersion: "1.0",
              validation: { required: false },
            },
          ],
        },
      ],
    };

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Duplicate Variable Name: 'I1'. Must be unique across study.",
          location: "F2 > I1",
          sheetName: "F2",
        }),
      ])
    );
  });

  it("should accept numeric metadata when Length and Significant Digits are valid integers", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = 2;

    const issues = validateStudyDesign(mockStudy);
    const metadataIssues = issues.filter(
      (i) => i.message.includes("Length") || i.message.includes("Significant Digits")
    );

    expect(metadataIssues).toHaveLength(0);
  });

  it("should raise an error when Significant Digits exceeds Length", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 2;
    item.significantDigits = 3;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Significant Digits cannot exceed Length.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should warn when Significant Digits is set for text variables", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.TEXT;
    item.significantDigits = 1;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Warning",
          message: "Significant Digits is typically only used for numeric variables.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should warn when numeric variables are missing Length metadata", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.significantDigits = 2;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Warning",
          message: "Numeric variables should define Length.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should warn when numeric variables are missing Significant Digits metadata", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Warning",
          message: "Numeric variables should define Significant Digits.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should warn when Significant Digits is zero for numeric variables", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = 0;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Warning",
          message: "Significant Digits of 0 is likely too coarse for numeric variables.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should raise an error for non-integer Significant Digits values", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = 1.5;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Significant Digits must be a non-negative integer.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should raise an error for negative Significant Digits values", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = -1;

    const issues = validateStudyDesign(mockStudy);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Significant Digits must be a non-negative integer.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should raise an error for non-positive or non-integer Length values", () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 0;
    item.significantDigits = 1;

    const zeroLengthIssues = validateStudyDesign(mockStudy);

    expect(zeroLengthIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Length must be a positive integer.",
          sheetName: "F1",
        }),
      ])
    );

    item.length = 2.5;
    const decimalLengthIssues = validateStudyDesign(mockStudy);

    expect(decimalLengthIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "Error",
          message: "Length must be a positive integer.",
          sheetName: "F1",
        }),
      ])
    );
  });

  it("should filter issues to the active CRF sheet only", () => {
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 3;
    mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

    const issues = validateStudyDesign(mockStudy, "F1");

    expect(issues).toHaveLength(1);
    expect(issues[0].sheetName).toBe("F1");
    expect(issues[0].message).toBe("Missing Variable Name.");
  });

  it("should not filter issues when active sheet is a system sheet", () => {
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 3;
    mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

    const issues = validateStudyDesign(mockStudy, "_Schedule");

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: "_Schedule" }),
        expect.objectContaining({ sheetName: "F1" }),
      ])
    );
  });

  describe("Cross-Form Dependencies", () => {
    beforeEach(() => {
      // Add form F2 and F3 to mockStudy
      mockStudy.forms["F2"] = {
        formOid: "F2",
        formName: "Form 2",
        orderNumber: 2,
        repeating: false,
        effectiveVersion: "1.0",
        itemGroups: [
          {
            groupOid: "G2",
            name: "Group 2",
            repeating: false,
            orderNumber: 1,
            items: [
              {
                itemOid: "I2",
                name: "Item 2",
                formOid: "F2",
                groupOid: "G2",
                orderNumber: 1,
                dataType: DataType.TEXT,
                label: { "en-US": "Item 2" },
                effectiveVersion: "1.0",
                validation: { required: false },
              },
            ],
          },
        ],
      };

      mockStudy.forms["F3"] = {
        formOid: "F3",
        formName: "Form 3",
        orderNumber: 3,
        repeating: true, // Repeating form!
        effectiveVersion: "1.0",
        itemGroups: [
          {
            groupOid: "G3",
            name: "Group 3",
            repeating: false,
            orderNumber: 1,
            items: [
              {
                itemOid: "I3",
                name: "Item 3",
                formOid: "F3",
                groupOid: "G3",
                orderNumber: 1,
                dataType: DataType.TEXT,
                label: { "en-US": "Item 3" },
                effectiveVersion: "1.0",
                validation: { required: false },
              },
            ],
          },
        ],
      };

      // Set up schedule: V1 contains F1, F2 is in V2, F3 is in V3
      mockStudy.events.push(
        {
          eventOid: "V2",
          eventName: "Visit 2",
          orderNumber: 2,
          eventType: EventType.SCHEDULED,
          forms: [{ formOid: "F2", orderNumber: 1, mandatory: true }],
        },
        {
          eventOid: "V3",
          eventName: "Visit 3",
          orderNumber: 3,
          eventType: EventType.SCHEDULED,
          forms: [{ formOid: "F3", orderNumber: 1, mandatory: true }],
        }
      );
    });

    it("should allow a valid cross-form reference", () => {
      // F2.I2 references F1.I1 which is scheduled before F2
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "F1.I1 == 'Yes'";

      const issues = validateStudyDesign(mockStudy);
      const crossFormErrors = issues.filter(
        (i) => i.level === "Error" && i.message.includes("reference")
      );
      expect(crossFormErrors.length).toBe(0);
      expect(mockStudy.crossFormDependencies).toBeDefined();
      expect(mockStudy.crossFormDependencies?.length).toBe(1);
      expect(mockStudy.crossFormDependencies?.[0].status).toBe("Valid");
    });

    it("should raise an Error for a broken reference", () => {
      // F2.I2 references a non-existent variable F1.MISSING
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "F1.MISSING == 'Yes'";

      const issues = validateStudyDesign(mockStudy);
      const brokenErr = issues.find(
        (i) => i.level === "Error" && i.message.includes("Broken reference")
      );
      expect(brokenErr).toBeDefined();
      expect(brokenErr?.location).toContain("F2 > Row");
    });

    it("should raise an Error for an unsupported target type reference", () => {
      // F1.I1 is set to File type
      mockStudy.forms["F1"].itemGroups[0].items[0].dataType = "File" as any;
      // F2.I2 references F1.I1
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "F1.I1 == 'File'";

      const issues = validateStudyDesign(mockStudy);
      const unsupportedErr = issues.find(
        (i) => i.level === "Error" && i.message.includes("unsupported target type")
      );
      expect(unsupportedErr).toBeDefined();
    });

    it("should raise an Error for an unreachable target (scheduled after source)", () => {
      // F1.I1 (scheduled in Visit 1) references F2.I2 (scheduled in Visit 2)
      mockStudy.forms["F1"].itemGroups[0].items[0].showIf = "F2.I2 == 'Yes'";

      const issues = validateStudyDesign(mockStudy);
      const unreachableErr = issues.find(
        (i) =>
          i.level === "Error" &&
          i.message.toLowerCase().includes("unreachable target") &&
          i.message.includes("scheduled after")
      );
      expect(unreachableErr).toBeDefined();
    });

    it("should raise an Error for an unreachable target (not scheduled at all)", () => {
      // Remove F2 from all events
      mockStudy.events = mockStudy.events.filter((e) => e.eventOid !== "V2");
      // F1.I1 references F2.I2
      mockStudy.forms["F1"].itemGroups[0].items[0].showIf = "F2.I2 == 'Yes'";

      const issues = validateStudyDesign(mockStudy);
      const unreachableErr = issues.find(
        (i) => i.level === "Error" && i.message.includes("is not scheduled in any event")
      );
      expect(unreachableErr).toBeDefined();
    });

    it("should raise a Warning for an unqualified cross-form reference", () => {
      // F2.I2 references I1 unqualified (which resides in F1)
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "I1 == 'Yes'";

      const issues = validateStudyDesign(mockStudy);
      const warning = issues.find(
        (i) => i.level === "Warning" && i.message.includes("high-risk unqualified reference")
      );
      expect(warning).toBeDefined();
    });

    it("should raise a Warning when a non-repeating form references a repeating form variable", () => {
      // Set F3 to be scheduled before F2 to avoid Unreachable target error
      mockStudy.events = [
        {
          eventOid: "V1",
          eventName: "Visit 1",
          orderNumber: 1,
          eventType: EventType.SCHEDULED,
          forms: [{ formOid: "F1", orderNumber: 1, mandatory: true }],
        },
        {
          eventOid: "V2",
          eventName: "Visit 2",
          orderNumber: 2,
          eventType: EventType.SCHEDULED,
          forms: [
            { formOid: "F3", orderNumber: 1, mandatory: true },
            { formOid: "F2", orderNumber: 2, mandatory: true },
          ],
        },
      ];

      // F2 (non-repeating) references F3.I3 (repeating)
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "F3.I3 == 'Yes'";

      const issues = validateStudyDesign(mockStudy);
      const warning = issues.find(
        (i) => i.level === "Warning" && i.message.includes("repeating variable")
      );
      expect(warning).toBeDefined();
    });

    it("should remain issues-free and have no dependencies in single-form study", () => {
      // Reset mockStudy to single form and check
      const issues = validateStudyDesign(mockStudy);
      const crossFormIssues = issues.filter(
        (i) => i.message.includes("reference") || i.message.includes("target")
      );
      expect(crossFormIssues.length).toBe(0);
      expect(mockStudy.crossFormDependencies?.length).toBe(0);
    });
  });
});
