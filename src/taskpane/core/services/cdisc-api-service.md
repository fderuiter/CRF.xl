# CDISC Library API Service (`cdisc-api-service.ts`)

## Purpose

`src/taskpane/core/services/cdisc-api-service.ts` provides a typed, testable client for fetching CDISC controlled terminology artifacts from `api.cdisc.org`.

## Supported endpoints

The service currently calls these CDISC Library API endpoints:

1. `GET /mdr/ct/packages`
2. `GET /mdr/ct/packages/{packageOid}/codelists`
3. `GET /mdr/ct/packages/{packageOid}/codelists/{codelistOid}/terms` (OpenAPI path)
4. `GET /mdr/ct/codelists/{codelistOid}/terms` (legacy fallback path for compatibility)

## Authentication

OAuth2 client-credentials flow is used via `POST /oauth/token`.

Credentials are resolved in this order:

1. `createCdiscApiService({ credentials: { clientId, clientSecret } })`
2. Environment variables:
   - `CDISC_LIBRARY_CLIENT_ID`
   - `CDISC_LIBRARY_CLIENT_SECRET`

If credentials are missing, callers receive a typed `auth` error with actionable configuration guidance.

## Typed service contract

### Service interface

- `listCtPackages(): Promise<CdiscApiResult<CdiscCtPackage[]>>`
- `listPackageCodelists(packageOid: string): Promise<CdiscApiResult<CdiscCtCodelist[]>>`
- `listCodelistTerms(codelistOid: string, packageOid?: string): Promise<CdiscApiResult<CdiscCtTerm[]>>`

### Success shape

```ts
export interface CdiscApiSuccess<T> {
  ok: true;
  endpoint: string;
  status: number;
  data: T;
}
```

### Error shape

```ts
export type CdiscApiError =
  | { type: "configuration"; message: string; retriable: false }
  | {
      type: "auth";
      code: "missing_credentials" | "token_request_failed" | "unauthorized";
      message: string;
      status?: number;
      retriable: boolean;
    }
  | { type: "http"; message: string; status?: number; retriable: boolean }
  | { type: "network"; code: "timeout" | "request_failed"; message: string; retriable: boolean }
  | { type: "invalid_response"; message: string; status?: number; retriable: false }
  | {
      type: "rate_limit";
      message: string;
      status: 429;
      retryAfterMs: number | null;
      retriable: boolean;
    };
```

## Timeout and retry behavior

Default behavior (override via service config):

- Timeout per request: `15000ms`
- Retry count for retriable failures: `2`
- Base backoff delay: `500ms` with exponential backoff (`500ms`, `1000ms`, ...)
- Token safety window: `30000ms` before expiry

Automatic retry applies to:

- network/timeout failures
- HTTP 5xx responses
- HTTP 429 responses (using `Retry-After` when provided)

## Rate-limit handling

For HTTP `429` responses:

- `Retry-After` is parsed (seconds or HTTP-date)
- `retryAfterMs` is included in the typed `rate_limit` error
- if retries remain, wait duration honors `Retry-After`
- callers still receive rate-limit state when retries are exhausted

## Logging and secret handling

- No credentials or access tokens are logged.
- Log context sanitizes keys containing `token`, `secret`, `authorization`, or `password`.
- Sensitive request/response payload details are not emitted in logs.

## Test fixtures and unit coverage

Committed fixtures:

- `test/fixtures/cdisc-library/ct-packages.response.json`
- `test/fixtures/cdisc-library/ct-package-codelists.response.json`
- `test/fixtures/cdisc-library/ct-codelist-terms.response.json`
- `test/fixtures/cdisc-library/ct-mapping-bundle.response.json` (consumed by mapping-layer tests)

Fixture payloads track OpenAPI shapes from `docs/cdisc-library-api.yaml`, including `_links.packages`, `_links.codelists`, and `_links.terms`.

Unit tests in `src/taskpane/core/services/__tests__/cdisc-api-service.test.ts` cover:

- success
- missing credentials/authentication failure
- expired/invalid token refresh on 401
- network failure
- malformed response
- rate-limit (`Retry-After`) handling
- logger redaction behavior

## Manual integration strategy (for environments where real CDISC calls are not run in CI)

1. Provide real credentials via environment variables.
2. Run targeted tests with mock coverage in CI.
3. Run a manual smoke script or dev harness against live endpoints in a secure environment:
   - verify token retrieval
   - verify endpoint responses for known package/codelist/term OIDs
   - force a rate-limit scenario (or simulate with a proxy) and verify surfaced `retryAfterMs`
4. Record request IDs/status outcomes in QA notes without storing secrets.

## Example usage

```ts
import { createCdiscApiService } from "../services/cdisc-api-service";

export async function main() {
  const service = createCdiscApiService();

  const packages = await service.listCtPackages();
  if (!packages.ok) {
    // present actionable error details to caller/UI
    console.error(packages.error.type, packages.error.message);
  }
}
```

## Related mapping layer

The dedicated response-to-row transform contract is documented in:

- `docs/specification/cdisc-ct-mapping-layer.md`

That layer consumes fetch outputs and returns typed `_Codelists` rows, warnings, and lifecycle decisions.
