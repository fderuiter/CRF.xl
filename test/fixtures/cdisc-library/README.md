# CDISC Library API Fixtures

Mock payloads for the CDISC Library controlled terminology endpoints used by the standards fetcher service tests.

- `ct-packages.response.json` → `/mdr/ct/packages`
- `ct-package-codelists.response.json` → `/mdr/ct/packages/{packageOid}/codelists`
- `ct-codelist-terms.response.json` → `/mdr/ct/packages/{packageOid}/codelists/{codelistOid}/terms`
- `ct-mapping-bundle.response.json` → canonical mapping-layer input bundle (`package`, `codelists`, `termsByCodelistOid`)

Fixtures intentionally mirror the OpenAPI response structures from `docs/specification/cdisc-library-api.yaml` (`_links.packages`, `_links.codelists`, `_links.terms`) so service and mapping-layer tests exercise realistic payloads.

`ct-mapping-bundle.response.json` includes 3 codelists and edge cases (unsupported fields, decode/title ambiguity, submissionValue fallback) for mapping and lifecycle tests.
