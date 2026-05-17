import { readFileSync } from "fs";
import { join } from "path";
import {
  CdiscApiFailure,
  CdiscApiResult,
  CdiscLogger,
  createCdiscApiService,
} from "../cdisc-api-service";

function loadFixture(name: string): unknown {
  const path = join(process.cwd(), "test", "fixtures", "cdisc-library", name);
  return JSON.parse(readFileSync(path, "utf8"));
}

type MockFetch = jest.Mock<Promise<Response>, [string, RequestInit | undefined]>;

function createMockClient(fetchMock: MockFetch) {
  return {
    fetch: fetchMock,
  };
}

function expectFailure<T>(result: CdiscApiResult<T>): CdiscApiFailure {
  if (result.ok) {
    throw new Error("expected failure result");
  }
  return result as CdiscApiFailure;
}

describe("cdisc-api-service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns packages for a successful call", async () => {
    const tokenResponse = new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const packagesResponse = new Response(JSON.stringify(loadFixture("ct-packages.response.json")), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock: MockFetch = jest.fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(packagesResponse);

    const service = createCdiscApiService(
      {
        baseUrl: "https://api.cdisc.org",
        tokenUrl: "https://api.cdisc.org/oauth/token",
        credentials: { clientId: "client", clientSecret: "secret" },
      },
      createMockClient(fetchMock),
    );

    const result = await service.listCtPackages();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success result");
    }
    expect(result.endpoint).toBe("/mdr/ct/packages");
    expect(result.data[0].packageOid).toBe("NCI_CDISC_Terminology_2026-03-27");
  });

  it("returns actionable error when credentials are missing", async () => {
    const service = createCdiscApiService(
      {
        baseUrl: "https://api.cdisc.org",
        tokenUrl: "https://api.cdisc.org/oauth/token",
      },
      createMockClient(jest.fn()),
    );

    const result = await service.listCtPackages();
    const failure = expectFailure(result);
    expect(failure.error.type).toBe("auth");
    expect(failure.error.message).toContain("CDISC_LIBRARY_CLIENT_ID");
  });

  it("refreshes token and retries once when API returns 401", async () => {
    const token1 = new Response(JSON.stringify({ access_token: "old-token", expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const unauthorized = new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
    const token2 = new Response(JSON.stringify({ access_token: "new-token", expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const codelists = new Response(JSON.stringify(loadFixture("ct-package-codelists.response.json")), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock: MockFetch = jest.fn()
      .mockResolvedValueOnce(token1)
      .mockResolvedValueOnce(unauthorized)
      .mockResolvedValueOnce(token2)
      .mockResolvedValueOnce(codelists);

    const service = createCdiscApiService(
      {
        baseUrl: "https://api.cdisc.org",
        tokenUrl: "https://api.cdisc.org/oauth/token",
        credentials: { clientId: "client", clientSecret: "secret" },
      },
      createMockClient(fetchMock),
    );

    const result = await service.listPackageCodelists("NCI_CDISC_Terminology_2026-03-27");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success result");
    }
    expect(result.data[0].codelistOid).toBe("C66741");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const fourthCall = fetchMock.mock.calls[3];
    expect(fourthCall[1]?.headers).toMatchObject({ Authorization: "Bearer new-token" });
  });

  it("returns typed network error on request failure", async () => {
    const token = new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock: MockFetch = jest.fn()
      .mockResolvedValueOnce(token)
      .mockRejectedValueOnce(new Error("ECONNRESET"));

    const service = createCdiscApiService(
      {
        baseUrl: "https://api.cdisc.org",
        tokenUrl: "https://api.cdisc.org/oauth/token",
        maxRetries: 0,
        credentials: { clientId: "client", clientSecret: "secret" },
      },
      createMockClient(fetchMock),
    );

    const result = await service.listCtPackages();
    const failure = expectFailure(result);
    expect(failure.error.type).toBe("network");
    expect(failure.error.retriable).toBe(false);
  });

  it("returns invalid_response error when API payload shape is malformed", async () => {
    const token = new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const malformed = new Response(JSON.stringify({ result: "not-an-array" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock: MockFetch = jest.fn()
      .mockResolvedValueOnce(token)
      .mockResolvedValueOnce(malformed);

    const service = createCdiscApiService(
      {
        baseUrl: "https://api.cdisc.org",
        tokenUrl: "https://api.cdisc.org/oauth/token",
        credentials: { clientId: "client", clientSecret: "secret" },
      },
      createMockClient(fetchMock),
    );

    const result = await service.listCtPackages();
    const failure = expectFailure(result);
    expect(failure.error.type).toBe("invalid_response");
  });

  it("returns rate_limit error and surfaces Retry-After in milliseconds", async () => {
    const token = new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const rateLimited = new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "3" },
    });

    const fetchMock: MockFetch = jest.fn()
      .mockResolvedValueOnce(token)
      .mockResolvedValueOnce(rateLimited);

    const service = createCdiscApiService(
      {
        baseUrl: "https://api.cdisc.org",
        tokenUrl: "https://api.cdisc.org/oauth/token",
        maxRetries: 0,
        credentials: { clientId: "client", clientSecret: "secret" },
      },
      createMockClient(fetchMock),
    );

    const result = await service.listCtPackages();
    const failure = expectFailure(result);
    expect(failure.error.type).toBe("rate_limit");
    if (failure.error.type === "rate_limit") {
      expect(failure.error.retryAfterMs).toBe(3000);
    }
  });

  it("redacts credential-like fields in logger context", async () => {
    const logs: Array<{ message: string; context?: Record<string, unknown> }> = [];
    const logger: CdiscLogger = {
      warn: (message, context) => logs.push({ message, context }),
      error: (message, context) => logs.push({ message, context }),
    };

    const fetchMock: MockFetch = jest.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const service = createCdiscApiService(
      {
        baseUrl: "https://api.cdisc.org",
        tokenUrl: "https://api.cdisc.org/oauth/token",
        credentials: { clientId: "client", clientSecret: "my-secret-value" },
      },
      createMockClient(fetchMock),
      logger,
    );

    await service.listCtPackages();

    expect(logs).toHaveLength(1);
    expect(logs[0].message).toContain("token request returned non-success");
    expect(JSON.stringify(logs[0].context)).not.toContain("my-secret-value");
  });
});
