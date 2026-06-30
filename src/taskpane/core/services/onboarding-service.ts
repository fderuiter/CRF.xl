/**
 * @issue #214
 */
export interface OnboardingState {
  currentStep: number;
  isActive: boolean;
  isCompleted: boolean;
}

const STORAGE_KEY = "crf_xl_onboarding_completed";

/**
 * Service to manage the state of the interactive onboarding tour.
 */
class OnboardingService {
  private state: OnboardingState = {
    currentStep: 0,
    isActive: false,
    isCompleted: false,
  };

  private listeners: Set<(state: OnboardingState) => void> = new Set();

  constructor() {
    if (typeof localStorage !== "undefined") {
      this.state.isCompleted = localStorage.getItem(STORAGE_KEY) === "true";
    }
  }

  /**
   * Returns the current onboarding state.
   */
  public getState(): OnboardingState {
    return { ...this.state };
  }

  /**
   * Subscribes to onboarding state changes.
   */
  public subscribe(listener: (state: OnboardingState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  /**
   * Starts the onboarding tour.
   */
  public start() {
    this.state.isActive = true;
    this.state.currentStep = 0;
    this.notify();
  }

  /**
   * Moves to the next step in the tour.
   */
  public next() {
    this.state.currentStep += 1;
    this.notify();
  }

  /**
   * Moves to the previous step in the tour.
   */
  public previous() {
    this.state.currentStep = Math.max(0, this.state.currentStep - 1);
    this.notify();
  }

  /**
   * Skips/Dismisses the tour without marking it as completed.
   */
  public skip() {
    this.state.isActive = false;
    this.notify();
  }

  /**
   * Completes the tour and persists the status.
   */
  public finish() {
    this.state.isActive = false;
    this.state.isCompleted = true;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    this.notify();
  }

  /**
   * Resets the onboarding status (for re-running the tour).
   */
  public reset() {
    this.state.isCompleted = false;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notify();
  }
}

export const onboardingService = new OnboardingService();
