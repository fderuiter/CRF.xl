/**
 * @issue #28
 */
import { migrateStudyDesign } from "../migration";
import { StudyDesign } from "../../types/index";

describe("Schema Migration Utility", () => {
  it("should initialize empty submissionMetadata arrays for legacy study designs", () => {
    const legacyStudy: any = {
      metadata: {
        protocolId: "T101",
        studyName: "Test Study",
        version: "1.0",
        defaultLanguage: "en-US",
      },
      events: [],
      forms: {},
      codelists: {},
    };

    const migrated = migrateStudyDesign(legacyStudy);

    expect(migrated.submissionMetadata).toBeDefined();
    expect(migrated.submissionMetadata?.sdtmDatasets).toEqual([]);
    expect(migrated.submissionMetadata?.adamDatasets).toEqual([]);
    expect(migrated.submissionMetadata?.sdtmDerivations).toEqual([]);
    expect(migrated.submissionMetadata?.adamDerivations).toEqual([]);
  });

  it("should preserve existing submissionMetadata if already defined", () => {
    const customStudy: any = {
      metadata: {
        protocolId: "T101",
        studyName: "Test Study",
        version: "1.0",
        defaultLanguage: "en-US",
      },
      events: [],
      forms: {},
      codelists: {},
      submissionMetadata: {
        sdtmDatasets: [
          { domain: "DM", label: "Demographics", class: "Special Purpose", structure: "One per subject" }
        ],
      },
    };

    const migrated = migrateStudyDesign(customStudy);

    expect(migrated.submissionMetadata?.sdtmDatasets?.length).toBe(1);
    expect(migrated.submissionMetadata?.sdtmDatasets?.[0].domain).toBe("DM");
    expect(migrated.submissionMetadata?.adamDatasets).toEqual([]);
  });

  it("should initialize sdtmMapping and adamMapping on all variables across forms", () => {
    const legacyStudy: any = {
      metadata: {
        protocolId: "T101",
        studyName: "Test Study",
        version: "1.0",
        defaultLanguage: "en-US",
      },
      events: [],
      forms: {
        F1: {
          formOid: "F1",
          formName: "Form 1",
          repeating: false,
          orderNumber: 1,
          effectiveVersion: "1.0",
          itemGroups: [
            {
              groupOid: "G1",
              name: "Group 1",
              orderNumber: 1,
              repeating: false,
              items: [
                {
                  formOid: "F1",
                  groupOid: "G1",
                  itemOid: "IT1",
                  name: "IT1",
                  label: { "en-US": "Item 1" },
                  dataType: "Text",
                  orderNumber: 1,
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

    const migrated = migrateStudyDesign(legacyStudy);
    const item = migrated.forms["F1"].itemGroups[0].items[0];

    expect(item.sdtmMapping).toEqual({});
    expect(item.adamMapping).toEqual({});
  });

  it("should initialize all eight submissionMetadata sub-arrays for a legacy study", () => {
    const legacyStudy: any = {
      metadata: { protocolId: "T101", studyName: "Test Study", version: "1.0", defaultLanguage: "en-US" },
      events: [],
      forms: {},
      codelists: {},
    };

    const migrated = migrateStudyDesign(legacyStudy);
    const sm = migrated.submissionMetadata!;

    // Original four
    expect(sm.sdtmDatasets).toEqual([]);
    expect(sm.adamDatasets).toEqual([]);
    expect(sm.sdtmDerivations).toEqual([]);
    expect(sm.adamDerivations).toEqual([]);
    // New four
    expect(sm.sdtmVariableMetadata).toEqual([]);
    expect(sm.adamVariableMetadata).toEqual([]);
    expect(sm.comments).toEqual([]);
    expect(sm.standards).toEqual([]);
  });

  it("should preserve existing sub-arrays and default only the absent new ones", () => {
    const partialStudy: any = {
      metadata: { protocolId: "T101", studyName: "Test Study", version: "1.0", defaultLanguage: "en-US" },
      events: [],
      forms: {},
      codelists: {},
      submissionMetadata: {
        sdtmDatasets: [
          { domain: "DM", label: "Demographics", class: "SpecialPurpose", structure: "One per subject" },
        ],
        comments: [
          { commentOid: "CMT.DM.SUBJID", text: "Collected as screen number" },
        ],
      },
    };

    const migrated = migrateStudyDesign(partialStudy);
    const sm = migrated.submissionMetadata!;

    // Pre-existing data preserved
    expect(sm.sdtmDatasets?.length).toBe(1);
    expect(sm.sdtmDatasets?.[0].domain).toBe("DM");
    expect(sm.comments?.length).toBe(1);
    expect(sm.comments?.[0].commentOid).toBe("CMT.DM.SUBJID");
    // Absent arrays defaulted
    expect(sm.adamDatasets).toEqual([]);
    expect(sm.sdtmDerivations).toEqual([]);
    expect(sm.adamDerivations).toEqual([]);
    expect(sm.sdtmVariableMetadata).toEqual([]);
    expect(sm.adamVariableMetadata).toEqual([]);
    expect(sm.standards).toEqual([]);
  });

  it("should preserve pre-populated VLM rows and standards through migration", () => {
    const studyWithVlm: any = {
      metadata: { protocolId: "T101", studyName: "Test Study", version: "1.0", defaultLanguage: "en-US" },
      events: [],
      forms: {},
      codelists: {},
      submissionMetadata: {
        sdtmVariableMetadata: [
          {
            vlmOid: "VLM.DM.RACE.WHITE",
            parentItemOid: "IT.DM.RACE",
            whereClause: "RACE = 'WHITE'",
            sdtmMapping: { domain: "DM", variable: "RACE" },
          },
        ],
        standards: [
          { standardOid: "STD.1", name: "SDTMIG", version: "3.4", status: "Final" },
        ],
      },
    };

    const migrated = migrateStudyDesign(studyWithVlm);
    const sm = migrated.submissionMetadata!;

    expect(sm.sdtmVariableMetadata?.length).toBe(1);
    expect(sm.sdtmVariableMetadata?.[0].vlmOid).toBe("VLM.DM.RACE.WHITE");
    expect(sm.sdtmVariableMetadata?.[0].whereClause).toBe("RACE = 'WHITE'");
    expect(sm.standards?.length).toBe(1);
    expect(sm.standards?.[0].standardOid).toBe("STD.1");
    expect(sm.standards?.[0].version).toBe("3.4");
    // Absent arrays still defaulted
    expect(sm.adamVariableMetadata).toEqual([]);
    expect(sm.comments).toEqual([]);
  });

  it("should normalize legacy origins and method referenced variables during migration", () => {
    const legacyStudy: any = {
      metadata: {
        protocolId: "T101",
        studyName: "Test Study",
        version: "1.0",
        defaultLanguage: "en-US",
      },
      events: [],
      forms: {
        F1: {
          formOid: "F1",
          formName: "Form 1",
          repeating: false,
          orderNumber: 1,
          effectiveVersion: "1.0",
          itemGroups: [
            {
              groupOid: "G1",
              name: "Group 1",
              orderNumber: 1,
              repeating: false,
              items: [
                {
                  formOid: "F1",
                  groupOid: "G1",
                  itemOid: "IT1",
                  name: "IT1",
                  label: { "en-US": "Item 1" },
                  dataType: "Text",
                  orderNumber: 1,
                  effectiveVersion: "1.0",
                  origin: "Protocol",
                  validation: { required: false },
                },
              ],
            },
          ],
        },
      },
      codelists: {},
      methods: {
        M_BMI: {
          methodOid: "M_BMI",
          name: "BMI",
          type: "Computation",
          referencedVariables: "WEIGHT, HEIGHT",
        },
      },
    };

    const migrated = migrateStudyDesign(legacyStudy);
    const item = migrated.forms["F1"].itemGroups[0].items[0];

    expect(item.origin).toBe("Pre-Specified");
    expect(migrated.methods?.M_BMI.referencedVariables).toEqual(["WEIGHT", "HEIGHT"]);
  });
});
