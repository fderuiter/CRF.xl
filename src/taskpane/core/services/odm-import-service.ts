/**
 * @issue #63, #76
 */
import ExcelJS from "exceljs";
import { validateStudyDesign } from "../parser/validator";
import { Codelist, StudyDesign } from "../types";
import {
  ImportDiagnostic,
  ImportProvenance,
  ImportStatus,
  WorkbookProjection,
} from "./migration-pipeline";
import { SHEET_NAMES, SHEET_HEADERS } from "../registry/sheet-metadata-registry";
import { groupBy } from "../utils/collection-utils";
import { LinguisticService } from "./linguistics-service";
import { normalizeDataType, normalizeOid } from "../parser/metadata-utils";

/**
 * Normalised severity for ODM import diagnostics.
 * Lowercase to align with the shared ImportSeverity contract.
 */
export type OdmImportDiagnosticSeverity = "error" | "warning";
export type OdmImportDiagnosticCategory = "Parse" | "Semantic" | "Unsupported";

/**
 * ODM-specific diagnostic record.  Extends the shared ImportDiagnostic so
 * that all import flows share a unified diagnostic contract while still
 * carrying the ODM-specific `category` value.
 */
export interface OdmImportDiagnostic extends ImportDiagnostic {
  severity: OdmImportDiagnosticSeverity;
  category: OdmImportDiagnosticCategory;
}

export interface OdmImportSummary {
  status: ImportStatus;
  actionsCount: {
    addedForms: number;
    addedCodelists: number;
    addedCodelistItems: number;
    warnings: number;
    errors: number;
  };
  details: Array<{
    sheet: "_Study" | "_Forms" | "_Codelists" | "_ODM";
    location: string;
    severity: "warning" | "conflict";
    message: string;
    suggestedResolution: "review" | "fix-source";
  }>;
}

/**
 * ODM workbook projection.  Satisfies the shared WorkbookProjection contract
 * (studyRows, formsRows, and codelistRows are all always present for ODM).
 */
export interface OdmWorkbookProjection extends WorkbookProjection {
  studyRows: string[][];
  formsRows: string[][];
  codelistRows: string[][];
}

export interface OdmImportPackage {
  study: StudyDesign;
  diagnostics: OdmImportDiagnostic[];
  projection: OdmWorkbookProjection;
  summary: OdmImportSummary;
  /**
   * Provenance record for this import run.
   * Populated when the caller supplies source metadata via createImportProvenance().
   * Present after write-back is confirmed; absent during preview-only calls.
   */
  provenance?: ImportProvenance;
}

interface XmlElementMatch {
  attributes: Record<string, string>;
  innerXml: string;
  index: number;
}

const STUDY_HEADERS = SHEET_HEADERS[SHEET_NAMES.STUDY];
const FORMS_HEADERS = SHEET_HEADERS[SHEET_NAMES.FORMS];
const CODELIST_HEADERS = SHEET_HEADERS[SHEET_NAMES.CODELISTS];
const UNSUPPORTED_ELEMENT_NAMES = [
  "StudyEventDef",
  "ItemGroupDef",
  "ItemDef",
  "MethodDef",
  "ConditionDef",
];

