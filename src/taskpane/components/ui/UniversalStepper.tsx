/**
 * @issue #313
 */
import * as React from "react";
import {
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Button,
  Spinner,
} from "@fluentui/react-components";
import { CheckmarkCircleRegular, ChevronRightRegular } from "@fluentui/react-icons";
import { useAnnouncer } from "../../hooks/useAnnouncer";

// ---------------------------------------------------------------------------
// 1. Universal Stepper (Visual Indicator)
// ---------------------------------------------------------------------------

interface StepperStep {
  label: string;
  status: "pending" | "active" | "complete";
}

interface UniversalStepperProps {
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
    listStyleType: "none",
    margin: 0,
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
  separatorItem: {
    display: "flex",
    alignItems: "center",
  },
  separatorIcon: {
    color: tokens.colorNeutralStroke1,
    fontSize: "12px",
  },
});

export const UniversalStepper: React.FC<UniversalStepperProps> = ({ steps, className }) => {
  const styles = useStepperStyles();
  return (
    <ul className={mergeClasses(styles.stagesContainer, className)}>
      {steps.map((stage, idx) => (
        <React.Fragment key={idx}>
          <li
            className={styles.stage}
            aria-current={stage.status === "active" ? "step" : undefined}
          >
            <div
              className={mergeClasses(
                styles.stageCircle,
                stage.status === "active" && styles.stageActive,
                stage.status === "complete" && styles.stageComplete
              )}
            >
              {stage.status === "complete" ? <CheckmarkCircleRegular /> : idx + 1}
            </div>
            <Text className={styles.stageLabel}>{stage.label}</Text>
          </li>
          {idx < steps.length - 1 && (
            <li aria-hidden="true" className={styles.separatorItem}>
              <ChevronRightRegular className={styles.separatorIcon} />
            </li>
          )}
        </React.Fragment>
      ))}
    </ul>
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

interface UniversalWizardProps {
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
    outline: "none",
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
  const [justNavigated, setJustNavigated] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const { announce } = useAnnouncer();

  const activeStep = steps[currentStepIndex];

  React.useEffect(() => {
    if (justNavigated && activeStep) {
      if (contentRef.current) {
        contentRef.current.focus();
      }
      announce(`Step ${currentStepIndex + 1} of ${steps.length}: ${activeStep.label}`, "polite");
      setJustNavigated(false);
    }
  }, [currentStepIndex, justNavigated, steps, activeStep, announce]);

  if (!activeStep) return null;

  const handleNext = async () => {
    setIsProcessing(true);
    try {
      if (activeStep.onNext) {
        await activeStep.onNext();
      }
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
        setJustNavigated(true);
      } else if (onComplete) {
        await onComplete();
      }
    } catch {
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
        setJustNavigated(true);
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
    <div className={mergeClasses(styles.container, className)}>
      <UniversalStepper steps={mappedSteps} />

      <div className={styles.content} ref={contentRef} tabIndex={-1}>
        {activeStep.content}
      </div>

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
              icon={isProcessing ? <Spinner size="small" /> : undefined}
            >
              {activeStep.nextLabel || (isLastStep ? completeLabel : "Next →")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
