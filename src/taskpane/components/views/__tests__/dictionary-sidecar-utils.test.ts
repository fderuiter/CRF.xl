/* global describe, expect, it */
/**
 * @issue #28
 */

import { getDictionaryPreview } from "../dictionary-sidecar-utils";
import { CodelistItem } from "../../../core/services/dictionary-service";

const items: CodelistItem[] = [
  { codedValue: "1", decodedText: { "en-US": "Mild", "fr-FR": "Léger" } },
  { codedValue: "2", decodedText: { "en-US": "Moderate" } },
  { codedValue: "3", decodedText: { "en-US": "Severe" } },
  { codedValue: "4", decodedText: { "en-US": "Life Threatening" } },
];

describe("dictionary-sidecar-utils", () => {
  it("builds a preview and overflow count for grid display (default locale)", () => {
    expect(getDictionaryPreview(items, "en-US", "en-US")).toEqual({
      previewItems: ["1 = Mild", "2 = Moderate", "3 = Severe"],
      overflowCount: 1,
    });
  });

  it("builds a preview for a specific target locale", () => {
    expect(getDictionaryPreview(items, "fr-FR", "en-US")).toEqual({
      previewItems: ["1 = Léger", "2 = Moderate", "3 = Severe"],
      overflowCount: 1,
    });
  });

  it("builds a preview using only the coded value when decode is absent", () => {
    const itemsWithoutDecode: CodelistItem[] = [
      { codedValue: "A", decodedText: {} },
      { codedValue: "B", decodedText: { "en-US": "Beta" } },
    ];
    expect(getDictionaryPreview(itemsWithoutDecode, "en-US", "en-US")).toEqual({
      previewItems: ["A", "B = Beta"],
      overflowCount: 0,
    });
  });
});
