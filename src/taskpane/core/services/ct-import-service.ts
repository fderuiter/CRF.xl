/* global Excel */
/**
 * @issue #76
 */

import {
  applyCodelistLifecycle,
  CrfCodelistsRow,
  LifecycleAction,
} from "./cdisc-ct-mapping-service";
import { SHEET_NAMES, SHEET_HEADERS } from "../registry/sheet-metadata-registry";
import { groupBy } from "../utils/collection-utils";
import { ChunkingEngine, ExecutionPlan } from "../engine/chunking-engine";
import { announcer } from "./announcer";

export type ConflictResolution = "skip" | "overwrite" | "append";

export interface ImportConflictItem {
  codelistId: string;
  codelistName: string;
  incomingTermCount: number;
  existingTermCount: number;
  message: string;
}

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

export interface CtImportPlan {
  incomingRows: CrfCodelistsRow[];
  /** Codelist IDs that are brand-new (no existing rows). */
  autoInsertIds: Set<string>;
  /** Codelist IDs where the incoming version is unambiguously newer — auto-overwrite. */
  autoOverwriteIds: Set<string>;
  /** Codelist IDs where all terms are byte-identical — silently skip. */
  skipIdenticalIds: Set<string>;
  /** Codelist IDs that have at least one `prompt_user` lifecycle decision. */
  conflictIds: Set<string>;
  /** Ordered list of conflict items for the UI to render. */
  conflicts: ImportConflictItem[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

const CODELISTS_HEADER = SHEET_HEADERS[SHEET_NAMES.CODELISTS];

function groupByCodelistId(rows: CrfCodelistsRow[]): Map<string, CrfCodelistsRow[]> {
  return groupBy(rows, (row) => row.codelistId);
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Reads the `_Codelists` worksheet and converts each data row into a
 * `CrfCodelistsRow`. Provenance fields that are not stored in the worksheet
 * (codelistOid, termOid, codelistVersion, source, etc.) default to empty
 * strings so that lifecycle comparisons treat manually-entered rows as
 * "unknown version" and prompt the user before overwriting.
 *
 * Throws if the worksheet is missing or protected.
 */
export async function readExistingCodelistRows(): Promise<CrfCodelistsRow[]> {
  return await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItemOrNullObject("_Codelists");
    sheet.load("isNullObject");
    await context.sync();

    if (sheet.isNullObject) {
      return [];
    }

    sheet.load("protection/protected");
    const usedRange = sheet.getUsedRangeOrNullObject();
    usedRange.load(["rowCount", "columnCount", "isNullObject"]);
    await context.sync();

    if (sheet.protection.protected) {
      throw new Error(
        "_Codelists worksheet is protected. Please unprotect it before importing controlled terminology."
      );
    }

    if (usedRange.isNullObject || usedRange.rowCount <= 1) {
      return [];
    }

    const rowCount = usedRange.rowCount;
    const allRows: CrfCodelistsRow[] = [];

    const engine = new ChunkingEngine<number>({ chunkSize: 500 });
    const plan: ExecutionPlan<number> = {
      id: "read_existing_ct",
      data: Array.from({ length: rowCount - 1 }, (_, i) => i + 1),
    };

    await engine.execute([plan], async (chunk) => {
      const chunkRange = sheet.getRangeByIndexes(chunk[0], 0, chunk.length, 4);
      chunkRange.load("values");
      await context.sync();

      const chunkValues = chunkRange.values as (string | number | boolean)[][];
      for (const row of chunkValues) {
        const codelistId = String(row[0] ?? "").trim();
        if (codelistId) {
          allRows.push({
            codelistId,
            codelistName: String(row[1] ?? "").trim(),
            codedValue: String(row[2] ?? "").trim(),
            decode: String(row[3] ?? "").trim(),
            codelistOid: "",
            termOid: "",
            codelistVersion: "",
            source: "",
            sourcePackageOid: "",
            sourcePackageTitle: "",
          });
        }
      }
    });

    return allRows;
  });
}

/**
 * Classifies each incoming codelist as auto-insert, auto-overwrite, skip, or
 * conflict based on the lifecycle rules from `applyCodelistLifecycle`.
 *
 * This is a **pure function** — it has no side effects and does not touch Excel.
 */
export function buildCtImportPlan(
  existingRows: CrfCodelistsRow[],
  incomingRows: CrfCodelistsRow[]
): CtImportPlan {
  const lifecycle = applyCodelistLifecycle(existingRows, incomingRows);

  // Determine which codelist IDs have at least one prompt_user decision
  const conflictIds = new Set<string>();
  lifecycle.decisions.forEach((d) => {
    if (d.action === "prompt_user") {
      conflictIds.add(d.row.codelistId);
    }
  });

  // Group lifecycle decisions by codelist ID
  const decisionsByCodelist = new Map<string, LifecycleAction[]>();
  lifecycle.decisions.forEach((d) => {
    const bucket = decisionsByCodelist.get(d.row.codelistId);
    if (bucket) {
      bucket.push(d.action);
    } else {
      decisionsByCodelist.set(d.row.codelistId, [d.action]);
    }
  });

  const autoInsertIds = new Set<string>();
  const autoOverwriteIds = new Set<string>();
  const skipIdenticalIds = new Set<string>();

  decisionsByCodelist.forEach((actions, codelistId) => {
    if (conflictIds.has(codelistId)) {
      // At least one prompt_user — skip classification for this codelist here
      return;
    }

    if (actions.every((a) => a === "skip_identical")) {
      skipIdenticalIds.add(codelistId);
    } else if (actions.every((a) => a === "insert")) {
      autoInsertIds.add(codelistId);
    } else {
      // Mix of insert + overwrite (new terms added to an existing codelist with a
      // newer version, or a fully new version that replaces the old one)
      autoOverwriteIds.add(codelistId);
    }
  });

  // Build conflict items for the UI
  const existingByCodelist = groupByCodelistId(existingRows);
  const incomingByCodelist = groupByCodelistId(incomingRows);

  const conflicts: ImportConflictItem[] = Array.from(conflictIds).map((id) => {
    const conflictDecision = lifecycle.decisions.find(
      (d) => d.row.codelistId === id && d.action === "prompt_user"
    );
    return {
      codelistId: id,
      codelistName: incomingByCodelist.get(id)?.[0]?.codelistName || id,
      incomingTermCount: incomingByCodelist.get(id)?.length ?? 0,
      existingTermCount: existingByCodelist.get(id)?.length ?? 0,
      message: conflictDecision?.message ?? "Conflict requires resolution.",
    };
  });

  return {
    incomingRows,
    autoInsertIds,
    autoOverwriteIds,
    skipIdenticalIds,
    conflictIds,
    conflicts,
  };
}

/**
 * Writes `CrfCodelistsRow[]` to the `_Codelists` worksheet using a single
 * batched Office.js range write, replacing all existing data rows while
 * preserving the header.
 *
 * Throws if:
 * - The `_Codelists` worksheet is missing.
 * - The worksheet is protected.
 */
async function writeCodelistRowsToSheet(rows: CrfCodelistsRow[]): Promise<void> {
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItemOrNullObject("_Codelists");
    sheet.load("isNullObject");
    await context.sync();

    if (sheet.isNullObject) {
      throw new Error("_Codelists worksheet not found. Please initialize the workbook first.");
    }

    sheet.load("protection/protected");
    const usedRange = sheet.getUsedRangeOrNullObject();
    usedRange.load(["rowCount", "isNullObject"]);
    await context.sync();

    if (sheet.protection.protected) {
      throw new Error(
        "_Codelists worksheet is protected. Please unprotect it before importing controlled terminology."
      );
    }

    const existingRowCount = usedRange.isNullObject ? 0 : usedRange.rowCount;

    const newValues: (string | number | boolean)[][] = [
      CODELISTS_HEADER,
      ...rows.map((r) => [r.codelistId, r.codelistName, r.codedValue, r.decode]),
    ];
    const newRowCount = newValues.length;

    const engine = new ChunkingEngine<any[]>({ chunkSize: 500 });
    engine.on("progress", (p: any) => {
      const pct = Math.round((p.completed / p.total) * 100);
      announcer.announce(`Writing controlled terminology: ${pct}% complete`);
    });

    const plan: ExecutionPlan<any[]> = {
      id: "write_ct_rows",
      data: newValues,
    };

    let currentRowOffset = 0;
    await engine.execute([plan], async (chunk) => {
      const writeRange = sheet.getRangeByIndexes(currentRowOffset, 0, chunk.length, 4);
      writeRange.values = chunk;
      currentRowOffset += chunk.length;
      await context.sync();
    });

    if (existingRowCount > newRowCount) {
      const clearRange = sheet.getRangeByIndexes(newRowCount, 0, existingRowCount - newRowCount, 4);
      clearRange.clear("Contents");
    }

    const namedItem = context.workbook.names.getItemOrNullObject("CodelistDictionary");
    namedItem.load("isNullObject");
    await context.sync();
    if (!namedItem.isNullObject) {
      namedItem.delete();
    }

    if (rows.length > 0) {
      context.workbook.names.add(
        "CodelistDictionary",
        sheet.getRangeByIndexes(1, 0, rows.length, 1)
      );
    }

    await context.sync();
  });
}

