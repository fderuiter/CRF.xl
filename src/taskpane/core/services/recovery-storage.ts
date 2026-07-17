/**
 * @issue #68
 */

import { z } from "zod";
import { StudyDesign, isCrfItem } from "../types";
import { ValidationIssue } from "../types";

export const RECOVERY_STORAGE_KEY = "crf-xl-recovery-snapshot-v1";
export const RECOVERY_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RECOVERY_APP_VERSION = "0.0.1";

export interface StorageLike {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

class ExcelCustomXmlStorage implements StorageLike {
  private readonly namespace = "http://schemas.crf-xl.com/recovery";

  async getItem(key: string): Promise<string | null> {
    if (typeof Excel === "undefined") return null;
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        const parts = context.workbook.customXmlParts.getByNamespace(this.namespace);
        parts.load("items");
        await context.sync();
        
        if (parts.items.length > 0) {
          const part = parts.items[0];
          (part as any).load("xml");
          await context.sync();
          
          const xml = (part as any).xml;
          if (typeof DOMParser !== "undefined") {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            const node = xmlDoc.getElementsByTagName(key)[0];
            resolve(node ? node.textContent : null);
          } else {
            // Simple regex fallback for environments without DOMParser
            const match = xml.match(new RegExp(`<${key}>(.*?)</${key}>`));
            resolve(match ? match[1] : null);
          }
          return;
        }
        resolve(null);
      }).catch(reject);
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof Excel === "undefined") return;
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        const parts = context.workbook.customXmlParts.getByNamespace(this.namespace);
        parts.load("items");
        await context.sync();
        
        let xmlDoc: Document | null = null;
        let part: Excel.CustomXmlPart;
        let xml: string = "";

        if (parts.items.length === 0) {
          const initialXml = `<Recovery xmlns="${this.namespace}"></Recovery>`;
          part = context.workbook.customXmlParts.add(initialXml);
          xml = initialXml;
          if (typeof DOMParser !== "undefined") {
            const parser = new DOMParser();
            xmlDoc = parser.parseFromString(initialXml, "text/xml");
          }
        } else {
          part = parts.items[0];
          (part as any).load("xml");
          await context.sync();
          xml = (part as any).xml;
          if (typeof DOMParser !== "undefined") {
            const parser = new DOMParser();
            xmlDoc = parser.parseFromString(xml, "text/xml");
          }
        }

        if (xmlDoc && typeof XMLSerializer !== "undefined") {
          const root = xmlDoc.getElementsByTagName("Recovery")[0];
          let existingNode = xmlDoc.getElementsByTagName(key)[0];
          
          const newNode = xmlDoc.createElement(key);
          newNode.textContent = value;

          if (existingNode) {
            root.replaceChild(newNode, existingNode);
          } else {
            root.appendChild(newNode);
          }

          const serializer = new XMLSerializer();
          part.setXml(serializer.serializeToString(xmlDoc));
        } else if (parts.items.length > 0) {
          // Simple regex replace for environments without DOMParser
          const regex = new RegExp(`<${key}>.*?</${key}>`);
          const newTag = `<${key}>${value}</${key}>`;
          if (regex.test(xml)) {
            xml = xml.replace(regex, newTag);
          } else {
            xml = xml.replace(`</Recovery>`, `${newTag}</Recovery>`);
          }
          part.setXml(xml);
        }
        await context.sync();
        resolve();
      }).catch(reject);
    });
  }

  async removeItem(key: string): Promise<void> {
    if (typeof Excel === "undefined") return;
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        const parts = context.workbook.customXmlParts.getByNamespace(this.namespace);
        parts.load("items");
        await context.sync();
        if (parts.items.length > 0) {
          const part = parts.items[0];
          (part as any).load("xml");
          await context.sync();
          const xml = (part as any).xml;
          
          if (typeof DOMParser !== "undefined" && typeof XMLSerializer !== "undefined") {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            const root = xmlDoc.getElementsByTagName("Recovery")[0];
            const node = xmlDoc.getElementsByTagName(key)[0];
            if (node) {
              root.removeChild(node);
              const serializer = new XMLSerializer();
              part.setXml(serializer.serializeToString(xmlDoc));
              await context.sync();
            }
          } else {
            // Regex fallback
            const regex = new RegExp(`<${key}>.*?</${key}>`);
            if (regex.test(xml)) {
              const newXml = xml.replace(regex, "");
              part.setXml(newXml);
              await context.sync();
            }
          }
        }
        resolve();
      }).catch(reject);
    });
  }
}

export interface StudyDesignSummary {
  formCount: number;
  variableCount: number;
  visitCount: number;
}

export interface ValidationSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  analyzedAt: number;
}

export interface RecoveryIssue {
  level: ValidationIssue["level"];
  message: ValidationIssue["message"];
  location?: ValidationIssue["location"];
  rowIndex?: ValidationIssue["rowIndex"];
  sheetName?: ValidationIssue["sheetName"];
}

export interface WorkbookFingerprint {
  sheetCount: number;
  sheetNames: string[];
}

export interface RecoverySnapshot {
  appVersion: string;
  savedAt: number;
  validationSummary: ValidationSummary;
  studySummary: StudyDesignSummary;
  uiState: {
    openForm?: string;
    currentFilter?: string;
  };
  issues: RecoveryIssue[];
  workbookFingerprint?: WorkbookFingerprint;
  justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
}

const StudyDesignSummarySchema = z
  .object({
    formCount: z.number(),
    variableCount: z.number(),
    visitCount: z.number(),
  })
  .strict();

const ValidationSummarySchema = z
  .object({
    totalIssues: z.number(),
    errorCount: z.number(),
    warningCount: z.number(),
    analyzedAt: z.number(),
  })
  .strict();

