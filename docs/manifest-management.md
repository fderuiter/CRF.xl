# Manifest Management

This document describes how CRF.xl manages its Office Add-in manifests across development,
staging, and production environments, and how to deploy via Microsoft 365 Admin Center.

---

## Table of Contents

1. [Manifest Files Overview](#1-manifest-files-overview)
2. [Environment Configuration](#2-environment-configuration)
3. [Updating a Manifest](#3-updating-a-manifest)
4. [Manifest Validation](#4-manifest-validation)
5. [Centralized Deployment via Microsoft 365 Admin Center](#5-centralized-deployment-via-microsoft-365-admin-center)
6. [Rollback Strategy](#6-rollback-strategy)
7. [Sideload / Smoke Test Steps](#7-sideload--smoke-test-steps)
8. [Permissions Justification](#8-permissions-justification)

---

## 1. Manifest Files Overview

| File | Environment | App ID | Host URL |
|------|-------------|--------|----------|
| `manifest.dev.xml` | Development | `96d77cf1-fe3c-4f18-9e7a-310fa8ae354e` | `https://localhost:3000` |
| `manifest.staging.xml` | Staging | `a3f8c2d1-74b6-4e90-bc15-2d9a7f3e8c04` | `STAGING_HOST_URL` (replace) |
| `manifest.prod.xml` | Production | `d4e7b9f2-31a5-4c82-9e6d-0f8b5a2c7d91` | `PRODUCTION_HOST_URL` (replace) |

Each environment uses a **distinct App ID (GUID)** so that they can coexist in the same
Microsoft 365 tenant without conflicting.

> **Important**: `manifest.dev.xml` must never be deployed to staging or production.
> `manifest.prod.xml` must never reference `localhost`, staging domains, or dev tunnels.

---

## 2. Environment Configuration

### Development (`manifest.dev.xml`)

* Points to `https://localhost:3000`.
* Used for local development with `npm start`.
* Sideloaded manually into Excel; never deployed centrally.

### Staging (`manifest.staging.xml`)

* Points to `STAGING_HOST_URL` — replace this token with your actual staging HTTPS URL
  before deployment (e.g., `https://crfxl-staging.example.com`).
* Used for internal QA and user-acceptance testing (UAT).
* Deploy via Microsoft 365 Admin Center to a test security group.

**To set the staging URL** (one-time setup or on URL change):

```bash
STAGING_URL="https://crfxl-staging.example.com"
sed -i "s|STAGING_HOST_URL|${STAGING_URL}|g" manifest.staging.xml
```

### Production (`manifest.prod.xml`)

* Points to `PRODUCTION_HOST_URL` — replace this token with your actual production HTTPS URL
  before deployment (e.g., `https://crfxl.example.com`).
* The production manifest **must not** contain `localhost`, `127.0.0.1`, or staging domains.
  CI validates this automatically (see §4).
* Deploy via Microsoft 365 Admin Center for organization-wide or department rollouts.

**To set the production URL** (one-time setup or on URL change):

```bash
PROD_URL="https://crfxl.example.com"
sed -i "s|PRODUCTION_HOST_URL|${PROD_URL}|g" manifest.prod.xml
```

---

## 3. Updating a Manifest

All three manifest files are committed to the repository. Follow these steps for any change:

1. Edit the relevant `manifest.<env>.xml` file.
2. Bump `<Version>` following semver: `MAJOR.MINOR.PATCH.0` (e.g., `1.0.1.0`).
3. Run `npm run validate:<env>` to confirm the manifest passes schema validation.
4. Open a pull request. CI runs `npm run validate:dev` and `npm run validate:prod`
   automatically on every PR (see `.github/workflows/main.yml`).
5. After merging, deploy the updated manifest following §5.

### Version bump guidelines

| Change type | Example | Version segment to increment |
|-------------|---------|------------------------------|
| New feature / ribbon button | Added export command | MINOR (second) |
| Bug fix / URL change | Fixed icon URL | PATCH (third) |
| Breaking schema change | Removed extension point | MAJOR (first) |

---

## 4. Manifest Validation

### Automated (CI)

Every pull request runs:

```yaml
- name: 📋 Validate Manifests
  run: |
    npm run validate:dev
    npm run validate:prod
```

`office-addin-manifest validate` checks XML schema conformance, required elements,
and URL reachability (when online).

### Manual validation commands

```bash
# Validate individual manifests
npm run validate:dev       # manifest.dev.xml
npm run validate:staging   # manifest.staging.xml (after substituting STAGING_HOST_URL)
npm run validate:prod      # manifest.prod.xml (after substituting PRODUCTION_HOST_URL)
```

### Production localhost check (required release gate)

Before any production release, confirm that no localhost references remain:

```bash
grep -i "localhost" manifest.prod.xml && echo "FAIL: localhost found" || echo "PASS: no localhost"
```

This check is included in the CI pipeline. A non-zero exit code blocks the merge.

---

## 5. Centralized Deployment via Microsoft 365 Admin Center

> **Prerequisite**: You must be a Global Administrator or Office Apps Administrator in
> the Microsoft 365 tenant.

### 5.1 First-time deployment

1. Log in to [https://admin.microsoft.com](https://admin.microsoft.com).
2. Navigate to **Settings → Integrated apps**.
3. Click **Upload custom apps**.
4. Select **Office Add-in** and upload `manifest.prod.xml`
   (with `PRODUCTION_HOST_URL` replaced by the real URL).
5. Assign the app:
   - **Entire organization** — for org-wide rollout.
   - **Specific groups** — for department-level rollout (recommended for initial release).
   - **Specific users** — for pilot / UAT.
6. Click **Next**, review the permissions summary, then **Finish Deployment**.
7. Inform end users. The add-in appears in Excel within ~24 hours (or sooner with
   Office client restart).

### 5.2 Updating to a new version

1. Bump `<Version>` in `manifest.prod.xml` and validate locally.
2. In Admin Center, go to **Settings → Integrated apps**.
3. Select **CRF.xl** → **Edit app**.
4. Under **Update**, upload the new `manifest.prod.xml`.
5. Save. The updated add-in is pushed to assigned users automatically within 24 hours.

### 5.3 Staging / department-level rollout

For a phased rollout:

1. Deploy `manifest.staging.xml` (with real `STAGING_HOST_URL`) to a **pilot security group**.
2. Collect feedback from the pilot group.
3. After UAT sign-off, deploy `manifest.prod.xml` to the full organization or target groups.

---

## 6. Rollback Strategy

### Option A — Re-upload previous manifest version (recommended)

1. Check out the previous Git tag (e.g., `git checkout v1.0.0`).
2. Retrieve `manifest.prod.xml` from that tag.
3. In Admin Center, follow §5.2 "Updating to a new version" with the previous manifest.
4. Office clients receive the rollback within ~24 hours.

### Option B — Remove the deployment

If the issue requires immediate removal:

1. In Admin Center → **Settings → Integrated apps**, select **CRF.xl**.
2. Click **Remove app** → confirm.
3. The add-in is removed from users' Excel installations on next launch.

### Version history

All manifest changes are tracked in Git. To view history:

```bash
git log --oneline -- manifest.prod.xml
```

To inspect a specific release manifest:

```bash
git show v1.0.0:manifest.prod.xml
```

---

## 7. Sideload / Smoke Test Steps

### Development (localhost)

1. Start the dev server: `npm start`
   (launches webpack-dev-server and sideloads `manifest.dev.xml` into Excel).
2. Verify the **CRF.xl** group appears on the **Home** ribbon.
3. Click **Open CRF.xl** — the task pane should load without console errors.
4. Initialize a workbook and confirm system sheets (_Study, _Forms, _Items) are created.
5. Run the validator and confirm issues appear in the task pane.
6. Export an ODM XML file and verify it opens cleanly.

### Staging sideload

1. Host the production build on the staging server.
2. Manually sideload `manifest.staging.xml` via **File → Options → Trust Center →
   Trusted Add-in Catalogs** (network share), or upload via Admin Center to a pilot group.
3. Repeat smoke test steps 2–6 above using the staging URL.

### Production smoke test (post-deployment)

1. On a machine that received the Centralized Deployment, open Excel.
2. Confirm **CRF.xl** appears on the Home ribbon.
3. Open CRF.xl and perform a basic workbook initialize + export cycle.
4. Document the result (pass/fail) in the release notes for that version tag.

---

## 8. Permissions Justification

The manifests request `ReadWriteDocument` — the broadest Excel permission level.

| Permission | Why it is needed |
|------------|-----------------|
| `ReadWriteDocument` | CRF.xl reads the entire workbook to build the CRF metadata model (sheets, named ranges, cell values) and writes back validated results, navigation hyperlinks, and exported XML. A narrower permission (e.g., `ReadDocument`) would prevent writing system control sheets, ODM exports, and hyperlink navigation. |

No network-based permissions (Graph API, external data sources) are requested.
All data processing occurs client-side within Excel.
