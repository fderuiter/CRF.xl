/** @jest-environment node */
import { parseRawDataToStudyDesign } from "../../src/taskpane/core/parser/parser-engine";
import { generateOdmXml } from "../../src/taskpane/core/generators/cdisc/odm-builder";
import { validateRules } from "../../src/taskpane/core/parser/dag-validator";

describe("Ingestion-Time Canonical OID Normalization & Downstream Verification", () => {
  it("should normalize mixed-prefixed and non-prefixed workbooks into identical validation graphs and ODM structures", async () => {
    // 1. Prefixed raw data
    const rawDataPrefixed: Record<string, unknown[][]> = {
      _Study: [
        ["Protocol ID", "Study Name", "Version", "Language"],
        ["PROT-001", "Prefix Normalization Verification Study", "1.0", "en-US"],
      ],
      _Forms: [
        ["Form ID", "Form Name", "Repeating"],
        ["CDISC:VS", "Vital Signs", "No"],
      ],
      "CDISC:VS": [
        ["Variable Name", "Label", "Variable Type", "Required"],
        ["CDISC:MV.VS.WT", "Weight", "Integer", "No"],
      ],
      _Schedule: [
        ["Form ID", "Screening"],
        ["CDISC:VS", "X"],
      ],
      _Rules: [
        ["Rule ID", "Rule Type", "Target", "Expression", "Error Message"],
        ["CDISC:R_001", "Validation", "CDISC:MV.VS.WT", "CDISC:MV.VS.WT > 10", "Invalid weight"],
      ],
      _Codelists: [
        ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
        ["CDISC:YESNO", "Yes/No", "Y", "Yes"],
      ],
    };

    // 2. Purely canonical raw data
    const rawDataCanonical: Record<string, unknown[][]> = {
      _Study: [
        ["Protocol ID", "Study Name", "Version", "Language"],
        ["PROT-001", "Prefix Normalization Verification Study", "1.0", "en-US"],
      ],
      _Forms: [
        ["Form ID", "Form Name", "Repeating"],
        ["VS", "Vital Signs", "No"],
      ],
      VS: [
        ["Variable Name", "Label", "Variable Type", "Required"],
        ["VS.WT", "Weight", "Integer", "No"],
      ],
      _Schedule: [
        ["Form ID", "Screening"],
        ["VS", "X"],
      ],
      _Rules: [
        ["Rule ID", "Rule Type", "Target", "Expression", "Error Message"],
        ["R_001", "Validation", "VS.WT", "VS.WT > 10", "Invalid weight"],
      ],
      _Codelists: [
        ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
        ["YESNO", "Yes/No", "Y", "Yes"],
      ],
    };

    // 3. Parse both datasets into StudyDesigns
    const studyPrefixed = await parseRawDataToStudyDesign(rawDataPrefixed);
    const studyCanonical = await parseRawDataToStudyDesign(rawDataCanonical);

    // Verify OIDs are normalized to their canonical forms
    expect(studyPrefixed.forms["VS"]).toBeDefined();
    expect(studyPrefixed.forms["VS"].itemGroups[0].items[0].itemOid).toBe("VS.WT");
    expect(studyPrefixed.rules![0].ruleId).toBe("R_001");
    expect(studyPrefixed.rules![0].target).toBe("VS.WT");
    expect(studyPrefixed.rules![0].expression).toBe("VS.WT > 10");

    expect(studyCanonical.forms["VS"]).toBeDefined();
    expect(studyCanonical.forms["VS"].itemGroups[0].items[0].itemOid).toBe("VS.WT");
    expect(studyCanonical.rules![0].ruleId).toBe("R_001");
    expect(studyCanonical.rules![0].target).toBe("VS.WT");
    expect(studyCanonical.rules![0].expression).toBe("VS.WT > 10");

    // Preserve original context validation checks
    expect((studyPrefixed.forms["VS"] as any).originalOid).toBe("CDISC:VS");
    expect((studyPrefixed.forms["VS"].itemGroups[0].items[0] as any).originalOid).toBe(
      "CDISC:MV.VS.WT"
    );
    expect(studyPrefixed.rules![0].originalRuleId).toBe("CDISC:R_001");
    expect(studyPrefixed.rules![0].originalTarget).toBe("CDISC:MV.VS.WT");
    expect(studyPrefixed.rules![0].originalExpression).toBe("CDISC:MV.VS.WT > 10");

    // 4. Validate dependency graphs (Topological sorting)
    const prefixedGraph = await validateRules(studyPrefixed.rules!, studyPrefixed);
    const canonicalGraph = await validateRules(studyCanonical.rules!, studyCanonical);

    if (!prefixedGraph.isValid) {
      console.log("Prefixed graph errors:", JSON.stringify(prefixedGraph.errors, null, 2));
    }
    if (!canonicalGraph.isValid) {
      console.log("Canonical graph errors:", JSON.stringify(canonicalGraph.errors, null, 2));
    }

    expect(prefixedGraph.isValid).toBe(true);
    expect(canonicalGraph.isValid).toBe(true);
    expect(prefixedGraph.topologicalOrder).toEqual(canonicalGraph.topologicalOrder);
    expect(prefixedGraph.dependencyMap).toEqual(canonicalGraph.dependencyMap);

    // 5. Serialize both to CDISC ODM XML
    const prefixedOdm = await generateOdmXml(studyPrefixed);
    const canonicalOdm = await generateOdmXml(studyCanonical);

    // The produced XML should be exactly identical (ignoring dynamic CreationDateTime)
    const cleanPrefixed = prefixedOdm.xml.replace(
      /CreationDateTime="[^"]*"/,
      'CreationDateTime="2026-07-23T00:00:00.000Z"'
    );
    const cleanCanonical = canonicalOdm.xml.replace(
      /CreationDateTime="[^"]*"/,
      'CreationDateTime="2026-07-23T00:00:00.000Z"'
    );
    expect(cleanPrefixed).toEqual(cleanCanonical);
  });
});
