/* global Worker, self, MessageEvent, setTimeout */
/**
 * @issue #28
 */

import { parseRawDataToStudyDesign } from "../parser/parser-engine";
import { ParseProgressUpdate } from "../parser/chunking-runtime";
import { validateStudyDesign } from "../parser/validator";
import { DiagnosticError } from "../services/diagnostic-framework";

const ctx: Worker = self as any;

ctx.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === "START_PARSING") {
    const { rawData, options } = payload;
    let isCancelled = false;

    // We can't pass functions through postMessage, so we recreate the cancellation token and progress callbacks here
    const workerOptions = {
      ...options,
      cancellationToken: {
        isCancelled: () => isCancelled,
      },
      onProgress: (update: ParseProgressUpdate) => {
        ctx.postMessage({ type: "PROGRESS", payload: update });
      },
    };

    // A closure to handle cancellation messages while parsing is ongoing
    const cancelListener = (e: MessageEvent) => {
      if (e.data.type === "CANCEL_PARSING") {
        isCancelled = true;
      }
    };
    ctx.addEventListener("message", cancelListener);

    try {
      const studyDesign = await parseRawDataToStudyDesign(rawData, workerOptions);
      if (isCancelled) {
        ctx.postMessage({ type: "CANCELLED" });
        return;
      }
      ctx.postMessage({
        type: "PROGRESS",
        payload: {
          phase: "validation",
          completed: 0,
          total: 1,
          message: "Validating study design...",
        },
      });
      const validationIssues = await validateStudyDesign(studyDesign, undefined, workerOptions);
      ctx.postMessage({ type: "SUCCESS", payload: { studyDesign, validationIssues } });
    } catch (error) {
      if (isCancelled) {
        ctx.postMessage({ type: "CANCELLED" });
      } else {
        const payload =
          error instanceof DiagnosticError
            ? error.toJSON()
            : error instanceof Error
              ? error.message
              : String(error);
        ctx.postMessage({ type: "ERROR", payload });
      }
    } finally {
      ctx.removeEventListener("message", cancelListener);
    }
  }
};
