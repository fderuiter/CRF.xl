/* global Excel, console, setTimeout, clearTimeout */
/**
 * @issue #165
 */

import { DiagnosticError } from "./diagnostic-framework";
import { createOfficeDiagnostic } from "./office-error-handling";

export interface SelectionContext {
  sheetName: string;
  address: string;
  value: any;
  rowIndex: number;
  columnIndex: number;
  isValid: boolean;
  fieldName?: string;
}

export type SelectionChangeListener = (context: SelectionContext) => void;

class BindingService {
  private listeners: Set<SelectionChangeListener> = new Set();
  private errorListeners: Set<(error: DiagnosticError) => void> = new Set();
  private currentContext: SelectionContext | null = null;
  private debounceTimer: any = null;
  private isInternalOperation = false;
  private isInitialized = false;

  private sheetActivatedHandler: any = null;
  private selectionChangedHandler: any = null;

  /**
   * Subscribes to selection changes. Returns an unsubscribe function.
   */
  public subscribe(listener: SelectionChangeListener, immediate = true): () => void {
    this.listeners.add(listener);
    if (immediate && this.currentContext) {
      listener(this.currentContext);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribes to binding service errors.
   */
  public subscribeError(listener: (error: DiagnosticError) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  private emitError(error: unknown) {
    const diagnostic = createOfficeDiagnostic(error);
    this.errorListeners.forEach((listener) => {
      try {
        listener(diagnostic);
      } catch (e) {
        console.error("Error in error listener:", e);
      }
    });
  }

  /**
   * Initializes Office.js event listeners.
   */
  public async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    try {
      await Excel.run(async (context) => {
        const workbook = context.workbook;

        // Listener 1: Worksheet Switched
        this.sheetActivatedHandler = workbook.worksheets.onActivated.add(
          this.handleSheetActivated.bind(this)
        );

        // Listener 2: Selection Changed
        this.selectionChangedHandler = workbook.onSelectionChanged.add(
          this.handleSelectionChanged.bind(this)
        );

        // Initial sync
        await this.refreshContext();
        await context.sync();
      });
    } catch (error) {
      this.emitError(error);
    }
  }

  /**
   * Cleans up event listeners.
   */
  public async terminate() {
    if (!this.isInitialized) return;
    try {
      await Excel.run(async (context) => {
        if (this.sheetActivatedHandler) {
          this.sheetActivatedHandler.remove();
          this.sheetActivatedHandler = null;
        }
        if (this.selectionChangedHandler) {
          this.selectionChangedHandler.remove();
          this.selectionChangedHandler = null;
        }
        await context.sync();
        this.isInitialized = false;
      });
    } catch (error) {
      this.emitError(error);
    }
  }

  /**
   * Performs an Excel operation and tags it as internal to prevent event loops.
   */
  public async performInternalOperation<T>(
    operation: (context: Excel.RequestContext) => Promise<T>
  ): Promise<T> {
    this.isInternalOperation = true;
    try {
      return await Excel.run(async (context) => {
        const result = await operation(context);
        await context.sync();
        return result;
      });
    } finally {
      // Small delay before re-enabling external event handling to catch trailing events
      setTimeout(() => {
        this.isInternalOperation = false;
      }, 250);
    }
  }

  private handleSheetActivated() {
    this.debouncedRefresh();
  }

  private handleSelectionChanged() {
    if (this.isInternalOperation) return;
    this.debouncedRefresh();
  }

  private debouncedRefresh() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.refreshContext().catch((err) => this.emitError(err));
    }, 150);
  }

  private async refreshContext() {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load(["address", "values", "rowIndex", "columnIndex", "rowCount", "columnCount"]);
      await context.sync();

      const sheet = context.workbook.worksheets.getActiveWorksheet();
      sheet.load("name");
      await context.sync();

      // Sidecar only supports single-cell context for dictionary operations
      const isValid = range.rowCount === 1 && range.columnCount === 1;
      let fieldName = "";

      if (isValid && !sheet.name.startsWith("_")) {
        try {
          // Attempt to get header from row 0
          const headerRange = sheet.getRangeByIndexes(0, range.columnIndex, 1, 1);
          headerRange.load("values");
          await context.sync();
          fieldName = String(headerRange.values[0][0] || "");
        } catch {
          // Fallback if header can't be read
          fieldName = "";
        }
      }

      const newContext: SelectionContext = {
        sheetName: sheet.name,
        address: range.address,
        value: range.values[0][0],
        rowIndex: range.rowIndex,
        columnIndex: range.columnIndex,
        isValid,
        fieldName,
      };

      if (this.hasChanged(newContext)) {
        this.currentContext = newContext;
        this.notifyListeners();
      }
    });
  }

  private hasChanged(newContext: SelectionContext): boolean {
    if (!this.currentContext) return true;
    return (
      this.currentContext.sheetName !== newContext.sheetName ||
      this.currentContext.address !== newContext.address ||
      this.currentContext.value !== newContext.value ||
      this.currentContext.isValid !== newContext.isValid ||
      this.currentContext.fieldName !== newContext.fieldName
    );
  }

  private notifyListeners() {
    if (this.currentContext) {
      const contextToNotify = { ...this.currentContext };
      this.listeners.forEach((l) => {
        try {
          l(contextToNotify);
        } catch (err) {
          this.emitError(err);
        }
      });
    }
  }

  public getCurrentContext(): SelectionContext | null {
    return this.currentContext ? { ...this.currentContext } : null;
  }
}

export const bindingService = new BindingService();
