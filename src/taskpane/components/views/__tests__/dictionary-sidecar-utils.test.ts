/* global describe, expect, it */
/**
 * @issue #28
 */


import { filterDictionaries, getDictionaryPreview } from "../dictionary-sidecar-utils";
import { CodelistGroup } from "../../../core/services/dictionary-service";

const dictionaries: CodelistGroup[] = [
  {
    id: "SEV_DICT",
    name: "Severity Scale",
    items: [
      { codedValue: "1", decode: "Mild" },
      { codedValue: "2", decode: "Moderate" },
      { codedValue: "3", decode: "Severe" },
      { codedValue: "4", decode: "Life Threatening" },
    ],
  },
  {
    id: "YN",
    name: "Yes / No",
    items: [
      { codedValue: "Y", decode: "Yes" },
      { codedValue: "N", decode: "No" },
    ],
  },
];

describe("dictionary-sidecar-utils", () => {
  it("returns all dictionaries when the search term is empty", () => {
    expect(filterDictionaries(dictionaries, "   ")).toEqual(dictionaries);
  });

  it("filters dictionaries by codelist id and name", () => {
    expect(filterDictionaries(dictionaries, "sev")).toEqual([dictionaries[0]]);
    expect(filterDictionaries(dictionaries, "yes / no")).toEqual([dictionaries[1]]);
  });

  it("filters dictionaries by coded values and decodes", () => {
    expect(filterDictionaries(dictionaries, "moderate")).toEqual([dictionaries[0]]);
    expect(filterDictionaries(dictionaries, " 4 ")).toEqual([dictionaries[0]]);
    expect(filterDictionaries(dictionaries, "no")).toEqual([dictionaries[1]]);
  });

  it("returns an empty array when no dictionaries match the search term", () => {
    expect(filterDictionaries(dictionaries, "NONEXISTENT_TERM_XYZ")).toEqual([]);
  });

  it("matches case-insensitively on codelist id", () => {
    expect(filterDictionaries(dictionaries, "SEV_DICT")).toEqual([dictionaries[0]]);
    expect(filterDictionaries(dictionaries, "sev_dict")).toEqual([dictionaries[0]]);
  });

  it("builds a preview and overflow count for grid display", () => {
    expect(getDictionaryPreview(dictionaries[0].items)).toEqual({
      previewItems: ["1 = Mild", "2 = Moderate", "3 = Severe"],
      overflowCount: 1,
    });
  });

  it("builds a preview using only the coded value when decode is absent", () => {
    const itemsWithoutDecode: import("../../../core/services/dictionary-service").CodelistItem[] = [
      { codedValue: "A", decode: "" },
      { codedValue: "B", decode: "Beta" },
    ];
    expect(getDictionaryPreview(itemsWithoutDecode)).toEqual({
      previewItems: ["A", "B = Beta"],
      overflowCount: 0,
    });
  });
});
