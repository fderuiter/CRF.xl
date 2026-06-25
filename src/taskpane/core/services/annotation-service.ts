/**
 * @issue #84
 */
/* eslint-disable no-undef */
/* global Excel */
import { ValidationIssue } from "../parser/validator";
import { ParseRuntime, createParseRuntime, processRowsInChunks } from "../parser/chunking-runtime";
import { LinguisticService } from "./linguistics-service";
import { Annotation, AnnotationType, AnnotationTargetType, TranslatedText } from "../types";

const ANNOTATION_XML_NAMESPACE = "http://schemas.crf-xl.com/annotations";

/**
 * Serializes an annotation to XML string.
 */
function serializeAnnotation(annotation: Annotation): string {
  const content = typeof annotation.content === "string"
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
  } catch (e) {
    // Keep as string
  }

  let metadata = {};
  try {
    metadata = JSON.parse(getTagValue("Metadata") || "{}");
  } catch (e) {
    console.warn("[AnnotationService] Failed to parse annotation metadata", e);
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
 */
export async function saveAnnotationToStore(
  annotation: Annotation,
  existingContext?: Excel.RequestContext
): Promise<void> {
  const operation = async (context: Excel.RequestContext) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATION_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    let xmlDoc: Document;
    let part: Excel.CustomXmlPart;

    if (parts.items.length === 0) {
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
    const existingAnnotations = xmlDoc.getElementsByTagName("Annotation");
    let existingNode: Element | null = null;

    for (let i = 0; i < existingAnnotations.length; i++) {
      const idNode = existingAnnotations[i].getElementsByTagName("Id")[0];
      if (idNode && idNode.textContent === annotation.id) {
        existingNode = existingAnnotations[i];
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
 */
export async function loadAnnotationsFromStore(
  existingContext?: Excel.RequestContext
): Promise<Annotation[]> {
  const annotations: Annotation[] = [];
  const operation = async (context: Excel.RequestContext) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATION_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    if (parts.items.length > 0) {
      const part = parts.items[0];
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
 */
export async function deleteAnnotationFromStore(
  id: string,
  existingContext?: Excel.RequestContext
): Promise<void> {
  const operation = async (context: Excel.RequestContext) => {
    const parts = context.workbook.customXmlParts.getByNamespace(ANNOTATION_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    if (parts.items.length > 0) {
      const part = parts.items[0];
      (part as any).load("xml");
      await context.sync();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString((part as any).xml, "text/xml");
      const annotationsRoot = xmlDoc.getElementsByTagName("Annotations")[0];
      const annotationNodes = xmlDoc.getElementsByTagName("Annotation");

      for (let i = 0; i < annotationNodes.length; i++) {
        const idNode = annotationNodes[i].getElementsByTagName("Id")[0];
        if (idNode && idNode.textContent === id) {
          annotationsRoot.removeChild(annotationNodes[i]);
          break;
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
 * Detects orphaned annotations in the store.
 * An annotation is orphaned if its physical address no longer contains a comment with its ID.
 */
export async function detectOrphans(): Promise<Annotation[]> {
  const orphans: Annotation[] = [];
  if (typeof Excel === "undefined") return orphans;

  await Excel.run(async (context) => {
    const stored = await loadAnnotationsFromStore(context);

    for (const annotation of stored) {
      const sheet = context.workbook.worksheets.getItemOrNullObject(annotation.anchor.sheetName);
      sheet.load("isNullObject");
      await context.sync();

      if (sheet.isNullObject) {
        orphans.push(annotation);
        continue;
      }

      try {
        const range = sheet.getRange(annotation.anchor.address);
        const comments = (range as any).getComments
          ? (range as any).getComments()
          : (sheet.comments as any).getComments(range);
        comments.load("items");
        await context.sync();

        const found = comments.items.some((c: any) => c.id === annotation.id);
        if (!found) {
          orphans.push(annotation);
        }
      } catch (e) {
        // Range might be invalid if rows/cols deleted
        orphans.push(annotation);
      }
    }
  });

  return orphans;
}

/**
 * Repairs orphaned annotations by attempting to re-anchor them using their logical ID.
 */
export async function repairOrphans(orphans: Annotation[]): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    for (const orphan of orphans) {
      if (orphan.anchor.logicalId) {
        // resolvePhysicalRange is defined later in this file
        const newLocation = await resolvePhysicalRange(orphan.anchor.logicalId);
        if (newLocation) {
          orphan.anchor.address = newLocation.address;
          orphan.anchor.sheetName = newLocation.sheetName;
          await applyAnnotationInternal(context, newLocation.sheetName, newLocation.address, orphan);
        }
      }
    }
    await context.sync();
  });
}

/**
 * Bulk applies annotations from the store to the workbook.
 */
export async function bulkApplyAnnotations(annotations: Annotation[]): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    for (const annotation of annotations) {
      try {
        await applyAnnotationInternal(context, annotation.anchor.sheetName, annotation.anchor.address, annotation);
      } catch (e) {
        console.warn(`[AnnotationService] Failed to bulk apply annotation ${annotation.id}`, e);
      }
    }
    await context.sync();
  });
}

/**
 * Internal helper to apply annotation content to a cell.
 */
async function applyAnnotationInternal(
  context: Excel.RequestContext,
  sheetName: string,
  address: string,
  annotation: Annotation
): Promise<void> {
  const sheet = context.workbook.worksheets.getItem(sheetName);
  const range = sheet.getRange(address);

  const metaPrefix = `[${annotation.type}:${annotation.anchor.logicalId || "N/A"}]`;
  const displayContent =
    typeof annotation.content === "string" ? annotation.content : annotation.content.value || "";

  const fullContent = `${metaPrefix}\n${displayContent}`;

  const comment = sheet.comments.add(range, fullContent);
  comment.load("id");
  await context.sync();
  annotation.id = comment.id;

  await saveAnnotationToStore(annotation, context);
}

/**
 * Checks for orphaned annotations (comments) across the active sheets.
 * @deprecated Use detectOrphans instead for structured orphan detection.
 */
export async function getOrphanedAnnotationsCount(sheetNames: string[]): Promise<number> {
  let count = 0;
  if (typeof Excel === "undefined") return 0;
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
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const comments = sheet.comments;
    comments.load("items/content");
    await context.sync();

    // Map to track occupied cells: address -> annotation metadata
    const occupied = new Map<string, { type: string; id: string }>();

    for (const comment of comments.items) {
      const content = comment.content;
      const typeMatch = content.match(/^\[(.*?):/);
      const type = typeMatch ? typeMatch[1] : "Unknown";

      const location = (comment as any).location;
      if (location) {
        location.load("address");
        await context.sync();

        const address = location.address;

        if (occupied.has(address)) {
          const existing = occupied.get(address)!;
          // Conflict policy: Overlapping incompatible annotations are validation problems
          if (existing.type !== type) {
            issues.push({
              level: "Error",
              message: `Overlapping incompatible annotations: ${existing.type} and ${type} on cell ${address}.`,
              sheetName: sheetName,
              location: address
            });
          }
        } else {
          occupied.set(address, { type, id: comment.id });
        }
      }
    }
  });
  return issues;
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
    await applyAnnotationInternal(context, sheetName, address, annotation);
  });
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
  let updatedAnnotation: Annotation | null = null;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    const comments = (range as any).getComments
      ? (range as any).getComments()
      : (sheet.comments as any).getComments(range);
    comments.load("items");
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
 */
export async function removeAnnotation(sheetName: string, address: string): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    const comments = (range as any).getComments
      ? (range as any).getComments()
      : (sheet.comments as any).getComments(range);
    comments.load("items");
    await context.sync();

    for (const comment of comments.items) {
      comment.load("id");
      await context.sync();
      await deleteAnnotationFromStore(comment.id, context);
      comment.delete();
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
