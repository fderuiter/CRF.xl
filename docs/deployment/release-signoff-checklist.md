# Release Signoff Checklist: CRF.xl

<!-- @issue #68 -->

**Release Tag:** `vX.Y.Z`
**Date:** YYYY-MM-DD
**Status:** 🔴 Pending Signoff

This checklist must be completed and all blocking items must provide linked evidence before any production deployment.

---

## 1. Engineering Completeness
**Owner Role:** Engineering Lead

| Item | Status | Evidence (Link/Path) | Nature |
|:---|:---:|:---|:---:|
| `npm run validate` passes for all environments | [ ] | | Blocking |
| TypeScript compilation clean (`npx tsc --noEmit`) | [ ] | | Blocking |
| All unit and integration tests pass (`npm test`) | [ ] | | Blocking |
| CI pipeline green on the release branch | [ ] | | Blocking |
| `npm audit --omit=dev --audit-level=high` is clean | [ ] | | Blocking |
| Codebase alignment verified via `npm run docs:traceability` | [ ] | | Blocking |

---

## 2. QA / Validation Completeness
**Owner Role:** QA Lead

| Item | Status | Evidence (Link/Path) | Nature |
|:---|:---:|:---|:---:|
| Quality Matrix (#152) requirements satisfied | [ ] | | Blocking |
| NFR Criteria (#153) benchmarks verified (Mega-study) | [ ] | | Blocking |
| UAT suite (`docs/qa-testing/uat-suite.md`) verified | [ ] | | Blocking |
| Office.js runtime manual checklist completed | [ ] | | Blocking |
| Performance budgets enforced per `docs/qa-testing/performance-benchmark-policy.md` | [ ] | | Blocking |

---

## 3. Security & Compliance Review
**Owner Role:** Compliance Officer

| Item | Status | Evidence (Link/Path) | Nature |
|:---|:---:|:---|:---:|
| No secrets or credentials in committed files (trufflehog/gitleaks) | [ ] | | Blocking |
| 21 CFR Part 11 mapping (`docs/compliance/21-cfr-part-11-excel-versioning.md`) still accurate | [ ] | | Blocking |
| PHI protection warnings verified | [ ] | | Blocking |
| Security posture references in `SECURITY.md` current | [ ] | | Advisory |

---

## 4. Deployment & Environment Readiness
**Owner Role:** DevOps Engineer

| Item | Status | Evidence (Link/Path) | Nature |
|:---|:---:|:---|:---:|
| Production/staging URLs verified in `manifest.production.xml` | [ ] | | Blocking |
| Version string in manifest matches release tag | [ ] | | Blocking |
| Version update endpoint (`assets/version.json`) updated and responding | [ ] | | Blocking |
| Environment-specific feature flags verified | [ ] | | Blocking |

---

## 5. Rollback Readiness
**Owner Role:** DevOps Engineer

| Item | Status | Evidence (Link/Path) | Nature |
|:---|:---:|:---|:---:|
| Prior known-good manifest archived and accessible | [ ] | | Blocking |
| Rollback procedure (`docs/deployment/manifests.md`) verified | [ ] | | Blocking |
| Database/Storage migration reversal (if applicable) tested | [ ] | | Advisory |

---

## 6. Documentation & Release Notes
**Owner Role:** Product Owner

| Item | Status | Evidence (Link/Path) | Nature |
|:---|:---:|:---|:---:|
| `CHANGELOG.md` updated with all changes for this release | [ ] | | Blocking |
| `README.md` reflects any architectural or workflow changes | [ ] | | Blocking |
| `docs/architecture/module-map.md` updated with new modules | [ ] | | Blocking |
| `docs/github/codebase-alignment.md` current | [ ] | | Blocking |

---

## 7. Reviewer / Export Validation
**Owner Role:** Clinical Lead

| Item | Status | Evidence (Link/Path) | Nature |
|:---|:---:|:---|:---:|
| aCRF rendering (`pdf-builder.ts`) verified for clinical accuracy | [ ] | | Blocking |
| Reviewer package generation verified (`reviewer-package-service.ts`) | [ ] | | Blocking |
| Clinical standards mappings (`docs/qa-testing/clinical-standards.md`) verified | [ ] | | Advisory |

---

## Signoff Summary

| Role | Name | Signature | Date |
|:---|:---|:---|:---|
| Engineering Lead | | | |
| QA Lead | | | |
| Compliance Officer | | | |
| DevOps Engineer | | | |
| Product Owner | | | |
| Clinical Lead | | | |

**Final Approval for Deployment:** __________________________ (Release Manager)
