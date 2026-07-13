/**
 * @issue #68
 */

import { ChunkingEngine, getDefaultYieldStrategy } from "../engine/chunking-engine";

export type ParsePhase =
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
    yieldToHost: options.yieldControl ?? getDefaultYieldStrategy(),
    reportProgress: (update) => {
      options.onProgress?.(update);
    },
  };
}

export async function processRowsInChunks<T>(
  rows: T[],
  runtime: ParseRuntime,
  phase: ParsePhase,
  onRow: (row: T, index: number) => Promise<void> | void
): Promise<void> {
  const engine = new ChunkingEngine<T>({
    chunkSize: runtime.chunkSize,
    yieldStrategy: runtime.yieldToHost,
  });

  engine.use(async (_ctx, _chunk, next) => {
    runtime.throwIfStopped(phase);
    await next();
  });

  await engine.execute([{ id: phase, data: rows }], async (chunk, ctx) => {
    for (let i = 0; i < chunk.length; i++) {
      await onRow(chunk[i], ctx.startIndex + i);
    }
  });
}

function normalizeChunkSize(chunkSize?: number): number {
  if (!Number.isFinite(chunkSize) || (chunkSize ?? 0) < 1) return DEFAULT_CHUNK_SIZE;
  return Math.floor(chunkSize as number);
}
