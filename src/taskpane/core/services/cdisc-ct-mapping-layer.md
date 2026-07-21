# CDISC CT Mapping Layer (`cdisc-ct-mapping-service.ts`)

## Purpose

`src/taskpane/core/services/cdisc-ct-mapping-service.ts` is the isolated transform layer between:

- fetch layer (`cdisc-api-service.ts`) and
- import/write layer (`_Codelists` persistence and Sidecar UI flow).

It is a pure mapping module: response bundle in, typed rows/warnings/errors out.

## Canonical input contract

```ts
export interface CdiscCtMappingInput {
  package: any;
  codelists: any[];
  termsByCodelistOid: Record<string, any[]>;
  source?: string;
}
```

The contract normalizes CDISC CT package/codelist/term responses into one deterministic bundle for ingestion.

## Output contract

```ts
export interface CrfCodelistsRow {
  codelistId: string;
  codelistName: string;
  codedValue: string;
  decode: string;
  codelistOid: string;
  termOid: string;
  codelistVersion: string;
  source: string;
  sourcePackageOid: string;
  sourcePackageTitle: string;
}
```

## `_Codelists` column mapping contract

| `_Codelists` schema column | Source field(s) | Mapping |
| --- | --- | --- |
| `Codelist ID` | `codelist.submissionValue` → fallback `codelist.title` → fallback `codelistOid` | mapped to `row.codelistId` |
| `Codelist Name` | `codelist.title` → fallback `row.codelistId` | mapped to `row.codelistName` |
| `Coded Value` | `term.codedValue` → fallback `term.submissionValue` → fallback `termOid` | mapped to `row.codedValue` |
| `Decode` | `term.decode` → fallback `term.title` → fallback `row.codedValue` | mapped to `row.decode` |

### Additional mapped fields (not current `_Codelists` worksheet columns)

These are preserved on every row for ingestion/governance and to avoid losing CT provenance:

- `codelistOid`
- `termOid`
- `codelistVersion` (from package `effectiveDate` or package OID suffix)
- `source` (default `CDISC Library API`)
- `sourcePackageOid`
- `sourcePackageTitle`

### Explicitly excluded fields (with warning)

Unsupported package/codelist/term fields are not silently dropped; each field emits a typed `MappingWarning` with `code: "unsupported_field"`.

## Typed error and warning behavior

- `MappingError` (`invalid_payload`, `partial_payload`, `invalid_field`) is returned for malformed/partial bundles.
- `MappingWarning` emits for:
  - unsupported/unmapped fields,
  - ambiguous decode/title conflicts (`decode` takes precedence),
  - lifecycle conflicts that require user prompt.

## Lifecycle management rules

`applyCodelistLifecycle(existingRows, incomingRows)` enforces:

1. **Overwrite if newer**: incoming `codelistVersion` > existing version.
2. **Skip if identical**: incoming row exactly equals existing row.
3. **Prompt on conflict**: non-identical rows where version is equal, older, or ambiguous.

The function returns explicit per-row decisions and warnings so UI/write layer can prompt the user before applying conflicts.

## Test evidence

`src/taskpane/core/services/__tests__/cdisc-ct-mapping-service.test.ts` covers:

- successful mapping with representative fixture (3 codelists + edge cases),
- partial response handling,
- malformed response handling,
- lifecycle overwrite/skip/prompt conflict behavior.