export async function importOdmXml(xml: string): Promise<OdmImportPackage> {
  const diagnostics: OdmImportDiagnostic[] = [];
  const emptyStudy = createEmptyStudy();

  const parseError = detectStructuralParseError(xml);
  if (parseError) {
    diagnostics.push({
      severity: "error",
      category: "Parse",
      message: parseError,
      location: "_ODM",
    });
    return buildImportPackage(emptyStudy, diagnostics);
  }

  const studyMatch = findXmlElements(xml, "Study")[0];
  if (!studyMatch) {
    diagnostics.push({
      severity: "error",
      category: "Semantic",
      message: "ODM Study element is missing.",
      location: "_Study",
    });
    return buildImportPackage(emptyStudy, diagnostics);
  }

  const metaDataVersions = findXmlElements(studyMatch.innerXml, "MetaDataVersion");
  if (metaDataVersions.length === 0) {
    diagnostics.push({
      severity: "error",
      category: "Semantic",
      message: "ODM MetaDataVersion element is missing.",
      location: "_Study",
    });
    return buildImportPackage(emptyStudy, diagnostics);
  }

  if (metaDataVersions.length > 1) {
    diagnostics.push({
      severity: "warning",
      category: "Semantic",
      message: `Multiple MetaDataVersion elements were found (${metaDataVersions.length}); only the first version will be imported in v1.`,
      location: "_Study",
    });
  }

  const study = createEmptyStudy();
  const activeMetaDataVersion = metaDataVersions[0];

  const globalVariables = findXmlElements(studyMatch.innerXml, "GlobalVariables")[0];
  const studyName = globalVariables
    ? getPreferredText(globalVariables.innerXml, "StudyName")
    : undefined;
  const protocolName = globalVariables
    ? getPreferredText(globalVariables.innerXml, "ProtocolName")
    : undefined;

  study.metadata.protocolId =
    nonEmpty(studyMatch.attributes.OID) || nonEmpty(protocolName) || study.metadata.protocolId;
  study.metadata.studyName =
    nonEmpty(studyName) || nonEmpty(protocolName) || study.metadata.studyName;
  study.metadata.version = inferMetaDataVersion(activeMetaDataVersion.attributes);
  study.metadata.defaultLanguage =
    inferDefaultLanguage([studyMatch.innerXml, activeMetaDataVersion.innerXml]) ||
    study.metadata.defaultLanguage;

  const formOrder = collectFormOrder(activeMetaDataVersion.innerXml);
  const formMatches = findXmlElements(activeMetaDataVersion.innerXml, "FormDef");
  const mappedForms: Array<{ orderNumber: number; formOid: string }> = [];

  const groupedForms = groupBy(formMatches, (m) => nonEmpty(m.attributes.OID));

  for (const [formOid, matches] of groupedForms.entries()) {
    if (!formOid) {
      matches.forEach(() => {
        diagnostics.push({
          severity: "error",
          category: "Semantic",
          message: "Encountered FormDef without an OID; the form cannot be mapped into _Forms.",
          location: "_Forms",
        });
      });
      continue;
    }

    const formMatch = matches[matches.length - 1];
    const originalIndex = formMatches.indexOf(formMatch);
    const orderNumber = formOrder[formOid] || originalIndex + 1;

    study.forms[formOid] = {
      formOid,
      formName:
        nonEmpty(formMatch.attributes.Name) ||
        getPreferredTranslatedText(formMatch.innerXml) ||
        formOid,
      repeating: normalizeOdmBoolean(formMatch.attributes.Repeating),
      orderNumber,
      effectiveVersion: study.metadata.version,
      itemGroups: [
        {
          groupOid: `${formOid}_GRP`,
          name: "Default Group",
          repeating: false,
          orderNumber: 1,
          items: [],
        },
      ],
    };
    mappedForms.push({ orderNumber, formOid });
  }

  mappedForms
    .sort((left, right) => left.orderNumber - right.orderNumber)
    .forEach((entry, index) => {
      study.forms[entry.formOid].orderNumber = index + 1;
    });

  const codeListMatches = findXmlElements(activeMetaDataVersion.innerXml, "CodeList");
  const groupedCodelists = groupBy(codeListMatches, (m) => nonEmpty(m.attributes.OID));

  for (const [codelistId, matches] of groupedCodelists.entries()) {
    if (!codelistId) {
      matches.forEach(() => {
        diagnostics.push({
          severity: "error",
          category: "Semantic",
          message:
            "Encountered CodeList without an OID; the codelist cannot be mapped into _Codelists.",
          location: "_Codelists",
        });
      });
      continue;
    }

    const codeListMatch = matches[matches.length - 1];

    const codelist: Codelist = {
      codelistId,
      codelistName:
        nonEmpty(codeListMatch.attributes.Name) ||
        getPreferredTranslatedText(codeListMatch.innerXml) ||
        codelistId,
      dataType: normalizeDataType(codeListMatch.attributes.DataType),
      items: [],
    };

    const codeListItems = findXmlElements(codeListMatch.innerXml, "CodeListItem");
    const enumeratedItems = findXmlElements(codeListMatch.innerXml, "EnumeratedItem");
    const allItems = codeListItems
      .concat(enumeratedItems)
      .sort((left, right) => left.index - right.index);

    codelist.items = allItems
      .map((itemMatch, itemIndex) => {
        const codedValue = nonEmpty(itemMatch.attributes.CodedValue);
        if (!codedValue) {
          diagnostics.push({
            severity: "error",
            category: "Semantic",
            message: `Codelist '${codelistId}' contains an item without CodedValue.`,
            location: "_Codelists",
          });
          return null;
        }

        const decode =
          getDecodeText(itemMatch.innerXml) ||
          getPreferredTranslatedText(itemMatch.innerXml) ||
          codedValue;
        if (decode === codedValue && itemMatch.innerXml.indexOf("Decode") === -1) {
          diagnostics.push({
            severity: "warning",
            category: "Semantic",
            message: `Codelist '${codelistId}' item '${codedValue}' has no Decode text; the coded value will be reused in _Codelists.`,
            location: "_Codelists",
          });
        }

        return {
          codelistId,
          codedValue,
          decodedText: {
            [study.metadata.defaultLanguage]: decode,
          },
          orderNumber: itemIndex + 1,
        };
      })
      .filter((i) => i !== null) as Codelist["items"];

    study.codelists[codelistId] = codelist;
  }

  collectUnsupportedConstructDiagnostics(activeMetaDataVersion.innerXml, diagnostics);
  collectLanguageDiagnostics(
    activeMetaDataVersion.innerXml,
    study.metadata.defaultLanguage,
    diagnostics
  );

  const validationIssues = await validateStudyDesign(study);
  validationIssues.forEach((issue) => {
    diagnostics.push({
      severity: issue.level.toLowerCase() as OdmImportDiagnosticSeverity,
      category: "Semantic",
      message: issue.message,
      location: issue.sheetName || issue.location,
    });
  });

  study.metadata.customProperties = {
    ...(study.metadata.customProperties ?? {}),
    odmImport: {
      sourceFormat: "CDISC ODM",
      metaDataVersionOid: activeMetaDataVersion.attributes.OID || "",
    },
  };

  return buildImportPackage(study, diagnostics);
}

