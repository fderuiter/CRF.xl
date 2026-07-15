/**
 * @issue #28
 */
import { CodelistGroup, CodelistItem } from "@crf-xl/taskpane/services/dictionary-service";


export interface DictionaryPreview {
  previewItems: string[];
  overflowCount: number;
}

export function filterDictionaries(
  dictionaries: CodelistGroup[],
  searchTerm: string
): CodelistGroup[] {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  if (!normalizedSearchTerm) {
    return dictionaries;
  }

  return dictionaries.filter((dictionary) => {
    if (
      dictionary.id.toLowerCase().includes(normalizedSearchTerm) ||
      dictionary.name.toLowerCase().includes(normalizedSearchTerm)
    ) {
      return true;
    }

    return dictionary.items.some(
      (item) =>
        item.codedValue.toLowerCase().includes(normalizedSearchTerm) ||
        Object.values(item.decodedText).some((t) => t.toLowerCase().includes(normalizedSearchTerm))
    );
  });
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
