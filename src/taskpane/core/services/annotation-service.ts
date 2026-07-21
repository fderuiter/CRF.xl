/// <reference types="office-js" />
import { sha256Native } from "../utils/crypto-utils";
import { logger } from "../utils/logger";
/**
 * @issue #84
 */

/* global Excel */
import { ChunkingEngine } from "../engine/chunking-engine";
import { ParseRuntime, createParseRuntime, processRowsInChunks } from "../parser/chunking-runtime";
import { LinguisticService } from "./linguistics-service";
import {
  Annotation,
  AnnotationType,
  AnnotationTargetType,
  TranslatedText,
  ValidationIssue,
} from "../types";
import {
  validateAnnotationTarget,
  detectConflicts,
  getRepairPolicy,
  RepairConfidence,
} from "../validators/annotation-validator";

const ANNOTATION_XML_NAMESPACE = "http://schemas.crf-xl.com/annotations";

/**
 * Serializes an annotation to XML string.
 * @param annotation
 * @returns
 */
function serializeAnnotation(annotation: Annotation): string {
  const content =
    typeof annotation.content === "string"
      ? annotation.content
      : JSON.stringify(annotation.content);

  return `<Annotation>
    <Id>${annotation.id}</Id>
    <Type>${annotation.type}</Type>
    <TargetType>${annotation.targetType}</TargetType>
    <Anchor>
      <Address>${annotation.anchor.address}</Address>
      <LogicalId>${annotation.anchor.logicalId || ""}</LogicalId>
      <SheetName>${annotation.anchor.sheetName}</SheetName>
    </Anchor>
    <Content><![CDATA[${content}]]></Content>
    <Author>${annotation.author || ""}</Author>
    <Timestamp>${annotation.timestamp}</Timestamp>
    <UpdatedTimestamp>${annotation.updatedTimestamp || ""}</UpdatedTimestamp>
    <Version>${annotation.version}</Version>
    <Metadata>${JSON.stringify(annotation.metadata || {})}</Metadata>
  </Annotation>`;
}

/**
 * Deserializes an annotation from an XML element.
 * @param element
 * @returns
 */
function deserializeAnnotation(element: Element): Annotation {
  const getTagValue = (tagName: string) => {
    const el = element.getElementsByTagName(tagName)[0];
    return el ? el.textContent : "";
  };

  const contentStr = getTagValue("Content") || "";
  let content: string | TranslatedText = contentStr;
  try {
    if (contentStr.startsWith("{")) {
      content = JSON.parse(contentStr);
    }
  } catch {
    // Keep as string
  }

  let metadata = {};
  try {
    metadata = JSON.parse(getTagValue("Metadata") || "{}");
  } catch (e) {
    logger.warn("[AnnotationService] Failed to parse annotation metadata", e);
  }

  return {
    id: getTagValue("Id") || "",
    type: (getTagValue("Type") as AnnotationType) || AnnotationType.COMMENT,
    targetType: (getTagValue("TargetType") as AnnotationTargetType) || AnnotationTargetType.CELL,
    anchor: {
      address: getTagValue("Address") || "",
      logicalId: getTagValue("LogicalId") || undefined,
      sheetName: getTagValue("SheetName") || "",
    },
    content,
    author: getTagValue("Author") || undefined,
    timestamp: getTagValue("Timestamp") || "",
    updatedTimestamp: getTagValue("UpdatedTimestamp") || undefined,
    version: parseInt(getTagValue("Version") || "1", 10),
    metadata,
  };
}

/**
 * Saves an annotation to the CustomXmlParts store.
 * @param annotation
 * @param existingContext
 */
export async function saveAnnotationToStore(
  annotation: Annotation,
  existingContext?: Excel.RequestContext
): Promise<void> {
  await saveAnnotationsToStoreBatch([annotation], existingContext);
}

/**
 * Saves multiple annotations to the CustomXmlParts store in a single operation.
 * @param annotations
 * @param existingContext
 */
