# CDISC Library API Fixtures

Mock payloads for the CDISC Library controlled terminology endpoints used by the standards fetcher service tests.

- `ct-packages.response.json` → `/mdr/ct/packages`
- `ct-package-codelists.response.json` → `/mdr/ct/packages/{packageOid}/codelists`
- `ct-codelist-terms.response.json` → `/mdr/ct/packages/{packageOid}/codelists/{codelistOid}/terms`

Fixtures intentionally mirror the OpenAPI response structures from `docs/cdisc-library-api.yaml` (`_links.packages`, `_links.codelists`, `_links.terms`) so service and mapping-layer tests exercise realistic payloads.