const RecoveryIssueSchema = z
  .object({
    level: z.enum(["Error", "Warning"]),
    message: z.string(),
    location: z.string().optional(),
    rowIndex: z.number().optional(),
    sheetName: z.string().optional(),
  })
  .strict();

const WorkbookFingerprintSchema = z
  .object({
    sheetCount: z.number(),
    sheetNames: z.array(z.string()),
  })
  .strict();

const JustificationSchema = z
  .object({
    reason: z.string(),
    userId: z.string(),
    timestamp: z.string(),
  })
  .strict();

export const RecoverySnapshotSchema = z
  .object({
    appVersion: z.string(),
    savedAt: z.number(),
    validationSummary: ValidationSummarySchema,
    studySummary: StudyDesignSummarySchema,
    uiState: z
      .object({
        openForm: z.string().optional(),
        currentFilter: z.string().optional(),
      })
      .strict(),
    issues: z.array(RecoveryIssueSchema),
    workbookFingerprint: WorkbookFingerprintSchema.optional(),
    justifications: z.record(z.string(), JustificationSchema).optional(),
  })
  .strict();

type PersistResult =
  | { saved: true }
  | { saved: false; reason: "storage-unavailable" | "quota-exceeded" | "unknown" };

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof Excel !== "undefined") {
    return new ExcelCustomXmlStorage();
  }
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: string }).name === "QuotaExceededError"
  );
}

export function summarizeStudyDesign(study: StudyDesign): StudyDesignSummary {
  const forms = Object.values(study.forms ?? {});
  const variableCount = forms.reduce(
    (total, form) =>
      total +
      (form.itemGroups ?? []).reduce(
        (groupTotal, group) => groupTotal + (group.items?.filter(isCrfItem).length ?? 0),
        0
      ),
    0
  );
  return {
    formCount: forms.length,
    variableCount,
    visitCount: study.events?.length ?? 0,
  };
}

export function summarizeValidation(
  issues: ValidationIssue[],
  analyzedAt: number = Date.now()
): ValidationSummary {
  const errorCount = issues.filter((issue) => issue.level === "Error").length;
  return {
    totalIssues: issues.length,
    errorCount,
    warningCount: issues.length - errorCount,
    analyzedAt,
  };
}

function sanitizeMessage(message: string): string {
  if (!message) return message;
  return message.replace(/'[^']*'/g, "'[REDACTED]'").replace(/"[^"]*"/g, '"[REDACTED]"');
}

export function toRecoveryIssues(issues: ValidationIssue[]): RecoveryIssue[] {
  return issues.map((issue) => ({
    level: issue.level,
    message: sanitizeMessage(issue.message),
    location: issue.location,
    rowIndex: issue.rowIndex,
    sheetName: issue.sheetName,
  }));
}

export function createRecoverySnapshot({
  issues,
  studySummary,
  openForm,
  currentFilter,
  workbookFingerprint,
  justifications,
  analyzedAt = Date.now(),
  appVersion = RECOVERY_APP_VERSION,
}: {
  issues: ValidationIssue[];
  studySummary: StudyDesignSummary;
  openForm?: string;
  currentFilter?: string;
  workbookFingerprint?: WorkbookFingerprint;
  justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
  analyzedAt?: number;
  appVersion?: string;
}): RecoverySnapshot {
  return {
    appVersion,
    savedAt: Date.now(),
    validationSummary: summarizeValidation(issues, analyzedAt),
    studySummary,
    uiState: {
      openForm,
      currentFilter,
    },
    issues: toRecoveryIssues(issues),
    workbookFingerprint,
    justifications,
  };
}

export async function persistRecoverySnapshot(
  snapshot: RecoverySnapshot,
  storage?: StorageLike
): Promise<PersistResult> {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return { saved: false, reason: "storage-unavailable" };

  try {
    const validatedSnapshot = RecoverySnapshotSchema.parse(snapshot);
    await resolvedStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(validatedSnapshot));
    return { saved: true };
  } catch (error) {
    if (isQuotaError(error)) return { saved: false, reason: "quota-exceeded" };
    return { saved: false, reason: "unknown" };
  }
}

export async function dismissRecoverySnapshot(storage?: StorageLike): Promise<void> {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return;
  try {
    await resolvedStorage.removeItem(RECOVERY_STORAGE_KEY);
  } catch {
    // no-op: storage cleanup failure should never crash UI
  }
}

export async function readRecoverySnapshot({
  storage,
  now = Date.now(),
  ttlMs = RECOVERY_SNAPSHOT_TTL_MS,
}: {
  storage?: StorageLike;
  now?: number;
  ttlMs?: number;
} = {}): Promise<RecoverySnapshot | null> {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return null;

  let raw: string | null = null;
  try {
    raw = await resolvedStorage.getItem(RECOVERY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const rawParsed = JSON.parse(raw);
    const parsed = RecoverySnapshotSchema.parse(rawParsed);

    if (now - parsed.savedAt > ttlMs) {
      await dismissRecoverySnapshot(resolvedStorage);
      return null;
    }
    return parsed;
  } catch {
    await dismissRecoverySnapshot(resolvedStorage);
    return null;
  }
}

export function hasWorkbookChanged(
  snapshot?: WorkbookFingerprint,
  current?: WorkbookFingerprint
): boolean {
  if (!snapshot || !current) return false;
  if (snapshot.sheetCount !== current.sheetCount) return true;
  if (snapshot.sheetNames.length !== current.sheetNames.length) return true;
  return snapshot.sheetNames.some((name, index) => name !== current.sheetNames[index]);
}
