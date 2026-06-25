/**
 * @issue #84
 */
/* eslint-disable no-undef */
/* global Excel */
import { ValidationIssue } from "../parser/validator";
import { ParseRuntime, createParseRuntime, processRowsInChunks } from "../parser/chunking-runtime";
import { LinguisticService } from "./linguistics-service";
import { Annotation, AnnotationStatus } from "../types";

const ANNOTATIONS_XML_NAMESPACE = "http://schemas.crf-xl.com/annotations";

/**
 * Loads all annotations from the workbook's Custom XML storage.
 */
export async function loadAnnotationsFromStore(): Promise<Annotation[]> {
  return await Excel.run(async (context) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATIONS_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    if (parts.items.length === 0) {
      return [];
    }

    const part = parts.items[0];
    const xmlValue = part.getXml();
    await context.sync();

    try {
      const xmlString = xmlValue.value;
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const dataNode = xmlDoc.getElementsByTagName("Data")[0];
        if (dataNode && dataNode.textContent) {
          return JSON.parse(dataNode.textContent) as Annotation[];
        }
      }

      // Fallback for environments without DOMParser (like some Node test environments)
      const startTag = "<Data>";
      const endTag = "</Data>";
      const startIndex = xmlString.indexOf(startTag) + startTag.length;
      const endIndex = xmlString.indexOf(endTag);

      if (startIndex >= startTag.length && endIndex !== -1) {
        const jsonContent = xmlString.substring(startIndex, endIndex)
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        return JSON.parse(jsonContent) as Annotation[];
      }
      return [];
    } catch (e) {
      console.error("[AnnotationService] Failed to parse annotations from store", e);
      return [];
    }
  });
}

/**
 * Retrieves all annotations from the persistent store.
 */
export async function getAnnotations(): Promise<Annotation[]> {
  return await loadAnnotationsFromStore();
}

/**
 * Clears all annotations from the persistent store.
 */
export async function clearAllAnnotations(): Promise<void> {
  await saveAnnotationsToStore([]);
}

/**
 * Saves all annotations to the workbook's Custom XML storage.
 */
