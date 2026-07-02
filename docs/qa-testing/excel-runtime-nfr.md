# Non-Functional Acceptance Criteria for Excel Runtime Interactions

This document defines the explicit, measurable non-functional acceptance criteria (NFRs) for all Office.js / Excel runtime interaction points in CRF.xl. These criteria are integrated into the [Definition of Done](../github/definition-of-ready-done.md) for issues labeled with `area:excel-integration`.

## 1. Overview

CRF.xl relies heavily on the Office.js runtime. To ensure a stable and performant experience, all runtime interactions must meet the following criteria. Degraded-mode behavior is explicitly defined to prevent improvisations during implementation.

## 2. Interaction Points

### 2.1 Annotation Painting
*   **Module**: `services/annotation-service.ts`
*   **Risk Level**: High (`risk:excel-runtime`)
*   **Performance Target**:
    *   Batch painting of 100+ items must complete in < 2 seconds.
    *   UI must remain responsive (not frozen) during operation.
*   **Failure Mode & Expected Behavior**:
    *   *Excel Host Freeze*: If operation exceeds 1s, a progress indicator must be shown.
    *   *Large Batches*: Use `Excel.CalculationMode.manual` during paint to minimize overhead.
    *   *Partial Failure*: If a specific range cannot be painted (e.g., protected), log a warning and continue with other ranges.
*   **Min Excel Version**: Excel 2016 (Requirement Set 1.1)
*   **Test Approach**:
    *   Integration tests with mock Excel ranges.
    *   Performance profiling in Authoring view with > 100 annotations.

### 2.2 Navigation to Source
*   **Module**: `App.tsx` → `template-generator.ts`
*   **Risk Level**: Medium
*   **Performance Target**: < 500ms from UI click to active range selection in Excel.
*   **Failure Mode & Expected Behavior**:
    *   *Target Missing*: If the target sheet or range has been deleted, show a toast notification: "Source range no longer exists or sheet was deleted."
    *   *Sheet Hidden*: Automatically unhide the sheet before selection if required by the workflow.
*   **Min Excel Version**: Excel 2016 (Requirement Set 1.1)
*   **Test Approach**:
    *   Manual verification of navigation links.
    *   Integration test verifying `range.select()` call.

### 2.3 Workbook Sync
*   **Module**: `parser/template-generator.ts`
*   **Risk Level**: High
*   **Performance Target**: < 1s for metadata sync of the active sheet.
*   **Failure Mode & Expected Behavior**:
    *   *Cell Edit Mode*: If `context.sync()` fails due to an open cell editor, prompt the user: "Please finish editing the cell to continue."
    *   *Transient Failures*: Implement "Retry-with-Backoff" (max 3 retries) for transient sync errors before prompting the user.
*   **Min Excel Version**: Excel 2016 (Requirement Set 1.1)
*   **Test Approach**:
    *   Manual checklist: Start editing a cell and trigger sync; verify prompt appearance.
    *   Unit tests for retry logic in `office-error-handling.ts`.

### 2.4 Large Workbook Parsing
*   **Module**: `parser/excel-parser.ts`, `parser/chunking-runtime.ts`
*   **Risk Level**: High (`risk:excel-runtime`, `mega-study`)
*   **Performance Target**:
    *   Cold parse (workbook to `StudyDesign`): <= 3000ms for Mega-study fixture (1,500 variables).
    *   Warm parse (cached): <= 1500ms.
    *   Max taskpane blocking time: <= 1000ms.
*   **Failure Mode & Expected Behavior**:
    *   *Host Timeout (5s)*: Use `chunking-runtime.ts` to split reads into batches (default 250 rows).
    *   *Memory Limit*: Max acceptable RSS memory usage <= 1024 MB.
    *   *User Cancellation*: Support cancellation tokens to stop parsing if the user switches views.
*   **Min Excel Version**: Excel 2016 (Requirement Set 1.1)
*   **Test Approach**:
    *   `npm run benchmark:mega-study` (Enforced via `ENFORCE_PERFORMANCE_BUDGET=1`).
    *   Integration tests with `chunking-runtime.ts`.

### 2.5 Sidecar Interaction
*   **Module**: `components/views/DictionarySidecar.tsx`
*   **Risk Level**: Medium
*   **Performance Target**:
    *   Sidecar opening/transition: < 300ms.
    *   Selection sync lag: < 200ms between Excel selection change and Sidecar update.
*   **Failure Mode & Expected Behavior**:
    *   *Desynchronization*: If the selection context is lost, show a "Refresh" button in the sidecar.
    *   *High-Frequency Selection*: Debounce selection change listeners (200ms) to prevent UI thrashing.
*   **Min Excel Version**: Excel 2016 (Requirement Set 1.1)
*   **Test Approach**:
    *   Playwright frontend verification for UI responsiveness.
    *   Manual verification of selection sync across different sheets.

### 2.6 Office.js API Error Recovery
*   **Module**: `services/office-error-handling.ts`
*   **Risk Level**: High
*   **Performance Target**: Error recovery UI (prompts) must appear within 200ms of a terminal failure.
*   **Failure Mode & Expected Behavior**:
    *   *Unhandled context.sync()*: Capture and normalize all Office extension errors.
    *   *Degraded Mode*: If Office.js is unavailable (e.g., standalone browser), the UI must fall back to a "Disconnected" state with mock data or read-only mode.
*   **Min Excel Version**: Excel 2016 (Requirement Set 1.1)
*   **Test Approach**:
    *   Unit tests for error normalization and classification (Transient vs. Terminal).
    *   Manual simulation of network/API failures.

## 3. Mega-Study Benchmark Reference

All performance targets for large-scale operations are anchored to the `mega-study` fixture.
See [Mega-Study Performance Budget](./performance-benchmark-mega-study.md) for detailed numeric thresholds and reproducible execution steps.

## 4. Integration with Definition of Done

These NFRs are enforced for all `area:excel-integration` issues. Refer to [Definition of Ready and Done](../github/definition-of-ready-done.md) for the mandatory checklist.
