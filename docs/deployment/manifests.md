# Office Add-in Manifest

This repository maintains a single Office add-in XML manifest.

- **Manifest:** [manifest.xml](../../manifest.xml)

---

## 🛠️ Which manifest to use

- **Local developer sideload:** `manifest.xml` (points to `localhost:3000` or dev-tunnel URLs).

---

## 🚫 External Host Provisioning Status (Issue #135 Block)

> [!WARNING]
> **Pending Infrastructure Provisioning:**
> Until the corporate IT infrastructure group completes external host provisioning (Issue #135), the manifest utilizes secure placeholder hosts for production deployments.

---

## ✅ Manifest Validation & CI Quality Gates

Every manifest change undergoes automated linting and validation via `scripts/validate-manifests.js` on checkouts and PR builds:

```bash
npm run validate
```

The validation suite (`npm run validate`) automatically executes checks like version synchronization and placeholder presence.

To validate against Microsoft's schema validator, run:

```bash
npm run validate:office
```

---

## 🔑 Permissions Rationale

All environment manifests request the following permission level:

```xml
<Permissions>ReadWriteDocument</Permissions>
```

This permission is **strictly limited** to the workbook context. It is required for CRF.xl's core tabular authoring flows (sheet initialization, workbook data extraction, cell validation drop-downs, metadata sync, and in-workbook updates). CRF.xl does **not** request or utilize broader mailbox, user account, or calendar scopes.

---

## 🚀 Microsoft 365 Centralized Rollout (Production)

1. Build and publish production web assets to the approved production host.
2. Verify manifest integrity: `npm run validate`.
3. Log in to the **Microsoft 365 Admin Center** as an Global Admin or Exchange Admin.
4. Navigate to **Settings → Integrated apps**.
5. Select **Upload custom apps** and upload your production `manifest.xml`.
6. Configure deployment scope:
   - Stage 1: Pilot IT / QA validation group.
   - Stage 2: Clinical Data Management / UAT department rollout.
   - Stage 3: Global organization-wide deployment.
7. Verify that the CRF.xl task pane appears in the Excel clients of the target users.

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
