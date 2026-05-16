export const VERSION_ENDPOINT_FALLBACK = '/assets/version.json';
export const VERSION_DISMISSAL_STORAGE_KEY = 'crf-xl-version-update-dismissed-v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface VersionHttpClient {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export interface VersionUpdateMetadata {
  version: string;
  description?: string;
  changelogUrl?: string;
}

export type VersionCheckResult =
  | { status: 'update-available'; update: VersionUpdateMetadata }
  | { status: 'dismissed'; update: VersionUpdateMetadata }
  | { status: 'up-to-date' }
  | { status: 'unreachable' };

function resolveSessionStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) return null;
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function parseVersion(version: string): number[] | null {
  const normalized = version.trim();
  if (!normalized) return null;
  const segments = normalized.split('.').map((segment) => Number.parseInt(segment, 10));
  if (segments.some((segment) => Number.isNaN(segment) || segment < 0)) return null;
  return segments;
}

export function isRemoteVersionNewer(currentVersion: string, remoteVersion: string): boolean {
  const current = parseVersion(currentVersion);
  const remote = parseVersion(remoteVersion);
  if (!current || !remote) return false;
  const length = Math.max(current.length, remote.length);
  for (let i = 0; i < length; i += 1) {
    const currentSegment = current[i] ?? 0;
    const remoteSegment = remote[i] ?? 0;
    if (remoteSegment > currentSegment) return true;
    if (remoteSegment < currentSegment) return false;
  }
  return false;
}

function readDismissedVersion(storage?: StorageLike): string | null {
  const resolvedStorage = resolveSessionStorage(storage);
  if (!resolvedStorage) return null;
  try {
    return resolvedStorage.getItem(VERSION_DISMISSAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function dismissVersionNotification(version: string, storage?: StorageLike): void {
  const resolvedStorage = resolveSessionStorage(storage);
  if (!resolvedStorage) return;
  try {
    resolvedStorage.setItem(VERSION_DISMISSAL_STORAGE_KEY, version);
  } catch {
    // no-op: session persistence should not break taskpane behavior
  }
}

export async function checkForVersionUpdate({
  currentVersion,
  endpoint = VERSION_ENDPOINT_FALLBACK,
  httpClient = { fetch: (input: string, init?: RequestInit) => fetch(input, init) },
  storage,
}: {
  currentVersion: string;
  endpoint?: string;
  httpClient?: VersionHttpClient;
  storage?: StorageLike;
}): Promise<VersionCheckResult> {
  try {
    const response = await httpClient.fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok) {
      return { status: 'unreachable' };
    }

    const payload = (await response.json()) as Partial<VersionUpdateMetadata>;
    if (!payload || typeof payload.version !== 'string') {
      return { status: 'up-to-date' };
    }

    if (!isRemoteVersionNewer(currentVersion, payload.version)) {
      return { status: 'up-to-date' };
    }

    const update: VersionUpdateMetadata = {
      version: payload.version,
      description: typeof payload.description === 'string' ? payload.description : undefined,
      changelogUrl: typeof payload.changelogUrl === 'string' ? payload.changelogUrl : undefined,
    };

    const dismissedVersion = readDismissedVersion(storage);
    if (dismissedVersion === update.version) {
      return {
        status: 'dismissed',
        update,
      };
    }

    return {
      status: 'update-available',
      update,
    };
  } catch {
    return { status: 'unreachable' };
  }
}