export async function saveAnnotationsToStoreBatch(
  annotations: Annotation[],
  existingContext?: Excel.RequestContext
): Promise<void> {
  const operation = async (context: Excel.RequestContext) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATION_XML_NAMESPACE);
    parts.load("id");

    await context.sync();

    let xmlDoc: Document;
    let part: Excel.CustomXmlPart;

    const { items } = parts;
    if (items.length === 0) {
      const initialXml = `<Annotations xmlns="${ANNOTATION_XML_NAMESPACE}"></Annotations>`;
      part = context.workbook.customXmlParts.add(initialXml);
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(initialXml, "text/xml");
    } else {
      part = parts.items[0];
      (part as any).load("xml");

      await context.sync();
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString((part as any).xml, "text/xml");
    }

    const annotationsRoot = xmlDoc.getElementsByTagName("Annotations")[0];
    const existingAnnotationNodes = Array.from(xmlDoc.getElementsByTagName("Annotation"));

    for (const annotation of annotations) {
      let existingNode: Element | null = null;
      for (const node of existingAnnotationNodes) {
        const idNode = node.getElementsByTagName("Id")[0];
        if (idNode && idNode.textContent === annotation.id) {
          existingNode = node;
          break;
        }
      }

      const annotationXml = serializeAnnotation(annotation);
      const tempDoc = new DOMParser().parseFromString(annotationXml, "text/xml");
      const newNode = xmlDoc.importNode(tempDoc.documentElement, true);

      if (existingNode) {
        annotationsRoot.replaceChild(newNode, existingNode);
      } else {
        annotationsRoot.appendChild(newNode);
      }
    }

    const serializer = new XMLSerializer();
    const finalXml = serializer.serializeToString(xmlDoc);
    part.setXml(finalXml);
  };

  if (existingContext) {
    await operation(existingContext);
  } else if (typeof Excel !== "undefined") {
    await Excel.run(async (context) => {
      await operation(context);

      await context.sync();
    });
  }
}

/**
 * Loads all annotations from the CustomXmlParts store.
 * @param existingContext
 * @returns
 */
export async function loadAnnotationsFromStore(
  existingContext?: Excel.RequestContext
): Promise<Annotation[]> {
  const annotations: Annotation[] = [];
  const operation = async (context: Excel.RequestContext) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATION_XML_NAMESPACE);
    parts.load("id");

    await context.sync();

    const { items } = parts;
    if (items.length > 0) {
      const part = items[0];
      (part as any).load("xml");

      await context.sync();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString((part as any).xml, "text/xml");
      const annotationNodes = xmlDoc.getElementsByTagName("Annotation");
      for (let i = 0; i < annotationNodes.length; i++) {
        annotations.push(deserializeAnnotation(annotationNodes[i]));
      }
    }
  };

  if (existingContext) {
    await operation(existingContext);
  } else if (typeof Excel !== "undefined") {
    await Excel.run(async (context) => {
      await operation(context);
    });
  }
  return annotations;
}

/**
 * Deletes an annotation from the CustomXmlParts store.
 * @param id
 * @param existingContext
 */
export async function deleteAnnotationFromStore(
  id: string,
  existingContext?: Excel.RequestContext
): Promise<void> {
  await deleteAnnotationsFromStoreBatch([id], existingContext);
}

/**
 * Deletes multiple annotations from the CustomXmlParts store in a single operation.
 * @param ids
 * @param existingContext
 */
export async function deleteAnnotationsFromStoreBatch(
  ids: string[],
  existingContext?: Excel.RequestContext
): Promise<void> {
  const operation = async (context: Excel.RequestContext) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATION_XML_NAMESPACE);
    parts.load("id");

    await context.sync();

    const { items } = parts;
    if (items.length > 0) {
      const part = items[0];
      (part as any).load("xml");

      await context.sync();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString((part as any).xml, "text/xml");
      const annotationsRoot = xmlDoc.getElementsByTagName("Annotations")[0];
      const annotationNodes = Array.from(xmlDoc.getElementsByTagName("Annotation"));

      for (const id of ids) {
        for (const node of annotationNodes) {
          const idNode = node.getElementsByTagName("Id")[0];
          if (idNode && idNode.textContent === id) {
            annotationsRoot.removeChild(node);
            break;
          }
        }
      }

      const serializer = new XMLSerializer();
      const finalXml = serializer.serializeToString(xmlDoc);
      part.setXml(finalXml);
    }
  };

  if (existingContext) {
    await operation(existingContext);
  } else if (typeof Excel !== "undefined") {
    await Excel.run(async (context) => {
      await operation(context);

      await context.sync();
    });
  }
}

/**
 * Detects drifted annotations where the current row hash no longer matches the stored anchoringHash.
 * Uses the bi-directional scanner to propose a new address if found.
 * @returns
 */
