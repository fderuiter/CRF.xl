/**
 * @issue #334
 */
export interface ChunkContext {
  id: string; // Identifier for the current dataset (e.g., sheet name or generic ID)
  chunkIndex: number;
  startIndex: number;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  totalItems: number;
  state: Record<string, any>;
  abortSignal?: AbortSignal;
}

export type NextFunction = () => Promise<void>;

export type Middleware<T> = (ctx: ChunkContext, chunk: T[], next: NextFunction) => Promise<void>;

export interface ExecutionPlan<T> {
  id: string;
  data: T[];
}

export type EngineEvent = "progress" | "state" | "error";

export interface ChunkingEngineOptions {
  chunkSize?: number;
  yieldStrategy?: () => Promise<void>;
  abortSignal?: AbortSignal;
}

export function getDefaultYieldStrategy(): () => Promise<void> {
  const isWorker =
    typeof (globalThis as any).WorkerGlobalScope !== "undefined" &&
    typeof self !== "undefined" &&
    self instanceof (globalThis as any).WorkerGlobalScope;
  if (isWorker) {
    return async () => {
      await new Promise((r) => setTimeout(r, 0));
    };
  }
  return async () => {
    await new Promise((r) => setTimeout(r, 20));
  };
}

export class ChunkingEngine<T> {
  private middlewares: Middleware<T>[] = [];
  private listeners: Record<EngineEvent, Function[]> = {
    progress: [],
    state: [],
    error: [],
  };
  private chunkSize: number;
  private yieldStrategy: () => Promise<void>;

  constructor(options: ChunkingEngineOptions = {}) {
    this.chunkSize = options.chunkSize && options.chunkSize > 0 ? options.chunkSize : 500;
    this.yieldStrategy = options.yieldStrategy ?? getDefaultYieldStrategy();
  }

  public use(middleware: Middleware<T>): this {
    this.middlewares.push(middleware);
    return this;
  }

  public on(event: EngineEvent, listener: Function): () => void {
    this.listeners[event].push(listener);
    return () => {
      this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
    };
  }

  public emit(event: EngineEvent, payload: any) {
    this.listeners[event].forEach((l) => l(payload));
  }

  public async execute(
    plans: ExecutionPlan<T>[],
    processor: (chunk: T[], ctx: ChunkContext) => Promise<void>
  ): Promise<void> {
    let totalCompleted = 0;
    const totalItems = plans.reduce((acc, plan) => acc + plan.data.length, 0);

    for (const plan of plans) {
      if (plan.data.length === 0) {
        // Run once for empty datasets if needed, or skip. Let's run once with empty chunk.
        const ctx: ChunkContext = {
          id: plan.id,
          chunkIndex: 0,
          startIndex: 0,
          isFirstChunk: true,
          isLastChunk: true,
          totalItems: 0,
          state: {},
        };
        await this.runPipeline(ctx, [], processor);
        totalCompleted += 0;
        this.emit("progress", { completed: totalCompleted, total: totalItems, planId: plan.id });
        await this.yieldStrategy();
        continue;
      }

      for (let i = 0; i < plan.data.length; i += this.chunkSize) {
        const chunk = plan.data.slice(i, i + this.chunkSize);
        const ctx: ChunkContext = {
          id: plan.id,
          chunkIndex: Math.floor(i / this.chunkSize),
          startIndex: i,
          isFirstChunk: i === 0,
          isLastChunk: i + this.chunkSize >= plan.data.length,
          totalItems: plan.data.length,
          state: {},
        };

        await this.runPipeline(ctx, chunk, processor);

        totalCompleted += chunk.length;
        this.emit("progress", { completed: totalCompleted, total: totalItems, planId: plan.id });
        await this.yieldStrategy();
      }
    }
  }

  private async runPipeline(
    ctx: ChunkContext,
    chunk: T[],
    processor: (chunk: T[], ctx: ChunkContext) => Promise<void>
  ): Promise<void> {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;

      if (i === this.middlewares.length) {
        await processor(chunk, ctx);
      } else {
        const middleware = this.middlewares[i];
        await middleware(ctx, chunk, () => dispatch(i + 1));
      }
    };

    try {
      await dispatch(0);
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
}
