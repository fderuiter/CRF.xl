/**
 * @issue #28
 */
export interface ValidationIssue {
  level: "Error" | "Warning";
  message: string;
  location?: string;
  rowIndex?: number;
  sheetName?: string; // Tracks which tab the error lives on
}
