/**
 * @issue #84
 */
/* global Excel */
import { AnnotationType, AnnotationTargetType, Annotation } from "../types";
import { applyAnnotation, resolveLogicalId } from "./annotation-service";
import { validateAnnotationTarget, getRepairPolicy } from "../validators/annotation-validator";

export interface PaintbrushState {
  isEnabled: boolean;
  activeType: AnnotationType;
  activeContent: string;
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
  };

  private listeners: Set<(state: PaintbrushState) => void> = new Set();

  /**
   * Returns the current state of the paintbrush.
   */
  public getState(): PaintbrushState {
    return { ...this.state };
  }

  /**
   * Subscribes to paintbrush state changes.
   */
  public subscribe(listener: (state: PaintbrushState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  /**
   * Enables or disables the paintbrush mode.
   */
  public setEnabled(enabled: boolean) {
    this.state.isEnabled = enabled;
    this.notify();
  }

  /**
   * Sets the active annotation type for the paintbrush.
   */
  public setType(type: AnnotationType) {
    this.state.activeType = type;
    this.notify();
  }

  /**
   * Sets the content template for the paintbrush.
   */
  public setContent(content: string) {
    this.state.activeContent = content;
    this.notify();
  }

  /**
   * Applies the current paintbrush annotation to the specified cell.
   */
  public async applyToRange(sheetName: string, address: string): Promise<void> {
    if (!this.state.isEnabled) return;

    // Validation Check before applying
    let isBlocked = false;
    if (typeof Excel !== "undefined") {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const range = sheet.getRange(address);
        const issues = await validateAnnotationTarget(range);

        for (const issue of issues) {
          const policy = getRepairPolicy(issue);
          if (policy.action === "Block") {
            console.error(`[AnnotationPaintbrush] Application blocked at ${address}: ${issue.message}`);
            isBlocked = true;
            break;
          }
        }
      });
    }

    if (isBlocked) return;

    // Resolve logical ID from the workbook context (e.g., Variable Name)
    const logicalId = await resolveLogicalId(sheetName, address);

    const annotation: Annotation = {
      id: "", // Will be assigned by the AnnotationService/Excel Comment ID
      type: this.state.activeType,
      targetType: AnnotationTargetType.CELL,
      anchor: {
        address,
        sheetName,
        logicalId: logicalId || undefined,
      },
      content: this.state.activeContent,
      timestamp: new Date().toISOString(),
      version: 1,
    };

    await applyAnnotation(sheetName, address, annotation);
  }
}

export const annotationPaintbrushService = new AnnotationPaintbrushService();
