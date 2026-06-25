# Compliance Configuration Guide

## 1. Introduction

This guide provides IT administrators with the mandatory manual configuration steps required to prepare a SharePoint host environment for the CRF.xl application. Completing these steps ensures the environment meets 21 CFR Part 11 audit requirements and prevents "Host Environment" validation errors in the application taskpane.

**Note on Access:** SharePoint Site Collection Administrator permissions are required to perform these configuration steps. Users without administrative rights will still see error notifications in the taskpane if the environment is misconfigured, but there is no self-service fix available for them; this guide is exclusively for administrators.

## 2. SharePoint Library Configuration

The CRF.xl application's `ComplianceGovernanceService` programmatically verifies library settings. The following configurations must be exact.

### 2.1 Enable Versioning (`enableVersioning`)

To comply with electronic record requirements, strict versioning must be enabled:
1. Navigate to the target SharePoint Document Library.
2. Go to **Settings** (gear icon) > **Library settings** > **More library settings**.
3. Click on **Versioning settings**.
4. Under *Document Version History*, select **Create major versions** (or major and minor versions if required by your organization).
5. Click **OK** to save. This fulfills the `enableVersioning` requirement.

### 2.2 Disable Require Check-out

The application requires real-time synchronization, which is blocked if check-outs are enforced:
1. In the **Versioning settings** page (from the step above).
2. Scroll down to *Require Check Out*.
3. Ensure **Require documents to be checked out before they can be edited** is set to **No**.
4. Click **OK**.

### 2.3 Create Required Metadata Columns

The application relies on specific custom columns to track compliance metrics.
1. Navigate to your Document Library.
2. Click **Add column** or go to **Library settings** to create new columns.
3. Create the following columns exactly as named (case-sensitive):
    * **Column Name:** `GovernanceSummary`
      * **Type:** Multiple lines of text (Note)
    * **Column Name:** `JustificationCount`
      * **Type:** Number

## 3. Deployment Build Preparation

For staging and production deployments, the manifest file must be correctly pointing to your designated application host.

### 3.1 Manifest Placeholder Substitution

Before uploading manifests to non-development environments, you must replace the placeholder URLs in the manifest XML files.
1. Open the relevant manifest file (e.g., `manifest.staging.xml` or `manifest.production.xml`).
2. Search for the placeholder strings: `REPLACE_WITH_STAGING_HOST` or `REPLACE_WITH_PRODUCTION_HOST`.
3. Replace these placeholders with the final, fully-qualified HTTPS endpoint of your deployed application host.
4. Run the validation script (`npm run manifest:validate`) to ensure no syntax errors were introduced.

## 4. Environment Verification

Once the host URL is substituted and the SharePoint environment is configured, verify the deployment:
1. Log in to the **Microsoft 365 Admin Center** as a Global Admin or Exchange Admin.
2. Navigate to **Settings > Integrated apps**.
3. Upload the configured manifest file.
4. Assign the app to a test group or yourself, and confirm the CRF.xl taskpane opens in Excel without returning a "Host Environment" error.

## 5. Infrastructure Dependency Note

**External Host Provisioning Status (Issue #135 Block):** 
Please note that until the corporate IT infrastructure group completes external host provisioning (Issue #135), full production deployment relies on the secure placeholder hosts mentioned above. You must ensure the provisioning is completed and you have the final URLs before performing the manifest placeholder substitution and finalizing the Microsoft 365 Admin Center rollout.
