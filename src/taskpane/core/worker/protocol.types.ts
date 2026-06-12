import { ParseProgressUpdate } from "../parser/chunking-runtime";
import { ValidationIssue } from "../parser/validator";
import { StudyDesign } from "../types/index";

export interface WorkerSerializableOptions {
  chunkSize?: number;
  timeoutMs?: number;
  allowPartialSheetFailures?: boolean;
}

export type WorkerRequest =
  | {
      type: "START_PARSING";
      payload: {
        rawData: Record<string, any[][]>;
        options: WorkerSerializableOptions;
      };
    }
  | { type: "CANCEL_PARSING" };

export type WorkerResponse =
  | { type: "PROGRESS"; payload: ParseProgressUpdate }
  | {
      type: "SUCCESS";
      payload: { studyDesign: StudyDesign; validationIssues: ValidationIssue[] };
    }
  | { type: "ERROR"; payload: string }
  | { type: "CANCELLED" };
