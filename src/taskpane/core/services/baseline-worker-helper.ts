/* global Worker, URL, MessageEvent */
/**
 * @issue #130, #85
 */
import { StudyDesign } from "../types";
import { DiagnosticError } from "./diagnostic-framework";

export function runBaselineParserInWorker(
  rawData: Record<string, unknown[][]>
): Promise<StudyDesign> {
  return new Promise((resolve, reject) => {
    // Webpack 5 standard worker creation
    // @ts-ignore: import.meta.url is supported by Webpack 5 but not by Jest/ts-jest with current config
    const worker = new Worker(new URL("../worker/engine.worker.ts", import.meta.url));

    // Handle incoming messages
    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (type === "SUCCESS") {
        worker.terminate();
        resolve(payload.studyDesign);
      } else if (type === "ERROR") {
        worker.terminate();
        if (payload && typeof payload === "object" && "category" in payload) {
          reject(DiagnosticError.fromJSON(payload));
        } else {
          reject(new Error(String(payload)));
        }
      } else if (type === "CANCELLED") {
        worker.terminate();
        reject(new Error("Parsing cancelled"));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    // Start parsing
    worker.postMessage({
      type: "START_PARSING",
      payload: {
        rawData,
        options: { chunkSize: 50 },
      },
    });
  });
}
