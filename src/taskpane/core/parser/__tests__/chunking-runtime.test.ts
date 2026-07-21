/**
 * @issue #28
 */

import { createParseRuntime, processRowsInChunks } from "../chunking-runtime";

describe("chunking runtime", () => {
  it("processes all rows in deterministic order for chunked and single-pass chunk sizes", async () => {
    const rows = Array.from({ length: 9 }, (_, i) => i + 1);
    const chunkedResult: number[] = [];
    const singlePassResult: number[] = [];

    const chunkedRuntime = createParseRuntime({
      chunkSize: 3,
      yieldControl: async () => Promise.resolve(),
    });
    await processRowsInChunks(rows, chunkedRuntime, "items", (row) => {
      chunkedResult.push(row);
    });

    const singlePassRuntime = createParseRuntime({
      chunkSize: rows.length,
      yieldControl: async () => Promise.resolve(),
    });
    await processRowsInChunks(rows, singlePassRuntime, "items", (row) => {
      singlePassResult.push(row);
    });

    expect(chunkedResult).toEqual(singlePassResult);
  });

  it("emits cancellation and timeout errors from runtime checks", () => {
    jest.useFakeTimers();
    const originalTimeout = AbortSignal.timeout;
    AbortSignal.timeout = (ms) => {
      const controller = new AbortController();
      const error = new Error("TimeoutError");
      error.name = "TimeoutError";
      setTimeout(() => controller.abort(error), ms);
      return controller.signal;
    };

    const controller = new AbortController();
    controller.abort();
    const cancelledRuntime = createParseRuntime({
      signal: controller.signal,
    });
    expect(() => cancelledRuntime.throwIfStopped("items")).toThrow(
      "Parsing cancelled during items"
    );

    const timedOutRuntime = createParseRuntime({
      timeoutMs: 1,
    });
    jest.advanceTimersByTime(5);
    expect(() => timedOutRuntime.throwIfStopped("items")).toThrow(
      "Parsing timed out during items after 1ms"
    );

    AbortSignal.timeout = originalTimeout;
    jest.useRealTimers();
  });
});
