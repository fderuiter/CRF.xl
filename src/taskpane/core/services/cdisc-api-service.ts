/**
 * @issue #44, #45
 */
/* eslint-disable no-undef */
export interface CdiscCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CdiscApiServiceConfig {
  baseUrl?: string;
  tokenUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  tokenSafetyWindowMs?: number;
  credentials?: CdiscCredentials;
}

export interface CdiscHttpClient {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export interface CdiscLogger {
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface CdiscCtPackage {
  packageOid: string;
  href?: string;
  title?: string;
  effectiveDate?: string;
  [key: string]: unknown;
}

export interface CdiscCtCodelist {
  codelistOid: string;
  href?: string;
  submissionValue?: string;
  [key: string]: unknown;
}

export interface CdiscCtTerm {
  termOid: string;
  codedValue?: string;
  decode?: string;
  [key: string]: unknown;
}

export interface CdiscApiSuccess<T> {
  ok: true;
  endpoint: string;
  status: number;
  data: T;
}

export interface CdiscApiFailure {
  ok: false;
  error: CdiscApiError;
}

export type CdiscApiResult<T> = CdiscApiSuccess<T> | CdiscApiFailure;

export interface CdiscApiErrorBase {
  type: "configuration" | "auth" | "http" | "network" | "invalid_response" | "rate_limit";
  message: string;
  endpoint?: string;
  status?: number;
  retriable: boolean;
}

export interface CdiscApiConfigurationError extends CdiscApiErrorBase {
  type: "configuration";
}

export interface CdiscApiAuthError extends CdiscApiErrorBase {
  type: "auth";
  code: "missing_credentials" | "token_request_failed" | "unauthorized";
}

export interface CdiscApiHttpError extends CdiscApiErrorBase {
  type: "http";
}

export interface CdiscApiNetworkError extends CdiscApiErrorBase {
  type: "network";
  code: "timeout" | "request_failed";
}

export interface CdiscApiInvalidResponseError extends CdiscApiErrorBase {
  type: "invalid_response";
}

export interface CdiscApiRateLimitError extends CdiscApiErrorBase {
  type: "rate_limit";
  retryAfterMs: number | null;
}

export type CdiscApiError =
  | CdiscApiConfigurationError
  | CdiscApiAuthError
  | CdiscApiHttpError
  | CdiscApiNetworkError
  | CdiscApiInvalidResponseError
  | CdiscApiRateLimitError;

export interface CdiscApiService {
  listCtPackages(): Promise<CdiscApiResult<CdiscCtPackage[]>>;
  listPackageCodelists(packageOid: string): Promise<CdiscApiResult<CdiscCtCodelist[]>>;
  listCodelistTerms(
    codelistOid: string,
    packageOid?: string
  ): Promise<CdiscApiResult<CdiscCtTerm[]>>;
}

function asFailure<T>(result: CdiscApiResult<T>): CdiscApiFailure {
  return result as CdiscApiFailure;
}

interface TokenState {
  accessToken: string;
  expiresAtMs: number;
}

const DEFAULT_BASE_URL = "https://api.cdisc.org";
const DEFAULT_TOKEN_URL = "https://api.cdisc.org/oauth/token";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_TOKEN_SAFETY_WINDOW_MS = 30000;

const noOpLogger: CdiscLogger = {
  warn: () => undefined,
  error: () => undefined,
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizeLogContext(
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const sanitized: Record<string, unknown> = {};
  Object.entries(context).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    if (
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("authorization") ||
      lower.includes("password")
    ) {
      sanitized[key] = "[redacted]";
      return;
    }
    sanitized[key] = value;
  });
  return sanitized;
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) return null;

  const asSeconds = Number.parseInt(retryAfterHeader, 10);
  if (!Number.isNaN(asSeconds)) {
    return Math.max(0, asSeconds * 1000);
  }

  const retryDate = Date.parse(retryAfterHeader);
  if (Number.isNaN(retryDate)) return null;

