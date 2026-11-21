/**
 * Thin, typed wrapper around fetch for talking to the Insta Snapshot backend.
 *
 * The backend (Python, in ../filter and ../features) does not expose an HTTP
 * API yet, so there are no endpoint functions here. When it does, add one
 * small function per endpoint in this folder (e.g. `getTopCreators(user)`)
 * that calls `apiRequest` — components should never call fetch directly.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super('NEXT_PUBLIC_API_URL is not set. See frontend/.env.example.');
    this.name = 'ApiNotConfiguredError';
  }
}

/** Base URL of the backend, from NEXT_PUBLIC_API_URL (no trailing slash). */
export function getApiBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  return url ? url.replace(/\/+$/, '') : null;
}

/**
 * Request `path` (e.g. "/users/justin/top-creators") and parse JSON.
 * Throws ApiNotConfiguredError when no base URL is set, ApiError on non-2xx.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new ApiNotConfiguredError();

  const response = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed with ${response.status}`, response.status, body);
  }
  return body as T;
}
