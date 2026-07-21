/**
 * @issue #28
 */
import { CodelistItem } from "../../core";

interface DictionaryPreview {
  previewItems: string[];
  overflowCount: number;
}

export function getDictionaryPreview(
  items: CodelistItem[],
  locale: string,
  defaultLocale: string,
  limit = 3
): DictionaryPreview {
  return {
    previewItems: items.slice(0, limit).map((item) => {
      const translation =
        item.decodedText[locale] ||
        item.decodedText[defaultLocale] ||
        Object.values(item.decodedText)[0] ||
        "";
      return translation ? `${item.codedValue} = ${translation}` : item.codedValue;
    }),
    overflowCount: Math.max(items.length - limit, 0),
  };
}
