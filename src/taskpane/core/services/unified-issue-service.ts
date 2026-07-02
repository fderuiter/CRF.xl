import { backgroundValidationEngine } from "./validation-engine";
import { bindingService } from "./binding-service";
import { ValidationIssue } from "../types";
import { Diagnostic } from "./diagnostic-framework";

export type UnifiedIssue = 
  | (ValidationIssue & { type: "clinical"; severity: "error" | "warning" | "info"; originalClinicalIssue: ValidationIssue })
  | (Diagnostic & { type: "system"; severity: "error" | "warning" | "info"; originalClinicalIssue?: undefined; rowIndex?: number; sheetName?: string; retryAction?: () => Promise<void> });

import { StudyDesign } from "../types";

export interface UnifiedAppState {
  study: StudyDesign | null;
  issues: UnifiedIssue[];
  isProcessing: boolean;
  status: string;
}

class UnifiedIssueService {
  private systemIssues: UnifiedIssue[] = [];
  private listeners: Set<(state: UnifiedAppState) => void> = new Set();
  
  constructor() {
    backgroundValidationEngine.subscribe(() => this.notify());
    bindingService.subscribeError((err) => {
      this.addSystemIssue(err);
    });
  }

  public getState(): UnifiedAppState {
    const valState = backgroundValidationEngine.getState();
    const clinicalIssues: UnifiedIssue[] = valState.issues.map(i => ({
      ...i,
      type: "clinical",
      severity: i.level === "Error" ? "error" : i.level === "Warning" ? "warning" : "info",
      originalClinicalIssue: i
    }));
    
    return {
      study: valState.study,
      issues: [...clinicalIssues, ...this.systemIssues],
      isProcessing: valState.isProcessing,
      status: valState.status
    };
  }

  public subscribe(listener: (state: UnifiedAppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public addSystemIssue(issue: Diagnostic & { retryAction?: () => Promise<void> }) {
    this.systemIssues.push({
      ...issue,
      type: "system",
      severity: issue.severity || "error"
    });
    this.notify();
  }

  public clearSystemIssues() {
    this.systemIssues = [];
    this.notify();
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }
}

export const unifiedIssueService = new UnifiedIssueService();
