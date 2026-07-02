# Milestone Governance

This repository uses a small, stable milestone set tied to execution queues rather than historical phases.

## Active milestones

Use these milestones for active work:

1. `M1 — Core Metadata Foundations`
2. `M2 — Standards Import & Reverse Ingestion`
3. `M3 — Metadata Diff & Comparison`
4. `M4 — Authoring UX & Internationalization`
5. `M5 — Reviewer Export & aCRF`
6. `M6 — Enterprise Hardening & Deployment` ([Release Signoff Checklist](../deployment/release-signoff-checklist.md))
7. `M7 — Audit & Governance`

## Assignment rules

Assign issues by the scope that will be reviewed and burned down together:

| Milestone | Typical scope |
| --- | --- |
| `M1` | schema, validation, rule plumbing, metadata serialization |
| `M2` | standards import, reverse parsing, migration flows |
| `M3` | diff engine, baseline ingestion, diff visualization |
| `M4` | authoring-side UX and internationalization |
| `M5` | reviewer workflow and export rendering |
| `M6` | manifests, deployment, enterprise release hardening |
| `M7` | provenance, backlog governance, architecture/process controls |

## Retired milestone policy

The following milestone classes are considered retired for new work:

- phase milestones such as `Phase 2A`, `Phase 3A`, `Phase 3B`, `Phase 3C`
- temporary queue names such as `Build Queue 1` through `Build Queue 5`
- one-off planning milestones that no longer reflect the current operating model

Retired milestones may remain attached to closed historical work, but open issues should be migrated off them.

## Lifecycle rules

1. Create a milestone only when it represents a durable execution bucket.
2. Close a milestone after all remaining open issues are moved or closed.
3. Do not use milestones as vague timelines.
4. Do not keep both an old and a replacement milestone active for the same workstream.

## Review cadence

Review milestones during the weekly backlog review:

- move delayed work deliberately
- close empty retired milestones
- verify `status:ready` issues sit in the correct active milestone
- keep roadmap issues separate from execution milestones
