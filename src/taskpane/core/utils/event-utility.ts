import { logger } from "./logger";

/**
 * @issue #339
 */
type Subscriber<T> = (data: T) => void;

export class SubscriptionManager<T> {
  private subscribers: Set<Subscriber<T>> = new Set();
  private isHostReady: boolean = false;

  constructor() {
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

  public subscribe(callback: Subscriber<T>): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public notify(data: T): void {
    if (!this.isHostReady) return;
    this.subscribers.forEach((sub) => {
      try {
        sub(data);
      } catch (error) {
        logger.error("Error in subscriber callback:", error);
      }
    });
  }

  public clear(): void {
    this.subscribers.clear();
  }
}