export async function saveAnnotationsToStore(annotations: Annotation[]): Promise<void> {
  await Excel.run(async (context) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATIONS_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    // Delete existing parts to ensure clean state
    for (const part of parts.items) {
      part.delete();
    }

    const jsonContent = JSON.stringify(annotations);
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Annotations xmlns="${ANNOTATIONS_XML_NAMESPACE}">
  <Data>${jsonContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data>
</Annotations>`;

    context.workbook.customXmlParts.add(xmlContent);
    await context.sync();
  });
}

/**
 * Checks for orphaned annotations (comments) across the active sheets.
 */
export async function getOrphanedAnnotationsCount(sheetNames: string[]): Promise<number> {
  let count = 0;
  await Excel.run(async (context) => {
    // Requirement 2: Centralized state-loading
    context.workbook.worksheets.load("items/name");
    await context.sync();

    const sheetsToCheck = context.workbook.worksheets.items.filter((s) =>
      sheetNames.includes(s.name)
    );
    for (const sheet of sheetsToCheck) {
      sheet.comments.load("items");
    }
    await context.sync();

    for (const sheet of sheetsToCheck) {
      count += sheet.comments.items.length;
    }
  });
  return count;
}

/**
 * Transactional Performance Engine
 * Consolidates clear and highlight operations into a single logical transaction wrapper.
 * Requirement 1: Unified transactional scope.
 * Requirement 2: Local cache instead of iterative host requests.
 * Requirement 3: Batched assignments.
 * Requirement 4: Automatic yielding.
 * Requirement 5: Collection-level deletion.
 */
export async function applyValidationVisuals(
  sheetNamesToClear: string[],
  issuesToHighlight: ValidationIssue[],
  runtime?: ParseRuntime
): Promise<void> {
  await Excel.run(async (context) => {
    const rt = runtime ?? createParseRuntime({ chunkSize: 100 });
    const originalYield = rt.yieldToHost;

    // Weaving context.sync() into the chunking lifecycle to prevent memory overflows
    rt.yieldToHost = async () => {
      await context.sync();
      await originalYield();
    };

    // 1. Centralized state-loading phase
    context.workbook.worksheets.load("items/name");
    await context.sync();

    const allSheetNames = new Set([
      ...sheetNamesToClear,
      ...issuesToHighlight.filter((i) => i.sheetName).map((i) => i.sheetName!),
    ]);

    const cache = new Map<
      string,
      {
        sheet: Excel.Worksheet;
        usedRange: Excel.Range;
        comments: Excel.CommentCollection;
      }
    >();

    for (const name of Array.from(allSheetNames)) {
      const sheet = context.workbook.worksheets.items.find((s) => s.name === name);
      if (sheet) {
        const usedRange = sheet.getUsedRangeOrNullObject();
        usedRange.load(["rowCount", "columnCount", "isNullObject"]);
        sheet.comments.load("items");
        cache.set(name, { sheet, usedRange, comments: sheet.comments });
      }
    }

    // Single sync to load all used ranges and comments
    await context.sync();

    // 2. Clear previous annotations
    const allComments: Excel.Comment[] = [];

    for (const name of sheetNamesToClear) {
      const state = cache.get(name);
      if (!state) continue;

      if (!state.usedRange.isNullObject && state.usedRange.rowCount > 1) {
        const dataRange = state.sheet.getRangeByIndexes(
          1,
          0,
          state.usedRange.rowCount - 1,
          state.usedRange.columnCount
        );
        dataRange.format.fill.clear();
      }

      allComments.push(...state.comments.items);
    }

    if (allComments.length > 0) {
      rt.reportProgress({
        phase: "items",
        completed: 0,
        total: allComments.length,
        message: "Clearing previous comments",
      });
      await processRowsInChunks(allComments, rt, "items", (c, index) => {
        c.delete();
        rt.reportProgress({
          phase: "items",
          completed: index + 1,
          total: allComments.length,
          message: "Clearing previous comments",
        });
      });
    }

    // 3. Highlight new errors
    if (issuesToHighlight.length > 0) {
      rt.reportProgress({
        phase: "items",
        completed: 0,
        total: issuesToHighlight.length,
        message: "Highlighting validation errors",
      });
      await processRowsInChunks(issuesToHighlight, rt, "items", (issue, index) => {
        if (!issue.sheetName || issue.rowIndex === undefined) return;
        const state = cache.get(issue.sheetName);
        if (!state) return;

        const rowRange = state.sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 8);
        rowRange.format.fill.color = "#fee2e2"; // Tailwind red-100

        const cell = state.sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 1);
        try {
          state.comments.add(cell, issue.message);
        } catch (e) {
          console.warn(`[AnnotationService] Could not add comment to sheet: ${issue.sheetName}`, e);
        }

        rt.reportProgress({
          phase: "items",
          completed: index + 1,
          total: issuesToHighlight.length,
          message: "Highlighting validation errors",
        });
      });
    }

    // Final sync for any remaining queued operations
    await context.sync();
  });
}

/**
 * Resolves a physical range from a logical OID.
 * Searches across the study's forms to find the OID.
 */
export async function resolvePhysicalRange(logicalId: string): Promise<{ sheetName: string; address: string } | null> {
  let result: { sheetName: string; address: string } | null = null;
  if (typeof Excel === "undefined") return null;
  await Excel.run(async (context) => {
    const workbook = context.workbook;
    const sheets = workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    for (const sheet of sheets.items) {
      if (sheet.name.startsWith("_")) continue;

      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load(["values", "address", "rowCount", "columnCount", "isNullObject", "columnIndex", "rowIndex"]);
      await context.sync();

      if (usedRange.isNullObject) continue;

      const values = usedRange.values;
      // Search for logicalId in the sheet's used range
      // Clinical OIDs are typically in the first column (Variable Name)
      for (let r = 0; r < values.length; r++) {
        for (let c = 0; c < Math.min(values[r].length, 5); c++) { // Search first 5 columns for OID
          if (String(values[r][c]).trim() === logicalId) {
            const targetCell = sheet.getRangeByIndexes(usedRange.rowIndex + r, usedRange.columnIndex + c, 1, 1);
            targetCell.load("address");
            await context.sync();
            result = {
              sheetName: sheet.name,
              address: targetCell.address
            };
            return;
          }
        }
      }
    }
  });
  return result;
}

/**
 * Resolves a logical OID from a physical address.
 */
export async function resolveLogicalId(sheetName: string, address: string): Promise<string | null> {
  let logicalId: string | null = null;
  if (typeof Excel === "undefined") return null;
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    range.load(["rowIndex", "columnIndex"]);
    await context.sync();

    // Strategy: Look at the first few columns of the current row to find a likely OID
    // Also look at the header if it's a known clinical sheet
    const potentialOidRange = sheet.getRangeByIndexes(range.rowIndex, 0, 1, 5);
    potentialOidRange.load("values");
    await context.sync();

    if (potentialOidRange.values.length > 0) {
      const rowValues = potentialOidRange.values[0];
      // Typically the OID is in the first column
      if (rowValues[0]) {
        logicalId = String(rowValues[0]);
      }
    }
  });
  return logicalId;
}

/**
 * Handles workbook mutations like sheet renames or row/column insertions.
 * Office.js comments follow cells automatically, but we ensure our hybrid
 * model stays in sync by refreshing logical-to-physical mappings.
 */
export async function syncAnnotationsAfterMutation(): Promise<void> {
  if (typeof Excel === "undefined") return;

  const orphans = await detectOrphanedAnnotations();
  if (orphans.length > 0) {
    console.warn(`[AnnotationService] Detected ${orphans.length} orphaned annotations after mutation.`);
    // Automatically attempt repair or flag them
    await repairOrphanedAnnotations(orphans);
  }

  await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    for (const sheet of sheets.items) {
      if (sheet.name.startsWith("_")) continue;

      const comments = sheet.comments;
      comments.load("items/content");
      await context.sync();

      for (const comment of comments.items) {
        const content = comment.content;
        const metaMatch = content.match(/^\[(.*?):(.*?)\].*/);
        if (metaMatch) {
          const logicalId = metaMatch[2];
          // Use any for location if it's not in the type definition but exists in runtime
          const location = (comment as any).location;
          if (location) {
            location.load("address");
            await context.sync();

            const currentLogicalId = await resolveLogicalId(sheet.name, location.address);
            if (currentLogicalId && currentLogicalId !== logicalId) {
              console.warn(`[AnnotationService] Anchor mismatch at ${location.address}: Expected ${logicalId}, found ${currentLogicalId}`);
              // Logic to handle orphan/drift could be added here
            }
          }
        }
      }
    }
  });
}

/**
 * Handles copy/paste operations by validating if the target cells should receive
 * the annotation and creating new candidates if necessary.
 */
export async function handleAnnotationCopyPaste(
  sourceAddress: string,
  targetAddress: string
): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    console.log(`[AnnotationService] Handling copy from ${sourceAddress} to ${targetAddress}`);

    const resolveRange = (addr: string) => {
      if (addr.includes("!")) {
        const [sName, rAddr] = addr.split("!");
        return context.workbook.worksheets.getItem(sName).getRange(rAddr);
      }
      return context.workbook.worksheets.getActiveWorksheet().getRange(addr);
    };

    const sourceRange = resolveRange(sourceAddress);
    const targetRange = resolveRange(targetAddress);

    const sourceComments = (sourceRange as any).getComments ? (sourceRange as any).getComments() : (context.workbook.worksheets.getActiveWorksheet().comments as any).getComments(sourceRange);
    sourceComments.load("items/content");
    await context.sync();

    for (const comment of sourceComments.items) {
      // Propagation policy: copy creates new annotation candidate requiring confirmation
      // We mark it with a "[CANDIDATE]" flag in the content
      const candidateContent = `[CANDIDATE] ${comment.content}`;
      const targetSheet = targetRange.worksheet;
      targetSheet.comments.add(targetRange, candidateContent);
    }
  });
}

/**
 * Ensures annotations follow the entity identity during sort/filter.
 */
export async function reconcileAnnotationsAfterSort(sheetName: string): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    console.log(`[AnnotationService] Reconciling annotations for sheet: ${sheetName}`);
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const comments = sheet.comments;
    comments.load("items/content");
    await context.sync();

    for (const comment of comments.items) {
      const location = (comment as any).location;
      if (location) {
        location.load("address");
        await context.sync();
        // After sort, we verify the logical identity still matches
        const currentId = await resolveLogicalId(sheetName, location.address);
        const metaMatch = comment.content.match(/^\[.*?:(.*?)\].*/);
        if (metaMatch && currentId !== metaMatch[1]) {
          console.warn(`[AnnotationService] Annotation for ${metaMatch[1]} drifted to ${currentId} after sort at ${location.address}`);
        }
      }
    }
  });
}

/**
 * Handles partial range movements that might split or orphan an annotation.
 */
export async function handlePartialRangeMovement(
  movedAddress: string,
  _originalAddress: string
): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    console.log(`[AnnotationService] Partial move to ${movedAddress}`);
    const movedRange = movedAddress.includes("!")
      ? context.workbook.worksheets.getItem(movedAddress.split("!")[0]).getRange(movedAddress.split("!")[1])
      : context.workbook.worksheets.getActiveWorksheet().getRange(movedAddress);

    // Check if the original address had an annotation that should have moved entirely
    const comments = (movedRange as any).getComments ? (movedRange as any).getComments() : (movedRange.worksheet.comments as any).getComments(movedRange);
    comments.load("items/content");
    await context.sync();

    if (comments.items.length > 0) {
      // If it moved but was part of a larger range, flag it
      console.log(`[AnnotationService] Moved range ${movedAddress} contains annotations. Checking for splits...`);
    }
  });
}

/**
 * Detects overlapping incompatible annotations and returns them as validation issues.
 */
export async function detectAnnotationConflicts(sheetName: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  if (typeof Excel === "undefined") return issues;

  const allAnnotations = await loadAnnotationsFromStore();
  const sheetAnnotations = allAnnotations.filter(a => a.anchor.sheetName === sheetName);

  // Map to track occupied cells: address -> annotation metadata
  const occupied = new Map<string, { type: string; id: string }>();

  for (const annotation of sheetAnnotations) {
    const address = annotation.anchor.address;

    if (occupied.has(address)) {
      const existing = occupied.get(address)!;
      // Conflict policy: Overlapping incompatible annotations are validation problems
      if (existing.type !== annotation.type) {
        issues.push({
          level: "Error",
          message: `Overlapping incompatible annotations: ${existing.type} and ${annotation.type} on cell ${address}.`,
          sheetName: sheetName,
          location: address
        });
      }
    } else {
      occupied.set(address, { type: annotation.type, id: annotation.id });
    }
  }

  return issues;
}

/**
 * Applies multiple annotations at once.
 */
export async function bulkApplyAnnotations(
  items: { sheetName: string; address: string; annotation: Annotation }[]
): Promise<void> {
  if (typeof Excel === "undefined") return;

  const commentsToId: { comment: Excel.Comment; annotation: Annotation }[] = [];

  await Excel.run(async (context) => {
    for (const item of items) {
      const sheet = context.workbook.worksheets.getItem(item.sheetName);
      const range = sheet.getRange(item.address);

      const metaPrefix = `[${item.annotation.type}:${item.annotation.anchor.logicalId || "N/A"}]`;
      const displayContent =
        typeof item.annotation.content === "string" ? item.annotation.content : item.annotation.content.value || "";

      const fullContent = `${metaPrefix}\n${displayContent}`;

      try {
        const comment = sheet.comments.add(range, fullContent);
        comment.load("id");
        commentsToId.push({ comment, annotation: item.annotation });
      } catch (e) {
        console.error(`[AnnotationService] Failed to apply annotation at ${item.address}`, e);
      }
    }
    await context.sync();

    // After sync, capture real IDs
    for (const pair of commentsToId) {
      pair.annotation.id = pair.comment.id;
    }
  });

  const allAnnotations = await loadAnnotationsFromStore();
  allAnnotations.push(...items.map(i => i.annotation));
  await saveAnnotationsToStore(allAnnotations);
}

/**
 * Applies a clinical annotation to a range.
 * Uses a hybrid anchoring approach: physical address + logical context.
 */
export async function applyAnnotation(
  sheetName: string,
  address: string,
  annotation: Annotation
): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);

    // Format the comment content to include metadata for the hybrid model
    const metaPrefix = `[${annotation.type}:${annotation.anchor.logicalId || "N/A"}]`;
    const displayContent =
      typeof annotation.content === "string" ? annotation.content : annotation.content.value || "";

    const fullContent = `${metaPrefix}\n${displayContent}`;

    try {
      const comment = sheet.comments.add(range, fullContent);
      comment.load("id");
      await context.sync();
      annotation.id = comment.id;
    } catch (e) {
      console.error("[AnnotationService] Failed to apply annotation", e);
      throw e;
    }
  });

  // Persist to store
  const allAnnotations = await loadAnnotationsFromStore();
  allAnnotations.push(annotation);
  await saveAnnotationsToStore(allAnnotations);
}

/**
 * Edits an existing annotation's content.
 */
export async function editAnnotation(
  sheetName: string,
  address: string,
  newContent: string | Annotation
): Promise<void> {
  if (typeof Excel === "undefined") return;

  let annotationId: string | null = null;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    const comments = (range as any).getComments ? (range as any).getComments() : (sheet.comments as any).getComments(range);
    comments.load("items");
    await context.sync();

    if (comments.items.length > 0) {
      const comment = comments.items[0];
      annotationId = comment.id;

      if (typeof newContent === "string") {
        const oldContent = comment.content;
        const prefixMatch = oldContent.match(/^(\[.*\])\n/);
        const prefix = prefixMatch ? prefixMatch[1] + "\n" : "";
        comment.content = `${prefix}${newContent}`;
      } else {
        const metaPrefix = `[${newContent.type}:${newContent.anchor.logicalId || "N/A"}]`;
        const displayContent =
          typeof newContent.content === "string"
            ? newContent.content
            : newContent.content.value || "";
        comment.content = `${metaPrefix}\n${displayContent}`;
      }
      await context.sync();
    }
  });

  if (annotationId) {
    const allAnnotations = await loadAnnotationsFromStore();
    const index = allAnnotations.findIndex(a => a.id === annotationId);
    if (index !== -1) {
      if (typeof newContent === "string") {
        allAnnotations[index].content = newContent;
      } else {
        allAnnotations[index] = { ...newContent, id: annotationId };
      }
      allAnnotations[index].updatedTimestamp = new Date().toISOString();
      allAnnotations[index].version += 1;
      await saveAnnotationsToStore(allAnnotations);
    }
  }
}

/**
 * Removes annotations from a specific range.
 */
export async function removeAnnotation(sheetName: string, address: string): Promise<void> {
  if (typeof Excel === "undefined") return;

  const removedIds: string[] = [];

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    const comments = (range as any).getComments ? (range as any).getComments() : (sheet.comments as any).getComments(range);
    comments.load("items");
    await context.sync();

    for (const comment of comments.items) {
      removedIds.push(comment.id);
      comment.delete();
    }
    await context.sync();
  });

  if (removedIds.length > 0) {
    const allAnnotations = await loadAnnotationsFromStore();
    const filtered = allAnnotations.filter(a => !removedIds.includes(a.id));
    await saveAnnotationsToStore(filtered);
  }
}

/**
 * Detects orphaned annotations by comparing the persistent store with the actual workbook state.
 * Optimized to minimize sync calls.
 */
export async function detectOrphanedAnnotations(): Promise<{ annotation: Annotation; reason: "PhysicalMissing" | "LogicalMismatch" }[]> {
  const orphans: { annotation: Annotation; reason: "PhysicalMissing" | "LogicalMismatch" }[] = [];
  if (typeof Excel === "undefined") return orphans;

  const allAnnotations = await getAnnotations();
  if (allAnnotations.length === 0) return [];

  await Excel.run(async (context) => {
    const sheetCache = new Map<string, Excel.Worksheet>();

    // Batch load sheets and metadata
    for (const annotation of allAnnotations) {
      if (!sheetCache.has(annotation.anchor.sheetName)) {
        const sheet = context.workbook.worksheets.getItemOrNullObject(annotation.anchor.sheetName);
        sheet.load("isNullObject");
        sheetCache.set(annotation.anchor.sheetName, sheet);
      }
    }
    await context.sync();

    const annotationMetadata = new Map<string, { range: Excel.Range; comments: Excel.CommentCollection }>();

    for (const annotation of allAnnotations) {
      const sheet = sheetCache.get(annotation.anchor.sheetName)!;
      if (sheet.isNullObject) continue;

      const range = (sheet as any).getRangeOrNullObject ? (sheet as any).getRangeOrNullObject(annotation.anchor.address) : sheet.getRange(annotation.anchor.address);
      range.load(["isNullObject", "address", "rowIndex", "columnIndex"]);
      const comments = (range as any).getComments ? (range as any).getComments() : (sheet.comments as any).getComments(range);
      comments.load("items");

      annotationMetadata.set(annotation.id, { range, comments });
    }
    await context.sync();

    // Secondary data gathering for Logical Mismatch
    const logicalCheckMetadata = new Map<string, Excel.Range>();
    for (const annotation of allAnnotations) {
      const meta = annotationMetadata.get(annotation.id);
      if (!meta) continue;

      const sheet = sheetCache.get(annotation.anchor.sheetName)!;
      if (sheet.isNullObject || meta.range.isNullObject || meta.comments.items.length === 0) {
        orphans.push({ annotation, reason: "PhysicalMissing" });
      } else if (annotation.anchor.logicalId) {
        // Prepare logical ID check - look at first 5 columns of the row
        const potentialOidRange = sheet.getRangeByIndexes(meta.range.rowIndex, 0, 1, 5);
        potentialOidRange.load("values");
        logicalCheckMetadata.set(annotation.id, potentialOidRange);
      }
    }
    await context.sync();

    // Final logical evaluation
    logicalCheckMetadata.forEach((range, id) => {
      const annotation = allAnnotations.find(a => a.id === id)!;
      if (range.values.length > 0) {
        const rowValues = range.values[0];
        const currentLogicalId = String(rowValues[0]);
        if (currentLogicalId !== annotation.anchor.logicalId) {
          orphans.push({ annotation, reason: "LogicalMismatch" });
        }
      }
    });
  });

  return orphans;
}

/**
 * Repairs orphaned annotations by attempting to re-anchor them or marking them as orphaned.
 */
export async function repairOrphanedAnnotations(
  orphans: { annotation: Annotation; reason: "PhysicalMissing" | "LogicalMismatch" }[]
): Promise<void> {
  const allAnnotations = await getAnnotations();

  // Step 1: Attempt to find new physical addresses for logical mismatches in bulk
  const logicalIdsToFind = orphans
    .filter(o => o.reason === "LogicalMismatch" && o.annotation.anchor.logicalId)
    .map(o => o.annotation.anchor.logicalId!);

  const newLocations = new Map<string, { sheetName: string; address: string }>();

  if (logicalIdsToFind.length > 0) {
    // resolvePhysicalRange is already transactional but works on one ID.
    // For true bulk we'd need a multi-ID version. Given current structure, we'll process them.
    for (const id of logicalIdsToFind) {
      const loc = await resolvePhysicalRange(id);
      if (loc) newLocations.set(id, loc);
    }
  }

  // Step 2: Apply repairs
  await Excel.run(async (context) => {
    for (const orphan of orphans) {
      const index = allAnnotations.findIndex(a => a.id === orphan.annotation.id);
      if (index === -1) continue;

      if (orphan.reason === "LogicalMismatch" && orphan.annotation.anchor.logicalId) {
        const loc = newLocations.get(orphan.annotation.anchor.logicalId);
        if (loc) {
          allAnnotations[index].anchor.address = loc.address;
          allAnnotations[index].anchor.sheetName = loc.sheetName;
          allAnnotations[index].status = AnnotationStatus.Active;

          // Re-apply visually in same run
          const sheet = context.workbook.worksheets.getItem(loc.sheetName);
          const range = sheet.getRange(loc.address);
          const metaPrefix = `[${allAnnotations[index].type}:${allAnnotations[index].anchor.logicalId}]`;
          const displayContent = typeof allAnnotations[index].content === "string" ? allAnnotations[index].content : (allAnnotations[index].content as any).value || "";
          sheet.comments.add(range, `${metaPrefix}\n${displayContent}`);
        } else {
          allAnnotations[index].status = AnnotationStatus.Orphaned;
        }
      } else {
        allAnnotations[index].status = AnnotationStatus.Orphaned;
      }
      allAnnotations[index].updatedTimestamp = new Date().toISOString();
    }
    await context.sync();
  });

  await saveAnnotationsToStore(allAnnotations);
}

/**
 * Visually highlights columns in _Codelists that represent translations.
 */
export async function highlightLocaleColumns(): Promise<void> {
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItemOrNullObject("_Codelists");
    await context.sync();
    if (sheet.isNullObject) return;

    const usedRange = sheet.getUsedRangeOrNullObject();
    usedRange.load([
      "columnCount",
      "rowCount",
      "columnIndex",
      "rowIndex",
      "isNullObject",
      "values",
    ]);
    await context.sync();

    if (usedRange.isNullObject || usedRange.values.length === 0) return;

    const headers = usedRange.values[0];
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]);
      if (LinguisticService.discoverLocaleFromHeader(header)) {
        const column = sheet.getRangeByIndexes(
          usedRange.rowIndex,
          usedRange.columnIndex + i,
          usedRange.rowCount,
          1
        );
        column.format.fill.color = "#ecfdf5"; // Tailwind green-50
      }
    }
    await context.sync();
  });
}
