/**
 * @issue #68
 */
/* eslint-disable no-undef */
type ParsePhase =
  | "metadata"
  | "codelists"
  | "forms"
  | "items"
  | "schedule"
  | "rules"
  | "methods"
  | "complete";

export interface ParseProgressUpdate {
  phase: ParsePhase;
  completed: number;
  total: number;
  message: string;
}

export interface ParseRuntimeOptions {
  chunkSize?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (update: ParseProgressUpdate) => void;
  yieldControl?: () => Promise<void>;
}

export interface ParseRuntime {
  chunkSize: number;
  throwIfStopped: (phase: ParsePhase) => void;
  yieldToHost: () => Promise<void>;
  reportProgress: (update: ParseProgressUpdate) => void;
}

const DEFAULT_CHUNK_SIZE = 250;
const DEFAULT_TIMEOUT_MS = 45_000;

export function createParseRuntime(options: ParseRuntimeOptions = {}): ParseRuntime {
  const chunkSize = normalizeChunkSize(options.chunkSize);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let combinedSignal: AbortSignal | undefined = options.signal;
  if (timeoutMs > 0) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    combinedSignal = combinedSignal
      ? AbortSignal.any([combinedSignal, timeoutSignal])
      : timeoutSignal;
  }

  const throwIfStopped = (phase: ParsePhase): void => {
    if (combinedSignal?.aborted) {
      if (combinedSignal.reason && combinedSignal.reason.name === "TimeoutError") {
        throw new Error(`Parsing timed out during ${phase} after ${timeoutMs}ms`);
      }
      throw new Error(`Parsing cancelled during ${phase}`);
    }
  };

  return {
    chunkSize,
    throwIfStopped,
    yieldToHost: options.yieldControl ?? defaultYieldControl,
    reportProgress: (update) => {
      options.onProgress?.(update);
    },
  };
}

export async function processRowsInChunks<T>(
  rows: T[],
  runtime: ParseRuntime,
  phase: ParsePhase,
  onRow: (row: T, index: number) => void
): Promise<void> {
  for (let chunkStart = 0; chunkStart < rows.length; chunkStart += runtime.chunkSize) {
    runtime.throwIfStopped(phase);
    const chunkEnd = Math.min(chunkStart + runtime.chunkSize, rows.length);
    for (let rowIndex = chunkStart; rowIndex < chunkEnd; rowIndex++) {
      onRow(rows[rowIndex], rowIndex);
    }
    await runtime.yieldToHost();
  }
}

function normalizeChunkSize(chunkSize?: number): number {
  if (!Number.isFinite(chunkSize) || (chunkSize ?? 0) < 1) return DEFAULT_CHUNK_SIZE;
  return Math.floor(chunkSize as number);
}

async function defaultYieldControl(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
