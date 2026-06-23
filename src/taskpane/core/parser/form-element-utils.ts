/**
 * @issue #28, #40
 */
import { CrfDisplayBlock, CrfFormElement, CrfItem } from "../types";
import { LinguisticService } from "../services/linguistics-service";
import { normalizeDataOrigin } from "./metadata-utils";

export const DISPLAY_BLOCK_TYPES = ["heading", "instruction", "separator"] as const;

export const CRF_VARIABLE_TYPE_OPTIONS = [
  "Text",
  "Integer",
  "Float",
  "Date",
  "Time",
  "Datetime",
  "Boolean",
  "Codelist",
  "Heading",
  "Instruction",
  "Separator",
] as const;

export function isDisplayBlockType(value: unknown): value is CrfDisplayBlock["displayType"] {
  return DISPLAY_BLOCK_TYPES.includes(
    String(value ?? "")
      .trim()
      .toLowerCase() as any
  );
}

export function mapRowToFormElement(
  headers: string[],
  row: any[],
  formOid: string,
  excelRowIndex: number
): Partial<CrfFormElement> {
  const variableTypeIndex = headers.findIndex(
    (header) => header.toLowerCase().trim() === "variable type"
  );
  const displayType =
    variableTypeIndex >= 0
      ? String(row[variableTypeIndex] ?? "")
          .trim()
          .toLowerCase()
      : "";

  if (isDisplayBlockType(displayType)) {
    return mapRowToDisplayBlock(headers, row, displayType, excelRowIndex);
  }

  return mapRowToItem(headers, row, formOid, excelRowIndex);
}

function mapRowToDisplayBlock(
  headers: string[],
  row: any[],
  displayType: CrfDisplayBlock["displayType"],
  excelRowIndex: number
): Partial<CrfDisplayBlock> {
  const block: CrfDisplayBlock = {
    nodeType: "display",
    displayType,
    content: "",
    _sourceRowIndex: excelRowIndex,
  };

  headers.forEach((header, index) => {
    const value = row[index];
    if (value === undefined || value === null) {
      return;
    }

    const normalizedHeader = header.toLowerCase().trim();
    if (
      normalizedHeader === "label" ||
      normalizedHeader === "question / text" ||
      normalizedHeader === "question/text"
    ) {
      block.content = String(value);
    }
  });

  return block;
}

function mapRowToItem(
  headers: string[],
  row: any[],
  formOid: string,
  excelRowIndex: number
): Partial<CrfItem> {
  const item: any = {
    nodeType: "item",
    formOid,
    label: {},
    validation: { required: false },
    sdtmMapping: {},
    adamMapping: {},
    rowIndex: excelRowIndex,
  };

  headers.forEach((header, index) => {
    const value = row[index];
    if (value === undefined || value === null || value === "") return;
    const normalizedHeader = header.toLowerCase().trim();

    if (normalizedHeader === "variable name") {
      item.itemOid = String(value).trim().toUpperCase();
      item.name = item.itemOid;
    }
    if (
      normalizedHeader === "label" ||
      normalizedHeader === "question / text" ||
      normalizedHeader === "question/text"
    ) {
      item.label["en-US"] = String(value);
    } else {
      const match = LinguisticService.discoverLocaleFromHeader(header);
      if (match && match.type === "label") {
        item.label[match.locale] = String(value);
      }
    }
    if (normalizedHeader === "variable type") item.dataType = String(value).toLowerCase() as any;
    if (normalizedHeader === "length") item.length = parseNumericMetadata(value);
    if (normalizedHeader === "significant digits" || normalizedHeader === "precision")
      item.significantDigits = parseNumericMetadata(value);
    if (normalizedHeader === "required")
      item.validation.required = String(value).toLowerCase() === "yes";
    if (normalizedHeader === "require change reason" || normalizedHeader === "requirechangereason" || normalizedHeader === "audit threshold")
      item.requireChangeReason = String(value).toLowerCase() === "yes" || String(value).toLowerCase() === "true";
    if (normalizedHeader === "instructions") {
      if (!item.instructions) item.instructions = {};
      item.instructions["en-US"] = String(value);
    } else {
      const match = LinguisticService.discoverLocaleFromHeader(header);
      if (match && match.type === "instruction") {
        if (!item.instructions) item.instructions = {};
        item.instructions[match.locale] = String(value);
      }
    }
    if (normalizedHeader === "show if") item.showIf = String(value);
    if (normalizedHeader === "codelist id") item.codelistId = String(value).trim().toUpperCase();
    if (normalizedHeader === "origin") item.origin = normalizeDataOrigin(value);
    if (normalizedHeader === "methodoid" || normalizedHeader === "method oid")
      item.methodOid = String(value).trim();

    if (normalizedHeader === "sdtmdomain" || normalizedHeader === "sdtm domain")
      item.sdtmMapping.domain = String(value).trim();
    if (normalizedHeader === "sdtmvariable" || normalizedHeader === "sdtm variable")
      item.sdtmMapping.variable = String(value).trim();
    if (normalizedHeader === "sdtmncivariablecode" || normalizedHeader === "sdtm nci variable code")
      item.sdtmMapping.nciVariableCode = String(value).trim();
    if (normalizedHeader === "sdtmsasfieldname" || normalizedHeader === "sdtm sas field name")
      item.sdtmMapping.sasFieldName = String(value).trim();
    if (normalizedHeader === "sdtmsaslabel" || normalizedHeader === "sdtm sas label")
      item.sdtmMapping.sasLabel = String(value).trim();
    if (normalizedHeader === "sdtmsasdatasetname" || normalizedHeader === "sdtm sas dataset name")
      item.sdtmMapping.sasDatasetName = String(value).trim();
    if (normalizedHeader === "sdtmcore" || normalizedHeader === "sdtm core")
      item.sdtmMapping.core = String(value).trim() as any;
    if (normalizedHeader === "sdtmrole" || normalizedHeader === "sdtm role")
      item.sdtmMapping.role = String(value).trim();

    if (normalizedHeader === "adamdataset" || normalizedHeader === "adam dataset")
      item.adamMapping.dataset = String(value).trim();
    if (normalizedHeader === "adamvariable" || normalizedHeader === "adam variable")
      item.adamMapping.variable = String(value).trim();
    if (normalizedHeader === "adamncivariablecode" || normalizedHeader === "adam nci variable code")
      item.adamMapping.nciVariableCode = String(value).trim();
    if (normalizedHeader === "adamsasfieldname" || normalizedHeader === "adam sas field name")
      item.adamMapping.sasFieldName = String(value).trim();
    if (normalizedHeader === "adamsaslabel" || normalizedHeader === "adam sas label")
      item.adamMapping.sasLabel = String(value).trim();
    if (normalizedHeader === "adamcore" || normalizedHeader === "adam core")
      item.adamMapping.core = String(value).trim();
    if (normalizedHeader === "adamrole" || normalizedHeader === "adam role")
      item.adamMapping.role = String(value).trim();

    if (normalizedHeader === "comment") item.comment = String(value).trim();
  });

  return item;
}

function parseNumericMetadata(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return Number(value);
}