export function projectOdmImportToWorkbook(study: StudyDesign): OdmWorkbookProjection {
  const formRows = Object.values(study.forms)
    .slice()
    .sort((left, right) => left.orderNumber - right.orderNumber)
    .map((form) => [form.formOid, form.formName, form.repeating ? "Yes" : "No", "Portrait"]);

  const codelistRows: string[][] = [];
  Object.values(study.codelists)
    .slice()
    .sort((left, right) => left.codelistId.localeCompare(right.codelistId))
    .forEach((codelist) => {
      codelist.items
        .slice()
        .sort((left, right) => left.orderNumber - right.orderNumber)
        .forEach((item) => {
          codelistRows.push([
            codelist.codelistId,
            codelist.codelistName,
            item.codedValue,
            LinguisticService.resolveTranslation(
              item.decodedText as any,
              study.metadata.defaultLanguage,
              study.metadata.defaultLanguage
            ).content,
          ]);
        });
    });

  return {
    studyRows: [
      STUDY_HEADERS,
      [
        study.metadata.protocolId,
        study.metadata.studyName,
        study.metadata.version,
        study.metadata.defaultLanguage,
      ],
    ],
    formsRows: [FORMS_HEADERS].concat(formRows),
    codelistRows: [CODELIST_HEADERS].concat(codelistRows),
  };
}

export function applyOdmImportToWorkbook(
  workbook: ExcelJS.Workbook,
  importPackage: OdmImportPackage
): void {
  const blockingDiagnostics = importPackage.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error"
  );
  if (blockingDiagnostics.length > 0) {
    throw new Error(
      "ODM import contains blocking diagnostics; review the import summary before write-back."
    );
  }

  writeWorksheetRows(workbook, "_Study", importPackage.projection.studyRows);
  writeWorksheetRows(workbook, "_Forms", importPackage.projection.formsRows);
  writeWorksheetRows(workbook, "_Codelists", importPackage.projection.codelistRows);
}

