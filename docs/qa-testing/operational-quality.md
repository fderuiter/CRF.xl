# CRF.xl: Operational Quality & Reliability Specification

## 1. Performance Benchmarks

Small Study (50 Items): Analysis must complete in < 2 seconds.

Medium Study (500 Items): Analysis must complete in < 5 seconds.

Large Study (2000+ Items): Analysis must complete in < 15 seconds without freezing the Excel host.

Export Latency: Document generation for a 20-page CRF must complete in < 10 seconds.

## 2. Error Handling & Resilience

Network Resilience: Verify that the Add-in functions correctly in "Airplane Mode" (Offline) once loaded.

File Permissions: Test behavior when the user attempts to generate a document but has no permission to save to the local temp directory.

Data Corruption: Verify the system handles rows with junk data or infinite recursion in derivation dependencies gracefully.

### Office.js runtime manual checklist

- [ ] Excel busy / cell edit mode: start editing a cell and run a CRF.xl action; confirm plain-language prompt appears with retry and dismiss.
- [ ] Workbook not ready: open taskpane immediately on workbook open; confirm "Waiting for workbook to load..." guidance and retry path.
- [ ] Sheet/range missing: remove a required sheet/range and run analysis; confirm missing-structure prompt.
- [ ] Permission/protection failure: protect a required sheet and run sync/analysis; confirm protection guidance prompt.
- [ ] `context.sync()` failure: simulate transient Office sync failure; confirm one silent retry before a user prompt with retry/dismiss.
- [ ] Unsupported host/platform: open in unsupported Excel host/version; confirm supported-version guidance.
- [ ] Network/API failure: disable network and run a network-dependent flow; confirm connectivity guidance prompt.

---

## 3. Q2 Non-Functional Criteria

These criteria govern the platform stability and performance targets for the Q2 release cycle, specifically addressing host environment risks.

| Criteria | Target | Verification Method |
| :--- | :--- | :--- |
| **Runtime Resilience** | Zero unhandled `context.sync()` crashes. | Manual checklist + Office error normalization. |
| **Parsing Scale** | 2000+ items parsed without host timeout. | `mega-study` benchmark. |
| **Visual Feedback** | Annotation painting completes in < 2s for 100 items. | Performance profiling in Authoring view. |
| **State Integrity** | 100% session recovery after unexpected taskpane closure. | `recovery-storage` unit tests. |

For a detailed breakdown of host-related risks and mitigations, see the [Office.js Runtime Risk Register](../architecture/office-runtime-risk-register.md).
For detailed interaction-specific non-functional criteria, see the [Excel Runtime NFR Specification](./excel-runtime-nfr.md).

## 4. Security & Privacy

PHI Protection: Verify that items marked isPHI: true trigger a warning if they are about to be exported to a non-blinded file format.

Sandbox Isolation: Ensure the Add-in does not attempt to access any files outside of the workbook it was launched from.