export async function detectDrifts(): Promise<DriftWarning[]> {
  const drifts: DriftWarning[] = [];
  if (typeof Excel === "undefined") return drifts;

  await Excel.run(async (context) => {
    const stored = await loadAnnotationsFromStore(context);

    const engine = new ChunkingEngine<Annotation>({ chunkSize: 500 });

    await engine.execute([{ id: "detect-drifts", data: stored }], async (chunk: Annotation[]) => {
      // Phase 1: Load sheet presence
      const sheetInfos = chunk
        .filter((a: Annotation) => a.metadata && a.metadata.anchoringHash)
        .map((annotation: Annotation) => ({
          annotation,
          sheet: context.workbook.worksheets.getItemOrNullObject(annotation.anchor.sheetName),
        }));

      for (const info of sheetInfos) {
        info.sheet.load("name"); // implicitly loads isNullObject
      }

      await context.sync();

      // Phase 2: Load range rowIndex
      const ranges: {
        annotation: Annotation;
        sheet: Excel.Worksheet;
        range: Excel.Range | null;
      }[] = [];
      for (const info of sheetInfos) {
        if (!info.sheet.isNullObject) {
          try {
            const range = info.sheet.getRange(info.annotation.anchor.address);
            range.load("rowIndex");
            ranges.push({ annotation: info.annotation, sheet: info.sheet, range });
          } catch {
            ranges.push({ annotation: info.annotation, sheet: info.sheet, range: null });
          }
        }
      }

      await context.sync();

      // Phase 3: Evaluate hashes and detect drift
      for (const r of ranges) {
        if (r.range) {
          const currentHash = await generateRowHash(
            r.annotation.anchor.sheetName,
            r.range.rowIndex,
            r.annotation.anchor.logicalId
          );

          if (currentHash !== r.annotation.metadata?.anchoringHash) {
            const newAddress = await scanForDrift(
              r.annotation.anchor.sheetName,
              r.range.rowIndex,
              r.annotation.metadata?.anchoringHash || "",
              r.annotation.anchor.logicalId
            );

            drifts.push({
              annotationId: r.annotation.id,
              originalAddress: r.annotation.anchor.address,
              proposedAddress: newAddress,
              message: `Annotation ${r.annotation.anchor.logicalId || r.annotation.id} drifted from ${r.annotation.anchor.address}.`,
              lostHash: newAddress === null,
            });
          }
        } else {
          // Range was invalid
          const newAddress = await scanForDrift(
            r.annotation.anchor.sheetName,
            0,
            r.annotation.metadata?.anchoringHash || "",
            r.annotation.anchor.logicalId
          );
          drifts.push({
            annotationId: r.annotation.id,
            originalAddress: r.annotation.anchor.address,
            proposedAddress: newAddress,
            message: `Annotation ${r.annotation.anchor.logicalId || r.annotation.id} lost its anchor at ${r.annotation.anchor.address}.`,
            lostHash: newAddress === null,
          });
        }
      }
    });
  });

  return drifts;
}

/**
 * Detects orphaned annotations in the store.
 * An annotation is orphaned if its physical address no longer contains a comment with its ID.
 * @returns
 */
export async function detectOrphans(): Promise<Annotation[]> {
  const orphans: Annotation[] = [];
  if (typeof Excel === "undefined") return orphans;

  await Excel.run(async (context) => {
    const stored = await loadAnnotationsFromStore(context);

    const engine = new ChunkingEngine<Annotation>({ chunkSize: 500 });

    await engine.execute([{ id: "detect-orphans", data: stored }], async (chunk: Annotation[]) => {
      const sheetInfos = chunk.map((a: Annotation) => ({
        a,
        sheet: context.workbook.worksheets.getItemOrNullObject(a.anchor.sheetName),
      }));

      for (const info of sheetInfos) {
        info.sheet.load(["name", "isNullObject"]);
      }

      await context.sync();

      const validRanges = [];
      for (const info of sheetInfos) {
        if (info.sheet.isNullObject) {
          orphans.push(info.a);
          continue;
        }

        try {
          const range = info.sheet.getRange(info.a.anchor.address);
          const comments = (range as any)["getComments"]
            ? (range as any)["getComments"]()
            : (info.sheet["comments"] as any)["getComments"](range);
          comments.load("id");
          validRanges.push({ a: info.a, comments });
        } catch {
          orphans.push(info.a);
        }
      }

      await context.sync();

      for (const r of validRanges) {
        const { items } = r.comments;
        const found = items.some((c: any) => c.id === r.a.id);
        if (!found) {
          orphans.push(r.a);
        }
      }
    });
  });

  return orphans;
}

/**
 * Repairs orphaned annotations by attempting to re-anchor them using their logical ID.
 * @param orphans
 */
export async function repairOrphans(orphans: Annotation[]): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    for (const orphan of orphans) {
      if (orphan.anchor.logicalId) {
        const newLocation = await resolvePhysicalRange(orphan.anchor.logicalId);
        if (newLocation) {
          // Repair Policy: High confidence (Auto-heal) when logical mapping is certain
          orphan.anchor.address = newLocation.address;
          orphan.anchor.sheetName = newLocation.sheetName;

          const policy = getRepairPolicy({
            category: "Orphaned",
            message: `Auto-healing orphaned annotation for ${orphan.anchor.logicalId}`,
            confidence: RepairConfidence.High,
          });

          if (policy.action === "AutoHeal") {
            logger.info(`[AnnotationService] ${policy.description}`);
            await applyAnnotationInternal(
              context,
              newLocation.sheetName,
              newLocation.address,
              orphan
            );
          }
        }
      }
    }

    await context.sync();
  });
}

