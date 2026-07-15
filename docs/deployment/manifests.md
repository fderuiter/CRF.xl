# Office Add-in Manifests by Environment

This repository maintains a single, unified Office add-in XML manifest. Environment-specific URLs (development, staging, production) are injected during the CI/CD deployment pipeline to enforce environment isolation and GxP compliance:

- **Unified Manifest:** [manifest.xml](../../manifest.xml)

---

## 🛠️ Which manifest to use

- **Local developer sideload:** `manifest.xml` (dev URLs are configured via `.env` or during setup).
- **Department/UAT validation:** Injected in CI pipeline (points to secure UAT sandbox host).
- **Centralized rollout in Microsoft 365 Admin Center:** Injected in CI pipeline (points to canonical production host).

---

## 🚫 External Host Provisioning Status (Issue #135 Block)

> [!WARNING]
> **Pending Infrastructure Provisioning:**
> Until the corporate IT infrastructure group completes external host provisioning (Issue #135), the CI deployment pipeline utilizes placeholder variables.
> 
> Sideloading the manifest in non-development environments will fail to resolve until the final HTTPS endpoints are injected by your target deployment pipelines.

---

## ✅ Manifest Validation & CI Quality Gates

Every manifest change undergoes automated linting and validation via `scripts/validate-manifests.js` on checkouts and PR builds:

```bash
npm run validate
```

The validation suite (`npm run validate`) automatically executes:
1. **Version Synchronization:** Enforces that the `<Version>` tag matches the root `package.json` version string exactly as `${version}.0`.
2. **Identifier Check:** Verifies that the unique XML `<Id>` GUID is present.
3. **Placeholder Checks:** Confirms the presence of client ID placeholders before release assembly.

---

## 🔑 Permissions Rationale

All environment deployments request the following permission level in the unified manifest:

```xml
<Permissions>ReadWriteDocument</Permissions>
```

This permission is **strictly limited** to the workbook context. It is required for CRF.xl's core tabular authoring flows (sheet initialization, workbook data extraction, cell validation drop-downs, metadata sync, and in-workbook updates). CRF.xl does **not** request or utilize broader mailbox, user account, or calendar scopes.

---

## 🚀 Microsoft 365 Centralized Rollout (Production)

1. Build and publish production web assets to the approved production host.
2. The CI pipeline will update the `manifest.xml` placeholders with the final provisioned production URLs and Client IDs.
3. Verify manifest integrity: `npm run validate`.
4. Log in to the **Microsoft 365 Admin Center** as an Global Admin or Exchange Admin.
5. Navigate to **Settings → Integrated apps**.
6. Select **Upload custom apps** and upload your production-injected `manifest.xml`.
7. Configure deployment scope:
   - Stage 1: Pilot IT / QA validation group.
   - Stage 2: Clinical Data Management / UAT department rollout.
   - Stage 3: Global organization-wide deployment.
8. Verify that the CRF.xl task pane appears in the Excel clients of the target users.

---

## 🔄 Rollback / Previous-Version Strategy

1. Maintain the last known-good production manifest in your release archives and git repository history.
2. In the event of a critical production release failure, immediately re-upload the prior manifest version in the Microsoft 365 Admin Center.
3. Keep the target deployment scopes identical to ensure all active users are immediately reverted.
4. Clear Excel client cache if the prior taskpane version is slow to update.

---

## 🔔 Taskpane Version-Update Notification Mechanism

To alert active users of available application updates without interrupting current workflows, the taskpane executes a passive version audit:

1. **Endpoint Fetch:** On launch, the add-in requests `assets/version.json` (or `globalThis.CRF_XL_VERSION_ENDPOINT` if overridden by enterprise hosts).
2. **Payload Schema:**
   ```json
   {
     "version": "2.4.0",
     "description": "Critical security and stability updates.",
     "changelogUrl": "https://github.com/fderuiter/CRF.xl/releases"
   }
   ```
3. **Comparison:** If the fetched `version` is newer than the running client version, a Fluent UI v9 `MessageBar` is rendered at the top of the taskpane.
4. **Session Persistence:** Dismissing the notification stores `crf-xl-version-update-dismissed-v1` in `sessionStorage`, silencing the alert for the remainder of the active Excel session.
5. **Fault Tolerance:** If the network request fails or returns a non-200 status, the engine fails silently, allowing the data manager to work uninterrupted.
