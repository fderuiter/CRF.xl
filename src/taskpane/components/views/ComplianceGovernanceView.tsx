/* eslint-disable react/forbid-dom-props -- Temporary layout style exemption for legacy view */
/// <reference types="office-js" />
/**
 * @issue #28
 */
import * as React from "react";
import { useState, useEffect } from "react";
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
  Card,
  Badge,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { CheckmarkCircleRegular, ErrorCircleRegular } from "@fluentui/react-icons";
import { complianceGovernanceService as service, EnvironmentComplianceStatus } from "../../core";
import { backgroundValidationEngine } from "../../core";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
  },
  card: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    borderRadius: tokens.borderRadiusMedium,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  badge: {
    fontSize: tokens.fontSizeBase200,
  },
});

export const ComplianceGovernanceView: React.FC = () => {
  const styles = useStyles();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<EnvironmentComplianceStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isRemediating, setIsRemediating] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (!service.isAuthenticated) {
          await service.initialize();
        }
        setIsAuthenticated(service.isAuthenticated);
        if (service.isAuthenticated) {
          await fetchStatus();
        }
      } catch (error) {
        console.error("Auth init failed", error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const documentUrl = await new Promise<string>((resolve, reject) => {
        Office.context.document.getFilePropertiesAsync((result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve(result.value.url || "local://document");
          } else {
            reject(result.error);
          }
        });
      });
      const envStatus = await service.getEnvironmentStatus(documentUrl);
      setStatus(envStatus);
    } catch (error) {
      console.error("Failed to fetch status", error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleLogin = async () => {
    try {
      await service.login();
      setIsAuthenticated(true);
      await fetchStatus();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleRemediate = async () => {
    if (!status?.siteId || !status?.listId) return;
    setIsRemediating(true);
    try {
      await service.remediateSettings(
        status.siteId,
        status.listId,
        !status.hasGovernanceSummaryColumn,
        !status.hasJustificationCountColumn
      );
      await fetchStatus();
      // Remove Host Environment issue immediately after successful remediation
      backgroundValidationEngine.updateState((prev) => {
        const filtered = prev.issues.filter((i) => i.location !== "Host Environment");
        return {
          issues: filtered,
          status: filtered.length === 0 ? "Ready" : "Issues detected",
        };
      });
    } catch (error) {
      console.error("Remediation failed", error);
    } finally {
      setIsRemediating(false);
    }
  };

  if (isInitializing) {
    return <Spinner label="Initializing Compliance Center..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <Text className={styles.title}>Enterprise Compliance Governance Center</Text>
          <Text>
            Connect to Microsoft Graph to inspect M365 site-collection properties and verify 21 CFR
            Part 11 compliant storage locations.
          </Text>
          <Button appearance="primary" onClick={handleLogin}>
            Sign In with Microsoft
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.headerRow}>
          <Text className={styles.title}>Boundary of Record Status</Text>
          {isLoadingStatus ? (
            <Spinner size="tiny" />
          ) : status?.isCompliant ? (
            <Badge color="success" icon={<CheckmarkCircleRegular />} className={styles.badge}>
              GxP Ready
            </Badge>
          ) : (
            <Badge color="danger" icon={<ErrorCircleRegular />} className={styles.badge}>
              Non-Compliant
            </Badge>
          )}
        </div>

        {status && !status.isCloudHosted && !status.isCompliant && (
          <MessageBar intent="error">
            <MessageBarBody>
              File is saved to a local drive. Move it to a compliant SharePoint location to ensure
              audit trail integrity.
            </MessageBarBody>
          </MessageBar>
        )}

        {status && status.isCloudHosted && (
          <>
            <div className={styles.detailRow}>
              <Text>Storage Location</Text>
              <Text weight="semibold">SharePoint / OneDrive</Text>
            </div>
            <div className={styles.detailRow}>
              <Text>Version History</Text>
              <Text weight="semibold">{status.versionHistoryEnabled ? "Enabled" : "Disabled"}</Text>
            </div>
            <div className={styles.detailRow}>
              <Text>Check-out Required</Text>
              <Text weight="semibold">{status.checkoutRequired ? "Yes" : "No"}</Text>
            </div>
            <div className={styles.detailRow}>
              <Text>GovernanceSummary Column</Text>
              <Text weight="semibold">
                {status.hasGovernanceSummaryColumn ? "Present" : "Missing"}
              </Text>
            </div>
            <div className={styles.detailRow}>
              <Text>JustificationCount Column</Text>
              <Text weight="semibold">
                {status.hasJustificationCountColumn ? "Present" : "Missing"}
              </Text>
            </div>

            {!status.isCompliant && (
              <div style={{ marginTop: "16px" }}>
                {status.isAdmin ? (
                  <Button
                    appearance="primary"
                    onClick={handleRemediate}
                    disabled={isRemediating || !status.siteId || !status.listId}
                  >
                    {isRemediating ? <Spinner size="tiny" /> : "Apply Fixes"}
                  </Button>
                ) : (
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      Contact an administrator to apply necessary configuration fixes.
                    </MessageBarBody>
                  </MessageBar>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {status?.isCompliant && (
        <MessageBar intent="success">
          <MessageBarBody>
            The environment meets 21 CFR Part 11 requirements. Compliance logs will be included in
            exports.
          </MessageBarBody>
        </MessageBar>
      )}
    </div>
  );
};