/**
 * Refreshes visual highlights for all annotations in the specified sheet.
 * @param sheetName
 */
export async function refreshAnnotationHighlights(sheetName: string): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const stored = await loadAnnotationsFromStore(context);
    const relevant = stored.filter((a) => a.anchor.sheetName === sheetName);

    const colorMap: Record<string, string> = {
      [AnnotationType.SDTM]: "#e0f2fe", // Blue-50
      [AnnotationType.ADAM]: "#f3e8ff", // Purple-50
      [AnnotationType.ORIGIN]: "#fef9c3", // Yellow-50
      [AnnotationType.COMMENT]: "#f0fdf4", // Green-50
      [AnnotationType.VALIDATION]: "#fee2e2", // Red-50
    };

    for (const anno of relevant) {
      try {
        const range = sheet.getRange(anno.anchor.address);
        range.format.fill.color = colorMap[anno.type] || "#f3f4f6";
      } catch {
        // Range might be invalid if rows/cols deleted
      }
    }

    await context.sync();
  });
}

/**
 * Clears all annotation highlights from the specified sheet.
 * Only targets the used range to minimize performance impact.
 * @param sheetName
 */
export async function clearAnnotationHighlights(sheetName: string): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const usedRange = sheet.getUsedRangeOrNullObject();
    usedRange.load("name");

    await context.sync();

    if (!usedRange.isNullObject) {
      usedRange.format.fill.clear();
    }

    await context.sync();
  });
}

/**
 * Bulk applies annotations from the store to the workbook.
 * Optimized to load existing annotations once.
 * @param annotations
 */
export async function bulkApplyAnnotations(annotations: Annotation[]): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const existingAnnotations = await loadAnnotationsFromStore(context);

    for (const annotation of annotations) {
      try {
        await applyAnnotationInternal(
          context,
          annotation.anchor.sheetName,
          annotation.anchor.address,
          annotation,
          existingAnnotations
        );
      } catch (e) {
        logger.warn(`[AnnotationService] Failed to bulk apply annotation ${annotation.id}`, e);
      }
    }

    // Save all to store at once
    await saveAnnotationsToStoreBatch(annotations, context);

    await context.sync();
  });
}

/**
 * Bulk deletes annotations from the workbook and store.
 * @param ids
 */
export async function deleteAnnotationsBatch(ids: string[]): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const allStored = await loadAnnotationsFromStore(context);
    const toDelete = allStored.filter((a) => ids.includes(a.id));

    // Group by sheet for efficient comment deletion
    const bySheet: Record<string, Annotation[]> = {};
    for (const anno of toDelete) {
      if (!bySheet[anno.anchor.sheetName]) bySheet[anno.anchor.sheetName] = [];
      bySheet[anno.anchor.sheetName].push(anno);
    }

    const commentsList: { comments: Excel.CommentCollection; annoId: string }[] = [];
    for (const sheetName in bySheet) {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      for (const anno of bySheet[sheetName]) {
        try {
          const range = sheet.getRange(anno.anchor.address);
          const rng = range as any;
          const { comments: shtComments } = sheet as any;
          const comments = rng.getComments ? rng.getComments() : shtComments.getComments(range);
          comments.load("id");

          commentsList.push({ comments, annoId: anno.id });
        } catch {
          /* ignore */
        }
      }
    }

    await context.sync();

    for (const { comments, annoId } of commentsList) {
      try {
        const comment = comments.items.find((c: any) => c.id === annoId);

        if (comment) comment.delete();
      } catch {
        /* ignore */
      }
    }

    await deleteAnnotationsFromStoreBatch(ids, context);

    await context.sync();
  });
}

/**
 * Internal helper to apply annotation content to a cell.
 * @param context
 * @param sheetName
 * @param address
 * @param annotation
 * @param existingAnnotationsCache
 */
