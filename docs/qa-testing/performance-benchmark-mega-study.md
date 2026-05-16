# Mega-Study Performance Budget and Benchmark

This document defines the committed fixture and numeric performance budget for:

- `fderuiter/CRF.xl#59` (Performance epic)
- `fderuiter/CRF.xl#60` (parse/runtime validation)
- `fderuiter/CRF.xl#61` (related performance validation)

## Committed fixture reference

- Fixture: `test/fixtures/mega-study/mega-study-v1.xlsx`
- Definition: `test/fixtures/mega-study/README.md`
- Benchmark harness: `test/serialization/mega-study.benchmark.test.ts`

## Performance budget

| Metric | Target |
|---|---:|
| Cold parse time (fixture workbook -> StudyDesign) | <= 3000 ms |
| Warm parse time (cached sheet data) | <= 1500 ms |
| Validation time (`validateStudyDesign`) | <= 500 ms |
| Matrix view search latency (1,500 variables) | <= 150 ms |
| Taskpane blocking time during parse | <= 1000 ms |
| Max acceptable memory use (parse + validation peak) | <= 1024 MB RSS |

## Benchmark output contract

Each benchmark run emits structured JSON with:

- fixture name and version
- form count, variable count, codelist entry count, row count
- cold parse time (ms)
- warm parse time (ms)
- validation time (ms)
- matrix search time (ms)
- memory usage (rss MB)
- environment info (platform, OS release, Excel version field)

## Reproducible execution

```bash
npm test -- test/serialization/mega-study.benchmark.test.ts --runInBand
```

Optional budget enforcement:

```bash
ENFORCE_PERFORMANCE_BUDGET=1 npm test -- test/serialization/mega-study.benchmark.test.ts --runInBand
```

## Parser chunking + background execution decisions (Issue #60)

- Chunk size strategy: fixed row/column chunking with default `250` rows/columns per chunk (`parseExcelToStudyDesign` option `chunkSize`).
- Worker vs async batching strategy: cooperative async batching (`setTimeout(0)` yield between chunks) in the taskpane thread; no dedicated Web Worker dependency for Office.js parsing.
- Progress callback shape: `{ phase, completed, total, message }` via parser `onProgress` callback.
- Cancellation behavior: parser accepts a cancellation token (`isCancelled()`); taskpane unmount cancels the remaining parse loop.
- Timeout handling: parser timeout defaults to `45_000ms` and throws a parse timeout error when exceeded.
- Partial parse failure behavior: individual CRF sheet parse failures are skipped by default, and warnings are attached to `study.metadata.customProperties.parseWarnings`.
- Performance benchmark target: mega-study fixture `test/fixtures/mega-study/mega-study-v1.xlsx` and budget table above.
