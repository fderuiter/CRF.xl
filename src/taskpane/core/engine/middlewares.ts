/**
 * @issue #334
 */
import { Middleware } from "./chunking-engine";

interface RetryPolicy {
  maxRetries: number;
  delayMs: number;
  shouldRetry: (error: any) => boolean;
}

export function createRetryMiddleware<T>(policy: RetryPolicy): Middleware<T> {
  return async (_ctx, _chunk, next) => {
    let retries = 0;
    while (true) {
      try {
        await next();
        return;
      } catch (error: any) {
        if (!policy.shouldRetry(error) || retries >= policy.maxRetries) {
          throw error;
        }
        await new Promise((r) => setTimeout(r, policy.delayMs));
        retries++;
      }
    }
  };
}
