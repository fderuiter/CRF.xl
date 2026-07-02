/**
 * @issue #214
 */
import * as React from "react";
import {
  Button,
  TeachingPopover,
  TeachingPopoverSurface,
  TeachingPopoverHeader,
  TeachingPopoverTitle,
  TeachingPopoverBody,
  TeachingPopoverFooter,
  makeStyles,
} from "@fluentui/react-components";
import { onboardingService, OnboardingState } from "../core";

const useStyles = makeStyles({
  surface: {
    maxWidth: "320px",
  },
});

interface TourStep {
  title: string;
  description: string;
  anchorId: string;
  position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to CRF.xl",
    description:
      "Initialize your clinical study by setting up the Matrix Architecture. Click 'Initialize Canvas' to start.",
    anchorId: "tour-init-canvas",
  },
  {
    title: "System Registry",
    description:
      "Define global protocol metadata and register your forms. Use 'Sync Form Sheets' to generate authoring tabs for each form.",
    anchorId: "tour-registry",
  },
  {
    title: "Form Authoring",
    description:
      "Use context-aware tools and the Annotation Paintbrush to rapidly author CRF fields and clinical annotations.",
    anchorId: "tour-authoring",
  },
  {
    title: "Visit Matrix",
    description:
      "Manage your study schedule, track form/visit assignments, and run compliance exports for CDISC submissions.",
    anchorId: "tour-matrix",
  },
  {
    title: "Integrity Hub",
    description:
      "Review critical errors, warnings, and study changes. Sign-off on the design when it's reviewer-ready.",
    anchorId: "tour-integrity",
  },
];

export const OnboardingTour: React.FC = () => {
  const styles = useStyles();
  const [state, setState] = React.useState<OnboardingState>(onboardingService.getState());

  React.useEffect(() => {
    return onboardingService.subscribe(setState);
  }, []);

  if (!state.isActive) {
    return null;
  }

  const stepIndex = state.currentStep;
  const currentStep = TOUR_STEPS[stepIndex];

  if (!currentStep) {
    onboardingService.finish();
    return null;
  }

  const isLastStep = stepIndex === TOUR_STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const handleNext = () => {
    if (isLastStep) {
      onboardingService.finish();
    } else {
      onboardingService.next();
    }
  };

  const handleBack = () => {
    onboardingService.previous();
  };

  const handleSkip = () => {
    onboardingService.skip();
  };

  return (
    <TeachingPopover
      open={state.isActive}
      positioning={{ target: document.getElementById(currentStep.anchorId) }}
    >
      <TeachingPopoverSurface className={styles.surface}>
        <TeachingPopoverHeader>
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </TeachingPopoverHeader>
        <TeachingPopoverTitle>{currentStep.title}</TeachingPopoverTitle>
        <TeachingPopoverBody>{currentStep.description}</TeachingPopoverBody>
        <TeachingPopoverFooter
          primary={
            <Button appearance="primary" onClick={handleNext}>
              {isLastStep ? "Finish" : "Next"}
            </Button>
          }
          secondary={
            <div style={{ display: "flex", gap: "8px" }}>
              {!isFirstStep && (
                <Button appearance="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
              <Button appearance="subtle" onClick={handleSkip}>
                Skip
              </Button>
            </div>
          }
        />
      </TeachingPopoverSurface>
    </TeachingPopover>
  );
};