  return Math.max(0, retryDate - Date.now());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecordArray(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const records = value.filter(isRecord);
  return records.length === value.length ? records : null;
}

function normalizeArrayPayload(
  value: unknown,
  listKeys: string[] = []
): Record<string, unknown>[] | null {
  const directArray = asRecordArray(value);
  if (directArray) {
    return directArray;
  }

  if (!isRecord(value)) {
    return null;
  }

  const dataArray = asRecordArray(value.data);
  if (dataArray) {
    return dataArray;
  }

  for (const key of listKeys) {
    const directList = asRecordArray(value[key]);
    if (directList) {
      return directList;
    }
  }

  const links = isRecord(value._links) ? value._links : null;
  if (!links) {
    return null;
  }

  for (const key of listKeys) {
    const linkedList = asRecordArray(links[key]);
    if (linkedList) {
      return linkedList;
    }
  }

  return null;
}

function extractOidFromHref(href: unknown): string {
  if (typeof href !== "string") {
    return "";
  }

  const segments = href.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return "";
  }

  return decodeURIComponent(segments[segments.length - 1]);
}

function normalizeOid(value: unknown, fallbackHref: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return extractOidFromHref(fallbackHref);
}

function normalizeArrayValue(primary: unknown, fallback: unknown): string | undefined {
  if (typeof primary === "string") {
    return primary;
  }
  return typeof fallback === "string" ? fallback : undefined;
}

function toPackage(value: Record<string, unknown>): CdiscCtPackage {
  const packageOid = normalizeOid(value.packageOid ?? value.oid ?? value.name, value.href);

  return {
    ...value,
    packageOid,
    title: normalizeArrayValue(value.title, value.label),
  };
}

function toCodelist(value: Record<string, unknown>): CdiscCtCodelist {
  const codelistOid = normalizeOid(value.codelistOid ?? value.oid ?? value.conceptId, value.href);

  return {
    ...value,
    codelistOid,
    submissionValue: normalizeArrayValue(value.submissionValue, value.title),
  };
}

function toTerm(value: Record<string, unknown>): CdiscCtTerm {
  const termOid = normalizeOid(value.termOid ?? value.oid ?? value.conceptId, value.href);

  return {
    ...value,
    termOid,
    codedValue: normalizeArrayValue(value.codedValue, value.submissionValue),
    decode: normalizeArrayValue(value.decode, value.title),
  };
}

function readEnv(name: string): string | undefined {
  const processRef = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return processRef?.env?.[name];
}

