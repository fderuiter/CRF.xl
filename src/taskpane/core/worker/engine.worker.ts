/* global Worker, self, MessageEvent, setTimeout */
import { parseRawDataToStudyDesign } from "../parser/parser-engine";
import { ParseProgressUpdate } from "../parser/chunking-runtime";

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
      yieldControl: async () => {
        // Simple cooperative yield to let the worker process incoming cancellation messages
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
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
      ctx.postMessage({ type: "SUCCESS", payload: studyDesign });
    } catch (error) {
      if (isCancelled) {
        ctx.postMessage({ type: "CANCELLED" });
      } else {
        const message = error instanceof Error ? error.message : String(error);
        ctx.postMessage({ type: "ERROR", payload: message });
      }
    } finally {
      ctx.removeEventListener("message", cancelListener);
    }
  }
};