function buildImportPackage(
  study: StudyDesign,
  diagnostics: OdmImportDiagnostic[]
): OdmImportPackage {
  const projection = projectOdmImportToWorkbook(study);
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;

  return {
    study,
    diagnostics,
    projection,
    summary: {
      status: errorCount > 0 ? "conflicts" : warningCount > 0 ? "warnings" : "clean",
      actionsCount: {
        addedForms: Object.keys(study.forms).length,
        addedCodelists: Object.keys(study.codelists).length,
        addedCodelistItems: Object.values(study.codelists).reduce(
          (total, codelist) => total + codelist.items.length,
          0
        ),
        warnings: warningCount,
        errors: errorCount,
      },
      details: diagnostics.map((diagnostic) => ({
        sheet: mapDiagnosticSheet(diagnostic.location),
        location: diagnostic.location || "_ODM",
        severity: diagnostic.severity === "error" ? "conflict" : "warning",
        message: diagnostic.message,
        suggestedResolution: diagnostic.severity === "error" ? "fix-source" : "review",
      })),
    },
  };
}

function createEmptyStudy(): StudyDesign {
  return {
    metadata: {
      protocolId: "PROT-XXXX",
      studyName: "Untitled",
      version: "1.0",
      defaultLanguage: "en-US",
    },
    events: [],
    forms: {},
    codelists: {},
  };
}

function detectStructuralParseError(xml: string): string | undefined {
  if (!xml || !xml.trim()) {
    return "ODM XML content is empty.";
  }

  if (!/<(?:[\w.-]+:)?ODM\b/i.test(xml)) {
    return "ODM root element is missing.";
  }

  const stack: string[] = [];
  const tagPattern = /<\s*(\/?)\s*([A-Za-z_][\w:.-]*)\b([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(xml)) !== null) {
    const fullTag = match[0];
    if (fullTag.startsWith("<?") || fullTag.startsWith("<!")) {
      continue;
    }

    const isClosing = match[1] === "/";
    const localName = getLocalName(match[2]);
    const isSelfClosing = /\/\s*>$/.test(fullTag);

    if (isSelfClosing) {
      continue;
    }

    if (isClosing) {
      const expected = stack.pop();
      if (expected !== localName) {
        return `Malformed ODM XML: expected closing tag for '${expected || "document"}' but found '${localName}'.`;
      }
      continue;
    }

    stack.push(localName);
  }

  if (stack.length > 0) {
    return `Malformed ODM XML: missing closing tag for '${stack[stack.length - 1]}'.`;
  }

  return undefined;
}

function collectUnsupportedConstructDiagnostics(
  xml: string,
  diagnostics: OdmImportDiagnostic[]
): void {
  for (let index = 0; index < UNSUPPORTED_ELEMENT_NAMES.length; index += 1) {
    const localName = UNSUPPORTED_ELEMENT_NAMES[index];
    const count = findXmlElements(xml, localName).length;
    if (count === 0) {
      continue;
    }

    diagnostics.push({
      severity: "warning",
      category: "Unsupported",
      message: `ODM ${localName} elements are not projected into the workbook in v1 (${count} found).`,
      location: "_ODM",
    });
  }
}

function collectLanguageDiagnostics(
  xml: string,
  defaultLanguage: string,
  diagnostics: OdmImportDiagnostic[]
): void {
  const languages = collectLanguages(xml);
  if (languages.length > 1) {
    diagnostics.push({
      severity: "warning",
      category: "Unsupported",
      message: `Multiple ODM languages were detected (${languages.join(", ")}); workbook projection will use '${defaultLanguage}' as the default language.`,
      location: "_Study",
    });
  }
}

function collectLanguages(xml: string): string[] {
  const matches = findXmlElements(xml, "TranslatedText");
  const seen: Record<string, true> = {};
  const languages: string[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const language =
      nonEmpty(matches[index].attributes["xml:lang"]) || nonEmpty(matches[index].attributes.lang);
    if (!language || seen[language]) {
      continue;
    }
    seen[language] = true;
    languages.push(language);
  }

  return languages;
}

function inferDefaultLanguage(xmlFragments: string[]): string | undefined {
  for (let index = 0; index < xmlFragments.length; index += 1) {
    const languages = collectLanguages(xmlFragments[index]);
    if (languages.length > 0) {
      return languages[0];
    }
  }

  return undefined;
}

