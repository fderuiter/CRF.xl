# Office.js Runtime Risk Register

This document provides an explicit technical risk register for the Office.js runtime dependency, documenting known failure modes, mitigation strategies, and affected issues.

## Risk Register

| Risk Area | Description | Likelihood | Impact | Current Mitigation Status | Recommended Mitigation | Owning Issue |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Taskpane lifecycle (init/unload)** | Add-in state lost or corrupted during host-initiated reload or taskpane closure/re-opening. | Medium | High | `Office.onReady` guard; `recovery-storage.ts` for session snapshots. | Implement robust "Heartbeat" persistence for high-frequency state. | #68 |
| **Excel sync / workbook locking** | `context.sync()` failures due to Excel being in cell-edit mode or concurrent workbook operations. | High | Medium | Partial error handling in `office-error-handling.ts`; user-facing retry prompts. | Implement "Retry-with-Backoff" for transient sync failures; global "Busy" state UI. | #68 |
| **API version compatibility** | Missing JS API sets in older Excel versions (2016/2019) causing runtime crashes. | Low | High | Manifest requirements (Requirement Sets); basic feature detection. | Automated API surface compatibility testing across multiple host versions. | #68 |
| **Annotation/painting performance** | Significant UI lag or host freezing when painting 100+ cell highlights/comments on large sheets. | High | Medium | None documented; `risk:excel-runtime` tag applied to `annotation-service.ts`. | Implement virtualized/batched painting; use `Excel.CalculationMode.manual` during paint. | #84 |
| **Large workbook parsing** | Office.js memory limits or timeout (5s) exceeded when parsing workbooks with >500 rows. | Medium | High | `chunking-runtime.ts` implemented for batched range reading. | Formalize chunking strategy as a reusable decorator for all bulk read operations. | #68, #53 |
| **Sidecar DOM interaction with Excel state** | Desynchronization between `DictionarySidecar` UI and active Excel selection context. | Medium | Medium | None documented; manual refresh available in some views. | Implement `BindingService` with debounced `onSelectionChanged` event listeners. | #46, #93 |

## Risk Mitigation Summary

### `risk:excel-runtime`
Issues labeled with `risk:excel-runtime` involve Office.js behavior that has known runtime risk. These issues must be reviewed against this register during design and implementation.

### Q2 Non-Functional Criteria Integration
The recommended mitigations in this register are integrated into the Q2 non-functional criteria to ensure platform stability and performance targets are met for enterprise deployment.
