/**
 * @issue #334
 */
import { Middleware } from "./chunking-engine";

export interface RetryPolicy {
  maxRetries: number;
  delayMs: number;
  shouldRetry: (error: any) => boolean;
}

export function createRetryMiddleware<T>(policy: RetryPolicy): Middleware<T> {
  return async (ctx, chunk, next) => {
    let retries = 0;
    while (true) {
      try {
        await next();
        return;
      } catch (error: any) {
        if (!policy.shouldRetry(error) || retries >= policy.maxRetries) {
          throw error;
        }
        await new Promise(r => setTimeout(r, policy.delayMs));
        retries++;
      }
    }
  };
}

export function createLoggingMiddleware<T>(
  logger: (message: string, ...meta: any[]) => void
): Middleware<T> {
  return async (ctx, chunk, next) => {
    const startTime = Date.now();
    logger(`Starting chunk ${ctx.chunkIndex} for ${ctx.id}`, { size: chunk.length });
    try {
      await next();
      const duration = Date.now() - startTime;
      logger(`Completed chunk ${ctx.chunkIndex} for ${ctx.id}`, { duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger(`Failed chunk ${ctx.chunkIndex} for ${ctx.id}`, { duration, error });
      throw error;
    }
  };
}
