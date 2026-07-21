# Chunking Engine Specification

## 1. Technical Stack
- **Language:** TypeScript
- **Paradigm:** Asynchronous processing, Onion-skin Middleware Architecture
- **Environment Context:** Browser/Office JS Taskpane, Web Workers

## 2. System Architecture

The `ChunkingEngine` is designed to process large-scale datasets (like thousands of Excel rows) asynchronously without blocking the main browser thread. This is critical in the Office Add-in context to avoid UI freezes and "Script Unresponsive" browser warnings.

### Asynchronous Division
Instead of processing an entire array in a single blocking `for` loop or `Promise.all()`, the engine segments the data into smaller, manageable pieces (chunks) based on a configured `chunkSize`.

### Yielding Strategy
After each chunk is processed, the engine invokes a `yieldStrategy()`. 
- In the main thread, this typically uses `setTimeout(fn, 20)` to yield control back to the browser's event loop, allowing UI repaints and user interactions to occur.
- In a Web Worker, it yields with a shorter delay `setTimeout(fn, 0)`.

### Integration Points
1. **Workbook Parser:** The parser generates an `ExecutionPlan` detailing the sheets and rows to be processed. The Chunking Engine consumes this plan to stream parsing operations.
2. **Synchronization Service:** During speculative synchronization, massive datasets are synced back to backend APIs. The Chunking Engine throttles and segments these sync jobs to adhere to network limits and provide accurate progress updates to the UI.

## 3. Core Mechanics

### Progress Reporting
The engine emits a `"progress"` event after completing each chunk. 
```typescript
export interface ProgressEvent {
  completed: number;
  total: number;
  planId: string;
}

export function emitProgress(this: any, totalCompleted: number, totalItems: number, plan: any) {
  this.emit("progress", {
    completed: totalCompleted,
    total: totalItems,
    planId: plan.id,
  });
}
```
This is consumed by the UI to update progress bars.

### `ChunkContext`
Each chunk passes a `ChunkContext` down the execution pipeline. This context includes:
- `id`: Identifier of the current dataset (e.g., sheet name).
- `chunkIndex`: Zero-based index of the chunk.
- `isFirstChunk` / `isLastChunk`: Boolean flags to trigger initialization or cleanup routines.
- `state`: A shared state object across the pipeline for that specific chunk.

## 4. API Contracts

### `ChunkingEngineOptions`
```typescript
export interface ChunkingEngineOptions {
  chunkSize?: number; // Default: 500
  yieldStrategy?: () => Promise<void>;
  abortSignal?: AbortSignal;
}
```

### `ExecutionPlan<T>`
```typescript
export interface ExecutionPlan<T> {
  id: string;
  data: T[];
}
```

### `execute` Method
```typescript
export interface ChunkContext {
  id: string;
  chunkIndex: number;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  state: any;
}

export declare class Engine<T> {
  execute(
    plans: ExecutionPlan<T>[],
    processor: (chunk: T[], ctx: ChunkContext) => Promise<void>
  ): Promise<void>;
}
```
Executes the provided plans. The `processor` is the terminal function executed at the very center of the middleware pipeline.