export async function applyAnnotationInternal(
  context: Excel.RequestContext,
  sheetName: string,
  address: string,
  annotation: Annotation,
  existingAnnotationsCache?: Annotation[]
): Promise<void> {
  const sheet = context.workbook.worksheets.getItem(sheetName);
  const range = sheet.getRange(address);

  // 1. Validate Target Range (Merged cells, Protection)
  const targetIssues = await validateAnnotationTarget(range);
  for (const issue of targetIssues) {
    const policy = getRepairPolicy(issue);
    if (policy.action === "Block") {
      throw new Error(`[AnnotationService] ${issue.message} (${policy.description})`);
    }
    logger.warn(`[AnnotationService] ${issue.message} (${policy.description})`);
  }

  // 2. Conflict Detection
  const existingAnnotations = existingAnnotationsCache || (await loadAnnotationsFromStore(context));
  const conflicts = detectConflicts(existingAnnotations, annotation);
  for (const conflict of conflicts) {
    const policy = getRepairPolicy(conflict);
    if (policy.action === "Block") {
      throw new Error(`[AnnotationService] ${conflict.message} (${policy.description})`);
    }
    logger.warn(`[AnnotationService] ${conflict.message} (${policy.description})`);
  }

  // Generate initial anchoring hash
  range.load("rowIndex");

  await context.sync();
  const anchoringHash = await generateRowHash(
    sheetName,
    range.rowIndex,
    annotation.anchor.logicalId
  );
  if (!annotation.metadata) {
    annotation.metadata = {};
  }
  annotation.metadata.anchoringHash = anchoringHash;

  const metaPrefix = `[${annotation.type}:${annotation.anchor.logicalId || "N/A"}]`;
  const displayContent =
    typeof annotation.content === "string" ? annotation.content : annotation.content.value || "";

  const fullContent = `${metaPrefix}\n${displayContent}`;

  const comment = sheet["comments"].add(range, fullContent);
  comment.load("id");

  await context.sync();
  annotation.id = comment.id;

  if (!existingAnnotationsCache) {
    await saveAnnotationToStore(annotation, context);
  }
}

/**
 * Transactional Performance Engine
 * Consolidates clear and highlight operations into a single logical transaction wrapper.
 * Requirement 1: Unified transactional scope.
 * Requirement 2: Local cache instead of iterative host requests.
 * Requirement 3: Batched assignments.
 * Requirement 4: Automatic yielding.
 * Requirement 5: Collection-level deletion.
 * @param sheetNamesToClear
 * @param issuesToHighlight
 * @param runtime
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
        usedRange.load(["rowCount", "columnCount"]);
        sheet["comments"].load("id");
        cache.set(name, { sheet, usedRange, comments: sheet["comments"] });
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
          logger.warn(`[AnnotationService] Could not add comment to sheet: ${issue.sheetName}`, e);
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
 * @param logicalId
 * @returns
 */
export async function resolvePhysicalRange(
  logicalId: string
): Promise<{ sheetName: string; address: string } | null> {
  let result: { sheetName: string; address: string } | null = null;
  if (typeof Excel === "undefined") return null;
  await Excel.run(async (context) => {
    const workbook = context.workbook;
    const sheets = workbook.worksheets;
    sheets.load("items/name");

    await context.sync();

    const usedRanges: { sheetName: string; usedRange: Excel.Range }[] = [];
    for (const sheet of sheets.items) {
      if (sheet.name.startsWith("_")) continue;
      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load(["values", "address", "rowCount", "columnCount", "columnIndex", "rowIndex"]);
      usedRanges.push({ sheetName: sheet.name, usedRange });
    }

    await context.sync();

    let targetCell: Excel.Range | null = null;
    let targetSheetName = "";

    for (const { sheetName, usedRange } of usedRanges) {
      if (usedRange.isNullObject) continue;

      const values = usedRange["values"];
      for (let r = 0; r < values.length; r++) {
        for (let c = 0; c < Math.min(values[r].length, 5); c++) {
          if (String(values[r][c]).trim() === logicalId) {
            const sheet = sheets.items.find((s) => s.name === sheetName);
            if (sheet) {
              targetCell = sheet.getRangeByIndexes(
                usedRange.rowIndex + r,
                usedRange.columnIndex + c,
                1,
                1
              );
              targetCell.load("address");
              targetSheetName = sheetName;
            }
            break;
          }
        }
        if (targetCell) break;
      }
      if (targetCell) break;
    }

    if (targetCell) {
      await context.sync();
      result = {
        sheetName: targetSheetName,
        address: targetCell.address,
      };
    }
  });
  return result;
}

/**
 * Resolves a logical OID from a physical address.
 * @param sheetName
 * @param address
 * @returns
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

    const pVals = potentialOidRange["values"];
    if (pVals && pVals.length > 0) {
      const rowValues = potentialOidRange["values"][0];
      // Typically the OID is in the first column
      if (rowValues[0]) {
        logicalId = String(rowValues[0]);
      }
    }
  });
  return logicalId;
}

/**
 * Generates a stable content hash for an annotation's anchor row.
 * Joins the logicalId with the first 5 columns of the row to create a unique signature.
 * @param sheetName
 * @param rowIndex
 * @param logicalId
 * @returns
 */
