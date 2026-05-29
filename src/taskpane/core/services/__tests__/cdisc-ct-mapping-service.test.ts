/**
 * @issue #28
 */
/* eslint-disable no-undef */
import { readFileSync } from "fs";
import { join } from "path";
import {
  applyCodelistLifecycle,
  mapCdiscApiResponseToCrfCodelists,
  CrfCodelistsRow,
} from "../cdisc-ct-mapping-service";

function loadFixture(name: string): unknown {
  const path = join(process.cwd(), "test", "fixtures", "cdisc-library", name);
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("cdisc-ct-mapping-service", () => {
  it("maps a representative CDISC CT response bundle into _Codelists rows", () => {
    const input = loadFixture("ct-mapping-bundle.response.json");

    const result = mapCdiscApiResponseToCrfCodelists(input);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success result");
    }

    expect(result.rows).toHaveLength(6);
    expect(result.rows.every((row) => row.source === "CDISC Library API")).toBe(true);
    expect(result.rows.every((row) => row.codelistVersion === "2026-03-27")).toBe(true);

    expect(result.rows.filter((row) => row.codelistId === "SEX")).toMatchInlineSnapshot(`
[
  {
    "codedValue": "M",
    "codelistId": "SEX",
    "codelistName": "Sex",
    "codelistOid": "C66741",
    "codelistVersion": "2026-03-27",
    "decode": "Male",
    "source": "CDISC Library API",
    "sourcePackageOid": "NCI_CDISC_Terminology_2026-03-27",
    "sourcePackageTitle": "CDISC Terminology 2026-03-27",
    "termOid": "C20197",
  },
  {
    "codedValue": "F",
    "codelistId": "SEX",
    "codelistName": "Sex",
    "codelistOid": "C66741",
    "codelistVersion": "2026-03-27",
    "decode": "Female",
    "source": "CDISC Library API",
    "sourcePackageOid": "NCI_CDISC_Terminology_2026-03-27",
    "sourcePackageTitle": "CDISC Terminology 2026-03-27",
    "termOid": "C16576",
  },
]
`);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unsupported_field", path: "$.package.publisher" }),
        expect.objectContaining({ code: "unsupported_field", path: "$.codelists[1].extensible" }),
        expect.objectContaining({
          code: "unsupported_field",
          path: "$.termsByCodelistOid.C71620[0].synonyms",
        }),
        expect.objectContaining({ code: "ambiguous_term_decode" }),
      ])
    );
  });

  it("returns typed MappingError when response bundle is partial", () => {
    const input = loadFixture("ct-mapping-bundle.response.json") as {
      termsByCodelistOid: Record<string, unknown>;
    };

    delete input.termsByCodelistOid.C71620;

    const result = mapCdiscApiResponseToCrfCodelists(input);

    expect(result.ok).toBe(false);
    if (result.ok !== false) {
      throw new Error("expected failure result");
    }

    expect(result.error.code).toBe("partial_payload");
    expect(result.error.path).toBe("$.termsByCodelistOid.C71620");
  });

  it("returns typed MappingError when response bundle is malformed", () => {
    const result = mapCdiscApiResponseToCrfCodelists("not-an-object");

    expect(result.ok).toBe(false);
    if (result.ok !== false) {
      throw new Error("expected failure result");
    }

    expect(result.error.code).toBe("invalid_payload");
    expect(result.error.path).toBe("$");
  });

  it("applies lifecycle rules for overwrite, skip identical, and prompt-on-conflict", () => {
    const input = loadFixture("ct-mapping-bundle.response.json");
    const mapped = mapCdiscApiResponseToCrfCodelists(input);
    if (!mapped.ok) {
      throw new Error("expected success result");
    }

    const incomingRows = mapped.rows;
    const sexMaleIncoming = incomingRows.find((row) => row.codelistId === "SEX" && row.codedValue === "M");
    const sexFemaleIncoming = incomingRows.find(
      (row) => row.codelistId === "SEX" && row.codedValue === "F"
    );
    const nyIncoming = incomingRows.find((row) => row.codelistId === "NY" && row.codedValue === "Y");

    if (!sexMaleIncoming || !sexFemaleIncoming || !nyIncoming) {
      throw new Error("fixture mapping did not produce expected rows");
    }

    const existingRows: CrfCodelistsRow[] = [
      {
        ...sexMaleIncoming,
        decode: "Male",
      },
      {
        ...sexFemaleIncoming,
        codelistVersion: "2025-12-20",
      },
      {
        ...nyIncoming,
        codelistVersion: "2026-03-27",
        decode: "Yes",
        sourcePackageTitle: "Another package",
      },
    ];

    const lifecycle = applyCodelistLifecycle(existingRows, [sexMaleIncoming, sexFemaleIncoming, nyIncoming]);

    expect(lifecycle.rowsToUpsert).toEqual([sexFemaleIncoming]);
    expect(lifecycle.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "skip_identical", row: sexMaleIncoming }),
        expect.objectContaining({ action: "overwrite", row: sexFemaleIncoming }),
        expect.objectContaining({ action: "prompt_user", row: nyIncoming }),
      ])
    );
    expect(lifecycle.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "lifecycle_conflict_requires_user_prompt",
          path: `${nyIncoming.codelistId}::${nyIncoming.codedValue}`,
        }),
      ])
    );
  });
});
