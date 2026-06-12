/* global Worker, self, MessageEvent, setTimeout */
/**
 * @issue #28
 */

import { parseRawDataToStudyDesign } from "../parser/parser-engine";
import { ParseProgressUpdate } from "../parser/chunking-runtime";
import { validateStudyDesign } from "../parser/validator";
import { WorkerRequest, WorkerResponse } from "./protocol.types";

const ctx: Worker = self as any;

function sendResponse(response: WorkerResponse) {
  ctx.postMessage(response);
}

ctx.onmessage = async (event: MessageEvent) => {
  const request = event.data as WorkerRequest;

  switch (request.type) {
    case "START_PARSING": {
      const { rawData, options } = request.payload;
      let isCancelled = false;

      // We can't pass functions through postMessage, so we recreate the cancellation token and progress callbacks here
      const workerOptions = {
        ...options,
        cancellationToken: {
          isCancelled: () => isCancelled,
        },
        onProgress: (update: ParseProgressUpdate) => {
          sendResponse({ type: "PROGRESS", payload: update });
        },
        yieldControl: async () => {
          // Simple cooperative yield to let the worker process incoming cancellation messages
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        },
      };

      // A closure to handle cancellation messages while parsing is ongoing
      const cancelListener = (e: MessageEvent) => {
        const req = e.data as WorkerRequest;
        if (req.type === "CANCEL_PARSING") {
          isCancelled = true;
        }
      };
      ctx.addEventListener("message", cancelListener);

      try {
        const studyDesign = await parseRawDataToStudyDesign(rawData, workerOptions);
        if (isCancelled) {
          sendResponse({ type: "CANCELLED" });
          return;
        }
        sendResponse({ type: "PROGRESS", payload: { phase: "validation", completed: 0, total: 1, message: "Validating study design..." } });
        const validationIssues = await validateStudyDesign(studyDesign, undefined, workerOptions);
        sendResponse({ type: "SUCCESS", payload: { studyDesign, validationIssues } });
      } catch (error) {
        if (isCancelled) {
          sendResponse({ type: "CANCELLED" });
        } else {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ type: "ERROR", payload: message });
        }
      } finally {
        ctx.removeEventListener("message", cancelListener);
      }
      break;
    }
    case "CANCEL_PARSING": {
      // This is handled by the ad-hoc listener during parsing, but we include it for exhaustiveness
      break;
    }
    default: {
      const _exhaustiveCheck: never = request;
      break;
    }
  }
};
