/**
 * @issue #214
 */
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingTour } from "../OnboardingTour";

// Mock onboardingService and the core module to avoid MSAL/crypto issues
jest.mock("../../core", () => ({
  onboardingService: {
    getState: jest.fn(),
    subscribe: jest.fn(),
    next: jest.fn(),
    previous: jest.fn(),
    skip: jest.fn(),
    finish: jest.fn(),
    start: jest.fn(),
  },
}));

import { onboardingService } from "../../core";
import "@testing-library/jest-dom";

describe("OnboardingTour", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (onboardingService.subscribe as jest.Mock).mockImplementation(() => {
      return () => {};
    });
  });

  it("renders nothing when inactive", () => {
    (onboardingService.getState as jest.Mock).mockReturnValue({
      isActive: false,
      currentStep: 0,
      isCompleted: false,
    });

    render(<OnboardingTour />);
    expect(screen.queryByText(/Step 1 of 7/i)).not.toBeInTheDocument();
  });

  it("renders the first step when active", () => {
    (onboardingService.getState as jest.Mock).mockReturnValue({
      isActive: true,
      currentStep: 0,
      isCompleted: false,
    });

    render(<OnboardingTour />);
    expect(screen.getByText(/Step 1 of 7/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome to CRF.xl/i)).toBeInTheDocument();
  });

  it("calls next when Next button is clicked", () => {
    (onboardingService.getState as jest.Mock).mockReturnValue({
      isActive: true,
      currentStep: 0,
      isCompleted: false,
    });

    render(<OnboardingTour />);
    fireEvent.click(screen.getByText(/Next/i));
    expect(onboardingService.next).toHaveBeenCalled();
  });

  it("calls previous when Back button is clicked on second step", () => {
    (onboardingService.getState as jest.Mock).mockReturnValue({
      isActive: true,
      currentStep: 1,
      isCompleted: false,
    });

    render(<OnboardingTour />);
    fireEvent.click(screen.getByText(/Back/i));
    expect(onboardingService.previous).toHaveBeenCalled();
  });

  it("calls skip when Skip button is clicked", () => {
    (onboardingService.getState as jest.Mock).mockReturnValue({
      isActive: true,
      currentStep: 0,
      isCompleted: false,
    });

    render(<OnboardingTour />);
    fireEvent.click(screen.getByText(/Skip/i));
    expect(onboardingService.skip).toHaveBeenCalled();
  });

  it("calls finish when Finish button is clicked on last step", () => {
    (onboardingService.getState as jest.Mock).mockReturnValue({
      isActive: true,
      currentStep: 6,
      isCompleted: false,
    });

    render(<OnboardingTour />);
    fireEvent.click(screen.getByText(/Finish/i));
    expect(onboardingService.finish).toHaveBeenCalled();
  });
});
