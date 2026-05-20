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
});
