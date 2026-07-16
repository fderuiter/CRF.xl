# Middlewares Specification

## 1. Technical Stack
- **Language:** TypeScript
- **Paradigm:** Onion-skin Middleware Pipeline

## 2. System Architecture

The Chunking Engine employs an onion-skin middleware architecture (similar to Koa.js or Express.js). Middlewares wrap the core processing logic, allowing you to intercept, modify, or halt the execution of a chunk both before and after the core processor runs.

### Execution Pipeline Flow
When a chunk is ready to be processed, it traverses the registered middlewares in the order they were added via `engine.use()`. 

1. **Downstream:** A middleware performs setup or pre-processing, then calls `await next()`.
2. **Core:** The `next()` chain eventually invokes the terminal `processor` provided to the `execute()` function.
3. **Upstream:** After the core processor resolves, the promise returned by `next()` resolves, allowing the middleware to execute teardown or post-processing logic.

### Registration
Middlewares are registered directly onto the engine instance:
```typescript
engine
  .use(createLoggingMiddleware(logger))
  .use(createRetryMiddleware(policy))
```

## 3. Standard Middlewares

### 1. `RetryMiddleware`
Wraps the chunk execution in a `try/catch` block. If the inner execution throws an error (e.g., a network timeout during the Sync Service call), the middleware evaluates a `RetryPolicy`.
- If the error meets the `shouldRetry` criteria and the `maxRetries` limit hasn't been reached, the middleware waits `delayMs` and recursively calls `next()` again.
- This is highly useful for mitigating transient network errors during chunked data uploads.

### 2. `LoggingMiddleware`
Captures the precise `startTime` before calling `next()`, and calculates the `duration` after `next()` resolves. It logs both successes and failures, providing deep observability into the processing pipeline.

### 3. Fingerprint & State-Tracking (Conceptual)
While not present in the base engine implementation, custom middlewares often leverage the `ctx.state` object to pass fingerprinting or deduplication data down the pipeline.
- For instance, a `FingerprintMiddleware` might hash the chunk's contents and check against a cache in `ctx.state`. If the chunk is unchanged, it can bypass calling `next()` entirely, saving processing time.

## 4. API Contracts

### `Middleware<T>` Signature
```typescript
type Middleware<T> = (
  ctx: ChunkContext,
  chunk: T[],
  next: () => Promise<void>
) => Promise<void>;
```

### `RetryPolicy`
```typescript
interface RetryPolicy {
  maxRetries: number;
  delayMs: number;
  shouldRetry: (error: any) => boolean;
}
```

### `createRetryMiddleware`
```typescript
function createRetryMiddleware<T>(policy: RetryPolicy): Middleware<T>
```

### `createLoggingMiddleware`
```typescript
function createLoggingMiddleware<T>(
  logger: (message: string, ...meta: any[]) => void
): Middleware<T>
```