/**
 * Executes the import plan against the Excel workbook.
 *
 * For each codelist ID in the plan:
 * - **auto-insert**: append all incoming rows for that codelist.
 * - **auto-overwrite**: replace all existing rows for that codelist with
 *   incoming rows.
 * - **skip-identical**: leave the existing rows untouched.
 * - **conflict**: apply the caller-supplied `ConflictResolution`:
 *   - `"skip"` — keep existing rows, discard incoming.
 *   - `"overwrite"` — replace existing rows with incoming.
 *   - `"append"` — add incoming rows alongside existing rows.
 *
 * The write is performed as a single batch (`range.values = …`) so that a
 * write failure cannot leave the sheet in a partially-corrupted state.
 *
 * @param existingRows   Rows currently in `_Codelists` (from `readExistingCodelistRows`).
 * @param plan           The import plan produced by `buildCtImportPlan`.
 * @param conflictResolutions  Per-codelist conflict decisions keyed by `codelistId`.
 * @param onProgress     Optional progress callback (stage label, completed, total).
 */
export async function executeCtImport(
  existingRows: CrfCodelistsRow[],
  plan: CtImportPlan,
  conflictResolutions: Map<string, ConflictResolution>,
  onProgress?: (stage: string, completed: number, total: number) => void
): Promise<ImportSummary> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const incomingByCodelist = groupByCodelistId(plan.incomingRows);

  // Build the final row list starting from existing rows
  let finalRows = [...existingRows];

  const totalCodelists =
    plan.autoInsertIds.size +
    plan.autoOverwriteIds.size +
    plan.skipIdenticalIds.size +
    plan.conflictIds.size;
  let processed = 0;

  onProgress?.("Preparing import", 0, totalCodelists);

  // ── Auto-insert (brand-new codelists) ──────────────────────────────────────
  plan.autoInsertIds.forEach((id) => {
    const rows = incomingByCodelist.get(id) ?? [];
    finalRows.push(...rows);
    added += rows.length;
    onProgress?.("Inserting new codelists", ++processed, totalCodelists);
  });

  // ── Auto-overwrite (unambiguously newer version) ───────────────────────────
  plan.autoOverwriteIds.forEach((id) => {
    const incoming = incomingByCodelist.get(id) ?? [];
    finalRows = finalRows.filter((r) => r.codelistId !== id);
    finalRows.push(...incoming);
    updated += incoming.length;
    onProgress?.("Applying version updates", ++processed, totalCodelists);
  });

  // ── Skip identical ─────────────────────────────────────────────────────────
  plan.skipIdenticalIds.forEach((id) => {
    const rows = incomingByCodelist.get(id) ?? [];
    skipped += rows.length;
    onProgress?.("Skipping unchanged codelists", ++processed, totalCodelists);
  });

  // ── Conflict resolutions ───────────────────────────────────────────────────
  plan.conflictIds.forEach((id) => {
    const resolution = conflictResolutions.get(id) ?? "skip";
    const incoming = incomingByCodelist.get(id) ?? [];
    onProgress?.("Applying conflict resolutions", ++processed, totalCodelists);

    if (resolution === "skip") {
      skipped += incoming.length;
    } else if (resolution === "overwrite") {
      finalRows = finalRows.filter((r) => r.codelistId !== id);
      finalRows.push(...incoming);
      updated += incoming.length;
    } else {
      // "append" — add alongside existing rows
      finalRows.push(...incoming);
      added += incoming.length;
    }
  });

  // ── Batch write to Excel ───────────────────────────────────────────────────
  onProgress?.("Writing to workbook", totalCodelists, totalCodelists);

  try {
    await writeCodelistRowsToSheet(finalRows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    // Roll back counters — nothing was actually written
    failed = added + updated;
    added = 0;
    updated = 0;
  }

  return { added, updated, skipped, failed, errors, warnings };
}