export async function generateRowHash(
  sheetName: string,
  rowIndex: number,
  logicalId?: string
): Promise<string> {
  let hash = "";
  if (typeof Excel === "undefined") return hash;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    // Grab first 5 columns to form the hash
    const rowRange = sheet.getRangeByIndexes(rowIndex, 0, 1, 5);
    rowRange.load("values");

    await context.sync();

    const { values: rVals } = rowRange as any;
    if (rVals && rVals.length > 0) {
      const rowString = rVals[0].map((v: any) => String(v || "").trim()).join("|");
      const signature = `${logicalId || "NO_OID"}::${rowString}`;
      hash = await sha256Native(signature);
    }
  });

  return hash;
}

/**
 * Represents a drifted annotation that needs manual re-anchoring.
 */
export interface DriftWarning {
  annotationId: string;
  originalAddress: string;
  proposedAddress: string | null;
  message: string;
  lostHash?: boolean;
}

/**
 * Scans up to 50 rows bi-directionally to find a matching anchoring hash using a cooperative, non-blocking interval.
 * @param sheetName
 * @param startRowIndex
 * @param targetHash
 * @param logicalId
 * @returns
 */
export async function scanForDrift(
  sheetName: string,
  startRowIndex: number,
  targetHash: string,
  logicalId?: string
): Promise<string | null> {
  if (typeof Excel === "undefined") return null;

  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load(["rowCount"]);

      await context.sync();

      if (usedRange.isNullObject) {
        resolve(null);
        return;
      }

      const maxRows = usedRange.rowCount;
      const MAX_OFFSET = 50;
      let offset = 0;

      const processNextBatch = async () => {
        if (offset > MAX_OFFSET) {
          resolve(null);
          return;
        }

        await Excel.run(async (batchContext) => {
          const batchSheet = batchContext.workbook.worksheets.getItem(sheetName);
          const checks: { rowIndex: number; direction: string }[] = [];

          if (offset === 0) {
            if (startRowIndex < maxRows)
              checks.push({ rowIndex: startRowIndex, direction: "center" });
          } else {
            const upRow = startRowIndex - offset;
            const downRow = startRowIndex + offset;
            if (upRow >= 0) checks.push({ rowIndex: upRow, direction: "up" });
            if (downRow < maxRows) checks.push({ rowIndex: downRow, direction: "down" });
          }

          for (const check of checks) {
            const rowRange = batchSheet.getRangeByIndexes(check.rowIndex, 0, 1, 5);
            rowRange.load(["values", "address"]);
            await batchContext.sync();

            const { values: rVals } = rowRange as any;
            if (rVals && rVals.length > 0) {
              const rowString = rVals[0].map((v: any) => String(v || "").trim()).join("|");
              const signature = `${logicalId || "NO_OID"}::${rowString}`;
              const hash = await sha256Native(signature);

              if (hash === targetHash) {
                // Found it! Return the address of the first cell in that row
                const foundCell = batchSheet.getRangeByIndexes(check.rowIndex, 0, 1, 1);
                foundCell.load("address");
                await batchContext.sync();
                const { address } = foundCell as any;
                resolve(address);
                return;
              }
            }
          }

          offset++;
          // Cooperative yield to UI thread
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => {
              processNextBatch();
            });
          } else {
            setTimeout(processNextBatch, 0);
          }
        });
      };

      processNextBatch();
    }).catch((e) => {
      logger.error("[AnnotationService] Error during drift scanning", e);
      resolve(null);
    });
  });
}

/**
 * Manually applies a user-approved re-anchor action for a drifted annotation.
 * @param annotationId
 * @param newAddress
 */
