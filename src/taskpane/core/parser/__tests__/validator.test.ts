/* eslint-disable no-undef */
import {
  validateStudyDesign,
  ValidationIssue,
  validateSubmissionMetadataForRelease,
} from "../validator";
import {
  StudyDesign,
  DataType,
  EventType,
  SdtmDatasetClass,
  AdamDatasetClass,
  AdamCore,
} from "../../types";

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

  it("should return 0 issues for a perfectly valid study", async () => {
    const issues = await validateStudyDesign(mockStudy);
    expect(issues.length).toBe(0);
  });

  it("should throw an Error if an Item references a missing Codelist ID", async () => {
    // Mutate the valid study to inject an error
    mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
    mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "MISSING_DICTIONARY";

    const issues = await validateStudyDesign(mockStudy);

    const error = (await issues).find(
      (i) => i.level === "Error" && i.message.includes("Missing Codelist definition")
    );
    expect(error).toBeDefined();
    expect(error?.location).toContain("Form 1 > Item 1");
  });

  it("should validate codelistId references even when dataType is not Codelist", async () => {
    mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.TEXT;
    mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "MISSING_DICTIONARY";

    const issues = await validateStudyDesign(mockStudy);

    const error = (await issues).find(
      (i) => i.level === "Error" && i.message.includes("Missing Codelist definition")
    );
    expect(error).toBeDefined();
  });

  it("should throw an Error if an Event references a missing Form ID", async () => {
    // Mutate the schedule to request a non-existent form
    mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

    const issues = await validateStudyDesign(mockStudy);

    const error = (await issues).find(
      (i) => i.level === "Error" && i.message.includes("non-existent Form ID")
    );
    expect(error).toBeDefined();
  });

  it("should throw an Error if an Item is missing a Variable Name", async () => {
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 7;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should throw an Error if Type is Codelist and ID is blank", async () => {
    mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
    delete (mockStudy.forms["F1"].itemGroups[0].items[0] as any).codelistId;
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 2;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should skip missing variable and codelist checks for display blocks", async () => {
    mockStudy.forms["F1"].itemGroups[0].items.unshift({
      nodeType: "display",
      displayType: "instruction",
      content: "Complete all fields below.",
      _sourceRowIndex: 2,
      itemOid: "IGNORED_DUPLICATE",
      codelistId: "MISSING_DICTIONARY",
      dataType: DataType.CODELIST,
    } as any);

    const issues = await validateStudyDesign(mockStudy);

    expect(
      issues.find(
        (issue) => issue.rowIndex === 2 && issue.message.includes("Missing Variable Name")
      )
    ).toBeUndefined();
    expect(
      issues.find(
        (issue) => issue.rowIndex === 2 && issue.message.includes("Missing Codelist definition")
      )
    ).toBeUndefined();
    expect(
      issues.find(
        (issue) => issue.rowIndex === 2 && issue.message.includes("Duplicate Variable Name")
      )
    ).toBeUndefined();
  });

  it("should not throw a Codelist reference error when the Codelist exists", async () => {
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

    const issues = await validateStudyDesign(mockStudy);
    const codelistErrors = issues.filter((i) => i.message.includes("Codelist"));

    expect(codelistErrors).toHaveLength(0);
  });

  it("should throw an Error for duplicate Variable Names across forms", async () => {
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

    const issues = await validateStudyDesign(mockStudy);

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

  it("should accept numeric metadata when Length and Significant Digits are valid integers", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = 2;

    const issues = await validateStudyDesign(mockStudy);
    const metadataIssues = issues.filter(
      (i) => i.message.includes("Length") || i.message.includes("Significant Digits")
    );

    expect(metadataIssues).toHaveLength(0);
  });

  it("should raise an error when Significant Digits exceeds Length", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 2;
    item.significantDigits = 3;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should warn when Significant Digits is set for text variables", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.TEXT;
    item.significantDigits = 1;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should warn when numeric variables are missing Length metadata", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.significantDigits = 2;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should warn when numeric variables are missing Significant Digits metadata", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should warn when Significant Digits is zero for numeric variables", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = 0;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should raise an error for non-integer Significant Digits values", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = 1.5;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should raise an error for negative Significant Digits values", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 8;
    item.significantDigits = -1;

    const issues = await validateStudyDesign(mockStudy);

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

  it("should raise an error for non-positive or non-integer Length values", async () => {
    const item = mockStudy.forms["F1"].itemGroups[0].items[0] as any;
    item.dataType = DataType.FLOAT;
    item.length = 0;
    item.significantDigits = 1;

    const zeroLengthIssues = await validateStudyDesign(mockStudy);

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
    const decimalLengthIssues = await validateStudyDesign(mockStudy);

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

  it("should filter issues to the active CRF sheet only", async () => {
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 3;
    mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

    const issues = await validateStudyDesign(mockStudy, "F1");

    expect(issues).toHaveLength(1);
    expect(issues[0].sheetName).toBe("F1");
    expect(issues[0].message).toBe("Missing Variable Name.");
  });

  it("should not filter issues when active sheet is a system sheet", async () => {
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
    (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 3;
    mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

    const issues = await validateStudyDesign(mockStudy, "_Schedule");

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

    it("should allow a valid cross-form reference", async () => {
      // F2.I2 references F1.I1 which is scheduled before F2
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "F1.I1 == 'Yes'";

      const issues = await validateStudyDesign(mockStudy);
      const crossFormErrors = issues.filter(
        (i) => i.level === "Error" && i.message.includes("reference")
      );
      expect(crossFormErrors.length).toBe(0);
      expect(mockStudy.crossFormDependencies).toBeDefined();
      expect(mockStudy.crossFormDependencies?.length).toBe(1);
      expect(mockStudy.crossFormDependencies?.[0].status).toBe("Valid");
    });

    it("should raise a Warning for a broken external reference", async () => {
      // F2.I2 references a non-existent variable F1.MISSING
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "F1.MISSING == 'Yes'";

      const issues = await validateStudyDesign(mockStudy);
      const brokenErr = issues.find(
        (i) => i.level === "Warning" && i.message.includes("Broken reference")
      );
      expect(brokenErr).toBeDefined();
      expect(brokenErr?.location).toContain("F2 > Row");
    });

    it("should raise an Error for an unsupported target type reference", async () => {
      // F1.I1 is set to File type
      mockStudy.forms["F1"].itemGroups[0].items[0].dataType = "File" as any;
      // F2.I2 references F1.I1
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "F1.I1 == 'File'";

      const issues = await validateStudyDesign(mockStudy);
      const unsupportedErr = issues.find(
        (i) => i.level === "Error" && i.message.includes("unsupported target type")
      );
      expect(unsupportedErr).toBeDefined();
    });

    it("should raise an Error for an unreachable target (scheduled after source)", async () => {
      // F1.I1 (scheduled in Visit 1) references F2.I2 (scheduled in Visit 2)
      mockStudy.forms["F1"].itemGroups[0].items[0].showIf = "F2.I2 == 'Yes'";

      const issues = await validateStudyDesign(mockStudy);
      const unreachableErr = issues.find(
        (i) =>
          i.level === "Error" &&
          i.message.toLowerCase().includes("unreachable target") &&
          i.message.includes("scheduled after")
      );
      expect(unreachableErr).toBeDefined();
    });

    it("should raise an Error for an unreachable target (not scheduled at all)", async () => {
      // Remove F2 from all events
      mockStudy.events = mockStudy.events.filter((e) => e.eventOid !== "V2");
      // F1.I1 references F2.I2
      mockStudy.forms["F1"].itemGroups[0].items[0].showIf = "F2.I2 == 'Yes'";

      const issues = await validateStudyDesign(mockStudy);
      const unreachableErr = issues.find(
        (i) => i.level === "Error" && i.message.includes("is not scheduled in any event")
      );
      expect(unreachableErr).toBeDefined();
    });

    it("should raise a Warning for an unqualified cross-form reference", async () => {
      // F2.I2 references I1 unqualified (which resides in F1)
      mockStudy.forms["F2"].itemGroups[0].items[0].showIf = "I1 == 'Yes'";

      const issues = await validateStudyDesign(mockStudy);
      const warning = issues.find(
        (i) => i.level === "Warning" && i.message.includes("high-risk unqualified reference")
      );
      expect(warning).toBeDefined();
    });

    it("should raise a Warning when a non-repeating form references a repeating form variable", async () => {
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

      const issues = await validateStudyDesign(mockStudy);
      const warning = issues.find(
        (i) => i.level === "Warning" && i.message.includes("repeating variable")
      );
      expect(warning).toBeDefined();
    });

    it("should remain issues-free and have no dependencies in single-form study", async () => {
      // Reset mockStudy to single form and check
      const issues = await validateStudyDesign(mockStudy);
      const crossFormIssues = issues.filter(
        (i) => i.message.includes("reference") || i.message.includes("target")
      );
      expect(crossFormIssues.length).toBe(0);
      expect(mockStudy.crossFormDependencies?.length).toBe(0);
    });
  });

  describe("Variable Level Metadata (VLM) & Methods Validation", () => {
    it("should raise an Error for an invalid Origin value", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "InvalidOrigin" as any;
      const issues = await validateStudyDesign(mockStudy);
      const error = (await issues).find(
        (i) => i.level === "Error" && i.message.includes("Invalid Origin value")
      );
      expect(error).toBeDefined();
    });

    it("should not raise an Error for a valid Origin value", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "Collected" as any;
      const issues = await validateStudyDesign(mockStudy);
      const errors = issues.filter((i) => i.level === "Error" && i.message.includes("Origin"));
      expect(errors.length).toBe(0);
    });

    it("should raise an Error when Origin is Derived/Assigned but Method OID is missing", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "Derived" as any;
      mockStudy.forms["F1"].itemGroups[0].items[0].methodOid = "";
      const issues1 = await validateStudyDesign(mockStudy);
      const err1 = issues1.find(
        (i) => i.level === "Error" && i.message.includes("Method OID is required")
      );
      expect(err1).toBeDefined();

      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "Assigned" as any;
      mockStudy.forms["F1"].itemGroups[0].items[0].methodOid = "  ";
      const issues2 = await validateStudyDesign(mockStudy);
      const err2 = issues2.find(
        (i) => i.level === "Error" && i.message.includes("Method OID is required")
      );
      expect(err2).toBeDefined();
    });

    it("should raise an Error when Method OID is specified but not found in study.methods", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "Derived" as any;
      mockStudy.forms["F1"].itemGroups[0].items[0].methodOid = "M_UNKNOWN";
      mockStudy.methods = {};
      const issues = await validateStudyDesign(mockStudy);
      const err = issues.find(
        (i) => i.level === "Error" && i.message.includes("does not exist in _Methods")
      );
      expect(err).toBeDefined();
    });

    it("should pass when Method OID exists in study.methods (case-insensitive)", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "Derived" as any;
      mockStudy.forms["F1"].itemGroups[0].items[0].methodOid = "m_bmi";
      mockStudy.methods = {
        M_BMI: {
          methodOid: "M_BMI",
          name: "BMI Method",
          type: "Computation",
        },
      };
      const issues = await validateStudyDesign(mockStudy);
      const vlmErrors = issues.filter((i) => i.level === "Error" && i.location?.includes("Item 1"));
      expect(vlmErrors.length).toBe(0);
    });

    it("should raise a Warning when companion SDTM Domain or Variable is missing", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].sdtmMapping = {
        domain: "DM",
        variable: "",
      };
      const issues1 = await validateStudyDesign(mockStudy);
      const warn1 = issues1.find(
        (i) =>
          i.level === "Warning" &&
          i.message.includes("SDTM Domain is specified but companion SDTM Variable is missing")
      );
      expect(warn1).toBeDefined();

      mockStudy.forms["F1"].itemGroups[0].items[0].sdtmMapping = {
        domain: "",
        variable: "SUBJID",
      };
      const issues2 = await validateStudyDesign(mockStudy);
      const warn2 = issues2.find(
        (i) =>
          i.level === "Warning" &&
          i.message.includes("SDTM Variable is specified but companion SDTM Domain is missing")
      );
      expect(warn2).toBeDefined();
    });

    it("should pass when companion SDTM Domain and Variable are both present or both missing", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].sdtmMapping = {
        domain: "DM",
        variable: "SUBJID",
      };
      const issues = await validateStudyDesign(mockStudy);
      const warnings = issues.filter((i) => i.level === "Warning" && i.message.includes("SDTM"));
      expect(warnings.length).toBe(0);
    });
  });

  describe("Submission Metadata Export/Release Validator Gate", () => {
    beforeEach(() => {
      // Re-init mock study
      mockStudy.submissionMetadata = {
        sdtmDatasets: [
          {
            domain: "DM",
            label: "Demographics",
            class: SdtmDatasetClass.SPECIAL_PURPOSE,
            structure: "One per subject",
          },
        ],
        adamDatasets: [
          {
            dataset: "ADSL",
            label: "Subject-Level Analysis",
            class: AdamDatasetClass.ADAM_BASIC_DATA_STRUCTURE,
            structure: "One per subject",
          },
        ],
        sdtmDerivations: [],
        adamDerivations: [],
      };
      mockStudy.forms["F1"].itemGroups[0].items[0].sdtmMapping = undefined;
      mockStudy.forms["F1"].itemGroups[0].items[0].adamMapping = undefined;
    });

    it("should pass cleanly when no submission metadata mapping exists on items", async () => {
      const issues = validateSubmissionMetadataForRelease(mockStudy);
      expect(issues.length).toBe(0);
    });

    it("should raise Errors when required release fields (core, role, sasFieldName, sasLabel) are missing on SDTM mapping", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].sdtmMapping = {
        domain: "DM",
        variable: "SUBJID",
      };
      const issues = validateSubmissionMetadataForRelease(mockStudy);
      const errors = issues.filter((i) => i.level === "Error" && i.message.includes("SUBJID"));

      expect(errors.length).toBe(4); // Core, Role, SAS Field Name, SAS Label
      expect(errors.find((e) => e.message.includes("Core requiredness"))).toBeDefined();
      expect(errors.find((e) => e.message.includes("Role"))).toBeDefined();
      expect(errors.find((e) => e.message.includes("SAS Field Name"))).toBeDefined();
      expect(errors.find((e) => e.message.includes("SAS Label"))).toBeDefined();
    });

    it("should raise Errors when required release fields (core, role, sasFieldName, sasLabel) are missing on ADaM mapping", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].adamMapping = {
        dataset: "ADSL",
        variable: "TRTP",
      };
      const issues = validateSubmissionMetadataForRelease(mockStudy);
      const errors = issues.filter((i) => i.level === "Error" && i.message.includes("TRTP"));

      expect(errors.length).toBe(4); // Core, Role, SAS Field Name, SAS Label
      expect(errors.find((e) => e.message.includes("Core requiredness"))).toBeDefined();
      expect(errors.find((e) => e.message.includes("Role"))).toBeDefined();
      expect(errors.find((e) => e.message.includes("SAS Field Name"))).toBeDefined();
      expect(errors.find((e) => e.message.includes("SAS Label"))).toBeDefined();
    });

    it("should raise an Error when SDTM variable references an undefined domain in central dataset metadata", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].sdtmMapping = {
        domain: "VS", // not defined in sdtmDatasets
        variable: "VSORRES",
        core: "Required" as any,
        role: "Topic",
        sasFieldName: "VSORRES",
        sasLabel: "Verbatim Result",
      };
      const issues = validateSubmissionMetadataForRelease(mockStudy);
      const error = (await issues).find(
        (i) => i.level === "Error" && i.message.includes("references undefined domain 'VS'")
      );
      expect(error).toBeDefined();
    });

    it("should raise an Error when ADaM variable references an undefined dataset in central dataset metadata", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].adamMapping = {
        dataset: "ADVS", // not defined in adamDatasets
        variable: "AVAL",
        core: AdamCore.REQUIRED,
        role: "Analysis Parameter",
        sasFieldName: "AVAL",
        sasLabel: "Analysis Value",
      };
      const issues = validateSubmissionMetadataForRelease(mockStudy);
      const error = (await issues).find(
        (i) => i.level === "Error" && i.message.includes("references undefined dataset 'ADVS'")
      );
      expect(error).toBeDefined();
    });

    it("should raise an Error when Derived variable references an undefined method/derivation OID", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "Derived" as any;
      mockStudy.forms["F1"].itemGroups[0].items[0].methodOid = "DER_UNKNOWN";
      mockStudy.methods = {};
      const issues = validateSubmissionMetadataForRelease(mockStudy);
      const error = (await issues).find(
        (i) =>
          i.level === "Error" &&
          i.message.includes("references undefined Method/Derivation OID 'DER_UNKNOWN'")
      );
      expect(error).toBeDefined();
    });

    it("should pass when Derived variable references a valid central SDTM or ADaM derivation ID", async () => {
      mockStudy.forms["F1"].itemGroups[0].items[0].origin = "Derived" as any;
      mockStudy.forms["F1"].itemGroups[0].items[0].methodOid = "DER_TEST";
      mockStudy.methods = {};
      mockStudy.submissionMetadata!.sdtmDerivations = [
        {
          derivationId: "DER_TEST",
          label: "Test Derivation",
          description: "This is a test derivation",
        },
      ];
      const issues = validateSubmissionMetadataForRelease(mockStudy);
      const error = (await issues).find((i) => i.level === "Error" && i.message.includes("DER_TEST"));
      expect(error).toBeUndefined();
    });
  });
});