function collectFormOrder(xml: string): Record<string, number> {
  const orderByFormOid: Record<string, number> = {};
  const formRefs = findXmlElements(xml, "FormRef");

  for (let index = 0; index < formRefs.length; index += 1) {
    const formOid = nonEmpty(formRefs[index].attributes.FormOID);
    const orderNumber = Number(formRefs[index].attributes.OrderNumber || index + 1);
    if (!formOid || !Number.isFinite(orderNumber)) {
      continue;
    }

    if (!orderByFormOid[formOid] || orderNumber < orderByFormOid[formOid]) {
      orderByFormOid[formOid] = orderNumber;
    }
  }

  return orderByFormOid;
}

function findXmlElements(xml: string, localName: string): XmlElementMatch[] {
  const matches: XmlElementMatch[] = [];
  const escapedName = escapeRegExp(localName);
  const blockPattern = new RegExp(
    `<((?:[\\w.-]+:)?${escapedName})\\b([^>]*)>([\\s\\S]*?)</\\1>`,
    "gi"
  );
  const selfClosingPattern = new RegExp(`<((?:[\\w.-]+:)?${escapedName})\\b([^>]*)/\\s*>`, "gi");

  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockPattern.exec(xml)) !== null) {
    matches.push({
      attributes: parseXmlAttributes(blockMatch[2]),
      innerXml: blockMatch[3],
      index: blockMatch.index,
    });
  }

  let selfClosingMatch: RegExpExecArray | null;
  while ((selfClosingMatch = selfClosingPattern.exec(xml)) !== null) {
    matches.push({
      attributes: parseXmlAttributes(selfClosingMatch[2]),
      innerXml: "",
      index: selfClosingMatch.index,
    });
  }

  return matches.sort((left, right) => left.index - right.index);
}

function parseXmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const attributeName = match[1];
    const attributeValue = match[3] !== undefined ? match[3] : match[4];
    attributes[attributeName] = decodeXml(attributeValue);
  }

  return attributes;
}

function inferMetaDataVersion(attributes: Record<string, string>): string {
  const name = nonEmpty(attributes.Name);
  if (name) {
    return name.replace(/^version\s+/i, "").trim();
  }

  const oid = nonEmpty(attributes.OID);
  if (oid) {
    return normalizeOid(oid);
  }

  return "1.0";
}

function normalizeOdmBoolean(value: string | undefined): boolean {
  return (
    String(value || "")
      .trim()
      .toLowerCase() === "yes"
  );
}

function getPreferredText(xml: string, localName: string): string | undefined {
  const match = findXmlElements(xml, localName)[0];
  if (!match) {
    return undefined;
  }

  return getPreferredTranslatedText(match.innerXml) || extractInnerText(match.innerXml);
}

function getDecodeText(xml: string): string | undefined {
  const decode = findXmlElements(xml, "Decode")[0];
  if (!decode) {
    return undefined;
  }

  return getPreferredTranslatedText(decode.innerXml) || extractInnerText(decode.innerXml);
}

function getPreferredTranslatedText(xml: string): string | undefined {
  const translatedTexts = findXmlElements(xml, "TranslatedText");
  if (translatedTexts.length === 0) {
    return extractInnerText(xml) || undefined;
  }

  return extractInnerText(translatedTexts[0].innerXml) || undefined;
}

function extractInnerText(xml: string): string {
  return decodeXml(
    xml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function writeWorksheetRows(
  workbook: ExcelJS.Workbook,
  sheetName: "_Study" | "_Forms" | "_Codelists",
  rows: string[][]
): void {
  const worksheet = workbook.getWorksheet(sheetName) || workbook.addWorksheet(sheetName);
  if (worksheet.rowCount > 0) {
    worksheet.spliceRows(1, worksheet.rowCount);
  }
  worksheet.addRows(rows);
}

function mapDiagnosticSheet(location?: string): "_Study" | "_Forms" | "_Codelists" | "_ODM" {
  if (location === "_Study") {
    return "_Study";
  }
  if (location === "_Forms") {
    return "_Forms";
  }
  if (location === "_Codelists") {
    return "_Codelists";
  }
  return "_ODM";
}

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.trim() ? value.trim() : undefined;
}

function getLocalName(qualifiedName: string): string {
  const parts = qualifiedName.split(":");
  return parts[parts.length - 1];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