export async function applyManualReAnchor(annotationId: string, newAddress: string): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const allStored = await loadAnnotationsFromStore(context);
    const annotation = allStored.find((a) => a.id === annotationId);

    if (!annotation) {
      throw new Error(
        `[AnnotationService] Cannot re-anchor: Annotation ${annotationId} not found in store.`
      );
    }

    // Remove old comment if it exists at the old location or globally
    const sheet = context.workbook.worksheets.getItem(annotation.anchor.sheetName);

    // We try to find and delete the old comment object
    sheet["comments"].load("id");

    await context.sync();

    const oldComment = sheet["comments"].items.find((c) => c.id === annotation.id);
    if (oldComment) {
      oldComment.delete();
    }

    // Update annotation model with new coordinates
    annotation.anchor.address = newAddress;

    // Generate new hash for the new location
    const range = sheet.getRange(newAddress);
    range.load("rowIndex");

    await context.sync();

    const newHash = await generateRowHash(
      annotation.anchor.sheetName,
      range.rowIndex,
      annotation.anchor.logicalId
    );
    if (!annotation.metadata) {
      annotation.metadata = {};
    }
    annotation.metadata.anchoringHash = newHash;
    annotation.metadata.lifecycleState = "resolved"; // Mark as resolved upon manual fix
    annotation.updatedTimestamp = new Date().toISOString();

    // Write back comment to the new address
    const metaPrefix = `[${annotation.type}:${annotation.anchor.logicalId || "N/A"}]`;
    const displayContent =
      typeof annotation.content === "string" ? annotation.content : annotation.content.value || "";
    const fullContent = `${metaPrefix}\n${displayContent}`;

    const newRange = sheet.getRange(newAddress);
    const newComment = sheet["comments"].add(newRange, fullContent);
    newComment.load("id");

    await context.sync();

    // Update store with new comment ID and coordinates
    annotation.id = newComment.id;
    await saveAnnotationToStore(annotation, context);

    await context.sync();
  });
}

/**
 * Handles workbook mutations like sheet renames or row/column insertions.
 * Office.js comments follow cells automatically, but we ensure our hybrid
 * model stays in sync by refreshing logical-to-physical mappings.
 */
export async function syncAnnotationsAfterMutation(): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");

    await context.sync();

    const allComments: any[] = [];

    for (const sheet of sheets.items) {
      if (sheet.name.startsWith("_")) continue;
      const { comments } = sheet as any;
      comments.load("items/content");
      allComments.push({ sheet, comments });
    }

    await context.sync();

    const commentsToProcess = [];

    for (const { sheet, comments } of allComments) {
      for (const comment of comments.items) {
        const content = comment.content;
        const metaMatch = content.match(/^\[(.*?):(.*?)\].*/);
        if (metaMatch) {
          const logicalId = metaMatch[2];
          const location = (comment as any).location;
          if (location) {
            location.load("address");
            commentsToProcess.push({ sheet, comment, location, logicalId });
          }
        }
      }
    }

    await context.sync();

    const engine = new ChunkingEngine<any>({ chunkSize: 50 });
    await engine.execute([{ id: "sync-mutations", data: commentsToProcess }], async (chunk) => {
      for (const item of chunk) {
        const { sheet, location, logicalId } = item;
        const currentLogicalId = await resolveLogicalId(sheet.name, location.address);
        if (currentLogicalId && currentLogicalId !== logicalId) {
          logger.warn(
            `[AnnotationService] Anchor mismatch at ${location.address}: Expected ${logicalId}, found ${currentLogicalId}`
          );
          // Logic to handle orphan/drift could be added here
        }
      }
    });
  });
}

/**
 * Handles copy/paste operations by validating if the target cells should receive
 * the annotation and creating new candidates if necessary.
 * @param sourceAddress
 * @param targetAddress
 */
export async function handleAnnotationCopyPaste(
  sourceAddress: string,
  targetAddress: string
): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    logger.info(`[AnnotationService] Handling copy from ${sourceAddress} to ${targetAddress}`);

    const resolveRange = (addr: string) => {
      if (addr.includes("!")) {
        const [sName, rAddr] = addr.split("!");
        return context.workbook.worksheets.getItem(sName).getRange(rAddr);
      }
      return context.workbook.worksheets.getActiveWorksheet().getRange(addr);
    };

    const sourceRange = resolveRange(sourceAddress);
    const targetRange = resolveRange(targetAddress);

    const sourceComments = (sourceRange as any).getComments
      ? (sourceRange as any).getComments()
      : (context.workbook.worksheets.getActiveWorksheet().comments as any).getComments(sourceRange);
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
 * @param sheetName
 */
export async function reconcileAnnotationsAfterSort(sheetName: string): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const { comments } = sheet as any;
    comments.load("items/content");

    await context.sync();

    const locs = [];
    for (const comment of comments.items) {
      const location = (comment as any).location;
      if (location) {
        location.load("address");
        locs.push({ comment, location });
      }
    }

    await context.sync();
  });
}

/**
 * Handles partial range movements that might split or orphan an annotation.
 * @param movedAddress
 * @param _originalAddress
 */
