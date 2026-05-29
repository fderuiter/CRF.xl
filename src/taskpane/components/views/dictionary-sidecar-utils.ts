/**
 * @issue #28
 */
import { CodelistGroup, CodelistItem } from "../../core/services/dictionary-service";

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
        item.decode.toLowerCase().includes(normalizedSearchTerm)
    );
  });
}

export function getDictionaryPreview(items: CodelistItem[], limit = 3): DictionaryPreview {
  return {
    previewItems: items
      .slice(0, limit)
      .map((item) => (item.decode ? `${item.codedValue} = ${item.decode}` : item.codedValue)),
    overflowCount: Math.max(items.length - limit, 0),
  };
}
