/**
 * @issue #39, #86
 */
import { StudyDesign, TranslatedText, TranslationStatus, TranslationUnit } from "../types";
import { isTranslationUnit } from "../models/multilingual-model";

export type TranslatableItemType = "item_label" | "item_instruction" | "codelist_decode" | "display_content";

export interface TranslatableItem {
  id: string; // Composite key
  type: TranslatableItemType;
  source: string; // Human readable context
  baseValue: string;
  translations: TranslatedText;
  location: {
    sheetName: string;
    rowIndex: number;
    columnHeader: string;
    formOid?: string;
    itemOid?: string;
    codelistId?: string;
    codedValue?: string;
  };
}

/**
 * Extracts all translatable items from the StudyDesign model.
 */
export function extractTranslatableItems(study: StudyDesign): TranslatableItem[] {
  const items: TranslatableItem[] = [];
  const baseLocale = study.metadata.defaultLanguage || "en-US";

  // 1. CRF Items and Display Blocks
  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      group.items.forEach((element) => {
        const rowIndex = (element as any).rowIndex || (element as any)._sourceRowIndex;

        if (element.nodeType === "item") {
          const item = element as any;
          // Label
          items.push({
            id: `item:${form.formOid}:${item.itemOid}:label`,
            type: "item_label",
            source: `${form.formOid}.${item.itemOid} (Label)`,
            baseValue: getPlainValue(item.label[baseLocale]),
            translations: item.label,
            location: {
              sheetName: form.formOid,
              rowIndex: rowIndex,
              columnHeader: "Label",
              formOid: form.formOid,
              itemOid: item.itemOid
            }
          });
          // Instructions
          if (item.instructions && Object.keys(item.instructions).length > 0) {
             items.push({
              id: `item:${form.formOid}:${item.itemOid}:instruction`,
              type: "item_instruction",
              source: `${form.formOid}.${item.itemOid} (Instructions)`,
              baseValue: getPlainValue(item.instructions[baseLocale]),
              translations: item.instructions,
              location: {
                sheetName: form.formOid,
                rowIndex: rowIndex,
                columnHeader: "Instructions",
                formOid: form.formOid,
                itemOid: item.itemOid
              }
            });
          }
        } else if (element.nodeType === "display") {
          const display = element as any;
          items.push({
            id: `display:${form.formOid}:${rowIndex}:content`,
            type: "display_content",
            source: `${form.formOid} (Display ${display.displayType})`,
            baseValue: display.content || "",
            translations: {}, // Display blocks currently don't support multi-lang in model but might in future
            location: {
              sheetName: form.formOid,
              rowIndex: rowIndex,
              columnHeader: "Question / Text",
              formOid: form.formOid
            }
          });
        }
      });
    });
  });

  // 2. Codelists
  Object.values(study.codelists).forEach((cl) => {
    cl.items.forEach((clItem) => {
      items.push({
        id: `codelist:${cl.codelistId}:${clItem.codedValue}:decode`,
        type: "codelist_decode",
        source: `${cl.codelistId} (${clItem.codedValue})`,
        baseValue: getPlainValue(clItem.decodedText[baseLocale]),
        translations: clItem.decodedText,
        location: {
          sheetName: "_Codelists",
          rowIndex: (clItem as any).rowIndex || 0, // Note: index may need to be tracked during parse
          columnHeader: "Decode",
          codelistId: cl.codelistId,
          codedValue: clItem.codedValue
        }
      });
    });
  });

  return items;
}

function getPlainValue(val: string | TranslationUnit | undefined): string {
  if (!val) return "";
  return isTranslationUnit(val) ? val.value : val;
}

/**
 * Returns the status of a translation for a specific locale.
 */
export function getTranslationStatus(
  item: TranslatableItem,
  locale: string
): TranslationStatus {
  const entry = item.translations[locale];
  if (!entry) return TranslationStatus.Missing;

  if (isTranslationUnit(entry)) {
    return entry.status;
  }

  // If it's just a string, we assume it's Translated unless it's empty
  return entry.trim() === "" ? TranslationStatus.Missing : TranslationStatus.Translated;
}

/**
 * Filters translatable items based on status, search, and locale.
 */
export function filterTranslatableItems(
  items: TranslatableItem[],
  options: {
    search?: string;
    statusFilter?: TranslationStatus | "all";
    locale?: string;
    typeFilter?: TranslatableItemType | "all";
  }
): TranslatableItem[] {
  const { search, statusFilter, locale, typeFilter } = options;
  const searchLower = search?.toLowerCase();

  return items.filter((item) => {
    if (typeFilter && typeFilter !== "all" && item.type !== typeFilter) return false;

    if (searchLower) {
      const matchSearch =
        item.source.toLowerCase().includes(searchLower) ||
        item.baseValue.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower);
      if (!matchSearch) return false;
    }

    if (statusFilter && statusFilter !== "all" && locale) {
      if (getTranslationStatus(item, locale) !== statusFilter) return false;
    }

    return true;
  });
}
