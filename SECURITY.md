# Security & Dependency Lifecycle

## Dependency Stewardship Policy

- Run `npm run audit:json` on a regular cadence (at least weekly and before every release).
- Every pull request runs `npm audit --omit=dev --audit-level=high` in GitHub Actions so dependency status is visible in PR checks.
- Track major dependency upgrade proposals with regression checkpoints before merge.
- Keep `package-lock.json` committed so dependency state is reproducible and auditable.

## React 18 / Webpack 5 Migration Status

- Current baseline uses **React 18** and **Webpack 5**.
- Any future framework/bundler major updates must pass this checkpoint list:
  1. `npx tsc --noEmit`
  2. `npm test`
  3. `npm run build`
  4. Manual add-in smoke test in Excel task pane (load add-in, run analysis, verify sidecar filtering).
  5. Peer code review focused on runtime compatibility and build output changes.

## Security Audit Log

| Date (UTC) | Command | Result | Action |
| --- | --- | --- | --- |
| 2026-05-15 | `npm audit --json` | 18 high vulnerabilities | Baseline captured for dependency-lifecycle work. |
| 2026-05-15 | `npm install --save-dev copy-webpack-plugin@^14.0.0` + `npm audit --json` | 16 high vulnerabilities | Removed direct `copy-webpack-plugin`/`serialize-javascript` high vulnerability chain; validated with typecheck, tests, and production build. |
| 2026-05-15 | `npm audit --omit=dev --json` | 0 high/critical vulnerabilities | PR quality gate now enforces production dependency audit at high severity. |

## Current Risk Notes

- Remaining highs are transitive and cluster under `@opentelemetry/*`, `applicationinsights`, and `protobufjs`.
- These are pulled in via Office add-in tooling dependencies; they are currently not directly imported by application runtime code.
- Continue monitoring upstream releases and re-run `npm run audit:json` after Office toolchain upgrades.
