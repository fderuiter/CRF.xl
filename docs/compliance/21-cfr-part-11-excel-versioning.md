# CRF.xl Compliance Mapping: Excel Versioning and 21 CFR Part 11

## Purpose

This guide maps Microsoft Excel versioning and history controls to key **21 CFR Part 11** expectations for audit trails in clinical research workflows using CRF.xl. It defines the formal architectural boundaries between native Microsoft 365 version control and transient local application states, aligning with GxP compliance inspections.

For CRF.xl's broader security control mapping (access control, data protection, and audit-log strategy), see `SECURITY.md`.

It is intended for:
- Clinical data managers
- QA/compliance reviewers
- Sponsor/CRO auditors and inspectors

---

## 🔒 Audit Trail & System Boundaries (Issue #75 Decision)

To maintain rigorous regulatory alignment while avoiding redundant system states, CRF.xl enforces a strict **boundary of record** policy:

1. **Canonical GxP Audit Trail (M365 Hosted):**
   * The **authoritative, GxP-compliant audit trail** is managed entirely via the hosting Microsoft 365 cloud environment (SharePoint/OneDrive).
   * M365 automatically records and timestamps every individual change, capturing the attributable user identity, date, and exact cell mutations in the workbook version history.
   * **Custom DB logging is prohibited.** Building a separate audit-trail database inside the add-in is intentionally avoided to prevent split-brain states and comply with corporate RBAC policies.

2. **Transient Recovery Snapshots (Browser Local):**
   * CRF.xl utilizes browser `localStorage` solely to maintain a **temporary recovery snapshot** to prevent data loss in the event of an accidental browser refresh or Excel taskpane crash.
   * These snapshots are strictly display-only and transient, containing only parsing statistics, visible diagnostic logs, and active UI filters.
   * **Security Safeguard:** Recovery snapshots **never** include user credentials, API keys, workbook cell values, or full parsed clinical metadata trees.
   * Recovery snapshots **auto-expire and are purged after 7 days**. They do not constitute any part of the GxP audit trail or clinical record.

---

## Control Mapping (Part 11 ↔ Excel Versioning)

| Part 11 Reference | Compliance Expectation | Excel / Microsoft 365 Capability | CRF.xl Implementation Guidance | Inspection Evidence |
| --- | --- | --- | --- | --- |
| **11.10(e)** | Secure, computer-generated, time-stamped audit trails for creation/modification of records | SharePoint/OneDrive **Version History** captures timestamp, user, and file version lineage | Store CRF.xl workbooks in controlled SharePoint/OneDrive libraries with versioning enabled | Version history panel showing author, timestamp, and version sequence |
| **11.10(c)** | Protection of records to enable accurate and ready retrieval | Native workbook version snapshots and restore support record preservation/retrieval | Retain source workbook plus generated outputs (`.xml`, `.docx`) per release | Archived workbook versions and linked export artifacts |
| **11.10(d)** | Limiting system access to authorized individuals | Microsoft 365 permissions, group-based access, and conditional access controls (Issue #68) | Restrict workbook editing rights using corporate Azure AD / Entra ID and M365 library permissions | Access policy and permissions report for the workbook/library |
| **11.10(k)** | Controls over documentation distribution, access, and revision/change | Versioned file lifecycle and immutable historical snapshots | Use formal release tags in workbook metadata and version comments | Version comments/release notes tied to protocol build milestones |
| **11.300** | Uniqueness/accountability of user identity | Authenticated Microsoft 365 user identity on edits/version entries | Enforce named accounts only (no shared IDs) in study build process | Version entries attributable to unique user accounts |

---

## Auditor Walkthrough (Clinical Use Case)

1. Open the CRF.xl source workbook from its controlled SharePoint/OneDrive location.
2. Select **File → Info → Version History** (or library-side version history).
3. Verify each key study-build milestone (e.g., draft, UAT, release candidate, approved release) has:
   - Timestamp
   - Attributable user
   - Ordered version lineage
4. Open selected historical versions and confirm that:
   - Clinical metadata changes are visible
   - Corresponding generated outputs (`CDISC ODM XML`, paper CRF `.docx`) align with that version
5. Validate access governance:
   - Edit rights limited to authorized personnel
   - Read/review access granted by role
6. Capture evidence package for inspection:
   - Version history export/screenshots
   - Change summary per milestone
   - Linked output artifacts and approval references

---

## Recommended Operating Procedure

To strengthen Part 11 readiness around CRF.xl workbook lifecycle:

1. Require cloud-hosted version-controlled storage (no uncontrolled local master files).
2. Require meaningful version comments at each milestone.
3. Define promotion checkpoints (Draft → Review → Approved) with accountable owners.
4. Retain workbook versions and generated outputs in the same governed record set.
5. Include this walkthrough in internal QA/audit playbooks.

---

## Important Compliance Notes

- Excel version history provides practical audit-trail support but should be used within a validated quality system.
- Organizations should complement this with SOPs for review/approval, training records, and change control.
- If electronic signatures are required, pair CRF.xl workbook controls with a validated e-signature process/platform.

