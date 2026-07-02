import * as React from "react";
import {
  makeStyles,
  tokens,
  Text,
  Button,
} from "@fluentui/react-components";
import { CheckmarkCircleRegular, ChevronRightRegular } from "@fluentui/react-icons";
import { Spinner } from "./DesignSystem";

// ---------------------------------------------------------------------------
// 1. Universal Stepper (Visual Indicator)
// ---------------------------------------------------------------------------

export interface StepperStep {
  label: string;
  status: "pending" | "active" | "complete";
}

export interface UniversalStepperProps {
  steps: StepperStep[];
  className?: string;
}

const useStepperStyles = makeStyles({
  stagesContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4px",
    padding: "16px 0",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  stage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    flex: 1,
    textAlign: "center",
  },
  stageCircle: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: `2px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: tokens.fontWeightBold,
  },
  stageActive: {
    borderColor: tokens.colorBrandStroke1,
    color: tokens.colorBrandForeground1,
  } as any,
  stageComplete: {
    backgroundColor: tokens.colorStatusSuccessBackground1,
    borderColor: tokens.colorStatusSuccessBorder1,
    color: tokens.colorStatusSuccessForeground1,
  } as any,
  stageLabel: {
    fontSize: tokens.fontSizeBase100,
  },
});

export const UniversalStepper: React.FC<UniversalStepperProps> = ({ steps, className }) => {
  const styles = useStepperStyles();
  return (
    <div className={`${styles.stagesContainer} ${className || ""}`}>
      {steps.map((stage, idx) => (
        <React.Fragment key={idx}>
          <div className={styles.stage}>
            <div
              className={`${styles.stageCircle} ${
                stage.status === "active" ? styles.stageActive : ""
              } ${stage.status === "complete" ? styles.stageComplete : ""}`}
            >
              {stage.status === "complete" ? <CheckmarkCircleRegular /> : idx + 1}
            </div>
            <Text className={styles.stageLabel}>{stage.label}</Text>
          </div>
          {idx < steps.length - 1 && (
            <ChevronRightRegular style={{ color: tokens.colorNeutralStroke1, fontSize: "12px" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Universal Wizard (Layout & Transitions)
// ---------------------------------------------------------------------------

export interface WizardStepDef {
  id: string;
  label: string;
  content: React.ReactNode;
  canNext?: boolean;
  canBack?: boolean;
  nextLabel?: string;
  backLabel?: string;
  onNext?: () => Promise<void> | void;
  onBack?: () => Promise<void> | void;
  hideNext?: boolean;
  hideBack?: boolean;
  hideCancel?: boolean;
}

export interface UniversalWizardProps {
  steps: WizardStepDef[];
  onCancel?: () => void;
  cancelLabel?: string;
  completeLabel?: string;
  onComplete?: () => Promise<void> | void;
  className?: string;
}

const useWizardStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
  },
  content: {
    flex: 1,
    padding: "16px 0",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: "16px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
  },
});

export const UniversalWizard: React.FC<UniversalWizardProps> = ({
  steps,
  onCancel,
  cancelLabel = "Cancel",
  completeLabel = "Complete",
  onComplete,
  className,
}) => {
  const styles = useWizardStyles();
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const activeStep = steps[currentStepIndex];
  if (!activeStep) return null;

  const handleNext = async () => {
    setIsProcessing(true);
    try {
      if (activeStep.onNext) {
        await activeStep.onNext();
      }
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else if (onComplete) {
        await onComplete();
      }
    } catch (e) {
      // Step's onNext threw an error, prevent advancing.
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = async () => {
    setIsProcessing(true);
    try {
      if (activeStep.onBack) {
        await activeStep.onBack();
      }
      if (currentStepIndex > 0) {
        setCurrentStepIndex((prev) => prev - 1);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const mappedSteps: StepperStep[] = steps.map((s, idx) => ({
    label: s.label,
    status: idx < currentStepIndex ? "complete" : idx === currentStepIndex ? "active" : "pending",
  }));

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <UniversalStepper steps={mappedSteps} />

      <div className={styles.content}>{activeStep.content}</div>

      <div className={styles.actions}>
        <div className={styles.actionGroup}>
          {!activeStep.hideCancel && onCancel && (
            <Button appearance="secondary" disabled={isProcessing} onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
        </div>
        <div className={styles.actionGroup}>
          {!activeStep.hideBack && !isFirstStep && (
            <Button
              appearance="secondary"
              disabled={isProcessing || activeStep.canBack === false}
              onClick={handleBack}
            >
              {activeStep.backLabel || "← Back"}
            </Button>
          )}
          {!activeStep.hideNext && (
            <Button
              appearance="primary"
              disabled={isProcessing || activeStep.canNext === false}
              onClick={handleNext}
              icon={isProcessing ? <Spinner /> : undefined}
            >
              {activeStep.nextLabel || (isLastStep ? completeLabel : "Next →")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