function resolveCredentials(explicit?: CdiscCredentials): CdiscCredentials | null {
  if (explicit?.clientId && explicit.clientSecret) {
    return explicit;
  }

  const clientId = readEnv("CDISC_LIBRARY_CLIENT_ID");
  const clientSecret = readEnv("CDISC_LIBRARY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export function createCdiscApiService(
  config: CdiscApiServiceConfig = {},
  httpClient: CdiscHttpClient = { fetch: (input, init) => fetch(input, init) },
  logger: CdiscLogger = noOpLogger
): CdiscApiService {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const tokenUrl = config.tokenUrl ?? DEFAULT_TOKEN_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryBaseDelayMs = config.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
  const tokenSafetyWindowMs = config.tokenSafetyWindowMs ?? DEFAULT_TOKEN_SAFETY_WINDOW_MS;
  const credentials = resolveCredentials(config.credentials);

  let tokenState: TokenState | null = null;

  const safeWarn = (message: string, context?: Record<string, unknown>) => {
    logger.warn(message, sanitizeLogContext(context));
  };

  const safeError = (message: string, context?: Record<string, unknown>) => {
    logger.error(message, sanitizeLogContext(context));
  };

  async function requestToken(): Promise<CdiscApiResult<TokenState>> {
    if (!credentials) {
      const error: CdiscApiAuthError = {
        type: "auth",
        code: "missing_credentials",
        message:
          "CDISC Library API credentials are missing. Configure CDISC_LIBRARY_CLIENT_ID and CDISC_LIBRARY_CLIENT_SECRET.",
        endpoint: tokenUrl,
        retriable: false,
      };
      return { ok: false, error };
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }).toString();

    let response: Response;
    try {
      response = await httpClient.fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch (error) {
      safeError("CDISC token request failed", {
        endpoint: tokenUrl,
        errorType: error instanceof Error ? error.name : typeof error,
      });
      return {
        ok: false,
        error: {
          type: "network",
          code: "request_failed",
          endpoint: tokenUrl,
          message: "Failed to reach the CDISC token endpoint.",
          retriable: true,
        },
      };
    }

    if (!response.ok) {
      safeWarn("CDISC token request returned non-success", {
        endpoint: tokenUrl,
        status: response.status,
      });
      return {
        ok: false,
        error: {
          type: "auth",
          code: "token_request_failed",
          endpoint: tokenUrl,
          status: response.status,
          message: "Could not authenticate with CDISC Library API using configured credentials.",
          retriable: response.status >= 500,
        },
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        error: {
          type: "invalid_response",
          endpoint: tokenUrl,
          status: response.status,
          message: "CDISC token endpoint returned non-JSON content.",
          retriable: false,
        },
      };
    }

    if (!isRecord(payload) || typeof payload.access_token !== "string") {
      return {
        ok: false,
        error: {
          type: "invalid_response",
          endpoint: tokenUrl,
          status: response.status,
          message: "CDISC token endpoint returned an invalid token payload.",
          retriable: false,
        },
      };
    }

    const expiresInSeconds = typeof payload.expires_in === "number" ? payload.expires_in : 3600;

    return {
      ok: true,
      endpoint: tokenUrl,
      status: response.status,
      data: {
        accessToken: payload.access_token,
        expiresAtMs: Date.now() + Math.max(0, expiresInSeconds) * 1000,
      },
    };
  }

  async function ensureToken(forceRefresh = false): Promise<CdiscApiResult<string>> {
    if (!forceRefresh && tokenState && tokenState.expiresAtMs - tokenSafetyWindowMs > Date.now()) {
      return { ok: true, endpoint: tokenUrl, status: 200, data: tokenState.accessToken };
    }

    const tokenResult = await requestToken();
    if (!tokenResult.ok) {
      return { ok: false, error: asFailure(tokenResult).error };
    }

    tokenState = tokenResult.data;
    return {
      ok: true,
      endpoint: tokenUrl,
      status: tokenResult.status,
      data: tokenResult.data.accessToken,
    };
  }

  async function requestJsonArray(
    endpoint: string,
    listKeys: string[] = []
  ): Promise<CdiscApiResult<Record<string, unknown>[]>> {
    const tokenResult = await ensureToken();
    if (!tokenResult.ok) {
      return { ok: false, error: asFailure(tokenResult).error };
    }

    let lastError: CdiscApiError | null = null;
    const requestUrl = `${baseUrl}${endpoint}`;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      let controller: AbortController | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller?.abort();
        }, timeoutMs);

        const response = await httpClient.fetch(requestUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenResult.data}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (response.status === 401 && attempt === 0) {
          const refreshedTokenResult = await ensureToken(true);
          if (!refreshedTokenResult.ok) {
            return { ok: false, error: asFailure(refreshedTokenResult).error };
          }
          tokenResult.data = refreshedTokenResult.data;
          continue;
        }

        if (response.status === 429) {
          const retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
          lastError = {
            type: "rate_limit",
            endpoint,
            status: 429,
            retryAfterMs,
            retriable: attempt < maxRetries,
            message:
              retryAfterMs !== null
                ? `CDISC Library API rate limit reached. Retry after ${retryAfterMs}ms.`
                : "CDISC Library API rate limit reached.",
          };

          safeWarn("CDISC API rate-limit response", {
            endpoint,
            attempt,
            status: 429,
            retryAfterMs,
          });

          if (attempt < maxRetries) {
            await wait(retryAfterMs ?? retryBaseDelayMs * 2 ** attempt);
            continue;
          }
          return { ok: false, error: lastError };
        }

        if (!response.ok) {
          lastError = {
            type: response.status === 401 || response.status === 403 ? "auth" : "http",
            ...(response.status === 401 || response.status === 403
              ? { code: "unauthorized" as const }
              : {}),
            endpoint,
            status: response.status,
            retriable: response.status >= 500 && attempt < maxRetries,
            message:
              response.status === 401 || response.status === 403
                ? "CDISC API rejected authorization for this request."
                : `CDISC API request failed with status ${response.status}.`,
          } as CdiscApiError;

          safeWarn("CDISC API non-success response", {
            endpoint,
            attempt,
            status: response.status,
          });

          if (response.status >= 500 && attempt < maxRetries) {
            await wait(retryBaseDelayMs * 2 ** attempt);
            continue;
          }

          return { ok: false, error: lastError };
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          return {
            ok: false,
            error: {
              type: "invalid_response",
              endpoint,
              status: response.status,
              retriable: false,
              message: "CDISC API returned non-JSON content.",
            },
          };
        }

        const normalized = normalizeArrayPayload(payload, listKeys);
        if (!normalized) {
          return {
            ok: false,
            error: {
              type: "invalid_response",
              endpoint,
              status: response.status,
              retriable: false,
              message: "CDISC API JSON payload did not match expected array shape.",
            },
          };
        }

        return {
          ok: true,
          endpoint,
          status: response.status,
          data: normalized,
        };
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        lastError = {
          type: "network",
          code: aborted ? "timeout" : "request_failed",
          endpoint,
          retriable: attempt < maxRetries,
          message: aborted
            ? `CDISC API request timed out after ${timeoutMs}ms.`
            : "Network error while calling CDISC API.",
        };

        safeError("CDISC API request failed", {
          endpoint,
          attempt,
          code: lastError.code,
          errorType: error instanceof Error ? error.name : typeof error,
        });

        if (attempt < maxRetries) {
          await wait(retryBaseDelayMs * 2 ** attempt);
          continue;
        }

        return { ok: false, error: lastError };
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    return {
      ok: false,
      error: lastError ?? {
        type: "http",
        endpoint,
        retriable: false,
        message: "CDISC API request failed.",
      },
    };
  }

  async function listCtPackages(): Promise<CdiscApiResult<CdiscCtPackage[]>> {
    const result = await requestJsonArray("/mdr/ct/packages", ["packages"]);
    if (!result.ok) return { ok: false, error: asFailure(result).error };

    return {
      ok: true,
      endpoint: result.endpoint,
      status: result.status,
      data: result.data.map(toPackage),
    };
  }

  async function listPackageCodelists(
    packageOid: string
  ): Promise<CdiscApiResult<CdiscCtCodelist[]>> {
    if (!packageOid.trim()) {
      return {
        ok: false,
        error: {
          type: "configuration",
          message: "packageOid is required to fetch package codelists.",
          endpoint: "/mdr/ct/packages/{packageOid}/codelists",
          retriable: false,
        },
      };
    }

    const result = await requestJsonArray(
      `/mdr/ct/packages/${encodeURIComponent(packageOid)}/codelists`,
      ["codelists"]
    );
    if (!result.ok) return { ok: false, error: asFailure(result).error };

    return {
      ok: true,
      endpoint: result.endpoint,
      status: result.status,
      data: result.data.map(toCodelist),
    };
  }

  async function listCodelistTerms(
    codelistOid: string,
    packageOid?: string
  ): Promise<CdiscApiResult<CdiscCtTerm[]>> {
    if (!codelistOid.trim()) {
      return {
        ok: false,
        error: {
          type: "configuration",
          message: "codelistOid is required to fetch codelist terms.",
          endpoint: "/mdr/ct/codelists/{codelistOid}/terms",
          retriable: false,
        },
      };
    }

    if (packageOid !== undefined && !packageOid.trim()) {
      return {
        ok: false,
        error: {
          type: "configuration",
          message: "packageOid cannot be empty when provided for codelist terms.",
          endpoint: "/mdr/ct/packages/{packageOid}/codelists/{codelistOid}/terms",
          retriable: false,
        },
      };
    }

    const endpoint = packageOid?.trim()
      ? `/mdr/ct/packages/${encodeURIComponent(packageOid)}/codelists/${encodeURIComponent(codelistOid)}/terms`
      : `/mdr/ct/codelists/${encodeURIComponent(codelistOid)}/terms`;

    const result = await requestJsonArray(endpoint, ["terms"]);
    if (!result.ok) return { ok: false, error: asFailure(result).error };

    return {
      ok: true,
      endpoint: result.endpoint,
      status: result.status,
      data: result.data.map(toTerm),
    };
  }

  return {
    listCtPackages,
    listPackageCodelists,
    listCodelistTerms,
  };
}
