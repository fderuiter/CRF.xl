# Office Add-in Manifests by Environment

This repository maintains separate Office add-in manifests for each deployment environment:

- Development: `manifest.dev.xml`
- Staging: `manifest.staging.xml`
- Production: `manifest.production.xml`

## Which manifest to use

- Local developer sideload: `manifest.dev.xml`
- Department/UAT validation: `manifest.staging.xml`
- Centralized rollout in Microsoft 365 Admin Center: `manifest.production.xml`

## Required placeholders before release

Until final endpoints are confirmed, staging/production manifests intentionally use:

- `REPLACE_WITH_STAGING_HOST`
- `REPLACE_WITH_PRODUCTION_HOST`

Replace these placeholders with the final HTTPS hostnames before deployment.

## Validation (repeatable from clean checkout)

```bash
npm ci
npm run manifest:validate
```

`manifest:validate` performs:

1. Guardrail checks that staging/production manifests do not contain localhost/dev-tunnel endpoints.
2. Version check (`<Version>` must match `package.json` as `${version}.0`).
3. Environment ID check (each manifest `<Id>` must be unique).
4. Presence checks for required metadata fields (`Id`, `Version`, `Permissions`) and environment placeholders.

Optional Office service validation:

```bash
npm run manifest:validate:office
```

## Permissions rationale

All manifests request:

- `<Permissions>ReadWriteDocument</Permissions>`

This permission is required for CRF.xl workbook authoring flows (sheet creation, metadata extraction, navigation, and in-workbook updates). No broader mailbox/calendar scopes are requested.

## Microsoft 365 Admin Center centralized deployment (production)

1. Build and publish production web assets to the approved production host.
2. Update `manifest.production.xml` placeholders with final production URLs.
3. Run `npm run manifest:validate`.
4. In Microsoft 365 admin center, open **Settings → Integrated apps**.
5. Select **Upload custom apps** and upload `manifest.production.xml`.
6. Assign users/groups:
   - Pilot IT group first.
   - Department rollout groups second.
   - Organization-wide assignment last.
7. Confirm add-in appears in target Excel clients.

## Smoke test checklist (sideload/deployment)

1. Install/sideload manifest for target environment.
2. Open Excel and launch the CRF.xl task pane.
3. Verify task pane and commands load from the expected host.
4. Run a basic workbook flow:
   - Initialize workbook
   - Parse/validate metadata
   - Trigger an export action
5. Confirm no console/network calls to localhost for staging/production.

## Rollback / previous-version strategy

1. Keep the last known-good production manifest in release artifacts/source control.
2. If a release fails, re-upload the previous production manifest version in Admin Center.
3. Reassign the same deployment groups to the prior manifest package.
4. Verify clients receive the prior version and smoke-test the critical path.

## Taskpane version-update notification mechanism

- On taskpane boot, CRF.xl requests a JSON payload from `/assets/version.json` (or from `globalThis.CRF_XL_VERSION_ENDPOINT` when overridden by host configuration).
- Expected payload shape:

```json
{
  "version": "0.0.2",
  "description": "Short non-blocking update message",
  "changelogUrl": "https://github.com/fderuiter/CRF.xl/releases"
}
```

- If `version` is newer than the running app version, a Fluent UI v9 `MessageBar` is shown with:
  - target version number,
  - optional description,
  - optional changelog link.
- Dismissal is persisted for the current browser session in `sessionStorage` key `crf-xl-version-update-dismissed-v1`, so the notice does not reappear until the next session.
- Endpoint failures (offline/network/non-200) are treated as non-fatal and the add-in continues without showing an error notification.

### Update cadence expectations

- Publish `assets/version.json` with each production release.
- Keep `version` aligned with release manifest/package versioning.
- Keep `description` concise (< 120 chars) and include a stable changelog URL for release auditability.
