/**
 * @issue #254
 */
import * as Comlink from 'comlink';
import { parseRawDataToStudyDesign } from "../parser/parser-engine";
import { ParseProgressUpdate, ParseRuntimeOptions } from "../parser/chunking-runtime";
import { validateStudyDesign } from "../parser/validator";

export class EngineWorker {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async parse(
    rawData: Record<string, any[][]>,
    options: Omit<ParseRuntimeOptions, 'abortSignal' | 'onProgress' | 'yieldControl'>,
    onProgress?: (update: ParseProgressUpdate) => void
  ) {
    this.isCancelled = false;

    const abortController = new AbortController();

    const workerOptions = {
      ...options,
      abortSignal: abortController.signal,
      onProgress: onProgress,
      yieldControl: async () => {
        // Yield control to let event loop process potential cancel calls
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (this.isCancelled) {
          abortController.abort();
        }
      },
    };

    try {
      const studyDesign = await parseRawDataToStudyDesign(rawData, workerOptions);
      if (this.isCancelled) {
        throw new Error("Parsing cancelled");
      }
      
      if (onProgress) {
        onProgress({ phase: "validation", completed: 0, total: 1, message: "Validating study design..." });
      }
      
      const validationIssues = await validateStudyDesign(studyDesign, undefined, workerOptions);
      if (this.isCancelled) {
        throw new Error("Parsing cancelled");
      }

      return { studyDesign, validationIssues };
    } catch (e: any) {
      if (this.isCancelled || e.message === "Parsing cancelled") {
        throw new Error("Parsing cancelled");
      }
      throw e;
    }
  }
}

Comlink.expose(new EngineWorker());

