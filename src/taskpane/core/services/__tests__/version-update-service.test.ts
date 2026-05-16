/* eslint-disable no-undef */
import {
  VERSION_DISMISSAL_STORAGE_KEY,
  checkForVersionUpdate,
  dismissVersionNotification,
  isRemoteVersionNewer,
} from "../version-update-service";

type MockFetch = jest.Mock<Promise<Response>, [string, RequestInit | undefined]>;

function createMockClient(fetchMock: MockFetch) {
  return {
    fetch: fetchMock,
  };
}

function createMockStorage(initialData: Record<string, string> = {}) {
  const state = new Map<string, string>(Object.entries(initialData));
  return {
    getItem: (key: string) => state.get(key) ?? null,
    setItem: (key: string, value: string) => {
      state.set(key, value);
    },
  };
}

describe("version-update-service", () => {
  it("detects when the remote version is newer", async () => {
    const fetchMock: MockFetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          version: "0.0.2",
          description: "Security and reliability improvements.",
          changelogUrl: "https://github.com/fderuiter/CRF.xl/releases",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await checkForVersionUpdate({
      currentVersion: "0.0.1",
      httpClient: createMockClient(fetchMock),
      endpoint: "https://example.test/version.json",
    });

    expect(result.status).toBe("update-available");
    if (result.status !== "update-available") {
      throw new Error("expected update-available status");
    }
    expect(result.update.version).toBe("0.0.2");
    expect(result.update.changelogUrl).toBe("https://github.com/fderuiter/CRF.xl/releases");
  });

  it("returns up-to-date when current version is latest", async () => {
    const fetchMock: MockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: "0.0.1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await checkForVersionUpdate({
      currentVersion: "0.0.1",
      httpClient: createMockClient(fetchMock),
      endpoint: "https://example.test/version.json",
    });

    expect(result).toEqual({ status: "up-to-date" });
  });

  it("fails gracefully when the version endpoint is unreachable", async () => {
    const fetchMock: MockFetch = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

    const result = await checkForVersionUpdate({
      currentVersion: "0.0.1",
      httpClient: createMockClient(fetchMock),
      endpoint: "https://example.test/version.json",
    });

    expect(result).toEqual({ status: "unreachable" });
  });

  it("persists dismissal for the current session and suppresses repeated notifications", async () => {
    const storage = createMockStorage();
    const fetchMock: MockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: "0.0.2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    dismissVersionNotification("0.0.2", storage);
    expect(storage.getItem(VERSION_DISMISSAL_STORAGE_KEY)).toBe("0.0.2");

    const result = await checkForVersionUpdate({
      currentVersion: "0.0.1",
      httpClient: createMockClient(fetchMock),
      endpoint: "https://example.test/version.json",
      storage,
    });

    expect(result.status).toBe("dismissed");
    if (result.status !== "dismissed") {
      throw new Error("expected dismissed status");
    }
    expect(result.update.version).toBe("0.0.2");
  });

  it("compares dotted version segments safely", () => {
    expect(isRemoteVersionNewer("1.2.3", "1.2.4")).toBe(true);
    expect(isRemoteVersionNewer("1.2.3", "1.2.3.0")).toBe(false);
    expect(isRemoteVersionNewer("1.2.3", "1.2.2")).toBe(false);
    expect(isRemoteVersionNewer("1.2.3", "x.y.z")).toBe(false);
  });
});
