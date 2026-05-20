# Performance Benchmark Policy

This document defines the performance benchmarks, parsing budgets, and regression policies for CRF.xl. To ensure a responsive authoring environment in Microsoft Excel, the clinical parsing engine must operate under strict, measurable runtime budgets.

---

## ⏱️ Clinical Parsing Budgets

As clinical studies scale to hundreds of items across dozens of sheets, tabular parsing can easily block the single UI thread of the taskpane. CRF.xl enforces the following execution limits:

| Study Scale | Items Count | Target Parsing Budget | Maximum Allowed |
| --- | --- | --- | --- |
| **Small Study** | < 100 items | < 500 ms | 1,000 ms |
| **Medium Study** | 100 - 300 items | < 1,500 ms | 2,000 ms |
| **Mega Study** (Scale) | 500+ items | **< 3,000 ms (3s)** | 4,000 ms |

---

## 💾 The Mega-Study Fixture

To verify scalability, every build runs a dedicated benchmark against the **Mega-Study Fixture**:

* **Test Suite:** `test/serialization/mega-study.benchmark.test.ts`
* **Source Fixture:** `test/fixtures/mega-study/mega-study.xlsx`
* **Details Document:** `test/fixtures/mega-study/README.md`

### Benchmark Execution Mechanics
1. **Mock Environment:** The benchmark simulates sheet extraction by bypassing the physical Office.js network boundaries and feeding raw data into the `chunking-runtime.ts` parser.
2. **Performance Measurement:** Execution times are calculated using the Node.js `performance.now()` API to ensure high-resolution measurements.
3. **Budget Verification:** Jest validates that the runtime does not exceed the maximum allowed threshold, raising compilation warnings if execution time rises above 3 seconds.

---

## 🚫 Regression Prevention Rules

If a parser or validation rule modification results in a performance regression (exceeding budgets):

1. **No Merging Regressions:** Pull requests that push the Mega-Study parse time above 4 seconds will fail the CI performance gate and are blocked from merging.
2. **Profiling Expectation:** Developers must profile their modifications to identify bottlenecks (e.g., redundant loops, unoptimized regex compilation, or synchronous file reads).
3. **Use of Chunking Runtime:** Large metadata imports must utilize `chunking-runtime.ts` to slice large-sheet parse loops into asynchronous micro-tasks, keeping the event loop unblocked.
