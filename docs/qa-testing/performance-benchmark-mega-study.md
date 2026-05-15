# Mega-Study Performance Budget and Benchmark

This document defines the committed fixture and provisional numeric budget for performance work tracked by:

- `fderuiter/CRF.xl#59` (Performance epic)
- `fderuiter/CRF.xl#60` (parse/runtime validation)
- `fderuiter/CRF.xl#61` (related performance validation)
- `fderuiter/CRF.xl#105` (budget finalization)

## Committed fixture reference

- Fixture: `test/fixtures/mega-study/mega-study-v1.xlsx`
- Definition: `test/fixtures/mega-study/README.md`
- Benchmark harness: `test/serialization/mega-study.benchmark.test.ts`

## Performance budget (provisional, numeric)

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
