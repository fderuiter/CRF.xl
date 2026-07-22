/**
 * @issue #28
 */
export interface RowChange {
  sheet: string;
  rowIndex: number;
  action: "insert" | "update" | "delete" | "unchanged";
  diff?: Record<string, { old: unknown; new: unknown }>;
}

export interface WorkbookProjection {
  changes: RowChange[];
  summary: {
    inserted: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };
}

export interface ImportManifest {
  id: string;
  timestamp: string;
  status: "success" | "failure";
  source: string;
  metadata: {
    originalVersion?: string;
    targetVersion?: string;
  };
  errors?: string[];
  warnings?: string[];
  summary: {
    formsProcessed: number;
    itemsProcessed: number;
  };
}
