/// <reference types="office-js" />
import { SubscriptionManager } from "../utils/event-utility";
/**
 * @issue #84
 */
/* global Excel */
import { AnnotationType, AnnotationTargetType, Annotation } from "../types";
import {
  validateAnnotationTarget,
  getRepairPolicy,
  AnnotationValidationIssue,
} from "../validators/annotation-validator";

interface PaintbrushTarget {
  address: string;
  sheetName: string;
}

interface PaintbrushState {
  isEnabled: boolean;
  activeType: AnnotationType;
  activeContent: string;
  sourceAnnotation?: Annotation;
  pendingTargets: PaintbrushTarget[];
  validationIssues: Record<string, AnnotationValidationIssue[]>;
  history: string[][]; // Last applied annotation IDs for undo
}

/**
 * Service to manage the state and application of the Annotation Paintbrush.
 * Allows users to "paint" annotations onto multiple cells rapidly.
 */
class AnnotationPaintbrushService {
  private state: PaintbrushState = {
    isEnabled: false,
    activeType: AnnotationType.SDTM,
    activeContent: "",
    pendingTargets: [],
    validationIssues: {},
    history: [],
  };

  private subscriptionManager = new SubscriptionManager<PaintbrushState>(() => this.getState());

  /**
   * Returns the current state of the paintbrush.
   * @returns
   */
  public getState(): PaintbrushState {
    return {
      ...this.state,
      pendingTargets: [...this.state.pendingTargets],
      validationIssues: { ...this.state.validationIssues },
      history: [...this.state.history.map((h) => [...h])],
    };
  }

  /**
   * Subscribes to paintbrush state changes.
   * @param listener
   * @returns
   */
  public subscribe(listener: (state: PaintbrushState) => void): () => void {
    return this.subscriptionManager.subscribe(listener, { immediate: true });
  }

  private notify() {
    this.subscriptionManager.notify(this.state);
  }

  /**
   * Enables or disables the paintbrush mode.
   * @param enabled
   */
  public setEnabled(enabled: boolean) {
    this.state.isEnabled = enabled;
    if (!enabled) {
      this.clearTargets();
    }
    this.notify();
  }

  /**
   * Sets the active annotation type for the paintbrush.
   * @param type
   */
  public setType(type: AnnotationType) {
    this.state.activeType = type;
    this.notify();
  }

  /**
   * Sets the content template for the paintbrush.
   * @param content
   */
  public setContent(content: string) {
    this.state.activeContent = content;
    this.notify();
  }

  /**
   * Loads the annotation from the current selection as the paintbrush template.
   * @param sheetName
   * @param address
   */
  public async pickSourceFromSelection(sheetName: string, address: string): Promise<void> {
    if (typeof Excel === "undefined") return;

    await Excel.run(async (context) => {
      const { loadAnnotationsFromStore } = await import("./annotation-service");
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const range = sheet.getRange(address);
      sheet.load("comments");
      await context.sync();
      const anyRange = range as any;
      const anySheet = sheet as any;
      const comments = anyRange.getComments
        ? anyRange.getComments()
        : anySheet.comments.getComments(range);
      comments.load("items");
      await context.sync();

      if (comments.items.length > 0) {
        const comment = comments.items[0];
        comment.load("id");
        await context.sync();

        const allStored = await loadAnnotationsFromStore(context);
        const annotation = allStored.find((a) => a.id === comment.id);

        if (annotation) {
          this.state.sourceAnnotation = annotation;
          this.state.activeType = annotation.type;
          this.state.activeContent =
            typeof annotation.content === "string"
              ? annotation.content
              : annotation.content.value || "";
          this.notify();
        }
      }
    });
  }

  /**
   * Toggles a target range in the pending list.
   * @param sheetName
   * @param address
   */
  public async toggleTarget(sheetName: string, address: string): Promise<void> {
    if (!this.state.isEnabled) return;

    const key = `${sheetName}!${address}`;
    const existingIndex = this.state.pendingTargets.findIndex(
      (t) => t.address === address && t.sheetName === sheetName
    );

    if (existingIndex >= 0) {
      this.state.pendingTargets.splice(existingIndex, 1);
      delete this.state.validationIssues[key];
    } else {
      this.state.pendingTargets.push({ address, sheetName });

      // Validate target
      if (typeof Excel !== "undefined") {
        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getItem(sheetName);
          const range = sheet.getRange(address);
          
          range.load(["format/protection/locked", "address", "worksheet/protection/protected"]);
          let mergedAreas: any = null;
          if (typeof (range as any).getMergedAreasOrNullObject === "function") {
            mergedAreas = (range as any).getMergedAreasOrNullObject();
            mergedAreas.load(["address", "isNullObject"]);
          }
          await context.sync();

          const rangeData = {
            address: range.address,
            isLocked: range.format?.protection?.locked || false,
            isWorksheetProtected: range.worksheet?.protection?.protected || false,
            isMerged: !!(mergedAreas && !mergedAreas.isNullObject),
            mergedAddress: mergedAreas && !mergedAreas.isNullObject ? mergedAreas.address : undefined,
          };

          const issues = validateAnnotationTarget(rangeData);
          if (issues.length > 0) {
            this.state.validationIssues[key] = issues;
          }
        });
      }
    }
    this.notify();
  }

  /**
   * Clears all pending targets.
   */
  public clearTargets() {
    this.state.pendingTargets = [];
    this.state.validationIssues = {};
    this.notify();
  }

  /**
   * Executes bulk apply for all pending targets.
   */
  public async executeBulkApply(): Promise<void> {
    if (this.state.pendingTargets.length === 0) return;

    // Check for blocking issues
    const blocked = Object.values(this.state.validationIssues).some((issues) =>
      issues.some((issue) => getRepairPolicy(issue).action === "Block")
    );

    if (blocked) {
      throw new Error("Cannot apply paintbrush: Some targets are blocked by validation errors.");
    }

    const { resolveLogicalId, bulkApplyAnnotations } = await import("./annotation-service");
    const annotationsToApply: Annotation[] = [];

    for (const target of this.state.pendingTargets) {
      const logicalId = await resolveLogicalId(target.sheetName, target.address);
      annotationsToApply.push({
        id: "",
        type: this.state.activeType,
        targetType: AnnotationTargetType.CELL,
        anchor: {
          address: target.address,
          sheetName: target.sheetName,
          logicalId: logicalId || undefined,
        },
        content: this.state.activeContent,
        timestamp: new Date().toISOString(),
        version: 1,
      });
    }

    // Use AnnotationService for bulk application
    await bulkApplyAnnotations(annotationsToApply);

    // Reset state after success
    this.state.history.push(annotationsToApply.map((a) => a.id).filter((id) => !!id));
    this.clearTargets();
    this.notify();
  }

  /**
   * Reverts the last bulk apply operation.
   */
  public async undoLastOperation(): Promise<void> {
    const lastIds = this.state.history.pop();
    if (!lastIds || lastIds.length === 0) return;

    const { deleteAnnotationsBatch } = await import("./annotation-service");
    await deleteAnnotationsBatch(lastIds);

    this.notify();
  }
}

export const annotationPaintbrushService = new AnnotationPaintbrushService();
