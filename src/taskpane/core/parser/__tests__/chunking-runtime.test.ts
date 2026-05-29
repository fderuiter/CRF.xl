/**
 * @issue #28
 */
/* eslint-disable no-undef */
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
    const cancelledRuntime = createParseRuntime({
      cancellationToken: {
        isCancelled: () => true,
      },
    });
    expect(() => cancelledRuntime.throwIfStopped("items")).toThrow(
      "Parsing cancelled during items"
    );

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(0);
    const timedOutRuntime = createParseRuntime({
      timeoutMs: 1,
    });
    nowSpy.mockReturnValue(5);
    expect(() => timedOutRuntime.throwIfStopped("items")).toThrow(
      "Parsing timed out during items after 1ms"
    );
    nowSpy.mockRestore();
  });
});
