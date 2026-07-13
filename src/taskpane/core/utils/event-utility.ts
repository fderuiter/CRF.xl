import { logger } from "./logger";

/**
 * @issue #339
 */
type Subscriber<T> = (data: T) => void;

export class SubscriptionManager<T> {
  private subscribers: Set<Subscriber<T>> = new Set();
  private isHostReady: boolean = false;
  private stateProvider?: () => T | undefined;

  constructor(stateProvider?: () => T | undefined) {
    this.stateProvider = stateProvider;
    // Ensure execution only when host is ready
    if (typeof Office !== "undefined") {
      Office.onReady(() => {
        this.isHostReady = true;
      });
    } else {
      this.isHostReady = true;
    }

    // Clean up listeners on unload to prevent memory leaks
    if (typeof window !== "undefined") {
      window.addEventListener("unload", () => {
        this.clear();
      });
    }
  }

  private shallowClone(data: T): T {
    if (data === null || typeof data !== "object") {
      return data;
    }
    if (Array.isArray(data)) {
      return [...data] as any;
    }
    return { ...data };
  }

  public subscribe(callback: Subscriber<T>, options?: { immediate?: boolean } | boolean): () => void {
    this.subscribers.add(callback);
    
    const isImmediate = typeof options === 'boolean' ? options : options?.immediate;
    if (isImmediate && this.stateProvider) {
      try {
        const state = this.stateProvider();
        if (state !== undefined) {
          const initialState = this.shallowClone(state);
          callback(initialState);
        }
      } catch (error) {
        logger.error("Error in subscriber callback (immediate):", error);
      }
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  public notify(data: T): void {
    if (!this.isHostReady) return;
    
    const clonedData = this.shallowClone(data);
    this.subscribers.forEach((sub) => {
      try {
        sub(clonedData);
      } catch (error) {
        logger.error("Error in subscriber callback:", error);
      }
    });
  }

  public clear(): void {
    this.subscribers.clear();
  }
}
