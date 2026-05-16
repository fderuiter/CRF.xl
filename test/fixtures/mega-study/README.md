# Mega Study Performance Fixture (v1)

This fixture defines the large-scale workbook used to benchmark parser/runtime behavior for performance issue tracking.

- Workbook: `mega-study-v1.xlsx`
- Version: `v1`
- Generation script: `generate-mega-study-fixture.js`

## Exact fixture definition

| Metric | Count |
|---|---:|
| Forms | 50 |
| Variables per form | 30 |
| Total variables | 1,500 |
| Codelists | 50 |
| Codelist entries per list | 100 |
| Total codelist entries | 5,000 |
| Visit columns | 10 |
| Visit schedule rows | 200 |
| Total workbook rows | 6,805 |

## Workbook structure

- `_Study`: 1 header + 1 data row
- `_Forms`: 1 header + 50 form rows (`F001`..`F050`)
- `_Codelists`: 1 header + 5,000 rows (`CL001`..`CL050`)
- `_Schedule`: 1 header + 200 rows mapping forms to visits
- Form sheets: 50 tabs, each with 1 header + 30 variable rows

## Regenerate fixture

```bash
node test/fixtures/mega-study/generate-mega-study-fixture.js
```