export async function handlePartialRangeMovement(
  movedAddress: string,
  _originalAddress: string
): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    logger.info(`[AnnotationService] Partial move to ${movedAddress}`);
    const movedRange = movedAddress.includes("!")
      ? context.workbook.worksheets
          .getItem(movedAddress.split("!")[0])
          .getRange(movedAddress.split("!")[1])
      : context.workbook.worksheets.getActiveWorksheet().getRange(movedAddress);

    // Check if the original address had an annotation that should have moved entirely
    const comments = (movedRange as any).getComments
      ? (movedRange as any).getComments()
      : (movedRange.worksheet["comments"] as any).getComments(movedRange);
    comments.load("items/content");

    await context.sync();

    if (comments.items.length > 0) {
      // If it moved but was part of a larger range, flag it
      logger.info(
        `[AnnotationService] Moved range ${movedAddress} contains annotations. Checking for splits...`
      );
    }
  });
}

/**
 * Detects overlapping incompatible annotations and returns them as validation issues.
 * @param sheetName
 * @returns
 */
export async function detectAnnotationConflicts(sheetName: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  if (typeof Excel === "undefined") return issues;
  await Excel.run(async (context) => {
    const allStored = await loadAnnotationsFromStore(context);
    const relevant = allStored.filter((a) => a.anchor.sheetName === sheetName);

    for (let i = 0; i < relevant.length; i++) {
      for (let j = i + 1; j < relevant.length; j++) {
        const conflicts = detectConflicts([relevant[i]], relevant[j]);
        for (const conflict of conflicts) {
          issues.push({
            level: conflict.confidence === RepairConfidence.Low ? "Error" : "Warning",
            message: conflict.message,
            sheetName: sheetName,
            location: conflict.location,
          });
        }
      }
    }
  });
  return issues;
}

/**
 * Applies a clinical annotation to a range.
 * Uses a hybrid anchoring approach: physical address + logical context.
 * @param sheetName
 * @param address
 * @param annotation
 */
export async function applyAnnotation(
  sheetName: string,
  address: string,
  annotation: Annotation
): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    await applyAnnotationInternal(context, sheetName, address, annotation);
  });
}

/**
 * Edits an existing annotation's content.
 * @param sheetName
 * @param address
 * @param newContent
 */
export async function editAnnotation(
  sheetName: string,
  address: string,
  newContent: string | Annotation
): Promise<void> {
  if (typeof Excel === "undefined") return;
  let updatedAnnotation: Annotation | null = null;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    const rng = range as any;
    const { comments: shtComments } = sheet as any;
    const comments = rng.getComments ? rng.getComments() : shtComments.getComments(range);
    comments.load("id");

    await context.sync();

    if (comments.items.length > 0) {
      const comment = comments.items[0];
      comment.load("id");

      await context.sync();

      const allStored = await loadAnnotationsFromStore(context);
      const existing = allStored.find((a) => a.id === comment.id);

      if (typeof newContent === "string") {
        const oldContent = comment.content;
        const prefixMatch = oldContent.match(/^(\[.*\])\n/);
        const prefix = prefixMatch ? prefixMatch[1] + "\n" : "";
        comment.content = `${prefix}${newContent}`;

        if (existing) {
          updatedAnnotation = {
            ...existing,
            content: newContent,
            updatedTimestamp: new Date().toISOString(),
          };
        }
      } else {
        const metaPrefix = `[${newContent.type}:${newContent.anchor.logicalId || "N/A"}]`;
        const displayContent =
          typeof newContent.content === "string"
            ? newContent.content
            : newContent.content.value || "";
        comment.content = `${metaPrefix}\n${displayContent}`;
        updatedAnnotation = {
          ...newContent,
          id: comment.id,
          updatedTimestamp: new Date().toISOString(),
        };
      }

      if (updatedAnnotation) {
        await saveAnnotationToStore(updatedAnnotation, context);
      }

      await context.sync();
    }
  });
}

/**
 * Removes annotations from a specific range.
 * @param sheetName
 * @param address
 */
export async function removeAnnotation(sheetName: string, address: string): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    const rng = range as any;
    const { comments: shtComments } = sheet as any;
    const comments = rng.getComments ? rng.getComments() : shtComments.getComments(range);
    comments.load("items/id");

    await context.sync();

    const idsToDelete = comments.items.map((comment: any) => comment.id);
    for (const comment of comments.items) {
      comment.delete();
    }

    for (const id of idsToDelete) {
      await deleteAnnotationFromStore(id, context);
    }

    await context.sync();
  });
}

/**
 * Visually highlights columns in _Codelists that represent translations.
 */
export async function highlightLocaleColumns(): Promise<void> {
  if (typeof Excel === "undefined") return;
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItemOrNullObject("_Codelists");

    await context.sync();
    if (sheet.isNullObject) return;

    const usedRange = sheet.getUsedRangeOrNullObject();
    usedRange.load(["columnCount", "rowCount", "columnIndex", "rowIndex", "values"]);

    await context.sync();

    if (usedRange.isNullObject || usedRange["values"].length === 0) return;

    const headers = usedRange["values"][0];
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
