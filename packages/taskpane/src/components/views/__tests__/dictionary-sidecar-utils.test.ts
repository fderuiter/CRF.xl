/* global describe, expect, it */
/**
 * @issue #28
 */

import { filterDictionaries, getDictionaryPreview } from "../dictionary-sidecar-utils";
import { CodelistGroup } from "@crf-xl/taskpane/services/dictionary-service";

const dictionaries: CodelistGroup[] = [
  {
    id: "SEV_DICT",
    name: "Severity Scale",
    items: [
      { codedValue: "1", decodedText: { "en-US": "Mild", "fr-FR": "Léger" } },
      { codedValue: "2", decodedText: { "en-US": "Moderate" } },
      { codedValue: "3", decodedText: { "en-US": "Severe" } },
      { codedValue: "4", decodedText: { "en-US": "Life Threatening" } },
    ],
  },
  {
    id: "YN",
    name: "Yes / No",
    items: [
      { codedValue: "Y", decodedText: { "en-US": "Yes", "es-ES": "Sí" } },
      { codedValue: "N", decodedText: { "en-US": "No", "es-ES": "No" } },
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

  it("filters dictionaries by localized decodes", () => {
    expect(filterDictionaries(dictionaries, "léger")).toEqual([dictionaries[0]]);
    expect(filterDictionaries(dictionaries, "sí")).toEqual([dictionaries[1]]);
  });

  it("returns an empty array when no dictionaries match the search term", () => {
    expect(filterDictionaries(dictionaries, "NONEXISTENT_TERM_XYZ")).toEqual([]);
  });

  it("matches case-insensitively on codelist id", () => {
    expect(filterDictionaries(dictionaries, "SEV_DICT")).toEqual([dictionaries[0]]);
    expect(filterDictionaries(dictionaries, "sev_dict")).toEqual([dictionaries[0]]);
  });

  it("builds a preview and overflow count for grid display (default locale)", () => {
    expect(getDictionaryPreview(dictionaries[0].items, "en-US", "en-US")).toEqual({
      previewItems: ["1 = Mild", "2 = Moderate", "3 = Severe"],
      overflowCount: 1,
    });
  });

  it("builds a preview for a specific target locale", () => {
    expect(getDictionaryPreview(dictionaries[0].items, "fr-FR", "en-US")).toEqual({
      previewItems: ["1 = Léger", "2 = Moderate", "3 = Severe"],
      overflowCount: 1,
    });
  });

  it("builds a preview using only the coded value when decode is absent", () => {
    const itemsWithoutDecode: import("@crf-xl/taskpane/services/dictionary-service").CodelistItem[] =
      [
        { codedValue: "A", decodedText: {} },
        { codedValue: "B", decodedText: { "en-US": "Beta" } },
      ];
    expect(getDictionaryPreview(itemsWithoutDecode, "en-US", "en-US")).toEqual({
      previewItems: ["A", "B = Beta"],
      overflowCount: 0,
    });
  });
});
